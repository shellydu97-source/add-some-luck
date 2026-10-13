import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppDataState } from '../models/types'
import { createEmptyAppData, pickAppData } from '../storage/appData'
import { migrateToV12 } from '../storage/migrations'
import { useAppStore } from '../storage/store'
import { createSyncBaseline, findSyncConflicts, hashAppData, mergeAppData, type CloudSyncMeta } from './syncCore'
import { isVersionConflict, readRemote, writeRemote, type RemoteSnapshot } from './remoteData'
import { hasUserData } from '../storage/appData'
import { getSupabaseClient, isCloudAccountConfigured } from './supabaseClient'
import { CloudAccountContext, type CloudAccountValue, type CloudSyncStatus } from './accountContext'

const CLOUD_META_KEY = 'add-luck-cloud-sync-meta-v1'
const ACTIVE_DATA_OWNER_KEY = 'add-luck-active-data-owner-v1'
const GUEST_DATA_KEY = 'add-luck-guest-data-v1'
const GUEST_OWNER = 'guest'
const SYNC_DELAY_MS = 900

function getLocalData() {
  return pickAppData(useAppStore.getState())
}

function readSyncMeta(): CloudSyncMeta | undefined {
  try {
    const raw = window.localStorage.getItem(CLOUD_META_KEY)
    return raw ? JSON.parse(raw) as CloudSyncMeta : undefined
  } catch {
    return undefined
  }
}

function writeSyncMeta(meta: CloudSyncMeta) {
  window.localStorage.setItem(CLOUD_META_KEY, JSON.stringify(meta))
}

function readActiveDataOwner() {
  const explicit = window.localStorage.getItem(ACTIVE_DATA_OWNER_KEY)
  if (explicit) return explicit
  return readSyncMeta()?.userId ?? GUEST_OWNER
}

function writeActiveDataOwner(ownerId: string) {
  window.localStorage.setItem(ACTIVE_DATA_OWNER_KEY, ownerId)
}

function saveGuestData(payload: AppDataState) {
  window.localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(payload))
}

function readGuestData() {
  try {
    const raw = window.localStorage.getItem(GUEST_DATA_KEY)
    return raw ? migrateToV12(JSON.parse(raw)) : createEmptyAppData()
  } catch {
    return createEmptyAppData()
  }
}

function latestChange(data: AppDataState) {
  return [...data.profiles.map((p) => p.updatedAt), ...data.records.map((r) => r.metaUpdatedAt ?? r.createdAt), ...data.drafts.map((d) => d.updatedAt)].sort().at(-1) ?? ''
}

function friendlyCloudError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause)
  if (/fetch|network|timeout/i.test(message)) return '暂时无法连接云端，本机数据仍会正常保留。'
  if (/user_app_data|relation|schema cache/i.test(message)) return '云端空间尚未准备完成，请稍后再试。'
  return '云端同步失败，本机数据没有受到影响。'
}

export function CloudAccountProvider({ children }: { children: ReactNode }) {
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const [client, setClient] = useState<SupabaseClient>()
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(isCloudAccountConfigured)
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(isCloudAccountConfigured ? 'signed-out' : 'disabled')
  const [syncMessage, setSyncMessage] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<string>()
  const [conflictRemote, setConflictRemote] = useState<RemoteSnapshot>()
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [syncReadyUserId, setSyncReadyUserId] = useState('')
  const initializedUserId = useRef('')
  const applyingRemote = useRef(false)
  const accountUserId = session?.user.id
  const cloudDataReady = !accountUserId || syncReadyUserId === accountUserId || syncStatus === 'error'

  const version = useRef(0)
  const syncing = useRef(false)
  const idleWaiters = useRef<Array<() => void>>([])
  const conflict = useRef<RemoteSnapshot | undefined>(undefined)
  const paused = useRef(false)

  const commitSynced = useCallback((userId: string, remote: RemoteSnapshot) => {
    if (useAppStore.getState().hasHydrated && sessionUser.current !== userId) return
    version.current = remote.version
    writeActiveDataOwner(userId)
    const dirty = hashAppData(getLocalData()) !== remote.dataHash
    writeSyncMeta({ userId, lastSyncedHash: remote.dataHash, lastSyncedAt: remote.updatedAt, lastSyncedVersion: remote.version, baseline: createSyncBaseline(remote.payload), dirty })
    if (!dirty) window.localStorage.removeItem(`add-luck-account-backup-${userId}`)
    setLastSyncedAt(remote.updatedAt)
    setSyncStatus(dirty ? 'waiting' : 'synced')
    setSyncMessage(dirty ? '还有本机改动等待同步' : '数据已保存到云端')
  }, [])

  const applyData = useCallback((payload: AppDataState) => {
    applyingRemote.current = true
    // Navigation, accessibility and selection remain local to this browser.
    const local = getLocalData()
    useAppStore.getState().restoreCloudData({ ...payload, lastPrimaryRoute: local.lastPrimaryRoute, reduceMotion: local.reduceMotion, activeProfileId: payload.profiles.some((p) => p.id === local.activeProfileId) ? local.activeProfileId : payload.profiles.find((p) => p.isDefault)?.id ?? payload.profiles[0]?.id ?? '' })
    applyingRemote.current = false
  }, [])

  const applyRemote = useCallback((remote: RemoteSnapshot, userId: string) => {
    applyData(remote.payload)
    commitSynced(userId, remote)
  }, [applyData, commitSynced])

  const showConflict = useCallback((remote: RemoteSnapshot) => {
    conflict.current = remote
    setConflictRemote(remote)
    setSyncStatus('conflict')
    setSyncMessage('两边修改了同一项内容，请选择如何保留。自动同步已暂停。')
  }, [])

  const pushLocal = useCallback(async (activeClient: SupabaseClient, userId: string) => {
    if (syncing.current || conflict.current || paused.current) return
    syncing.current = true
    try {
      // Capture a snapshot for each upload. Changes during upload remain dirty and are retried.
      for (let attempt = 0; attempt < 3; attempt++) {
        if (sessionUser.current !== userId || paused.current) return
        setSyncStatus('syncing')
        setSyncMessage('正在保存到云端…')
        const payload = getLocalData()
        try {
          const saved = await writeRemote(activeClient, payload, version.current)
          if (sessionUser.current !== userId || paused.current) return
          commitSynced(userId, saved)
          if (hashAppData(getLocalData()) === saved.dataHash) return
        } catch (cause) {
          if (!isVersionConflict(cause)) throw cause
          const remote = await readRemote(activeClient, userId)
          if (!remote) {
            if (version.current > 0) { showConflict({ payload: createEmptyAppData(), dataHash: hashAppData(createEmptyAppData()), updatedAt: new Date().toISOString(), version: 0 }); return }
            version.current = 0; continue
          }
          if (sessionUser.current !== userId || paused.current) return
          const meta = readSyncMeta()
          const baseline = meta?.userId === userId ? meta.baseline : undefined
          if (findSyncConflicts(getLocalData(), remote.payload, baseline).length) { showConflict(remote); return }
          version.current = remote.version
          applyData(mergeAppData(getLocalData(), remote.payload, baseline))
        }
      }
      setSyncStatus('waiting')
      setSyncMessage('本机改动仍保留，请点击同步重试。')
    } finally { syncing.current = false; idleWaiters.current.splice(0).forEach((resolve) => resolve()) }
  }, [applyData, commitSynced, showConflict])

  const reconcileAccountData = useCallback(async (activeClient: SupabaseClient, userId: string) => {
    if (syncing.current || conflict.current || paused.current) return
    setSyncStatus('checking')
    setSyncMessage('正在读取云端数据…')
    const owner = readActiveDataOwner()
    const remote = await readRemote(activeClient, userId)
    let local = getLocalData()
    const meta = readSyncMeta()
    if (sessionUser.current !== userId || paused.current) return
    version.current = remote?.version ?? 0
    let restoredBackup = false
    if (owner !== userId && meta?.userId === userId && meta.dirty) {
      try {
        const raw = window.localStorage.getItem(`add-luck-account-backup-${userId}`)
        if (raw) {
          if (owner === GUEST_OWNER) saveGuestData(local)
          local = migrateToV12(JSON.parse(raw))
          applyData(local)
          writeActiveDataOwner(userId)
          restoredBackup = true
        }
      } catch { /* Keep the backup intact if it cannot be parsed. */ }
    }
    if (owner !== userId && !restoredBackup) {
      if (owner === GUEST_OWNER) {
        saveGuestData(local)
        if (hasUserData(local)) {
          const importGuest = window.confirm('把本机人物、记录和草稿导入这个账号吗？选择“取消”则不导入。')
          applyData(importGuest ? mergeAppData(local, remote?.payload ?? createEmptyAppData()) : remote?.payload ?? createEmptyAppData())
        } else applyData(remote?.payload ?? createEmptyAppData())
      } else applyData(remote?.payload ?? createEmptyAppData())
      writeActiveDataOwner(userId)
      if (remote && hashAppData(getLocalData()) === remote.dataHash) commitSynced(userId, remote)
      else await pushLocal(activeClient, userId)
    } else if (!remote) {
      if ((meta?.lastSyncedVersion ?? 0) > 0) showConflict({ payload: createEmptyAppData(), dataHash: hashAppData(createEmptyAppData()), updatedAt: new Date().toISOString(), version: 0 })
      else await pushLocal(activeClient, userId)
    } else if (hashAppData(local) === remote.dataHash) {
      commitSynced(userId, remote)
    } else if (meta?.userId === userId && meta.lastSyncedHash === hashAppData(local) && !meta.dirty) {
      applyRemote(remote, userId)
    } else if (meta?.userId === userId && meta.lastSyncedHash === remote.dataHash) {
      await pushLocal(activeClient, userId)
    } else {
      const baseline = meta?.userId === userId ? meta.baseline : undefined
      if (findSyncConflicts(local, remote.payload, baseline).length) showConflict(remote)
      else {
        applyData(mergeAppData(local, remote.payload, baseline))
        await pushLocal(activeClient, userId)
      }
    }
    const loadedStore = useAppStore.getState()
    const defaultId = loadedStore.profiles.find(p => p.isDefault)?.id ?? loadedStore.profiles[0]?.id
    if (defaultId) loadedStore.setActiveProfile(defaultId)
    setSyncReadyUserId(userId)
  }, [applyData, applyRemote, commitSynced, pushLocal, showConflict])

  const sessionUser = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!isCloudAccountConfigured) return
    let active = true
    let unsubscribe: () => void = () => undefined
    void getSupabaseClient().then((nextClient) => {
      if (!active || !nextClient) return
      setClient(nextClient)
      const acceptSession = (next: Session | null) => {
        if (!active) return
        sessionUser.current = next?.user.id
        setSession(next)
        setAuthLoading(false)
        if (!next && readActiveDataOwner() !== GUEST_OWNER) {
          setSyncStatus('signed-out')
          setSyncMessage('登录已过期，请重新登录，未同步的改动仍保留在本机。')
        }
      }
      void nextClient.auth.getSession().then(({ data }) => acceptSession(data.session)).catch(() => { if (active) setAuthLoading(false) })
      const { data } = nextClient.auth.onAuthStateChange((event, nextSession) => {
        acceptSession(nextSession)
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
        if (event === 'SIGNED_OUT') {
          initializedUserId.current = ''
          setSyncReadyUserId('')
          conflict.current = undefined
          setConflictRemote(undefined)
        }
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })
    return () => { active = false; unsubscribe() }
  }, [])

  useEffect(() => {
    const userId = session?.user.id
    if (!client || !userId || !hasHydrated || initializedUserId.current === userId) return
    initializedUserId.current = userId
    paused.current = false
    void reconcileAccountData(client, userId).catch((cause) => { setSyncStatus('error'); setSyncMessage(friendlyCloudError(cause)) })
  }, [client, hasHydrated, reconcileAccountData, session?.user.id])

  useEffect(() => {
    const userId = session?.user.id
    if (!client || !userId || !hasHydrated) return
    let running = false
    const refresh = () => {
      if (running || document.visibilityState === 'hidden') return
      running = true
      void reconcileAccountData(client, userId).catch((cause) => { setSyncStatus('error'); setSyncMessage(friendlyCloudError(cause)) }).finally(() => { running = false })
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', onVisibility) }
  }, [client, hasHydrated, reconcileAccountData, session?.user.id])

  useEffect(() => {
    if (!hasHydrated) return
    const userId = session?.user.id
    let observedHash = hashAppData(getLocalData())
    let timer: number | undefined
    const unsubscribe = useAppStore.subscribe((state) => {
      const nextHash = hashAppData(pickAppData(state))
      if (nextHash === observedHash) return
      observedHash = nextHash
      if (applyingRemote.current || paused.current) return
      const owner = userId ?? readActiveDataOwner()
      if (owner === GUEST_OWNER) return
      const previous = readSyncMeta()
      writeSyncMeta({ userId: owner, lastSyncedHash: previous?.userId === owner ? previous.lastSyncedHash : '', lastSyncedAt: previous?.lastSyncedAt ?? '', lastSyncedVersion: previous?.lastSyncedVersion, baseline: previous?.baseline, dirty: true })
      if (!client || !userId || conflict.current || syncReadyUserId !== userId) return
      setSyncStatus('waiting')
      setSyncMessage('即将自动保存…')
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => { void pushLocal(client, userId).catch((cause) => { setSyncStatus('error'); setSyncMessage(friendlyCloudError(cause)) }) }, SYNC_DELAY_MS)
    })
    return () => { unsubscribe(); if (timer) window.clearTimeout(timer) }
  }, [client, hasHydrated, pushLocal, session?.user.id, syncReadyUserId])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!client) throw new Error('账号服务尚未就绪')
    const { data, error } = await client.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    if (data.session) setSession(data.session)
    return data.session ? 'signed-in' : 'check-email'
  }, [client])

  const verifySignUpCode = useCallback(async (email: string, token: string) => {
    if (!client) throw new Error('账号服务尚未就绪')
    const { data, error } = await client.auth.verifyOtp({ email, token, type: 'signup' })
    if (error) throw error
    if (!data.session) throw new Error('邮箱验证没有完成')
    setSession(data.session)
  }, [client])

  const resendSignUpCode = useCallback(async (email: string) => {
    if (!client) throw new Error('账号服务尚未就绪')
    const { error } = await client.auth.resend({ type: 'signup', email })
    if (error) throw error
  }, [client])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!client) throw new Error('账号服务尚未就绪')
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    setSession(data.session)
  }, [client])

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!client) throw new Error('账号服务尚未就绪')
    const { error } = await client.auth.resetPasswordForEmail(email)
    if (error) throw error
  }, [client])

  const verifyPasswordResetCode = useCallback(async (email: string, token: string) => {
    if (!client) throw new Error('账号服务尚未就绪')
    const { data, error } = await client.auth.verifyOtp({ email, token, type: 'recovery' })
    if (error) throw error
    if (!data.session) throw new Error('验证码验证没有完成')
    setSession(data.session)
    setPasswordRecovery(true)
  }, [client])

  const updatePassword = useCallback(async (password: string) => {
    if (!client) throw new Error('账号服务尚未就绪')
    const { error } = await client.auth.updateUser({ password })
    if (error) throw error
    setPasswordRecovery(false)
  }, [client])

  const signOut = useCallback(async () => {
    if (!client) return
    paused.current = true
    if (syncing.current) await new Promise<void>((resolve) => idleWaiters.current.push(resolve))
    // Preserve unsynced account data as a recovery backup before switching to guest.
    if (sessionUser.current) window.localStorage.setItem(`add-luck-account-backup-${sessionUser.current}`, JSON.stringify(getLocalData()))
    const { error } = await client.auth.signOut()
    if (error) { paused.current = false; throw error }
    setSyncReadyUserId('')
    applyingRemote.current = true
    useAppStore.getState().restoreCloudData(readGuestData())
    applyingRemote.current = false
    writeActiveDataOwner(GUEST_OWNER)
    setSyncMessage('')
  }, [client])

  const clearLocalData = useCallback(async (deleteCloud = false) => {
    if (!client || !accountUserId) return
    paused.current = true
    if (syncing.current) await new Promise<void>((resolve) => idleWaiters.current.push(resolve))
    if (deleteCloud) {
      const { error } = await client.from('user_app_data').delete().eq('user_id', accountUserId)
      if (error) { paused.current = false; throw error }
    }
    const { error } = await client.auth.signOut()
    if (error) { paused.current = false; throw error }
    applyingRemote.current = true
    useAppStore.getState().clearAllData()
    applyingRemote.current = false
    saveGuestData(createEmptyAppData())
    window.localStorage.removeItem(CLOUD_META_KEY)
    window.localStorage.removeItem(`add-luck-account-backup-${accountUserId}`)
    writeActiveDataOwner(GUEST_OWNER)
    setSyncReadyUserId('')
    setSyncMessage('')
  }, [accountUserId, client])

  const deleteAccount = useCallback(async () => {
    if (!client || !accountUserId) throw new Error('请先登录')
    paused.current = true
    if (syncing.current) await new Promise<void>(resolve => idleWaiters.current.push(resolve))
    try {
      const { data, error } = await client.functions.invoke('delete-account', { body: { confirmation: 'DELETE_MY_ACCOUNT' } })
      if (error || !data?.deleted) throw new Error('注销未成功，请稍后重试；本机数据仍保留。')
    } catch (error) { paused.current = false; throw error }
    await client.auth.signOut({ scope: 'local' })
    setSession(null)
    applyingRemote.current = true
    useAppStore.getState().restoreCloudData(readGuestData())
    applyingRemote.current = false
    window.localStorage.removeItem(CLOUD_META_KEY)
    window.localStorage.removeItem(`add-luck-account-backup-${accountUserId}`)
    writeActiveDataOwner(GUEST_OWNER)
    setSyncReadyUserId('')
    setSyncMessage('账号已注销，已回到访客状态。')
  }, [accountUserId, client])

  const syncNow = useCallback(async () => {
    if (!client || !accountUserId) return
    try { await reconcileAccountData(client, accountUserId) }
    catch (cause) { setSyncStatus('error'); setSyncMessage(friendlyCloudError(cause)); throw cause }
  }, [accountUserId, client, reconcileAccountData])

  const resolveConflict = useCallback(async (choice: 'cloud' | 'local' | 'merge') => {
    if (!client || !accountUserId || !conflict.current) return
    const newest = await readRemote(client, accountUserId)
    const selected = conflict.current
    if ((newest?.version ?? 0) !== selected.version) { showConflict(newest ?? { payload: createEmptyAppData(), dataHash: hashAppData(createEmptyAppData()), updatedAt: new Date().toISOString(), version: 0 }); throw new Error('云端又有新改动，请查看最新情况后再选择。') }
    version.current = newest?.version ?? 0
    if (choice === 'cloud') applyRemote(newest ?? { payload: createEmptyAppData(), dataHash: hashAppData(createEmptyAppData()), updatedAt: new Date().toISOString(), version: 0 }, accountUserId)
    else {
      if (choice === 'merge') applyData(mergeAppData(getLocalData(), selected.payload, readSyncMeta()?.baseline))
      conflict.current = undefined
      try { await pushLocal(client, accountUserId) }
      catch (cause) { conflict.current = selected; throw cause }
    }
    if (conflict.current && conflict.current !== selected) return
    conflict.current = undefined
    setConflictRemote(undefined)
    setSyncReadyUserId(accountUserId)
  }, [accountUserId, applyData, applyRemote, client, pushLocal, showConflict])
  const keepCloudData = useCallback(() => resolveConflict('cloud'), [resolveConflict])
  const keepLocalData = useCallback(() => resolveConflict('local'), [resolveConflict])
  const mergeBoth = useCallback(() => resolveConflict('merge'), [resolveConflict])

  const value = useMemo<CloudAccountValue>(() => ({
    configured: isCloudAccountConfigured,
    session,
    authLoading,
    cloudDataReady,
    syncStatus,
    syncMessage,
    lastSyncedAt,
    hasConflict: Boolean(conflictRemote),
    passwordRecovery,
    signUp,
    verifySignUpCode,
    resendSignUpCode,
    signIn,
    sendPasswordReset,
    verifyPasswordResetCode,
    updatePassword,
    signOut,
    deleteAccount,
    clearLocalData,
    conflictSummary: conflictRemote ? { local: { profiles: getLocalData().profiles.length, records: getLocalData().records.length, updatedAt: latestChange(getLocalData()) }, cloud: { profiles: conflictRemote.payload.profiles.length, records: conflictRemote.payload.records.length, updatedAt: conflictRemote.updatedAt } } : undefined,
    syncNow,
    keepCloudData,
    keepLocalData,
    mergeBoth,
  }), [authLoading, deleteAccount, clearLocalData, cloudDataReady, conflictRemote, keepCloudData, keepLocalData, lastSyncedAt, mergeBoth, passwordRecovery, resendSignUpCode, sendPasswordReset, session, signIn, signOut, signUp, syncMessage, syncNow, syncStatus, updatePassword, verifyPasswordResetCode, verifySignUpCode])

  return <CloudAccountContext.Provider value={value}>{children}</CloudAccountContext.Provider>
}

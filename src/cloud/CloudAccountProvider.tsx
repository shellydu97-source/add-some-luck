import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppDataState } from '../models/types'
import { pickAppData } from '../storage/appData'
import { migrateToV12 } from '../storage/migrations'
import { appDataSchema } from '../storage/schema'
import { useAppStore } from '../storage/store'
import { decideInitialSync, hashAppData, mergeAppData, type CloudSyncMeta } from './syncCore'
import { getSupabaseClient, isCloudAccountConfigured } from './supabaseClient'
import { CloudAccountContext, type CloudAccountValue, type CloudSyncStatus } from './accountContext'

const CLOUD_META_KEY = 'add-luck-cloud-sync-meta-v1'
const SYNC_DELAY_MS = 900

interface RemoteSnapshot {
  payload: AppDataState
  dataHash: string
  updatedAt: string
}

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

async function readRemote(client: SupabaseClient, userId: string): Promise<RemoteSnapshot | undefined> {
  const { data, error } = await client
    .from('user_app_data')
    .select('payload,data_hash,updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return undefined
  return {
    payload: migrateToV12(appDataSchema.parse(data.payload)),
    dataHash: String(data.data_hash),
    updatedAt: String(data.updated_at),
  }
}

async function writeRemote(client: SupabaseClient, userId: string, payload: AppDataState) {
  const dataHash = hashAppData(payload)
  const { data, error } = await client
    .from('user_app_data')
    .upsert({
      user_id: userId,
      payload,
      data_hash: dataHash,
      client_updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('updated_at')
    .single()
  if (error) throw error
  return { dataHash, updatedAt: String(data.updated_at) }
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

  const commitSynced = useCallback((userId: string, dataHash: string, updatedAt: string) => {
    writeSyncMeta({ userId, lastSyncedHash: dataHash, lastSyncedAt: updatedAt, dirty: false })
    setLastSyncedAt(updatedAt)
    setSyncStatus('synced')
    setSyncMessage('数据已保存到云端')
  }, [])

  const applyRemote = useCallback((remote: RemoteSnapshot, userId: string) => {
    applyingRemote.current = true
    useAppStore.getState().restoreCloudData(remote.payload)
    applyingRemote.current = false
    commitSynced(userId, remote.dataHash, remote.updatedAt)
  }, [commitSynced])

  const pushLocal = useCallback(async (activeClient: SupabaseClient, userId: string) => {
    setSyncStatus('syncing')
    setSyncMessage('正在保存到云端…')
    const result = await writeRemote(activeClient, userId, getLocalData())
    commitSynced(userId, result.dataHash, result.updatedAt)
  }, [commitSynced])

  const reconcileAccountData = useCallback(async (activeClient: SupabaseClient, userId: string) => {
    setSyncStatus('checking')
    setSyncMessage('正在读取云端数据…')
    const local = getLocalData()
    const localHash = hashAppData(local)
    const remote = await readRemote(activeClient, userId)
    const decision = decideInitialSync({
      userId,
      local,
      localHash,
      remoteHash: remote?.dataHash,
      meta: readSyncMeta(),
    })

    if (decision === 'upload') {
      await pushLocal(activeClient, userId)
    } else if (decision === 'download' && remote) {
      applyRemote(remote, userId)
    } else if (decision === 'merge' && remote) {
      const merged = mergeAppData(local, remote.payload)
      applyingRemote.current = true
      useAppStore.getState().restoreCloudData(merged)
      applyingRemote.current = false
      await pushLocal(activeClient, userId)
    } else if (remote) {
      commitSynced(userId, remote.dataHash, remote.updatedAt)
    }

    setConflictRemote(undefined)
    setSyncReadyUserId(userId)
  }, [applyRemote, commitSynced, pushLocal])

  useEffect(() => {
    if (!isCloudAccountConfigured) return
    let active = true
    let unsubscribe: () => void = () => undefined
    void getSupabaseClient().then((nextClient) => {
      if (!active || !nextClient) return
      setClient(nextClient)
      void nextClient.auth.getSession().then(({ data }) => {
        if (active) {
          setSession(data.session)
          setAuthLoading(false)
        }
      })
      const { data } = nextClient.auth.onAuthStateChange((event, nextSession) => {
        setSession(nextSession)
        setAuthLoading(false)
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
        if (event === 'SIGNED_OUT') {
          initializedUserId.current = ''
          setSyncReadyUserId('')
          setConflictRemote(undefined)
          setSyncStatus('signed-out')
          setSyncMessage('')
        }
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const userId = session?.user.id
    if (!client || !userId || !hasHydrated || initializedUserId.current === userId) return
    initializedUserId.current = userId
    setSyncStatus('checking')
    setSyncMessage('正在读取云端数据…')
    void (async () => {
      try {
        await reconcileAccountData(client, userId)
      } catch (cause) {
        setSyncStatus('error')
        setSyncMessage(friendlyCloudError(cause))
      }
    })()
  }, [client, hasHydrated, reconcileAccountData, session?.user.id])

  useEffect(() => {
    const userId = session?.user.id
    if (!client || !userId || !hasHydrated) return
    let running = false
    const refreshFromCloud = () => {
      if (running || document.visibilityState === 'hidden') return
      running = true
      void reconcileAccountData(client, userId)
        .catch((cause) => {
          setSyncStatus('error')
          setSyncMessage(friendlyCloudError(cause))
        })
        .finally(() => { running = false })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshFromCloud()
    }
    window.addEventListener('focus', refreshFromCloud)
    window.addEventListener('online', refreshFromCloud)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('focus', refreshFromCloud)
      window.removeEventListener('online', refreshFromCloud)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [client, hasHydrated, reconcileAccountData, session?.user.id])

  useEffect(() => {
    const userId = session?.user.id
    if (!client || !userId || conflictRemote || syncReadyUserId !== userId) return
    let observedHash = hashAppData(getLocalData())
    let timer: number | undefined
    const unsubscribe = useAppStore.subscribe((state) => {
      const nextHash = hashAppData(pickAppData(state))
      if (nextHash === observedHash) return
      observedHash = nextHash
      if (applyingRemote.current) return
      const previousMeta = readSyncMeta()
      writeSyncMeta({
        userId,
        lastSyncedHash: previousMeta?.userId === userId ? previousMeta.lastSyncedHash : '',
        lastSyncedAt: previousMeta?.userId === userId ? previousMeta.lastSyncedAt : '',
        dirty: true,
      })
      setSyncStatus('waiting')
      setSyncMessage('即将自动保存…')
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void pushLocal(client, userId).catch((cause) => {
          setSyncStatus('error')
          setSyncMessage(friendlyCloudError(cause))
        })
      }, SYNC_DELAY_MS)
    })
    return () => {
      unsubscribe()
      if (timer) window.clearTimeout(timer)
    }
  }, [client, conflictRemote, pushLocal, session?.user.id, syncReadyUserId])

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
    const { error } = await client.auth.signOut()
    if (error) throw error
  }, [client])

  const syncNow = useCallback(async () => {
    if (!client || !accountUserId) return
    try {
      await reconcileAccountData(client, accountUserId)
    }
    catch (cause) {
      setSyncStatus('error')
      setSyncMessage(friendlyCloudError(cause))
      throw cause
    }
  }, [accountUserId, client, reconcileAccountData])

  const keepCloudData = useCallback(async () => {
    if (!conflictRemote || !accountUserId) return
    applyRemote(conflictRemote, accountUserId)
    setConflictRemote(undefined)
    setSyncReadyUserId(accountUserId)
  }, [accountUserId, applyRemote, conflictRemote])

  const keepLocalData = useCallback(async () => {
    if (!client || !accountUserId) return
    await pushLocal(client, accountUserId)
    setConflictRemote(undefined)
    setSyncReadyUserId(accountUserId)
  }, [accountUserId, client, pushLocal])

  const mergeBoth = useCallback(async () => {
    if (!client || !conflictRemote || !accountUserId) return
    const merged = mergeAppData(getLocalData(), conflictRemote.payload)
    applyingRemote.current = true
    useAppStore.getState().restoreCloudData(merged)
    applyingRemote.current = false
    await pushLocal(client, accountUserId)
    setConflictRemote(undefined)
    setSyncReadyUserId(accountUserId)
  }, [accountUserId, client, conflictRemote, pushLocal])

  const value = useMemo<CloudAccountValue>(() => ({
    configured: isCloudAccountConfigured,
    session,
    authLoading,
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
    syncNow,
    keepCloudData,
    keepLocalData,
    mergeBoth,
  }), [authLoading, conflictRemote, keepCloudData, keepLocalData, lastSyncedAt, mergeBoth, passwordRecovery, resendSignUpCode, sendPasswordReset, session, signIn, signOut, signUp, syncMessage, syncNow, syncStatus, updatePassword, verifyPasswordResetCode, verifySignUpCode])

  return <CloudAccountContext.Provider value={value}>{children}</CloudAccountContext.Provider>
}

import SyncConflictPanel from '../components/SyncConflictPanel'
import { useEffect } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { CloudAccountProvider } from './CloudAccountProvider'
import { UnsyncedChangesError, useCloudAccount, type CloudAccountValue } from './accountContext'
import { useAppStore } from '../storage/store'
import { createEmptyAppData } from '../storage/appData'
import { seedRecords } from '../mocks/records'
import { seedProfiles } from '../mocks/profiles'
import { hashAppData, pickSyncData } from './syncCore'
import { createCastFromValues } from '../calculation/liuyao'
import type { DivinationDraft } from '../models/types'
import { adoptDraftResults } from '../utils/divinationRecords'

const backend = vi.hoisted(() => ({ row: undefined as unknown, authChange: undefined as unknown, session: undefined as unknown, read: vi.fn(), rpc: vi.fn(), delete: vi.fn(), invoke: vi.fn(), signOut: vi.fn() }))
vi.mock('./supabaseClient', () => ({
  isCloudAccountConfigured: true,
  getSupabaseClient: async () => ({
    auth: {
      getSession: async () => ({ data: { session: backend.session } }),
      onAuthStateChange: (callback: unknown) => { backend.authChange = callback; return { data: { subscription: { unsubscribe: () => {} } } } },
      signOut: backend.signOut,
    },
    from: () => ({ select: () => ({ eq: (_column: string, userId: string) => ({ maybeSingle: () => backend.read(userId) }) }), delete: () => ({ eq: (...args: unknown[]) => {
      const headers: Record<string, string> = {}
      const request = { setHeader: (name: string, value: string) => { headers[name] = value; return request }, then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => backend.delete(...args, headers).then(resolve, reject) }
      return request
    } }) }),
    rpc: (...args: unknown[]) => {
      const headers: Record<string, string> = {}
      const request = { setHeader: (name: string, value: string) => { headers[name] = value; return request }, then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => backend.rpc(...args, headers).then(resolve, reject) }
      return request
    },
    functions: { invoke: backend.invoke },
  }),
}))
let account: CloudAccountValue
const drafted = '2026-10-12T04:00:00.000Z'
const openDraft = (id: string): DivinationDraft => ({ id, type: 'meihua', profileId: 'guest', question: `${id}的问题`, createdAt: drafted, updatedAt: drafted, state: { locked: false } })
const finishedDraft = (id: string): DivinationDraft => ({ id, type: 'liuyao', profileId: 'guest', question: '旧版本没保存的结果', category: '其他', createdAt: drafted, updatedAt: drafted, state: { timeRange: '', casts: createCastFromValues([8, 8, 8, 6, 7, 9]), locked: true, lockedAt: drafted } })
function Probe() { const value = useCloudAccount(); useEffect(() => { account = value }, [value]); return <p>{value.syncMessage}</p> }
beforeEach(() => {
  localStorage.clear()
  useAppStore.setState({ ...createEmptyAppData(), hasHydrated: true })
  backend.session = { user: { id: 'u', email: 'test@example.com' }, access_token: 'test' } as Session
  const payload = { ...createEmptyAppData(), records: [{ ...seedRecords[0], id: 'r' }] }
  backend.row = { payload: pickSyncData(payload), data_hash: hashAppData(payload), updated_at: '2026-10-12T04:00:00Z', version: 1 }
  backend.invoke.mockReset().mockResolvedValue({data:{deleted:true},error:null})
  backend.read.mockReset().mockImplementation(async () => ({ data: structuredClone(backend.row), error: null }))
  backend.rpc.mockReset()
  backend.delete.mockReset().mockResolvedValue({ error: null })
  backend.signOut.mockReset().mockImplementation(async () => { (backend.authChange as (event: string, session: null) => void)('SIGNED_OUT', null); return { error: null } })
  backend.rpc.mockImplementation(async (_name, args) => {
    const row = backend.row as { version: number }
    if (args.p_expected_version !== row.version) return { data: null, error: { message: 'version_conflict' } }
    backend.row = { payload: args.p_payload, data_hash: args.p_data_hash, updated_at: new Date().toISOString(), version: row.version + 1 }
    return { data: row.version + 1, error: null }
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
async function mount() {
  render(<CloudAccountProvider><Probe /><SyncConflictPanel /></CloudAccountProvider>)
  await waitFor(() => expect(account.syncStatus).toBe('synced'))
}
describe('账号数据保护流程', () => {
  it.each(['signOut', 'clearLocalData', 'deleteAccount'] as const)('A的%s等待在途上传时换成B，旧操作不退出、清空或注销B', async (operation) => {
    await mount()
    let finishUpload!: (value: { data: number; error: null }) => void
    backend.rpc.mockImplementationOnce(() => new Promise((resolve) => { finishUpload = resolve }))
    act(() => useAppStore.getState().updateRecordVerification('r', { verificationStatus: 'pending', notes: 'A upload' }))
    let uploading!: Promise<void>
    act(() => { uploading = account.syncNow() })
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledTimes(1))
    let pendingOperation!: Promise<void>
    act(() => { pendingOperation = account[operation]() })
    const bData = { ...createEmptyAppData(), records: [{ ...seedRecords[0], id: 'b-record' }] }
    backend.row = { payload: pickSyncData(bData), data_hash: hashAppData(bData), updated_at: drafted, version: 1 }
    act(() => (backend.authChange as (event: string, session: Session) => void)('SIGNED_IN', { user: { id: 'b' }, access_token: 'b-token' } as Session))
    await act(async () => { finishUpload({ data: 2, error: null }); await Promise.all([uploading, pendingOperation]) })
    await waitFor(() => expect(account.syncStatus).toBe('synced'))
    expect(account.session?.user.id).toBe('b')
    expect(useAppStore.getState().records.map((r) => r.id)).toEqual(['b-record'])
    expect(backend.signOut).not.toHaveBeenCalled()
    expect(backend.invoke).not.toHaveBeenCalled()
    expect(backend.delete).not.toHaveBeenCalled()
  })
  it('A注销请求固定A token，返回前换成B时不退出B或恢复访客数据', async () => {
    await mount()
    let finishDelete!: (value: { data: { deleted: true }; error: null }) => void
    backend.invoke.mockImplementationOnce(() => new Promise((resolve) => { finishDelete = resolve }))
    let deleting!: Promise<void>
    act(() => { deleting = account.deleteAccount() })
    await waitFor(() => expect(backend.invoke).toHaveBeenCalledTimes(1))
    expect(backend.invoke).toHaveBeenCalledWith('delete-account', { body: { confirmation: 'DELETE_MY_ACCOUNT' }, headers: { Authorization: 'Bearer test' } })
    const bData = { ...createEmptyAppData(), records: [{ ...seedRecords[0], id: 'b-record' }] }
    backend.row = { payload: pickSyncData(bData), data_hash: hashAppData(bData), updated_at: drafted, version: 1 }
    act(() => (backend.authChange as (event: string, session: Session) => void)('SIGNED_IN', { user: { id: 'b' }, access_token: 'b-token' } as Session))
    await waitFor(() => expect(account.syncStatus).toBe('synced'))
    await act(async () => { finishDelete({ data: { deleted: true }, error: null }); await deleting })
    expect(account.session?.user.id).toBe('b')
    expect(useAppStore.getState().records.map((r) => r.id)).toEqual(['b-record'])
    expect(backend.signOut).not.toHaveBeenCalled()
    expect(localStorage.getItem('add-luck-active-data-owner-v1')).toBe('b')
  })
  it('B读取失败不放行A数据，也不把A未同步改动标为B；回到A可以继续保存', async () => {
    await mount()
    act(() => useAppStore.getState().updateRecordVerification('r', { verificationStatus: 'pending', notes: 'A尚未上传的备注' }))
    const aRow = structuredClone(backend.row)
    act(() => (backend.authChange as (event: string, session: Session | null) => void)('SIGNED_OUT', null))
    backend.read.mockRejectedValue(new Error('network unavailable'))
    act(() => (backend.authChange as (event: string, session: Session) => void)('SIGNED_IN', { user: { id: 'b' }, access_token: 'b-token' } as Session))
    await waitFor(() => expect(account.syncStatus).toBe('error'))
    expect(account.session?.user.id).toBe('b')
    expect(account.cloudDataReady).toBe(false)
    expect(useAppStore.getState().records[0].notes).toBe('A尚未上传的备注')
    act(() => useAppStore.getState().updateRecordVerification('r', { verificationStatus: 'pending', notes: 'A本机备注仍保留' }))
    expect(JSON.parse(localStorage.getItem('add-luck-cloud-sync-meta-v1')!).userId).toBe('u')
    expect(backend.rpc).not.toHaveBeenCalled()
    backend.row = aRow
    backend.read.mockImplementation(async () => ({ data: structuredClone(backend.row), error: null }))
    act(() => (backend.authChange as (event: string, session: Session) => void)('SIGNED_IN', backend.session as Session))
    await waitFor(() => expect(account.syncStatus).toBe('synced'))
    expect(account.session?.user.id).toBe('u')
    expect((backend.row as { payload: { records: typeof seedRecords } }).payload.records[0].notes).toBe('A本机备注仍保留')
    expect(backend.rpc.mock.calls[0][2]).toEqual({ Authorization: 'Bearer test' })
  })
  it('退出账号会取消访客导入弹窗，过期的选择不恢复旧账号云端数据', async () => {
    useAppStore.setState({ records: [{ ...seedRecords[0], id: 'guest-record' }] })
    render(<CloudAccountProvider><Probe /><SyncConflictPanel /></CloudAccountProvider>)
    await screen.findByRole('dialog')
    act(() => (backend.authChange as (event: string, session: Session | null) => void)('SIGNED_OUT', null))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(account.session).toBeNull()
    expect(useAppStore.getState().records.map((r) => r.id)).toEqual(['guest-record'])
    expect(localStorage.getItem('add-luck-active-data-owner-v1')).not.toBe('u')
    expect(backend.rpc).not.toHaveBeenCalled()
  })
  it.each([false, true])('同owner先归档旧云端完成草稿再走noop或push，本机已提前迁移=%s', async (alreadyAdopted) => {
    const legacy = { ...createEmptyAppData(), records: [{ ...seedRecords[0], id: 'r' }], drafts: [finishedDraft('same-owner-legacy')] }
    const local = alreadyAdopted ? adoptDraftResults(structuredClone(legacy)) : { ...createEmptyAppData(), records: structuredClone(legacy.records) }
    useAppStore.setState(local)
    localStorage.setItem('add-luck-active-data-owner-v1', 'u')
    localStorage.setItem('add-luck-cloud-sync-meta-v1', JSON.stringify({ userId: 'u', lastSyncedHash: hashAppData(local), dirty: false }))
    backend.row = { payload: legacy, data_hash: hashAppData(legacy), updated_at: drafted, version: 1 }
    await mount()
    expect(useAppStore.getState().records).toHaveLength(2)
    expect(backend.rpc.mock.calls[0][1].p_expected_version).toBe(1)
    expect((backend.row as { payload: unknown }).payload).not.toHaveProperty('drafts')
    act(() => useAppStore.getState().updateRecordVerification('r', { verificationStatus: 'pending', notes: '随后编辑' }))
    await act(async () => { await account.syncNow() })
    expect((backend.row as { payload: { records: unknown[] } }).payload.records).toHaveLength(2)
    expect(useAppStore.getState().records).toHaveLength(2)
  })
  it('旧云端草稿归档上传失败时不丢弃来源，不把失败当作完成同步', async () => {
    const legacy = { ...createEmptyAppData(), records: [{ ...seedRecords[0], id: 'r' }], drafts: [finishedDraft('failed-archive')] }
    localStorage.setItem('add-luck-active-data-owner-v1', 'u')
    useAppStore.setState({ records: structuredClone(legacy.records) })
    backend.row = { payload: legacy, data_hash: hashAppData(legacy), updated_at: drafted, version: 1 }
    const before = structuredClone(backend.row)
    backend.rpc.mockResolvedValue({ data: null, error: new Error('network unavailable') })
    render(<CloudAccountProvider><Probe /><SyncConflictPanel /></CloudAccountProvider>)
    await waitFor(() => expect(account.syncStatus).toBe('error'))
    expect(backend.row).toEqual(before)
    expect(account.cloudDataReady).toBe(true) // Safe offline use of this same account's data.
    expect(useAppStore.getState().records).toHaveLength(1)
  })
  it('A在途上传只使用A的token，B等它结束后恢复自己的数据，旧回调不覆盖B', async () => {
    await mount()
    let finishUpload!: (value: { data: number; error: null }) => void
    backend.rpc.mockImplementationOnce(() => new Promise((resolve) => { finishUpload = resolve }))
    act(() => useAppStore.getState().updateRecordVerification('r', { verificationStatus: 'pending', notes: 'A upload' }))
    let uploading!: Promise<void>
    act(() => { uploading = account.syncNow() })
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledTimes(1))
    const bData = { ...createEmptyAppData(), records: [{ ...seedRecords[0], id: 'b-record', question: 'B question' }] }
    backend.row = { payload: pickSyncData(bData), data_hash: hashAppData(bData), updated_at: drafted, version: 1 }
    act(() => (backend.authChange as (event: string, session: Session) => void)('SIGNED_IN', { user: { id: 'b' }, access_token: 'b-token' } as Session))
    expect(account.cloudDataReady).toBe(false)
    await act(async () => { finishUpload({ data: 2, error: null }); await uploading })
    await waitFor(() => expect(account.syncStatus).toBe('synced'))
    expect(account.session?.user.id).toBe('b')
    expect(useAppStore.getState().records.map((r) => r.id)).toEqual(['b-record'])
    expect(JSON.parse(localStorage.getItem('add-luck-cloud-sync-meta-v1')!).userId).toBe('b')
    expect(backend.rpc.mock.calls[0][2]).toEqual({ Authorization: 'Bearer test' })
  })
  it.each([true, false])('首次登录用应用内对话框询问是否带入访客数据：%s', async (accept) => {
    const confirm = vi.spyOn(window, 'confirm')
    useAppStore.setState({ records: [{ ...seedRecords[0], id: 'guest-record' }] })
    render(<CloudAccountProvider><Probe /><SyncConflictPanel /></CloudAccountProvider>)
    const dialog = await screen.findByRole('dialog', { name: '把这台设备上的数据带进账号？' })
    expect(dialog.textContent).toContain('0 个人物、1 条记录')
    fireEvent.click(screen.getByRole('button', { name: accept ? '带进账号' : '不用了' }))
    await waitFor(() => expect(account.syncStatus).toBe('synced'))
    expect(confirm).not.toHaveBeenCalled()
    expect(useAppStore.getState().records.map((r) => r.id).sort()).toEqual(accept ? ['guest-record', 'r'] : ['r'])
    expect(backend.rpc).toHaveBeenCalledTimes(accept ? 1 : 0)
    expect(JSON.parse(localStorage.getItem('add-luck-guest-data-v1')!).records[0].id).toBe('guest-record')
  })
  it('切换导航不会上传，清空本机不会删除或改写云端', async () => {
    await mount()
    const row = structuredClone(backend.row)
    act(() => useAppStore.getState().setLastPrimaryRoute('records'))
    await act(async () => { await account.clearLocalData(false) })
    expect(backend.rpc).not.toHaveBeenCalled()
    expect(backend.delete).not.toHaveBeenCalled()
    expect(backend.row).toEqual(row)
    expect(useAppStore.getState().records).toEqual([])
    expect(account.session).toBeNull()
  })
  it('升级后首次同步没有基线：人物按最新修改合并，不弹冲突', async () => {
    localStorage.setItem('add-luck-active-data-owner-v1', 'u')
    localStorage.setItem('add-luck-cloud-sync-meta-v1', JSON.stringify({ userId: 'u', lastSyncedHash: 'old-hash-format', lastSyncedAt: '2026-10-01T00:00:00Z', dirty: true }))
    const cloudPerson = { ...structuredClone(seedProfiles[0]), name: '云端改名', updatedAt: '2026-10-10T00:00:00Z' }
    const localPerson = { ...structuredClone(seedProfiles[0]), name: '本机改名', updatedAt: '2026-10-11T00:00:00Z' }
    const payload = { ...createEmptyAppData(), profiles: [cloudPerson], records: [{ ...seedRecords[0], id: 'r' }] }
    backend.row = { payload: pickSyncData(payload), data_hash: hashAppData(payload), updated_at: '2026-10-12T04:00:00Z', version: 3 }
    useAppStore.setState({ profiles: [localPerson], records: [{ ...seedRecords[0], id: 'r' }] })
    await mount()
    expect(account.hasConflict).toBe(false)
    expect(useAppStore.getState().profiles[0].name).toBe('本机改名')
  })
  it('登录状态下切回页面不会把正在查看的人物换回默认人物', async () => {
    const payload = { ...createEmptyAppData(), profiles: structuredClone(seedProfiles), records: [{ ...seedRecords[0], id: 'r' }] }
    backend.row = { payload: pickSyncData(payload), data_hash: hashAppData(payload), updated_at: '2026-10-12T04:00:00Z', version: 1 }
    await mount()
    const other = seedProfiles.find((p) => !p.isDefault)!.id
    act(() => useAppStore.getState().setActiveProfile(other))
    await act(async () => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')) })
    await waitFor(() => expect(account.syncStatus).toBe('synced'))
    expect(useAppStore.getState().activeProfileId).toBe(other)
  })
  it('已同步时退出登录，本机不留账号数据副本', async () => {
    await mount()
    await act(async () => { await account.signOut() })
    expect(account.session).toBeNull()
    expect(Object.keys(localStorage).filter((key) => key.startsWith('add-luck-account-backup-'))).toEqual([])
    expect(useAppStore.getState().records.map((r) => r.id)).not.toContain('r')
  })
  it('有改动且同步失败时退出需要明确选择，放弃后同样不留副本', async () => {
    await mount()
    backend.rpc.mockResolvedValue({ data: null, error: { message: 'network timeout' } })
    act(() => useAppStore.getState().updateRecordVerification('r', { verificationStatus: 'matched', notes: '还没上传' }))
    await act(async () => { await expect(account.signOut()).rejects.toBeInstanceOf(UnsyncedChangesError) })
    expect(account.session?.user.id).toBe('u')
    expect(useAppStore.getState().records[0].notes).toBe('还没上传')
    await act(async () => { await account.signOut({ discardUnsynced: true }) })
    expect(account.session).toBeNull()
    expect(Object.keys(localStorage).filter((key) => key.startsWith('add-luck-account-backup-'))).toEqual([])
    expect(JSON.stringify(useAppStore.getState().records)).not.toContain('还没上传')
  })
  it('会话过期保留未同步改动并提示重新登录', async () => {
    await mount()
    act(() => useAppStore.getState().updateRecordVerification('r', { verificationStatus: 'matched', notes: '未上传备注' }))
    act(() => (backend.authChange as (event: string, session: null) => void)('SIGNED_OUT', null))
    expect(useAppStore.getState().records[0].notes).toBe('未上传备注')
    expect(account.syncMessage).toContain('未同步的改动仍保留')
    expect(JSON.parse(localStorage.getItem('add-luck-cloud-sync-meta-v1')!).dirty).toBe(true)
  })
  it('换成另一个账号的数据时，不带上一个账号没做完的占卜', async () => {
    localStorage.setItem('add-luck-active-data-owner-v1', 'someone-else')
    useAppStore.setState({ drafts: [openDraft('别人的草稿')], records: [{ ...seedRecords[0], id: 'other-record' }] })
    await mount()
    expect(useAppStore.getState().drafts).toEqual([])
    expect(useAppStore.getState().records.map((r) => r.id)).toEqual(['r'])
  })
  it('访客没做完的占卜不进账号，退出登录后回到访客时还在', async () => {
    useAppStore.setState({ drafts: [openDraft('访客草稿')] })
    await mount()
    expect(useAppStore.getState().drafts).toEqual([])
    await act(async () => { await account.signOut() })
    expect(useAppStore.getState().drafts.map((d) => d.id)).toEqual(['访客草稿'])
  })
  it('云端旧版本留在草稿里的结果先变成记录再上传，不会被覆盖丢失', async () => {
    const legacy = { ...pickSyncData(createEmptyAppData()), records: [{ ...seedRecords[0], id: 'r' }], drafts: [finishedDraft('legacy'), openDraft('legacy-open')] }
    backend.row = { payload: legacy, data_hash: 'old', updated_at: '2026-10-12T04:00:00Z', version: 1 }
    await mount()
    const row = backend.row as { payload: { records: Array<{ id: string; question?: string; createdAt: string }> } }
    const adopted = row.payload.records.find((r) => r.question === '旧版本没保存的结果')
    expect(adopted?.createdAt).toBe(drafted)
    expect(row.payload).not.toHaveProperty('drafts')
    expect(useAppStore.getState().records.map((r) => r.id)).toContain(adopted?.id)
    expect(useAppStore.getState().drafts).toEqual([])
  })
  it('同一字段两端修改暂停同步，保留云端按最新版本恢复', async () => {
    await mount()
    act(() => useAppStore.getState().updateRecordVerification('r', { verificationStatus: 'matched', notes: '本机备注' }))
    const row = backend.row as { payload: { records: typeof seedRecords }; version: number }
    row.payload.records[0].notes = '云端备注'; row.payload.records[0].metaUpdatedAt = '2026-10-12T05:00:00Z'; row.version++
    await act(async () => { await account.syncNow() })
    expect(account.hasConflict).toBe(true)
    expect(backend.rpc).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: '选择如何保留两边数据' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '保留云端' }))
    await waitFor(() => expect(account.hasConflict).toBe(false))
    expect(useAppStore.getState().records[0].notes).toBe('云端备注')
    expect(account.hasConflict).toBe(false)
    expect(JSON.parse(localStorage.getItem('add-luck-cloud-sync-meta-v1')!).lastSyncedVersion).toBe(2)
  })
})

it('模拟注销成功回到访客并清理该账号备份，删除失败保留数据',async()=>{
 await mount()
 backend.invoke.mockResolvedValueOnce({data:null,error:new Error('offline')})
 const before=structuredClone(useAppStore.getState().records)
 await act(async()=>{await expect(account.deleteAccount()).rejects.toThrow()})
 expect(account.session?.user.id).toBe('u');expect(useAppStore.getState().records).toEqual(before)
 localStorage.setItem('add-luck-account-backup-u','private backup')
 await act(async()=>{await account.deleteAccount()})
 expect(account.session).toBeNull();expect(localStorage.getItem('add-luck-account-backup-u')).toBeNull()
 expect(backend.invoke).toHaveBeenCalledWith('delete-account',{body:{confirmation:'DELETE_MY_ACCOUNT'},headers:{Authorization:'Bearer test'}})
 expect(useAppStore.getState().records).toHaveLength(0)
})

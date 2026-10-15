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

const backend = vi.hoisted(() => ({ row: undefined as unknown, authChange: undefined as unknown, session: undefined as unknown, rpc: vi.fn(), delete: vi.fn(), invoke: vi.fn() }))
vi.mock('./supabaseClient', () => ({
  isCloudAccountConfigured: true,
  getSupabaseClient: async () => ({
    auth: {
      getSession: async () => ({ data: { session: backend.session } }),
      onAuthStateChange: (callback: unknown) => { backend.authChange = callback; return { data: { subscription: { unsubscribe: () => {} } } } },
      signOut: async () => { (backend.authChange as (event: string, session: null) => void)('SIGNED_OUT', null); return { error: null } },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: structuredClone(backend.row), error: null }) }) }), delete: () => ({ eq: backend.delete }) }),
    rpc: backend.rpc,
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
  backend.rpc.mockReset()
  backend.delete.mockReset().mockResolvedValue({ error: null })
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
 expect(backend.invoke).toHaveBeenCalledWith('delete-account',{body:{confirmation:'DELETE_MY_ACCOUNT'}})
 expect(useAppStore.getState().records).toHaveLength(0)
})

import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createEmptyAppData } from '../storage/appData'
import { seedRecords } from '../mocks/records'
import { readRemote, writeRemote } from './remoteData'
import { createSyncBaseline, findSyncConflicts, hashAppData, mergeAppData } from './syncCore'

// Two independent device states against a compare-and-swap RPC, including stale writes.
describe('两台设备版本同步', () => {
  it('读取旧完成草稿返回迁移后的hash及必须先归档的标记', async () => {
    const now = '2026-10-12T04:00:00.000Z'
    const payload = { ...createEmptyAppData(), drafts: [{ id: 'legacy', type: 'meihua' as const, profileId: 'guest', question: '旧结果', createdAt: now, updatedAt: now, state: { locked: true, lockedAt: now, method: 'time' as const } }] }
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { payload, updated_at: now, version: 3 }, error: null }) }) }) }) } as unknown as SupabaseClient
    const remote = await readRemote(client, 'u')
    expect(remote?.payload.records).toHaveLength(1)
    expect(remote?.requiresDraftMigration).toBe(true)
    expect(remote?.dataHash).toBe(hashAppData(remote!.payload))
    expect(remote?.dataHash).not.toBe(hashAppData(payload))
    expect(payload.drafts[0].state).not.toHaveProperty('recordId')
  })
  it('旧完成草稿无法转换时读取失败，不能继续上传而丢弃原始来源', async () => {
    const now = '2026-10-12T04:00:00.000Z'
    const payload = { ...createEmptyAppData(), drafts: [{ id: 'broken', type: 'meihua' as const, profileId: 'guest', question: '旧结果', createdAt: now, updatedAt: now, state: { locked: true, lockedAt: now, method: 'specified_time' as const } }] }
    const before = structuredClone(payload)
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { payload, updated_at: now, version: 3 }, error: null }) }) }) }) } as unknown as SupabaseClient
    await expect(readRemote(client, 'u')).rejects.toThrow('旧版结果尚未完成迁移')
    expect(payload).toEqual(before)
  })
  it('拒绝旧版本写入，合并不同记录后重试无丢失', async () => {
    let version = 0
    let cloud = createEmptyAppData()
    const client = { rpc: async (_name: string, args: { p_expected_version: number; p_payload: typeof cloud }) => {
      if (args.p_expected_version !== version) return { data: null, error: { code: 'P0001', message: 'version_conflict' } }
      cloud = { ...createEmptyAppData(), ...structuredClone(args.p_payload) }; version++
      return { data: version, error: null }
    } } as unknown as SupabaseClient
    const a = createEmptyAppData(), b = createEmptyAppData()
    const baseline = createSyncBaseline(a)
    a.records.push({ ...seedRecords[0], id: 'a' })
    expect((await writeRemote(client, a, 0)).version).toBe(1)
    b.records.push({ ...seedRecords[0], id: 'b' })
    await expect(writeRemote(client, b, 0)).rejects.toMatchObject({ message: 'version_conflict' })
    expect(findSyncConflicts(b, cloud, baseline)).toEqual([])
    const merged = mergeAppData(b, cloud, baseline)
    expect((await writeRemote(client, merged, 1)).version).toBe(2)
    expect(cloud.records.map((r) => r.id).sort()).toEqual(['a', 'b'])
    expect(cloud).not.toHaveProperty('activeProfileId', 'nonlocal')
  })
})

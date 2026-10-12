import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createEmptyAppData } from '../storage/appData'
import { seedRecords } from '../mocks/records'
import { writeRemote } from './remoteData'
import { createSyncBaseline, findSyncConflicts, mergeAppData } from './syncCore'

// Two independent device states against a compare-and-swap RPC, including stale writes.
describe('两台设备版本同步', () => {
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

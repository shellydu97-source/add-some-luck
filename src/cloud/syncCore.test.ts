import { describe, expect, it } from 'vitest'
import type { AppDataState } from '../models/types'
import { decideInitialSync, hashAppData, mergeAppData } from './syncCore'

function data(overrides: Partial<AppDataState> = {}): AppDataState {
  return {
    schemaVersion: '1.3', tombstones: { profiles: {}, records: {}, drafts: {} }, lastPrimaryRoute: 'charts', reduceMotion: false,
    activeProfileId: '', profiles: [], records: [], drafts: [], ...overrides,
  }
}

describe('云端同步决策', () => {
  it('同一账号云端没有数据时上传自己的本机数据', () => {
    const local = data()
    expect(decideInitialSync({ userId: 'u1', local, localHash: hashAppData(local), localOwnerId: 'u1' })).toBe('upload')
  })

  it('新账号绝不继承浏览器里其他账号或访客的数据', () => {
    const local = data({ profiles: [{ id: 'someone-else' } as AppDataState['profiles'][number]] })
    expect(decideInitialSync({ userId: 'u2', local, localHash: hashAppData(local), localOwnerId: 'u1' })).toBe('initialize')
    expect(decideInitialSync({ userId: 'u2', local, localHash: hashAppData(local), localOwnerId: 'guest' })).toBe('initialize')
  })

  it('新设备本机为空时下载云端数据', () => {
    const local = data()
    expect(decideInitialSync({ userId: 'u1', local, localHash: hashAppData(local), remoteHash: 'remote', localOwnerId: 'guest' })).toBe('download')
  })

  it('同一账号的本机和云端都变化时自动合并', () => {
    const local = data({ reduceMotion: true })
    expect(decideInitialSync({
      userId: 'u1', local, localHash: hashAppData(local), remoteHash: 'remote-new',
      localOwnerId: 'u1',
      meta: { userId: 'u1', lastSyncedHash: 'old', lastSyncedAt: '2026-07-17T00:00:00.000Z', dirty: true },
    })).toBe('merge')
  })

  it('新设备登录已有账号时直接以云端数据为准', () => {
    const local = data({ profiles: [{ id: 'browser-cache' } as AppDataState['profiles'][number]] })
    expect(decideInitialSync({
      userId: 'u1', local, localHash: hashAppData(local), remoteHash: 'remote',
      localOwnerId: 'browser-cache-owner',
    })).toBe('download')
  })

  it('只有本机在上次同步后变化时自动上传', () => {
    const local = data({ reduceMotion: true })
    expect(decideInitialSync({
      userId: 'u1', local, localHash: 'local-new', remoteHash: 'synced',
      localOwnerId: 'u1',
      meta: { userId: 'u1', lastSyncedHash: 'synced', lastSyncedAt: '2026-07-17T00:00:00.000Z', dirty: true },
    })).toBe('upload')
  })

  it('只有云端在上次同步后变化时自动下载', () => {
    const local = data()
    expect(decideInitialSync({
      userId: 'u1', local, localHash: 'synced', remoteHash: 'remote-new',
      localOwnerId: 'u1',
      meta: { userId: 'u1', lastSyncedHash: 'synced', lastSyncedAt: '2026-07-17T00:00:00.000Z', dirty: false },
    })).toBe('download')
  })

  it('散列不受对象字段顺序影响', () => {
    const left = data()
    const right = { tombstones: { profiles: {}, records: {}, drafts: {} }, records: [], profiles: [], drafts: [], activeProfileId: '', reduceMotion: false, lastPrimaryRoute: 'charts', schemaVersion: '1.3' } as AppDataState
    expect(hashAppData(left)).toBe(hashAppData(right))
  })
})

describe('自动合并', () => {
  it('合并不同设备的人物和记录且保留本机偏好', () => {
    const local = data({ reduceMotion: true, lastPrimaryRoute: 'records', profiles: [{ id: 'local', updatedAt: '2026-07-17', createdAt: '2026-07-17' } as AppDataState['profiles'][number]] })
    const remote = data({ profiles: [{ id: 'remote', updatedAt: '2026-07-16', createdAt: '2026-07-16' } as AppDataState['profiles'][number]] })
    const merged = mergeAppData(local, remote)
    expect(merged.profiles.map((profile) => profile.id)).toEqual(['remote', 'local'])
    expect(merged.reduceMotion).toBe(true)
    expect(merged.lastPrimaryRoute).toBe('records')
  })

  it('自动合并同一记录两端新增的解读与追问，不覆盖原始结果', () => {
    const baseRecord = {
      id: 'record-1', type: 'liuyao', profileId: 'guest', profileNameSnapshot: '未关联人物',
      question: '这件事怎么推进', createdAt: '2026-07-17T00:00:00.000Z',
      rawResult: { originalHexagram: '地山谦' }, calculationVersion: '1', ruleVersion: '1',
      interpretation: {
        headline: '保持谦逊，稳步推进', conclusion: '当前适合循序渐进。', evidence: [],
        support: [], conflicts: [], uncertainty: '仍需结合现实进展观察。', advice: [],
      },
      followUpMessages: [], verificationStatus: 'pending',
    } as AppDataState['records'][number]
    const local = data({ records: [{
      ...baseRecord,
      aiMessages: [{ id: 'local-message', role: 'user', content: '本机追问', createdAt: '2026-07-17T01:00:00.000Z' }],
    }] })
    const remote = data({ records: [{
      ...baseRecord,
      aiMessages: [{ id: 'remote-message', role: 'assistant', content: '云端回答', createdAt: '2026-07-17T01:01:00.000Z' }],
      notes: '云端备注',
    }] })
    const merged = mergeAppData(local, remote)
    expect(merged.records[0].rawResult).toEqual(baseRecord.rawResult)
    expect(merged.records[0].aiMessages?.map((message) => message.id).sort()).toEqual(['local-message', 'remote-message'])
    expect(merged.records[0].notes).toBe('云端备注')
  })
})

import { createSyncBaseline, findSyncConflicts, pickSyncData, pruneTombstones } from './syncCore'
import { migrateToV13 } from '../storage/migrations'
import { seedRecords } from '../mocks/records'
import { createEmptyAppData } from '../storage/appData'
import { parseImport, serializeExport } from '../storage/dataTransfer'

const NOW = '2026-10-12T04:00:00.000Z'
function record(id: string) { return { ...seedRecords[0], id, createdAt: '2026-10-01T04:00:00.000Z', metaUpdatedAt: '2026-10-01T04:00:00.000Z' } }
describe('1.3 安全合并', () => {
  it('删除标记阻止人物、记录和草稿复活', () => {
    const remote = data({ records: [record('r')], profiles: [{ id: 'p', createdAt: '2026-10-01', updatedAt: '2026-10-01' } as AppDataState['profiles'][number]], drafts: [{ id: 'd', createdAt: '2026-10-01', updatedAt: '2026-10-01' } as AppDataState['drafts'][number]] })
    const local = data({ tombstones: { profiles: { p: NOW }, records: { r: NOW }, drafts: { d: NOW } } })
    const merged = mergeAppData(local, remote)
    expect(merged.profiles).toEqual([]); expect(merged.records).toEqual([]); expect(merged.drafts).toEqual([])
    expect(merged.tombstones).toEqual(local.tombstones)
  })
  it('不同记录可自动合并，同一记录同一验证字段两端修改会冲突', () => {
    const base = data({ records: [record('a'), record('b')] }), baseline = createSyncBaseline(base)
    const local = structuredClone(base), remote = structuredClone(base)
    local.records[0].notes = '本机'; local.records[0].metaUpdatedAt = NOW
    remote.records[1].notes = '云端'; remote.records[1].metaUpdatedAt = NOW
    expect(findSyncConflicts(local, remote, baseline)).toEqual([])
    const merged = mergeAppData(local, remote, baseline)
    expect(merged.records.find((r) => r.id === 'a')?.notes).toBe('本机')
    expect(merged.records.find((r) => r.id === 'b')?.notes).toBe('云端')
    remote.records[0].notes = '云端同一字段'
    expect(findSyncConflicts(local, remote, baseline)).toEqual(['records:a:notes'])
    expect(merged.records[0].rawResult).toEqual(base.records[0].rawResult)
  })
  it('同一记录分别修改不同字段时两边均保留', () => {
    const base = data({ records: [record('a')] }), baseline = createSyncBaseline(base)
    const local = structuredClone(base), remote = structuredClone(base)
    local.records[0].notes = '本机备注'; local.records[0].metaUpdatedAt = NOW
    remote.records[0].verificationResult = '已发生'; remote.records[0].metaUpdatedAt = '2026-10-12T05:00:00.000Z'
    expect(findSyncConflicts(local, remote, baseline)).toEqual([])
    expect(mergeAppData(local, remote, baseline).records[0]).toMatchObject({ notes: '本机备注', verificationResult: '已发生' })
  })
  it('清理超过180天的删除标记，保留新标记', () => {
    expect(pruneTombstones({ profiles: { old: '2026-01-01T00:00:00Z', new: NOW }, records: {}, drafts: {} }, Date.parse(NOW))).toEqual({ profiles: { new: NOW }, records: {}, drafts: {} })
  })
  it('导航、动态效果和当前人物不参与同步散列或上传', () => {
    const base = data(), changed = { ...base, activeProfileId: 'another', reduceMotion: true, lastPrimaryRoute: 'records' as const }
    expect(hashAppData(base)).toBe(hashAppData(changed))
    expect(pickSyncData(changed)).not.toHaveProperty('lastPrimaryRoute')
    expect(pickSyncData(changed)).not.toHaveProperty('reduceMotion')
    expect(pickSyncData(changed)).not.toHaveProperty('activeProfileId')
  })
  it('1.2 备份迁移并完整保留原始结果、旧牌义及六爻来源', () => {
    const migrated = migrateToV13({ ...createEmptyAppData(), schemaVersion: '1.2', tombstones: undefined, records: [record('a')] })
    expect(migrated.schemaVersion).toBe('1.3')
    expect(migrated.tombstones).toEqual({ profiles: {}, records: {}, drafts: {} })
    expect(migrated.records[0].rawResult).toEqual(record('a').rawResult)
    expect(parseImport(serializeExport(migrated))).toEqual(migrated)
  })
})

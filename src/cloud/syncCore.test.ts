import { describe, expect, it } from 'vitest'
import type { AppDataState } from '../models/types'
import { decideInitialSync, hashAppData, mergeAppData } from './syncCore'

function data(overrides: Partial<AppDataState> = {}): AppDataState {
  return {
    schemaVersion: '1.2', lastPrimaryRoute: 'charts', reduceMotion: false,
    activeProfileId: '', profiles: [], records: [], drafts: [], ...overrides,
  }
}

describe('云端同步决策', () => {
  it('云端没有数据时上传本机数据', () => {
    const local = data()
    expect(decideInitialSync({ userId: 'u1', local, localHash: hashAppData(local) })).toBe('upload')
  })

  it('新设备本机为空时下载云端数据', () => {
    const local = data()
    expect(decideInitialSync({ userId: 'u1', local, localHash: hashAppData(local), remoteHash: 'remote' })).toBe('download')
  })

  it('同一账号的本机和云端都变化时自动合并', () => {
    const local = data({ reduceMotion: true })
    expect(decideInitialSync({
      userId: 'u1', local, localHash: hashAppData(local), remoteHash: 'remote-new',
      meta: { userId: 'u1', lastSyncedHash: 'old', lastSyncedAt: '2026-07-17T00:00:00.000Z', dirty: true },
    })).toBe('merge')
  })

  it('新设备登录已有账号时直接以云端数据为准', () => {
    const local = data({ profiles: [{ id: 'browser-cache' } as AppDataState['profiles'][number]] })
    expect(decideInitialSync({
      userId: 'u1', local, localHash: hashAppData(local), remoteHash: 'remote',
    })).toBe('download')
  })

  it('只有本机在上次同步后变化时自动上传', () => {
    const local = data({ reduceMotion: true })
    expect(decideInitialSync({
      userId: 'u1', local, localHash: 'local-new', remoteHash: 'synced',
      meta: { userId: 'u1', lastSyncedHash: 'synced', lastSyncedAt: '2026-07-17T00:00:00.000Z', dirty: true },
    })).toBe('upload')
  })

  it('只有云端在上次同步后变化时自动下载', () => {
    const local = data()
    expect(decideInitialSync({
      userId: 'u1', local, localHash: 'synced', remoteHash: 'remote-new',
      meta: { userId: 'u1', lastSyncedHash: 'synced', lastSyncedAt: '2026-07-17T00:00:00.000Z', dirty: false },
    })).toBe('download')
  })

  it('散列不受对象字段顺序影响', () => {
    const left = data()
    const right = { records: [], profiles: [], drafts: [], activeProfileId: '', reduceMotion: false, lastPrimaryRoute: 'charts', schemaVersion: '1.2' } as AppDataState
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

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

  it('本机和云端都变化时要求用户选择，不静默覆盖', () => {
    const local = data({ reduceMotion: true })
    expect(decideInitialSync({
      userId: 'u1', local, localHash: hashAppData(local), remoteHash: 'remote-new',
      meta: { userId: 'u1', lastSyncedHash: 'old', lastSyncedAt: '2026-07-17T00:00:00.000Z', dirty: true },
    })).toBe('conflict')
  })

  it('散列不受对象字段顺序影响', () => {
    const left = data()
    const right = { records: [], profiles: [], drafts: [], activeProfileId: '', reduceMotion: false, lastPrimaryRoute: 'charts', schemaVersion: '1.2' } as AppDataState
    expect(hashAppData(left)).toBe(hashAppData(right))
  })
})

describe('用户确认合并', () => {
  it('合并不同设备的人物和记录且保留本机偏好', () => {
    const local = data({ reduceMotion: true, lastPrimaryRoute: 'records', profiles: [{ id: 'local', updatedAt: '2026-07-17', createdAt: '2026-07-17' } as AppDataState['profiles'][number]] })
    const remote = data({ profiles: [{ id: 'remote', updatedAt: '2026-07-16', createdAt: '2026-07-16' } as AppDataState['profiles'][number]] })
    const merged = mergeAppData(local, remote)
    expect(merged.profiles.map((profile) => profile.id)).toEqual(['remote', 'local'])
    expect(merged.reduceMotion).toBe(true)
    expect(merged.lastPrimaryRoute).toBe('records')
  })
})

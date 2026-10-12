import { beforeEach, describe, expect, it } from 'vitest'
import { migratePersistedState, useAppStore } from './store'
import { getStorageRecoveryInfo, resetProtectedStorage, safeLocalStorage } from './persistence'
import { seedProfiles } from '../mocks/profiles'
import { seedRecords } from '../mocks/records'

describe('V1 / V1.1 本地数据迁移', () => {
  beforeEach(() => {
    resetProtectedStorage('broken-state')
    localStorage.clear()
  })

  it('保留人物、记录与旧六爻草稿并升级到 schemaVersion 1.2', () => {
    const migrated = migratePersistedState({
      profiles: seedProfiles,
      records: seedRecords,
      activeProfileId: 'profile-self',
      liuyaoDraft: { question: '测试', category: '其他', timeRange: '', seed: 'fixed', casts: [] },
    })
    expect(migrated.schemaVersion).toBe('1.3')
    expect(migrated.profiles.map((profile) => profile.id)).toEqual(seedProfiles.map((profile) => profile.id))
    expect(migrated.records.map((record) => record.id)).toEqual(seedRecords.map((record) => record.id))
    expect(migrated.drafts).toHaveLength(1)
    expect(migrated.drafts[0]).toMatchObject({ type: 'liuyao', question: '测试', state: { legacyImported: true } })
    expect(migrated.lastPrimaryRoute).toBe('charts')
  })

  it('兼容 lastPrimaryNav 并保留已有记录导航', () => {
    expect(migratePersistedState({ lastPrimaryNav: 'records' }).lastPrimaryRoute).toBe('records')
  })

  it('新用户默认关闭降低动态效果，旧用户设置保持不变', () => {
    expect(migratePersistedState({}).reduceMotion).toBe(false)
    expect(migratePersistedState({ reduceMotion: true }).reduceMotion).toBe(true)
  })

  it('现有六爻草稿把旧正反字段迁移为阴阳面且保留已起爻', () => {
    const migrated = migratePersistedState({
      drafts: [{
        id: 'old-draft', type: 'liuyao', profileId: 'guest', question: '', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
        state: { timeRange: '', casts: [{ coins: ['heads', 'tails', 'heads'] }], locked: false },
      }],
    })
    expect(migrated.drafts[0]).toMatchObject({ type: 'liuyao', state: { casts: [{ coins: ['yang', 'yin', 'yang'] }] } })
  })

  it('旧人物只有地点文本时保持待确认，不从文本猜测坐标', () => {
    const migrated = migratePersistedState({ profiles: [{ id: 'old', name: '旧人物', birthPlace: '杭州市' }] })
    expect(migrated.profiles[0]).toMatchObject({ birthPlaceText: '杭州市' })
    expect(migrated.profiles[0]?.birthLocation).toBeUndefined()
  })

  it('保留已确认城市的来源、版本与坐标', () => {
    const birthLocation = { canonicalName: '上海市', province: '上海市', city: '上海市', latitude: 31.22222, longitude: 121.45806, ianaTimeZone: 'Asia/Shanghai', coordinateSource: 'GeoNames CN country dump', coordinateDataVersion: 'test-v1', userConfirmed: true }
    const migrated = migratePersistedState({ profiles: [{ id: 'confirmed', name: '已确认', birthPlaceText: '上海市', birthLocation }] })
    expect(migrated.profiles[0]?.birthLocation).toEqual(birthLocation)
  })

  it('损坏 JSON 会保留原始备份并进入保护状态', () => {
    localStorage.setItem('broken-state', '{not-json')
    expect(safeLocalStorage.getItem('broken-state')).toBeNull()
    const backupKey = Object.keys(localStorage).find((key) => key.startsWith('broken-state-corrupt-backup-'))
    expect(backupKey).toBeTruthy()
    expect(localStorage.getItem(backupKey!)).toBe('{not-json')
    expect(getStorageRecoveryInfo()).toMatchObject({ kind: 'corrupt', raw: '{not-json' })
  })
})

describe('不可变记录快照', () => {
  it('验证更新不会覆盖原始结果、人物快照、问题和创建时间', () => {
    const original = structuredClone(seedRecords[0])
    useAppStore.setState({ records: [original] })
    useAppStore.getState().updateRecordVerification(original.id, {
      verificationStatus: 'matched', verificationDate: '2026/08/01', verificationResult: '实际结果', notes: '复盘备注',
    })
    const updated = useAppStore.getState().records[0]
    expect(updated.rawResult).toEqual(original.rawResult)
    expect(updated.profileSnapshot).toEqual(original.profileSnapshot)
    expect(updated.question).toBe(original.question)
    expect(updated.createdAt).toBe(original.createdAt)
    expect(updated).toMatchObject({ verificationStatus: 'matched', verificationResult: '实际结果', notes: '复盘备注' })
  })

  it('追加智能解读和追问时不会覆盖原始快照', () => {
    const original = structuredClone(seedRecords[0])
    useAppStore.setState({ records: [original] })
    useAppStore.getState().appendRecordAiInterpretation(original.id, {
      id: 'ai-1', module: original.type, question: original.question ?? '', createdAt: '2026-07-15T00:00:00.000Z',
      provider: 'deepseek', model: 'deepseek-v4-flash', promptVersion: 'ai-reading-v1.0.0',
      directAnswer: '先看事实。', summary: '保持克制。', sections: [], uncertainty: [], advice: [], suggestedQuestions: [],
    })
    useAppStore.getState().appendRecordAiMessages(original.id, [{
      id: 'message-1', role: 'user', content: '为什么？', createdAt: '2026-07-15T00:01:00.000Z',
    }])
    const updated = useAppStore.getState().records[0]
    expect(updated.rawResult).toEqual(original.rawResult)
    expect(updated.profileSnapshot).toEqual(original.profileSnapshot)
    expect(updated.question).toBe(original.question)
    expect(updated.createdAt).toBe(original.createdAt)
    expect(updated.aiInterpretations).toHaveLength(1)
    expect(updated.aiMessages).toHaveLength(1)
  })

  it('用户明确删除记录时移除快照，并清理草稿中的旧记录引用', () => {
    const original = structuredClone(seedRecords[0])
    useAppStore.setState({
      records: [original],
      drafts: [{
        id: 'draft-with-record', type: 'tarot', profileId: 'guest', question: '', createdAt: '2026-07-15T00:00:00.000Z', updatedAt: '2026-07-15T00:00:00.000Z',
        state: { isChoice: false, phase: 'revealed', deckOrder: [], orientations: {}, selected: [], cursor: 0, revealed: true, recordId: original.id },
      }],
    })
    useAppStore.getState().deleteRecord(original.id)
    expect(useAppStore.getState().records).toHaveLength(0)
    expect(useAppStore.getState().drafts[0]?.state.recordId).toBeUndefined()
  })

  it('批量删除只移除选中记录，并同时清理对应草稿引用', () => {
    const first = structuredClone(seedRecords[0])
    const second = { ...structuredClone(seedRecords[1]), id: 'record-keep' }
    useAppStore.setState({
      records: [first, second],
      drafts: [{
        id: 'draft-with-batch-record', type: 'tarot', profileId: 'guest', question: '', createdAt: '2026-07-15T00:00:00.000Z', updatedAt: '2026-07-15T00:00:00.000Z',
        state: { isChoice: false, phase: 'revealed', deckOrder: [], orientations: {}, selected: [], cursor: 0, revealed: true, recordId: first.id },
      }],
    })
    useAppStore.getState().deleteRecords([first.id])
    expect(useAppStore.getState().records.map((record) => record.id)).toEqual(['record-keep'])
    expect(useAppStore.getState().drafts[0]?.state.recordId).toBeUndefined()
  })
})

describe('人物切换', () => {
  it('新建人物后立即切换到新人物', () => {
    useAppStore.setState({ profiles: [structuredClone(seedProfiles[0])], activeProfileId: seedProfiles[0].id })
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = structuredClone(seedProfiles[1])
    const newId = useAppStore.getState().saveProfile({ ...input, name: '新人物', isDefault: false })
    expect(_id).toBe('profile-friend')
    expect(_createdAt).toBeTruthy()
    expect(_updatedAt).toBeTruthy()
    expect(useAppStore.getState().activeProfileId).toBe(newId)
  })
})

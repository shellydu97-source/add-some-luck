import { beforeEach, describe, expect, it } from 'vitest'
import { createCastFromValues } from '../calculation/liuyao'
import { pickSyncData } from '../cloud/syncCore'
import { createEmptyAppData } from '../storage/appData'
import { useAppStore } from '../storage/store'
import { adoptDraftResults, saveCompletedDrafts, saveDivinationRecord } from './divinationRecords'

const now = '2026-10-12T04:00:00.000Z'
const lockedLiuyao = { id: 'done', type: 'liuyao' as const, profileId: 'guest', question: '面试能过吗？', category: '工作 / 事业', createdAt: now, updatedAt: now, state: { timeRange: '', casts: createCastFromValues([8, 8, 8, 6, 7, 9]), locked: true, lockedAt: now } }
const openMeihua = { id: 'open', type: 'meihua' as const, profileId: 'guest', question: '还在起卦', createdAt: now, updatedAt: now, state: { locked: false } }

beforeEach(() => useAppStore.getState().replaceAllData(createEmptyAppData()))

describe('finished divinations become records automatically', () => {
  it('saving the same draft twice keeps a single record', () => {
    useAppStore.setState({ drafts: [structuredClone(lockedLiuyao)] })
    const first = saveDivinationRecord('done')
    const second = saveDivinationRecord('done')
    expect(first).toBeTruthy()
    expect(second).toBe(first)
    expect(useAppStore.getState().records).toHaveLength(1)
    expect(useAppStore.getState().records[0].question).toBe('面试能过吗？')
  })
  it('turns finished legacy drafts into records and leaves in-progress flows alone', () => {
    useAppStore.setState({ drafts: [structuredClone(lockedLiuyao), structuredClone(openMeihua)] })
    expect(saveCompletedDrafts()).toHaveLength(1)
    expect(useAppStore.getState().records).toHaveLength(1)
    expect(useAppStore.getState().drafts.find((d) => d.id === 'done')?.state.recordId).toBe(useAppStore.getState().records[0].id)
    expect(saveDivinationRecord('open')).toBeUndefined()
  })
  it('in-progress flows are not part of cloud sync data', () => {
    useAppStore.setState({ drafts: [structuredClone(openMeihua)] })
    expect(pickSyncData(useAppStore.getState())).not.toHaveProperty('drafts')
  })
  it('two devices adopting the same legacy draft get one identical record', () => {
    const data = { ...createEmptyAppData(), drafts: [{ ...structuredClone(lockedLiuyao), ai: { question: '', interpretations: [], messages: [{ id: 'm', role: 'user' as const, content: '问一句', createdAt: now }] } }, structuredClone(openMeihua)] }
    const first = adoptDraftResults(structuredClone(data))
    const second = adoptDraftResults(structuredClone(data))
    expect(first.records).toHaveLength(1)
    expect(second.records[0].id).toBe(first.records[0].id)
    expect(first.records[0].createdAt).toBe(now)
    expect(first.records[0].aiMessages).toHaveLength(1)
    expect(adoptDraftResults(first)).toBe(first)
  })
  it('a legacy result deleted on another device is not brought back', () => {
    const data = { ...createEmptyAppData(), drafts: [structuredClone(lockedLiuyao)] }
    const id = adoptDraftResults(structuredClone(data)).records[0].id
    const deleted = adoptDraftResults({ ...data, tombstones: { profiles: {}, records: { [id]: '2026-10-13T00:00:00.000Z' }, drafts: {} } })
    expect(deleted.records).toEqual([])
    expect((deleted.drafts[0].state as { recordId?: string }).recordId).toBe(id)
  })
})

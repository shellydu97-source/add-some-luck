import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AiConversationMessage, AiInterpretationSnapshot, AppDataState, DivinationDraft, FollowUpMessage, PrimaryNav, Profile, RecordSnapshot, VerificationStatus } from '../models/types'
import { makeId } from '../utils/id'
import { normalizeQuestion } from '../utils/text'
import { migrateToV12 } from './migrations'
import { getStorageRecoveryInfo, protectStorageAfterMigrationFailure, resetProtectedStorage, safeLocalStorage, type StorageRecoveryInfo } from './persistence'

export const STORAGE_KEY = 'add-luck-v1-demo'

interface VerificationPatch {
  verificationStatus: VerificationStatus
  verificationDate?: string
  verificationResult?: string
  notes?: string
}

interface AppState extends AppDataState {
  notice: string
  storageRecovery?: StorageRecoveryInfo
  hasHydrated: boolean
  setNotice: (notice: string) => void
  dismissStorageRecovery: () => void
  finishHydration: () => void
  setLastPrimaryRoute: (route: PrimaryNav) => void
  setReduceMotion: (value: boolean) => void
  setActiveProfile: (id: string) => void
  saveProfile: (profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string
  deleteProfile: (id: string) => void
  setDefaultProfile: (id: string) => void
  createRecordSnapshot: (record: RecordSnapshot) => void
  deleteRecord: (id: string) => void
  deleteRecords: (ids: string[]) => void
  appendRecordFollowUps: (id: string, messages: FollowUpMessage[]) => void
  appendRecordAiInterpretation: (id: string, interpretation: AiInterpretationSnapshot) => void
  appendRecordAiMessages: (id: string, messages: AiConversationMessage[]) => void
  updateRecordVerification: (id: string, patch: VerificationPatch) => void
  setLiuyaoUseGodOverride: (id: string, useGod: RecordSnapshot['liuyaoUseGodOverride']) => void
  findDuplicate: (profileId: string, type: 'liuyao' | 'meihua' | 'tarot', question: string) => RecordSnapshot | undefined
  upsertDraft: (draft: DivinationDraft) => void
  deleteDraft: (id: string) => void
  replaceAllData: (data: AppDataState) => void
  restoreCloudData: (data: AppDataState) => void
  clearAllData: () => void
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T
}

const emptyData: AppDataState = {
  schemaVersion: '1.3', tombstones: { profiles: {}, records: {}, drafts: {} }, lastPrimaryRoute: 'charts', reduceMotion: false,
  activeProfileId: '', profiles: [], records: [], drafts: [],
}

export function migratePersistedState(persisted: unknown): AppDataState {
  return migrateToV12(persisted)
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  ...emptyData,
  notice: '', storageRecovery: undefined, hasHydrated: false,
  setNotice: (notice) => set({ notice }),
  dismissStorageRecovery: () => set({ storageRecovery: undefined }),
  finishHydration: () => set({ hasHydrated: true }),
  setLastPrimaryRoute: (lastPrimaryRoute) => set({ lastPrimaryRoute }),
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  setActiveProfile: (activeProfileId) => set({ activeProfileId }),
  saveProfile: (input) => {
    const id = input.id ?? makeId('profile')
    const now = new Date().toISOString()
    set((state) => {
      const existing = state.profiles.find((item) => item.id === id)
      const profile: Profile = {
        ...clone(input), id, createdAt: existing?.createdAt ?? now, updatedAt: now,
        isDefault: state.profiles.length === 0 ? true : input.isDefault,
      }
      let profiles = existing ? state.profiles.map((item) => item.id === id ? profile : item) : [...state.profiles, profile]
      if (profile.isDefault) profiles = profiles.map((item) => ({ ...item, isDefault: item.id === id }))
      return { profiles, activeProfileId: id }
    })
    return id
  },
  deleteProfile: (id) => set((state) => {
    const target = state.profiles.find((item) => item.id === id)
    let profiles = state.profiles.filter((item) => item.id !== id)
    let activeProfileId = state.activeProfileId === id ? profiles[0]?.id ?? '' : state.activeProfileId
    let notice = `${target?.name ?? '人物'}已删除，历史记录快照未修改。`
    if (target?.isDefault && profiles.length) {
      profiles = profiles.map((item, index) => ({ ...item, isDefault: index === 0 }))
      activeProfileId = profiles[0].id
      notice += ` ${profiles[0].name}已自动设为默认人物。`
    }
    return { profiles, activeProfileId, notice, tombstones: { ...state.tombstones, profiles: { ...state.tombstones.profiles, [id]: new Date().toISOString() } } }
  }),
  setDefaultProfile: (id) => set((state) => ({
    profiles: state.profiles.map((item) => ({ ...item, isDefault: item.id === id, updatedAt: item.isDefault !== (item.id === id) ? new Date().toISOString() : item.updatedAt })), activeProfileId: id,
    notice: `${state.profiles.find((item) => item.id === id)?.name ?? '人物'}已设为默认人物。`,
  })),
  createRecordSnapshot: (record) => set((state) => state.records.some((item) => item.id === record.id)
    ? { notice: '记录快照已存在，原始内容未覆盖。' }
    : { records: [clone(record), ...state.records], notice: '已保存不可变记录快照。' }),
  deleteRecord: (id) => set((state) => ({
    records: state.records.filter((item) => item.id !== id),
    tombstones: { ...state.tombstones, records: { ...state.tombstones.records, [id]: new Date().toISOString() } },
    drafts: state.drafts.map((draft) => draft.state.recordId === id
      ? { ...draft, state: { ...draft.state, recordId: undefined } } as DivinationDraft
      : draft),
    notice: '记录已删除。',
  })),
  deleteRecords: (ids) => set((state) => {
    const targets = new Set(ids)
    if (!targets.size) return {}
    return {
      records: state.records.filter((item) => !targets.has(item.id)),
      tombstones: { ...state.tombstones, records: { ...state.tombstones.records, ...Object.fromEntries(ids.map((id) => [id, new Date().toISOString()])) } },
      drafts: state.drafts.map((draft) => draft.state.recordId && targets.has(draft.state.recordId)
        ? { ...draft, state: { ...draft.state, recordId: undefined } } as DivinationDraft
        : draft),
      notice: `已删除 ${targets.size} 条记录。`,
    }
  }),
  appendRecordFollowUps: (id, messages) => set((state) => ({
    records: state.records.map((item) => item.id === id ? { ...item, followUpMessages: [...item.followUpMessages, ...clone(messages)] } : item),
  })),
  appendRecordAiInterpretation: (id, interpretation) => set((state) => ({
    records: state.records.map((item) => item.id === id
      ? { ...item, aiInterpretations: [...(item.aiInterpretations ?? []), clone(interpretation)] }
      : item),
  })),
  appendRecordAiMessages: (id, messages) => set((state) => ({
    records: state.records.map((item) => item.id === id
      ? { ...item, aiMessages: [...(item.aiMessages ?? []), ...clone(messages)] }
      : item),
  })),
  setLiuyaoUseGodOverride: (id, useGod) => set((state) => ({ records: state.records.map(r => r.id === id ? { ...r, liuyaoUseGodOverride: useGod, metaUpdatedAt: new Date().toISOString() } : r) })),
  updateRecordVerification: (id, patch) => set((state) => ({
    records: state.records.map((item) => item.id === id ? { ...item, ...clone(patch), metaUpdatedAt: new Date().toISOString() } : item), notice: '验证与备注已保存。',
  })),
  findDuplicate: (profileId, type, question) => {
    const normalized = normalizeQuestion(question)
    if (!normalized) return undefined
    const limit = Date.now() - 7 * 24 * 60 * 60 * 1000
    return get().records.find((record) => record.profileId === profileId && record.type === type
      && normalizeQuestion(record.question ?? '') === normalized && new Date(record.createdAt).getTime() >= limit)
  },
  upsertDraft: (draft) => set((state) => ({
    tombstones: { ...state.tombstones, drafts: { ...state.tombstones.drafts, ...Object.fromEntries(state.drafts.filter((item) => item.type === draft.type && item.id !== draft.id).map((item) => [item.id, new Date().toISOString()])) } },
    drafts: state.drafts.some((item) => item.id === draft.id)
      ? state.drafts.map((item) => item.id === draft.id ? clone({ ...draft, updatedAt: new Date().toISOString() }) : item)
      : [clone(draft), ...state.drafts.filter((item) => item.type !== draft.type)],
  })),
  deleteDraft: (id) => set((state) => ({ tombstones: { ...state.tombstones, drafts: { ...state.tombstones.drafts, [id]: new Date().toISOString() } }, drafts: state.drafts.filter((item) => item.id !== id), notice: '未完成流程已删除。' })),
  replaceAllData: (data) => {
    resetProtectedStorage(STORAGE_KEY)
    set({ ...clone(data), storageRecovery: undefined, notice: '数据导入成功。' })
  },
  restoreCloudData: (data) => {
    resetProtectedStorage(STORAGE_KEY)
    set({ ...clone(data), storageRecovery: undefined, notice: '云端数据已更新。' })
  },
  clearAllData: () => {
    resetProtectedStorage(STORAGE_KEY)
    set({ ...emptyData, storageRecovery: undefined, notice: '本地数据已清空。' })
  },
}), {
  name: STORAGE_KEY,
  version: 5,
  storage: createJSONStorage(() => safeLocalStorage),
  migrate: (persistedState) => {
    try { return migrateToV12(persistedState) }
    catch (error) {
      protectStorageAfterMigrationFailure(STORAGE_KEY, `V1.2 数据迁移失败，旧数据未被覆盖：${error instanceof Error ? error.message : '未知错误'}`)
      throw error
    }
  },
  partialize: (state) => ({
    schemaVersion: state.schemaVersion, tombstones: state.tombstones, lastPrimaryRoute: state.lastPrimaryRoute, reduceMotion: state.reduceMotion,
    activeProfileId: state.activeProfileId, profiles: state.profiles, records: state.records, drafts: state.drafts,
  }),
  onRehydrateStorage: () => (state, error) => {
    state?.finishHydration()
    const recovery = getStorageRecoveryInfo()
    if (state && recovery) useAppStore.setState({ storageRecovery: recovery })
    else if (state && error) useAppStore.setState({ storageRecovery: { kind: 'migration', message: '本地数据升级失败，旧数据未被覆盖。', backupKey: '', raw: '' } })
  },
}))

export function getActiveProfile(state: Pick<AppState, 'profiles' | 'activeProfileId'>) {
  return state.profiles.find((profile) => profile.id === state.activeProfileId) ?? state.profiles[0]
}

export function getDraft<T extends DivinationDraft['type']>(state: Pick<AppState, 'drafts'>, type: T) {
  return state.drafts.find((draft): draft is Extract<DivinationDraft, { type: T }> => draft.type === type)
}

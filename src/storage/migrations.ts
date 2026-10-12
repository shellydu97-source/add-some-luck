import type { AppDataState, ConfirmedBirthLocation, DivinationDraft, Interpretation, Profile, RecordSnapshot, TarotSpread, TimeAccuracy, VerificationStatus } from '../models/types'
import { createTarotSession } from '../calculation/tarotMock'
import { makeId } from '../utils/id'
import { appDataSchema } from './schema'

const primaryRoutes = ['charts', 'fortune', 'divination', 'records'] as const
const emptyInterpretation: Interpretation = { headline: '旧版演示记录', conclusion: '', evidence: [], support: [], conflicts: [], uncertainty: '旧版迁移数据', advice: [] }

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function string(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function mapAccuracy(value: unknown): TimeAccuracy {
  const map: Record<string, TimeAccuracy> = {
    minute: 'exact_minute', shichen: 'known_shichen', period: 'approximate_period', unknown: 'unknown',
    exact_minute: 'exact_minute', known_shichen: 'known_shichen', approximate_period: 'approximate_period',
  }
  return map[string(value)] ?? 'unknown'
}

function mapVerification(value: unknown): VerificationStatus {
  const map: Record<string, VerificationStatus> = {
    pending: 'pending', verified: 'matched', matched: 'matched', partial: 'partially_matched',
    partially_matched: 'partially_matched', not_happened: 'not_happened', opposite: 'opposite',
    uncertain: 'unknown', unknown: 'unknown',
  }
  return map[string(value)] ?? 'pending'
}

function migrateConfirmedBirthLocation(value: unknown): ConfirmedBirthLocation | undefined {
  const item = object(value)
  if (item.userConfirmed !== true || item.ianaTimeZone !== 'Asia/Shanghai') return undefined
  if (typeof item.latitude !== 'number' || typeof item.longitude !== 'number') return undefined
  const canonicalName = string(item.canonicalName)
  const province = string(item.province)
  const city = string(item.city)
  const coordinateSource = string(item.coordinateSource)
  const coordinateDataVersion = string(item.coordinateDataVersion)
  if (!canonicalName || !province || !city || !coordinateSource || !coordinateDataVersion) return undefined
  return {
    canonicalName, province, city, latitude: item.latitude, longitude: item.longitude,
    ianaTimeZone: 'Asia/Shanghai', coordinateSource, coordinateDataVersion, userConfirmed: true,
  }
}

function migrateProfile(value: unknown, now: string): Profile {
  const item = object(value)
  const createdAt = string(item.createdAt, now)
  return {
    id: string(item.id, makeId('profile')),
    name: string(item.name, '未命名人物'),
    gender: item.gender === 'male' ? 'male' : 'female',
    relation: ['self', 'family', 'friend', 'partner', 'other'].includes(string(item.relation)) ? item.relation as Profile['relation'] : 'other',
    notes: string(item.notes),
    calendarType: item.calendarType === 'lunar' ? 'lunar' : 'solar',
    rawBirthDate: string(item.rawBirthDate, string(item.birthDate)),
    lunarLeapMonth: item.lunarLeapMonth === true,
    rawBirthTime: string(item.rawBirthTime, string(item.birthTime)),
    normalizedBirthDate: typeof item.normalizedBirthDate === 'string' ? item.normalizedBirthDate : undefined,
    normalizedBirthTime: typeof item.normalizedBirthTime === 'string' ? item.normalizedBirthTime : undefined,
    normalizationStatus: ['unprocessed', 'normalized', 'failed'].includes(string(item.normalizationStatus)) ? item.normalizationStatus as Profile['normalizationStatus'] : 'unprocessed',
    normalizationMessage: string(item.normalizationMessage),
    birthPlaceText: string(item.birthPlaceText, string(item.birthPlace)),
    birthLocation: migrateConfirmedBirthLocation(item.birthLocation),
    countryCode: string(item.countryCode), city: string(item.city),
    latitude: typeof item.latitude === 'number' ? item.latitude : undefined,
    longitude: typeof item.longitude === 'number' ? item.longitude : undefined,
    timezone: string(item.timezone),
    daylightSavingStatus: ['applied', 'not_applied'].includes(string(item.daylightSavingStatus)) ? item.daylightSavingStatus as Profile['daylightSavingStatus'] : 'unknown',
    timeAccuracy: mapAccuracy(item.timeAccuracy),
    useTrueSolarTime: ['on', 'off'].includes(string(item.useTrueSolarTime)) ? item.useTrueSolarTime as 'on' | 'off' : 'system_default',
    dayBoundaryRule: item.dayBoundaryRule === 'zi-23' ? 'zi-23' : 'system_default', houseSystem: 'system_default', unknownTimePolicy: 'time_independent_only',
    isDefault: item.isDefault === true, createdAt, updatedAt: string(item.updatedAt, createdAt),
  }
}

function migrateRecord(value: unknown, now: string): RecordSnapshot {
  const item = object(value)
  const oldSnapshot = object(item.profileSnapshot)
  const name = string(item.profileNameSnapshot, string(oldSnapshot.name, item.profileId === 'guest' ? '未关联人物' : '未知人物'))
  const profileSnapshot = item.profileNameSnapshot
    ? item.profileSnapshot as Partial<Profile> | undefined
    : {
        name,
        rawBirthDate: string(oldSnapshot.birthDate), rawBirthTime: string(oldSnapshot.birthTime),
        timeAccuracy: mapAccuracy(oldSnapshot.timeAccuracy), normalizationStatus: 'unprocessed' as const,
      }
  return {
    liuyaoUseGodOverride: ['父母','兄弟','子孙','妻财','官鬼','世爻','应爻'].includes(string(item.liuyaoUseGodOverride)) ? item.liuyaoUseGodOverride as RecordSnapshot['liuyaoUseGodOverride'] : undefined,
    metaUpdatedAt: typeof item.metaUpdatedAt === 'string' ? item.metaUpdatedAt : undefined,
    id: string(item.id, makeId('record')),
    type: ['bazi', 'astrology', 'liuyao', 'meihua', 'tarot'].includes(string(item.type)) ? item.type as RecordSnapshot['type'] : 'tarot',
    profileId: string(item.profileId, 'guest'), profileNameSnapshot: name, profileSnapshot,
    subjectType: item.subjectType === 'temporary' || item.subjectType === 'profile' ? item.subjectType : undefined,
    question: string(item.question), category: string(item.category), createdAt: string(item.createdAt, now),
    rawResult: object(item.rawResult), calculationVersion: string(item.calculationVersion, 'v1.1-demo'),
    ruleVersion: string(item.ruleVersion, 'v1.1-system-default-demo'), interpretationVersion: string(item.interpretationVersion, 'v1.1-mock'),
    interpretation: object(item.interpretation).headline ? item.interpretation as Interpretation : emptyInterpretation,
    followUpMessages: Array.isArray(item.followUpMessages) ? item.followUpMessages as RecordSnapshot['followUpMessages'] : [],
    aiInterpretations: Array.isArray(item.aiInterpretations) ? item.aiInterpretations as NonNullable<RecordSnapshot['aiInterpretations']> : [],
    aiMessages: Array.isArray(item.aiMessages) ? item.aiMessages as NonNullable<RecordSnapshot['aiMessages']> : [],
    mood: string(item.mood), expectation: string(item.expectation), verificationDate: string(item.verificationDate),
    verificationStatus: mapVerification(item.verificationStatus),
    verificationResult: string(item.verificationResult, string(item.verificationNote)),
    verificationNote: string(item.verificationNote), notes: string(item.notes, string(item.additionalNotes)), demo: item.demo === true,
  }
}

function legacyCoin(value: unknown) {
  return value === 3 || value === 'heads' || value === 'yang' ? 'yang' as const : 'yin' as const
}

function migrateCurrentDraft(value: unknown): DivinationDraft {
  const draft = value as DivinationDraft
  if (draft?.type !== 'liuyao') return draft
  const casts = Array.isArray(draft.state?.casts) ? draft.state.casts.map((cast) => ({
    ...cast, coins: [legacyCoin(cast.coins?.[0]), legacyCoin(cast.coins?.[1]), legacyCoin(cast.coins?.[2])] as ['yang' | 'yin', 'yang' | 'yin', 'yang' | 'yin'],
  })) : []
  return { ...draft, state: { ...draft.state, casts } }
}

function migrateLegacyDrafts(state: Record<string, unknown>, now: string, activeProfileId: string): DivinationDraft[] {
  const drafts: DivinationDraft[] = []
  const profileId = activeProfileId || 'guest'
  if (state.liuyaoDraft) {
    const legacy = object(state.liuyaoDraft)
    const casts = Array.isArray(legacy.casts) ? legacy.casts.map((cast) => {
      const coins = Array.isArray(object(cast).coins) ? object(cast).coins as unknown[] : []
      return { coins: [legacyCoin(coins[0]), legacyCoin(coins[1]), legacyCoin(coins[2])] as ['yang' | 'yin', 'yang' | 'yin', 'yang' | 'yin'] }
    }) : []
    drafts.push({ id: makeId('draft-liuyao-legacy'), type: 'liuyao', profileId, question: string(legacy.question), category: string(legacy.category), createdAt: now, updatedAt: now, randomSeed: string(legacy.seed), state: { timeRange: string(legacy.timeRange), casts, locked: false, legacyImported: true } })
  }
  if (state.tarotDraft) {
    const legacy = object(state.tarotDraft)
    const seed = string(legacy.seed, makeId('tarot-seed'))
    const session = createTarotSession(seed)
    const legacyOrder = Array.isArray(legacy.deckOrder) ? legacy.deckOrder.filter((item): item is number => typeof item === 'number').map((item) => `major-${String(item).padStart(2, '0')}`) : []
    const deckOrder = [...legacyOrder, ...session.deckOrder.filter((id) => !legacyOrder.includes(id))]
    const selected = Array.isArray(legacy.selected) ? legacy.selected.filter((item): item is number => typeof item === 'number').map((item) => `major-${String(item).padStart(2, '0')}`) : []
    const spreadValue = string(legacy.spread)
    const spread = ['single', 'three', 'dual-path'].includes(spreadValue) ? spreadValue as TarotSpread : undefined
    drafts.push({ id: makeId('draft-tarot-legacy'), type: 'tarot', profileId, question: string(legacy.question), category: string(legacy.category), createdAt: now, updatedAt: now, randomSeed: seed, state: { isChoice: legacy.isChoice === true, spread, phase: selected.length ? 'selected' : 'idle', deckOrder, orientations: session.orientations, selected, cursor: 0, revealed: false, legacyImported: true } })
  }
  return drafts
}

export function migrateToV13(persisted: unknown): AppDataState {
  const state = object(persisted)
  const now = new Date().toISOString()
  const profiles = (Array.isArray(state.profiles) ? state.profiles : []).map((item) => migrateProfile(item, now))
  if (profiles.length && !profiles.some((profile) => profile.isDefault)) profiles[0].isDefault = true
  const requestedActive = string(state.activeProfileId)
  const activeProfileId = profiles.some((profile) => profile.id === requestedActive) ? requestedActive : profiles[0]?.id ?? ''
  const records = (Array.isArray(state.records) ? state.records : []).map((item) => migrateRecord(item, now))
  const drafts = Array.isArray(state.drafts) ? state.drafts.map(migrateCurrentDraft) : migrateLegacyDrafts(state, now, activeProfileId)
  const requestedRoute = string(state.lastPrimaryRoute, string(state.lastPrimaryNav, 'charts'))
  const migrated: AppDataState = {
    schemaVersion: '1.3', tombstones: state.tombstones as AppDataState['tombstones'] ?? { profiles: {}, records: {}, drafts: {} }, lastPrimaryRoute: primaryRoutes.includes(requestedRoute as typeof primaryRoutes[number]) ? requestedRoute as AppDataState['lastPrimaryRoute'] : 'charts',
    reduceMotion: state.reduceMotion === true, activeProfileId, profiles, records, drafts,
  }
  appDataSchema.parse(migrated)
  return migrated
}

// Compatibility export for existing consumers; all versions now migrate to 1.3.
export const migrateToV12 = migrateToV13

export type Gender = 'male' | 'female'
export type Relation = 'self' | 'family' | 'friend' | 'partner' | 'other'
export type CalendarType = 'solar' | 'lunar'
export type TimeAccuracy = 'exact_minute' | 'known_shichen' | 'approximate_period' | 'unknown'
export type SystemChoice = 'system_default' | 'on' | 'off'
export type PrimaryNav = 'charts' | 'fortune' | 'divination' | 'records'
export type NormalizationStatus = 'unprocessed' | 'normalized' | 'failed'
export type DaylightSavingStatus = 'unknown' | 'applied' | 'not_applied'

export interface ConfirmedBirthLocation {
  canonicalName: string
  province: string
  city: string
  latitude: number
  longitude: number
  ianaTimeZone: 'Asia/Shanghai'
  coordinateSource: string
  coordinateDataVersion: string
  userConfirmed: true
}

export interface Profile {
  id: string
  name: string
  gender: Gender
  relation: Relation
  notes?: string
  calendarType: CalendarType
  rawBirthDate: string
  lunarLeapMonth: boolean
  rawBirthTime?: string
  normalizedBirthDate?: string
  normalizedBirthTime?: string
  normalizationStatus: NormalizationStatus
  normalizationMessage?: string
  birthPlaceText: string
  birthLocation?: ConfirmedBirthLocation
  countryCode?: string
  city?: string
  latitude?: number
  longitude?: number
  timezone?: string
  daylightSavingStatus: DaylightSavingStatus
  timeAccuracy: TimeAccuracy
  useTrueSolarTime: SystemChoice
  dayBoundaryRule: 'system_default' | 'zi-23'
  houseSystem: 'system_default'
  unknownTimePolicy: 'time_independent_only'
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type RecordType = 'bazi' | 'astrology' | 'liuyao' | 'meihua' | 'tarot'
export type VerificationStatus =
  | 'pending'
  | 'matched'
  | 'partially_matched'
  | 'not_happened'
  | 'opposite'
  | 'unknown'

export interface Interpretation {
  headline: string
  conclusion: string
  evidence: string[]
  support: string[]
  conflicts: string[]
  uncertainty: string
  advice: string[]
}

export interface FollowUpMessage {
  id: string
  role: 'user' | 'mock'
  content: string
  createdAt: string
}

export interface TemporarySubject {
  name?: string
  gender?: Gender
}

export type AiModule = RecordType

export interface AiReadingSection {
  title: string
  content: string
  evidence: string[]
}

export interface AiReading {
  directAnswer: string
  summary: string
  sections: AiReadingSection[]
  uncertainty: string[]
  advice: string[]
  suggestedQuestions: string[]
}

export interface AiUsageSnapshot {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  cachedTokens?: number
  reasoningTokens?: number
}

export interface AiInterpretationSnapshot extends AiReading {
  id: string
  module: AiModule
  question: string
  createdAt: string
  provider: 'deepseek'
  model: string
  promptVersion: string
  usage?: AiUsageSnapshot
}

export interface AiConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  reading?: AiReading
}

export interface RecordSnapshot {
  questionAddedLater?: string
  liuyaoUseGodOverride?: import('../calculation/liuyao/judgement').UseGod
  metaUpdatedAt?: string
  id: string
  type: RecordType
  profileId: string
  profileNameSnapshot: string
  profileSnapshot?: Partial<Profile>
  subjectType?: 'profile' | 'temporary'
  question?: string
  category?: string
  createdAt: string
  rawResult: Record<string, unknown>
  calculationVersion: string
  ruleVersion: string
  interpretationVersion?: string
  interpretation: Interpretation
  followUpMessages: FollowUpMessage[]
  aiInterpretations?: AiInterpretationSnapshot[]
  aiMessages?: AiConversationMessage[]
  mood?: string
  expectation?: string
  verificationDate?: string
  verificationStatus: VerificationStatus
  verificationResult?: string
  verificationNote?: string
  notes?: string
  demo?: boolean
}

export type DivinationRecord = RecordSnapshot

export type FortunePeriodType = 'day' | 'week' | 'month'

export interface FortunePeriod {
  profileId: string
  periodType: FortunePeriodType
  startDate: string
  endDate: string
  keywords: string[]
  summary: string
  baziView: Interpretation
  astrologyView: Interpretation
  combinedView: Interpretation
  dimensions: {
    relationships: { trend: string; summary: string }
    work: { trend: string; summary: string }
    finance: { trend: string; summary: string }
    wellbeing: { trend: string; summary: string }
  }
  alignment: string
  suggestions: string[]
  cautions: string[]
}

export type CoinSide = 'yang' | 'yin'
export interface CoinToss {
  method?: LiuyaoMethod
  coins: [CoinSide, CoinSide, CoinSide]
}

export type LiuyaoMethod = 'digital' | 'manual'
export interface LiuyaoDraftState {
  useGodOverride?: import('../calculation/liuyao/judgement').UseGod
  method?: LiuyaoMethod
  querentGender?: Gender
  coinConventionVersion?: 'character-2-back-3-v1' | 'fixed-coin-art-yin-2-yang-3-v2'
  timeRange: string
  casts: CoinToss[]
  castCompletedAt?: string
  editingIndex?: number
  locked: boolean
  lockedAt?: string
  recordId?: string
  legacyImported?: boolean
}

export type MeihuaMethod = 'time' | 'specified_time' | 'numbers' | 'three_numbers' | 'text' | 'object_count' | 'sound_count'
export interface MeihuaDraftState {
  method?: MeihuaMethod
  firstNumber?: number
  secondNumber?: number
  thirdNumber?: number
  specifiedLocalDateTime?: string
  sourceText?: string
  observedCount?: number
  locked: boolean
  lockedAt?: string
  recordId?: string
}

export type TarotSpread = 'single' | 'three' | 'dual-path'
export type TarotDrawMode = 'ritual' | 'system'
export type TarotPhase = 'idle' | 'shuffling' | 'rolling' | 'paused' | 'selected' | 'complete' | 'revealed'
export type TarotOrientation = 'upright' | 'reversed'

export interface TarotDraftState {
  isChoice: boolean
  spread?: TarotSpread
  drawMode?: TarotDrawMode
  phase: TarotPhase
  deckOrder: string[]
  orientations: Record<string, TarotOrientation>
  selected: string[]
  cursor: number
  revealed: boolean
  recordId?: string
  legacyImported?: boolean
}

interface DraftBase {
  id: string
  profileId: string
  question: string
  category?: string
  createdAt: string
  updatedAt: string
  randomSeed?: string
  temporarySubject?: TemporarySubject
}

export interface LiuyaoDraft extends DraftBase {
  type: 'liuyao'
  state: LiuyaoDraftState
}

export interface TarotDraft extends DraftBase {
  type: 'tarot'
  state: TarotDraftState
}

export interface MeihuaDraft extends DraftBase {
  type: 'meihua'
  state: MeihuaDraftState
}

export type DivinationDraft = LiuyaoDraft | MeihuaDraft | TarotDraft

export interface Tombstones {
  profiles: Record<string, string>
  records: Record<string, string>
  drafts: Record<string, string>
}

export interface AppDataState {
  tombstones: Tombstones
  schemaVersion: '1.3'
  lastPrimaryRoute: PrimaryNav
  reduceMotion: boolean
  activeProfileId: string
  profiles: Profile[]
  records: RecordSnapshot[]
  drafts: DivinationDraft[]
}

export interface TarotCard {
  id: string
  order: number
  arcana: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  rank?: string
  nameZh: string
  nameEn: string
}

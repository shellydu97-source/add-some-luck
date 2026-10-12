import type { Interpretation, Profile, RecordSnapshot, RecordType, TemporarySubject } from '../models/types'
import { makeId } from './id'

export const GUEST_PROFILE_ID = 'guest'

function clone<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T
}

const ruleVersions: Record<RecordType, string> = {
  bazi: 'bazi-frozen-v1',
  astrology: 'astrology-frozen-v1',
  liuyao: 'three-coins-yin-2-yang-3-najia-eight-palaces-1.2.0',
  meihua: 'xiantian-time-numbers-text-object-sound-1.2.0',
  tarot: 'web-crypto-fisher-yates-1.0.0',
}

export function createRecord(input: {
  profile?: Profile
  type: RecordType
  question?: string
  category?: string
  temporarySubject?: TemporarySubject
  rawResult: Record<string, unknown>
  interpretation: Interpretation
}): RecordSnapshot {
  const question = input.question?.trim() || undefined
  const category = input.category?.trim() || undefined
  const temporaryName = input.temporarySubject?.name?.trim()
  const isTemporary = !input.profile
  const profileNameSnapshot = input.profile?.name ?? (temporaryName ? `临时测算 · ${temporaryName}` : '临时测算')
  return {
    id: makeId('record'), type: input.type, profileId: input.profile?.id ?? GUEST_PROFILE_ID,
    profileNameSnapshot,
    profileSnapshot: input.profile ? clone(input.profile) : {
      name: temporaryName ?? '临时测算', gender: input.temporarySubject?.gender,
      timeAccuracy: 'unknown', normalizationStatus: 'unprocessed',
    },
    subjectType: isTemporary ? 'temporary' : 'profile',
    question, category, createdAt: new Date().toISOString(), rawResult: clone(input.rawResult),
    calculationVersion: `${input.type}-calculation-1.0.0`, ruleVersion: input.type === 'bazi' && typeof (input.rawResult.result as { ruleVersion?: string })?.ruleVersion === 'string' ? (input.rawResult.result as { ruleVersion: string }).ruleVersion : ruleVersions[input.type], interpretationVersion: 'basic-meaning-1.0.0',
    interpretation: clone(input.interpretation), followUpMessages: [], aiInterpretations: [], aiMessages: [],
    verificationStatus: 'pending', verificationResult: '',
    verificationNote: '', verificationDate: '', mood: '', expectation: '', notes: '',
  }
}

export function createBasicInterpretation(headline: string, conclusion: string, evidence: string[] = []): Interpretation {
  return {
    headline,
    conclusion,
    evidence,
    support: [],
    conflicts: [],
    uncertainty: '',
    advice: [],
  }
}

import type { Interpretation, Profile, RecordSnapshot, RecordType } from '../models/types'
import { makeId } from './id'

export const GUEST_PROFILE_ID = 'guest'

function clone<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T
}

const ruleVersions: Record<RecordType, string> = {
  bazi: 'bazi-frozen-v1',
  astrology: 'astrology-frozen-v1',
  liuyao: 'three-coins-yin-2-yang-3-najia-eight-palaces-1.2.0',
  meihua: 'xiantian-time-numbers-text-object-sound-1.1.0',
  tarot: 'web-crypto-fisher-yates-1.0.0',
}

export function createRecord(input: {
  profile?: Profile
  type: RecordType
  question?: string
  category?: string
  rawResult: Record<string, unknown>
  interpretation: Interpretation
}): RecordSnapshot {
  const question = input.question?.trim() || undefined
  const category = input.category?.trim() || undefined
  return {
    id: makeId('record'), type: input.type, profileId: input.profile?.id ?? GUEST_PROFILE_ID,
    profileNameSnapshot: input.profile?.name ?? '未关联人物',
    profileSnapshot: input.profile ? clone(input.profile) : { name: '未关联人物', timeAccuracy: 'unknown', normalizationStatus: 'unprocessed' },
    question, category, createdAt: new Date().toISOString(), rawResult: clone(input.rawResult),
    calculationVersion: `${input.type}-calculation-1.0.0`, ruleVersion: ruleVersions[input.type], interpretationVersion: 'basic-meaning-1.0.0',
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

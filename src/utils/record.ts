import type { Interpretation, Profile, RecordSnapshot, RecordType, TemporarySubject } from '../models/types'
import { compactSnapshot } from './snapshot'
import { makeId } from './id'

export const GUEST_PROFILE_ID = 'guest'

function clone<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T
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
  const computed = (input.rawResult.result ?? input.rawResult) as Record<string, unknown>
  const version = (key: string) => typeof computed[key] === 'string' ? computed[key] as string : 'unversioned'
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
    question, category, createdAt: new Date().toISOString(), rawResult: input.type === 'liuyao' || input.type === 'meihua' ? compactSnapshot({ ...clone(input.rawResult), savedInterpretation: clone(input.interpretation) }) : clone(input.rawResult),
    calculationVersion: version('calculationVersion') !== 'unversioned' ? version('calculationVersion') : version('adapterVersion'), ruleVersion: version('ruleVersion'), interpretationVersion: 'basic-meaning-1.0.0',
    interpretation: input.type === 'liuyao' || input.type === 'meihua' ? createBasicInterpretation(input.interpretation.headline, '') : clone(input.interpretation), followUpMessages: [], aiInterpretations: [], aiMessages: [],
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

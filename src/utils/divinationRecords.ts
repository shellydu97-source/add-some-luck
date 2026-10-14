import { calculateLiuyao, LIUYAO_COIN_CONVENTION_VERSION } from '../calculation/liuyao'
import { judgeLiuyao } from '../calculation/liuyao/judgement'
import {
  calculateMeihuaByNumbers, calculateMeihuaByObjectCount, calculateMeihuaBySoundCount,
  calculateMeihuaBySpecifiedTime, calculateMeihuaByText, calculateMeihuaByThreeNumbers,
  calculateMeihuaByTime, createMeihuaBasicInterpretation, type MeihuaCalculationResult,
} from '../calculation/meihua'
import { judgeMeihua } from '../calculation/meihua/judgement'
import { getTarotCard, spreadPositions } from '../calculation/tarotMock'
import { createTarotSpreadInterpretation, getTarotElement } from '../calculation/tarotInterpretation'
import { TAROT_CALCULATION_METADATA } from '../calculation/tarotVersions'
import { getTarotKnowledge } from '../data/tarotMeanings'
import type { DivinationDraft, Interpretation, LiuyaoDraft, MeihuaDraft, Profile, TarotDraft } from '../models/types'
import { useAppStore } from '../storage/store'
import { createRecord, GUEST_PROFILE_ID } from './record'

function subjectProfile(draft: DivinationDraft, profiles: Profile[]) {
  return draft.profileId === GUEST_PROFILE_ID ? undefined : profiles.find((item) => item.id === draft.profileId)
}

export function isLiuyaoComplete(draft: LiuyaoDraft) {
  return draft.state.casts.length === 6 && draft.state.locked && !!draft.state.lockedAt
}

export function buildLiuyaoOutcome(draft: LiuyaoDraft, override = draft.state.useGodOverride) {
  const castAt = draft.state.castCompletedAt ?? draft.state.lockedAt!
  const result = calculateLiuyao(draft.state.casts, castAt)
  const judgement = judgeLiuyao(result, draft.category, override, draft.state.querentGender)
  const rawResult = {
    judgement,
    method: draft.state.method,
    querentGender: draft.state.querentGender,
    timeRange: draft.state.timeRange,
    lockedAt: draft.state.lockedAt,
    castCompletedAt: draft.state.castCompletedAt,
    coinTosses: draft.state.casts,
    coinConventionVersion: draft.state.coinConventionVersion ?? LIUYAO_COIN_CONVENTION_VERSION,
    original: result.original,
    changed: result.changed,
    movingLines: result.movingLines,
    lines: result.lines,
    calendar: result.calendar,
    lowerTrigram: result.lowerTrigram,
    upperTrigram: result.upperTrigram,
    changedLowerTrigram: result.changedLowerTrigram,
    changedUpperTrigram: result.changedUpperTrigram,
    guaShen: result.guaShen,
    shiShen: result.shiShen,
    shenSha: result.shenSha,
    engineVersion: result.engineVersion,
    adapterVersion: result.adapterVersion,
    ruleVersion: result.ruleVersion,
  }
  const interpretation: Interpretation = {
    headline: judgement.tendency,
    conclusion: judgement.reasons.map((reason) => reason.replace(/[。；]+$/, '')).join('；') + '。',
    evidence: judgement.reasons,
    support: [],
    conflicts: judgement.auxiliaryFlags,
    uncertainty: judgement.uncertainty,
    advice: [judgement.advice],
  }
  return { castAt, result, judgement, rawResult, interpretation }
}

export function isMeihuaComplete(draft: MeihuaDraft) {
  return draft.state.locked && !!draft.state.lockedAt && !!draft.state.method
}

export function calculateMeihuaDraft(draft: MeihuaDraft): MeihuaCalculationResult {
  if (!draft.state.lockedAt || !draft.state.method) throw new Error('起卦信息尚未锁定。')
  switch (draft.state.method) {
    case 'time': return calculateMeihuaByTime(draft.state.lockedAt)
    case 'specified_time': return calculateMeihuaBySpecifiedTime(draft.state.specifiedLocalDateTime!)
    case 'numbers': return calculateMeihuaByNumbers(draft.state.firstNumber!, draft.state.secondNumber!)
    case 'three_numbers': return calculateMeihuaByThreeNumbers(draft.state.firstNumber!, draft.state.secondNumber!, draft.state.thirdNumber!)
    case 'text': return calculateMeihuaByText(draft.state.sourceText!)
    case 'object_count': return calculateMeihuaByObjectCount(draft.state.observedCount!, draft.state.lockedAt)
    case 'sound_count': return calculateMeihuaBySoundCount(draft.state.observedCount!, draft.state.lockedAt)
  }
}

export function buildMeihuaOutcome(draft: MeihuaDraft) {
  const lockedAt = draft.state.lockedAt!
  const result = calculateMeihuaDraft(draft)
  const judgement = judgeMeihua(result, lockedAt)
  const rawResult = {
    judgement, lockedAt,
    method: result.method, sourceNumbers: result.sourceNumbers, calendar: result.calendar,
    original: result.original, mutual: result.mutual, changed: result.changed, opposite: result.opposite, reversed: result.reversed,
    movingLine: result.movingLine, movingLineText: result.movingLineText,
    bodyTrigram: result.bodyTrigram, useTrigram: result.useTrigram, bodyPosition: result.bodyPosition, usePosition: result.usePosition,
    bodyUseRelation: result.bodyUseRelation,
    engineVersion: result.engineVersion, adapterVersion: result.adapterVersion, ruleVersion: result.ruleVersion,
  }
  return { lockedAt, result, judgement, rawResult, interpretation: createMeihuaBasicInterpretation(result) }
}

export function isTarotComplete(draft: TarotDraft) {
  return !!draft.state.spread && draft.state.revealed && draft.state.selected.length === spreadPositions[draft.state.spread].length
}

export function buildTarotOutcome(draft: TarotDraft) {
  const spread = draft.state.spread!
  const cards = draft.state.selected.map((cardId, index) => {
    const card = getTarotCard(cardId)
    const orientation = draft.state.orientations[cardId] ?? 'upright'
    const knowledge = getTarotKnowledge(cardId)
    const reversed = orientation === 'reversed'
    const arcana = card?.arcana ?? 'major'
    return {
      id: cardId, order: card?.order ?? 0, nameZh: card?.nameZh ?? cardId, nameEn: card?.nameEn ?? '', orientation,
      position: spreadPositions[spread][index], arcana, suit: card?.suit, rank: card?.rank,
      element: getTarotElement(arcana, card?.suit),
      keywords: reversed ? knowledge?.reversedKeywords ?? [] : knowledge?.uprightKeywords ?? [],
      basicMeaning: reversed ? knowledge?.reversedMeaning ?? '' : knowledge?.uprightMeaning ?? '',
    }
  })
  const localInterpretation = createTarotSpreadInterpretation(spread, cards)
  const rawResult = {
    ...TAROT_CALCULATION_METADATA,
    spread, drawMode: draft.state.drawMode, sessionId: draft.randomSeed, randomSource: 'Web Crypto', shuffleAlgorithm: 'Fisher-Yates',
    deckOrder: draft.state.deckOrder, orientations: draft.state.orientations, cards, localInterpretation,
  }
  const action = localInterpretation.sections.find((section) => section.id === 'action')
  const conflict = localInterpretation.sections.find((section) => section.id === 'tension' || section.id === 'difference')
  const interpretation: Interpretation = {
    headline: `${localInterpretation.spreadName}综合解读`,
    conclusion: localInterpretation.summary,
    evidence: [...new Set(localInterpretation.sections.flatMap((section) => section.evidence))],
    support: localInterpretation.patterns,
    conflicts: conflict ? [conflict.content] : [],
    uncertainty: localInterpretation.uncertainty,
    advice: action ? [action.content] : [],
  }
  return { spread, cards, localInterpretation, rawResult, interpretation }
}

function isComplete(draft: DivinationDraft) {
  if (draft.type === 'liuyao') return isLiuyaoComplete(draft)
  if (draft.type === 'meihua') return isMeihuaComplete(draft)
  if (draft.type === 'tarot') return isTarotComplete(draft)
  return false
}

// Results are saved the moment they exist; calling this again for the same draft returns the same record.
export function saveDivinationRecord(draftId: string): string | undefined {
  const state = useAppStore.getState()
  const draft = state.drafts.find((item) => item.id === draftId)
  if (!draft || !isComplete(draft)) return undefined
  if (draft.state.recordId && state.records.some((record) => record.id === draft.state.recordId)) return draft.state.recordId
  const profile = subjectProfile(draft, state.profiles)
  const common = { profile, temporarySubject: draft.temporarySubject, question: draft.question, category: draft.category }
  let created
  if (draft.type === 'liuyao') {
    const outcome = buildLiuyaoOutcome(draft)
    created = createRecord({ ...common, type: 'liuyao', rawResult: outcome.rawResult, interpretation: outcome.interpretation })
    if (draft.state.useGodOverride) created.liuyaoUseGodOverride = draft.state.useGodOverride
  } else if (draft.type === 'meihua') {
    const outcome = buildMeihuaOutcome(draft)
    created = createRecord({ ...common, type: 'meihua', rawResult: outcome.rawResult, interpretation: outcome.interpretation })
  } else if (draft.type === 'tarot') {
    const outcome = buildTarotOutcome(draft)
    created = createRecord({ ...common, type: 'tarot', rawResult: outcome.rawResult, interpretation: outcome.interpretation })
  } else return undefined
  state.createRecordSnapshot(created, draft.id, { quiet: true })
  return created.id
}

// Older versions kept finished results as drafts until the user pressed save; turn those into records.
export function saveCompletedDrafts() {
  const saved: string[] = []
  for (const draft of useAppStore.getState().drafts) {
    if (draft.state.recordId || !isComplete(draft)) continue
    try {
      const id = saveDivinationRecord(draft.id)
      if (id) saved.push(id)
    } catch { /* A draft that can no longer be calculated stays as it was. */ }
  }
  return saved
}

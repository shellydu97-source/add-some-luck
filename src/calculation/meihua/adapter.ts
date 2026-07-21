import { getMeihuaCalendarContext, MEIHUA_CALENDAR_ENGINE_VERSION, shanghaiLocalDateTimeToInstant } from './calendarAdapter'
import { hexagramFromBits, trigramFromNumber } from './data'
import type { MeihuaBodyUseRelation, MeihuaCalculationResult, MeihuaFiveElement, MeihuaMethod, MeihuaTrigram } from './types'

export const MEIHUA_ADAPTER_VERSION = 'meihua-calculation-adapter-1.1.0'
export const MEIHUA_RULE_VERSION = 'xiantian-time-numbers-text-object-sound-1.1.0'

const generation: Record<MeihuaFiveElement, MeihuaFiveElement> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const overcoming: Record<MeihuaFiveElement, MeihuaFiveElement> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

export function meihuaRemainder(value: number, divisor: 6 | 8) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('起卦数字必须是正整数。')
  const remainder = value % divisor
  return remainder === 0 ? divisor : remainder
}

function bodyUseRelation(body: MeihuaTrigram, use: MeihuaTrigram): MeihuaBodyUseRelation {
  let label: MeihuaBodyUseRelation['label']
  let summary: string
  if (body.element === use.element) {
    label = '比和'
    summary = '体卦与用卦五行相同，双方性质较接近；仍需结合现实条件判断是协同还是相互牵制。'
  } else if (generation[body.element] === use.element) {
    label = '体生用'
    summary = '体卦生用卦，主方的精力或资源更容易向事情本身投入，宜留意付出是否可持续。'
  } else if (generation[use.element] === body.element) {
    label = '用生体'
    summary = '用卦生体卦，外部条件对主方有支持倾向，但不等于结果必然顺利。'
  } else if (overcoming[body.element] === use.element) {
    label = '体克用'
    summary = '体卦克用卦，主方对事情有一定主动或约束空间，仍需注意实际执行成本。'
  } else {
    label = '用克体'
    summary = '用卦克体卦，事情或外部条件对主方形成压力，宜先识别限制并保留调整余地。'
  }
  return { label, bodyElement: body.element, useElement: use.element, summary }
}

export function calculateMeihuaFromTrigramNumbers(input: {
  method: MeihuaMethod
  upperNumber: number
  lowerNumber: number
  movingNumber: number
  firstNumber?: number
  secondNumber?: number
  thirdNumber?: number
  specifiedLocalDateTime?: string
  sourceText?: string
  normalizedText?: string
  characterCount?: number
  observedCount?: number
  calendar?: ReturnType<typeof getMeihuaCalendarContext>
}): MeihuaCalculationResult {
  const upper = trigramFromNumber(meihuaRemainder(input.upperNumber, 8))
  const lower = trigramFromNumber(meihuaRemainder(input.lowerNumber, 8))
  const movingLine = meihuaRemainder(input.movingNumber, 6)
  const originalBits = `${lower.bits}${upper.bits}`
  const changedBitsArray = [...originalBits]
  changedBitsArray[movingLine - 1] = changedBitsArray[movingLine - 1] === '1' ? '0' : '1'
  const mutualBits = `${originalBits.slice(1, 4)}${originalBits.slice(2, 5)}`
  const original = hexagramFromBits(originalBits)
  const mutual = hexagramFromBits(mutualBits)
  const changed = hexagramFromBits(changedBitsArray.join(''))
  const lowerIsUse = movingLine <= 3
  const bodyTrigram = lowerIsUse ? upper : lower
  const useTrigram = lowerIsUse ? lower : upper
  return {
    method: input.method,
    sourceNumbers: {
      upperTotal: input.upperNumber,
      lowerTotal: input.lowerNumber,
      movingTotal: input.movingNumber,
      firstNumber: input.firstNumber,
      secondNumber: input.secondNumber,
      thirdNumber: input.thirdNumber,
      specifiedLocalDateTime: input.specifiedLocalDateTime,
      sourceText: input.sourceText,
      normalizedText: input.normalizedText,
      characterCount: input.characterCount,
      observedCount: input.observedCount,
    },
    calendar: input.calendar,
    original,
    mutual,
    changed,
    movingLine,
    movingLineText: original.lineTexts[movingLine - 1]!,
    bodyTrigram,
    useTrigram,
    bodyPosition: lowerIsUse ? 'upper' : 'lower',
    usePosition: lowerIsUse ? 'lower' : 'upper',
    bodyUseRelation: bodyUseRelation(bodyTrigram, useTrigram),
    engineVersion: input.calendar ? MEIHUA_CALENDAR_ENGINE_VERSION : 'integer-arithmetic',
    adapterVersion: MEIHUA_ADAPTER_VERSION,
    ruleVersion: MEIHUA_RULE_VERSION,
  }
}

export function calculateMeihuaByTime(instant: string | Date, method: 'time' | 'specified_time' = 'time', specifiedLocalDateTime?: string): MeihuaCalculationResult {
  const calendar = getMeihuaCalendarContext(instant)
  const upperTotal = calendar.yearNumber + calendar.monthNumber + calendar.dayNumber
  const lowerTotal = upperTotal + calendar.hourNumber
  return calculateMeihuaFromTrigramNumbers({ method, upperNumber: upperTotal, lowerNumber: lowerTotal, movingNumber: lowerTotal, specifiedLocalDateTime, calendar })
}

export function calculateMeihuaBySpecifiedTime(localDateTime: string) {
  return calculateMeihuaByTime(shanghaiLocalDateTimeToInstant(localDateTime), 'specified_time', localDateTime)
}

export function calculateMeihuaByNumbers(firstNumber: number, secondNumber: number): MeihuaCalculationResult {
  if (!Number.isSafeInteger(firstNumber) || firstNumber <= 0 || !Number.isSafeInteger(secondNumber) || secondNumber <= 0) {
    throw new Error('两个数字都必须是正整数。')
  }
  return calculateMeihuaFromTrigramNumbers({
    method: 'numbers', upperNumber: firstNumber, lowerNumber: secondNumber,
    movingNumber: firstNumber + secondNumber, firstNumber, secondNumber,
  })
}

export function calculateMeihuaByThreeNumbers(firstNumber: number, secondNumber: number, thirdNumber: number): MeihuaCalculationResult {
  if (![firstNumber, secondNumber, thirdNumber].every((value) => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('三个数字都必须是正整数。')
  }
  return calculateMeihuaFromTrigramNumbers({
    method: 'three_numbers', upperNumber: firstNumber, lowerNumber: secondNumber,
    movingNumber: thirdNumber, firstNumber, secondNumber, thirdNumber,
  })
}

export function normalizeMeihuaText(value: string) {
  return Array.from(value.normalize('NFKC')).filter((character) => /\p{Script=Han}/u.test(character)).join('')
}

export function calculateMeihuaByText(sourceText: string): MeihuaCalculationResult {
  const normalizedText = normalizeMeihuaText(sourceText)
  const characterCount = Array.from(normalizedText).length
  if (characterCount < 11 || characterCount > 100) throw new Error('请输入 11 至 100 个汉字，标点和空格不计。')
  const upperNumber = Math.floor(characterCount / 2)
  const lowerNumber = characterCount - upperNumber
  return calculateMeihuaFromTrigramNumbers({
    method: 'text', upperNumber, lowerNumber, movingNumber: characterCount,
    sourceText: sourceText.trim(), normalizedText, characterCount,
  })
}

function validatedObservedCount(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('数量必须是正整数。')
  return value
}

export function calculateMeihuaByObjectCount(observedCount: number, instant: string | Date): MeihuaCalculationResult {
  const count = validatedObservedCount(observedCount)
  const calendar = getMeihuaCalendarContext(instant)
  return calculateMeihuaFromTrigramNumbers({
    method: 'object_count', upperNumber: count, lowerNumber: calendar.hourNumber,
    movingNumber: count + calendar.hourNumber, observedCount: count, calendar,
  })
}

export function calculateMeihuaBySoundCount(observedCount: number, instant: string | Date): MeihuaCalculationResult {
  const count = validatedObservedCount(observedCount)
  const calendar = getMeihuaCalendarContext(instant)
  const lowerTotal = count + calendar.hourNumber
  return calculateMeihuaFromTrigramNumbers({
    method: 'sound_count', upperNumber: count, lowerNumber: lowerTotal,
    movingNumber: lowerTotal, observedCount: count, calendar,
  })
}

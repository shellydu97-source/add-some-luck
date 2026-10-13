import type { AiReading } from '../models/types'
export function readingToText(reading:AiReading) {
 return [reading.directAnswer,reading.summary,...(reading.basis ?? []),...(reading.sections ?? []).map(s=>`${s.title}：${s.content}\n${s.evidence.join('；')}`),...(reading.uncertainty ?? []),...(reading.advice ?? [])].filter(Boolean).join('\n\n')
}
export function firstAnswerSentence(text?:string) { return text?.trim().match(/^[^。！？!?\n]+[。！？!?]?/)?.[0]?.slice(0,140) ?? '' }

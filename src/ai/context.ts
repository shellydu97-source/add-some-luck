import { activeBaziYear,calculateBaziFlowDate,getSolarTermDateTime,analyzeBaziNatal, type BaziCalculationSuccess,type BaziNatalAnalysis } from '../calculation/bazi'
import { calculateLiuyao } from '../calculation/liuyao'
import { judgeLiuyao,type UseGod,type LiuyaoJudgement } from '../calculation/liuyao/judgement'
import type { LiuyaoCalculationResult } from '../calculation/liuyao/types'
import type { MeihuaCalculationResult } from '../calculation/meihua'
import type { MeihuaJudgement } from '../calculation/meihua/judgement'
import type { TarotReadingCard } from '../calculation/tarotInterpretation'
import { getTarotKnowledge } from '../data/tarotMeanings'
import type { CoinToss,DivinationRecord,Gender,TarotSpread } from '../models/types'

const CONTEXT_VERSION = '3' as const
export function buildBaziContext(result:BaziCalculationSuccess,analysis:BaziNatalAnalysis = analyzeBaziNatal(result),now=new Date()) {
  const cycles=result.luck?.cycles ?? []
  const currentIndex=cycles.findIndex((c,i)=>now.getTime()>=new Date(c.startSolarDateTime.replace(' ','T')+'+08:00').getTime() && (!cycles[i+1] || now.getTime()<new Date(cycles[i+1].startSolarDateTime.replace(' ','T')+'+08:00').getTime()))
  const year=activeBaziYear(now)
  return {contextVersion:CONTEXT_VERSION,pillars:result.pillars,fiveElements:{occurrences:result.fiveElementCounts,weighted:analysis.weightedElementCounts},tenGods:{occurrences:analysis.tenGodCounts,weighted:analysis.weightedTenGodCounts},distributionNote:'显干1；藏干本中余气1/0.5/0.3；月支藏干×1.5，仅参考分布，不等同旺衰。',relations:analysis.relations,shenSha:analysis.shenSha,
    currentLuck:currentIndex>=0 ? cycles[currentIndex].ganZhi : null,
    luckCycles:cycles.slice(Math.max(0,currentIndex-1),currentIndex<0 ? 2 : currentIndex+2).map(({index,ganZhi,startYear,endYear,startAge,endAge,startSolarDateTime})=>({index,ganZhi,startYear,endYear,startAge,endAge,startSolarDateTime})),
    annual:[year,year+1,year+2].map(y=>{const flow=calculateBaziFlowDate(`${y}/07/01`);return {year:y,ganZhi:flow.ok && flow.year.status==='available' ? flow.year.ganZhi : '',lichun:getSolarTermDateTime(y,'立春')}}),
    correction:result.birthTimeCorrection,dayBoundaryRule:result.dayBoundaryRule ?? 'system_default',timeKnown:result.normalizedInput.timeKnown,warnings:result.warnings,ruleVersion:result.ruleVersion}
}
function compactJudgement(judgement:LiuyaoJudgement) {
  // Line calendars are already below. Avoid duplicating long reason strings inside god groups.
  return {useGod:judgement.useGod,useGodState:judgement.useGodState,originGod:judgement.originGod,avoidGod:judgement.avoidGod,movingEffects:judgement.movingEffects,auxiliaryFlags:judgement.auxiliaryFlags,tendency:judgement.tendency,reasons:judgement.reasons,uncertainty:judgement.uncertainty,ruleVersion:judgement.ruleVersion}
}
export function buildLiuyaoContext(result:LiuyaoCalculationResult,options:{question?:string;category?:string;timeRange?:string;useGod?:UseGod;gender?:Gender;castAt:string;method?:string;judgement?:LiuyaoJudgement}) {
  const judgement=options.judgement ?? judgeLiuyao(result,options.category,options.useGod,options.gender)
  return {contextVersion:CONTEXT_VERSION,question:options.question ?? '',category:options.category,timeRange:options.timeRange,useGod:options.useGod ?? judgement.useGod.relation,querentGender:options.gender,castAt:options.castAt,method:options.method,
    original:{number:result.original.number,name:result.original.name,judgment:result.original.judgment},changed:{number:result.changed.number,name:result.changed.name,judgment:result.changed.judgment},
    movingLines:result.movingLines,movingTexts:result.movingLines.map(index=>({index,text:result.original.lineTexts[index-1]})),
    lines:result.lines.map(({index,naJia,element,relation,spirit,shiYing,hiddenSpirit,environment,moving,changedNaJia,changedElement,changedRelation,changedEnvironment})=>({index,naJia,element,relation,spirit,shiYing,hiddenSpirit,environment,moving,...(moving?{changedNaJia,changedElement,changedRelation,changedEnvironment}:{})})),
    calendar:result.calendar,judgement:compactJudgement(judgement)}
}
export function buildMeihuaContext(result:MeihuaCalculationResult,judgement:MeihuaJudgement,lockedAt:string) {
  return {contextVersion:CONTEXT_VERSION,method:result.method,castAt:result.calendar?.localDateTime ?? lockedAt,
    original:{number:result.original.number,name:result.original.name},mutual:{number:result.mutual.number,name:result.mutual.name},changed:{number:result.changed.number,name:result.changed.name},movingLine:result.movingLine,movingLineText:result.movingLineText,
    body:{name:result.bodyTrigram.name,element:result.bodyTrigram.element,position:result.bodyPosition},use:{name:result.useTrigram.name,element:result.useTrigram.element,position:result.usePosition},judgement}
}
export function buildTarotContext(spread:TarotSpread,cards:TarotReadingCard[],drawnAt:string) {
  return {contextVersion:CONTEXT_VERSION,spread,drawnAt,cards:cards.map(({id,nameZh,orientation,position,basicMeaning})=>({id,nameZh,orientation,position,basicMeaning}))}
}
export function buildRecordContext(record:DivinationRecord):Record<string,unknown> {
  const raw=record.rawResult
  if(record.type==='bazi' && (raw.result as BaziCalculationSuccess)?.ok) return buildBaziContext(raw.result as BaziCalculationSuccess)
  if(record.type==='tarot' && Array.isArray(raw.cards)) {
    // Upgrade only the AI context to current RWS meanings; never rewrite saved old card meanings.
    const cards=(raw.cards as TarotReadingCard[]).map(c=>({...c,basicMeaning:(c.orientation==='reversed'?getTarotKnowledge(c.id)?.reversedMeaning:getTarotKnowledge(c.id)?.uprightMeaning) ?? c.basicMeaning}))
    return buildTarotContext(raw.spread as TarotSpread,cards,record.createdAt)
  }
  if(record.type==='liuyao' && Array.isArray(raw.coinTosses) && raw.calendar) {
    const castAt=String(raw.castCompletedAt ?? raw.lockedAt)
    const result=calculateLiuyao(raw.coinTosses as CoinToss[],castAt)
    return buildLiuyaoContext(result,{question:record.question || record.questionAddedLater,category:record.category,timeRange:raw.timeRange as string,gender:raw.querentGender as Gender,castAt,method:raw.method as string,useGod:record.liuyaoUseGodOverride,judgement:record.liuyaoUseGodOverride ? undefined : raw.judgement as LiuyaoJudgement | undefined})
  }
  if(record.type==='meihua' && raw.judgement) return buildMeihuaContext(raw as unknown as MeihuaCalculationResult,raw.judgement as MeihuaJudgement,String(raw.lockedAt))
  // Older incomplete snapshots stay readable; the server may reject AI for missing source data.
  return raw
}

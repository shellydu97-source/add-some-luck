import type { Interpretation } from '../../models/types'
import type { MeihuaCalculationResult } from './types'

export function createMeihuaBasicInterpretation(result: MeihuaCalculationResult): Interpretation {
  const movingPosition = result.movingLine <= 3 ? '下卦' : '上卦'
  return {
    headline: `${result.original.name}，第 ${result.movingLine} 爻动`,
    conclusion: `本卦反映事情的起点，互卦用于观察中间过程，变卦用于观察后续方向。当前体用关系为${result.bodyUseRelation.label}。`,
    evidence: [
      `本卦：第 ${result.original.number} 卦 ${result.original.name}`,
      `互卦：第 ${result.mutual.number} 卦 ${result.mutual.name}`,
      `变卦：第 ${result.changed.number} 卦 ${result.changed.name}`,
      `第 ${result.movingLine} 爻位于${movingPosition}，${result.useTrigram.name}为用，${result.bodyTrigram.name}为体`,
      `体卦${result.bodyTrigram.name}${result.bodyTrigram.element}，用卦${result.useTrigram.name}${result.useTrigram.element}`,
    ],
    support: [result.bodyUseRelation.summary],
    conflicts: [],
    uncertainty: '梅花易数的体用与卦象属于传统象数解释，不能替代现实证据，也不支持绝对成败或精确应期。',
    advice: ['先核对卦象提示与现实中已经发生的事实，再决定下一步行动。'],
  }
}

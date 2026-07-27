import type { HexagramDefinition, LiuyaoLineEnvironment } from './types'

export function liuyaoEnvironmentLabels(environment: LiuyaoLineEnvironment) {
  return [
    environment.isVoid ? '旬空' : '',
    environment.isMonthBuild ? '临月建' : '',
    environment.isMonthBreak ? '月破' : '',
    environment.isMonthCombine ? '月合' : '',
    environment.isDaySame ? '临日辰' : '',
    environment.isDayClash ? '日冲' : '',
    environment.isDayCombine ? '日合' : '',
  ].filter(Boolean)
}

export function hexagramPalaceLabel(hexagram: HexagramDefinition) {
  const extras = [hexagram.palaceStage, ...hexagram.specialTypes].filter(Boolean).join(' · ')
  return `${hexagram.palaceName}宫${extras ? ` · ${extras}` : ''}`
}

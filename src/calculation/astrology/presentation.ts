import type { AspectResult, AstrologyBody, MajorAspect, PlanetPosition, ZodiacSign } from './types'

export type AstrologyElement = '火' | '土' | '风' | '水'
export type AstrologyModality = '开创' | '固定' | '变动'

export const BODY_THEMES: Record<AstrologyBody, string> = {
  sun: '核心意志、自我认同与生命方向',
  moon: '情绪需求、安全感与习惯反应',
  mercury: '思考方式、学习与沟通表达',
  venus: '关系偏好、价值判断与审美',
  mars: '行动方式、欲望、竞争与边界',
  jupiter: '扩展、信念、机会与成长方式',
  saturn: '责任、结构、限制与长期建设',
  uranus: '独立、突破与非传统变化',
  neptune: '想象、理想、共情与边界感',
  pluto: '深层动力、控制议题与转化',
}

export const SIGN_STYLES: Record<ZodiacSign, string> = {
  aries: '直接、主动、强调开始与行动', taurus: '稳定、务实、重视感受与持续',
  gemini: '灵活、好奇、重视信息交换', cancer: '保护、感受、重视归属与安全',
  leo: '表达、创造、重视自我呈现', virgo: '分析、整理、重视改进与细节',
  libra: '协调、比较、重视关系与平衡', scorpio: '深入、集中、重视信任与转化',
  sagittarius: '探索、扩展、重视意义与自由', capricorn: '规划、克制、重视目标与责任',
  aquarius: '独立、创新、重视群体与观念', pisces: '感受、想象、重视共情与整体性',
}

export const HOUSE_THEMES: Record<number, string> = {
  1: '自我呈现、行动方式与第一印象', 2: '金钱、资源、价值感与稳定',
  3: '学习、沟通、手足与日常往来', 4: '家庭、根基、私人生活与安全感',
  5: '创造、恋爱、兴趣与自我表达', 6: '工作流程、日常责任与身心习惯',
  7: '伴侣、合作、契约与一对一关系', 8: '共享资源、亲密、风险与深层变化',
  9: '远行、高等学习、信念与视野', 10: '事业方向、社会角色与长期目标',
  11: '朋友、社群、协作与未来愿景', 12: '独处、潜意识、退隐与内在整理',
}

export const ASPECT_DYNAMICS: Record<MajorAspect, string> = {
  conjunction: '两股力量集中在同一主题，需要合并理解',
  opposition: '两端形成拉力，需要在对立需求之间寻找平衡',
  square: '两股力量形成摩擦，常通过行动和调整推动发展',
  trine: '两股力量较容易彼此支持，但仍需要主动使用',
  sextile: '两股力量存在协作机会，需要通过选择和实践启动',
}

const SIGN_ELEMENTS: Record<ZodiacSign, AstrologyElement> = {
  aries: '火', leo: '火', sagittarius: '火', taurus: '土', virgo: '土', capricorn: '土',
  gemini: '风', libra: '风', aquarius: '风', cancer: '水', scorpio: '水', pisces: '水',
}

const SIGN_MODALITIES: Record<ZodiacSign, AstrologyModality> = {
  aries: '开创', cancer: '开创', libra: '开创', capricorn: '开创',
  taurus: '固定', leo: '固定', scorpio: '固定', aquarius: '固定',
  gemini: '变动', virgo: '变动', sagittarius: '变动', pisces: '变动',
}

export function countAstrologyBalance(planets: PlanetPosition[]) {
  const elements: Record<AstrologyElement, number> = { 火: 0, 土: 0, 风: 0, 水: 0 }
  const modalities: Record<AstrologyModality, number> = { 开创: 0, 固定: 0, 变动: 0 }
  for (const planet of planets) {
    elements[SIGN_ELEMENTS[planet.sign]]++
    modalities[SIGN_MODALITIES[planet.sign]]++
  }
  return { elements, modalities }
}

export function emphasizedHouses(planets: PlanetPosition[]) {
  const counts = new Map<number, number>()
  for (const planet of planets) counts.set(planet.house, (counts.get(planet.house) ?? 0) + 1)
  return [...counts.entries()]
    .map(([house, count]) => ({ house, count, theme: HOUSE_THEMES[house] }))
    .sort((first, second) => second.count - first.count || first.house - second.house)
}

export function tightestAspects(aspects: AspectResult[], limit = 5) {
  return [...aspects].sort((first, second) => first.orbDeg - second.orbDeg).slice(0, limit)
}

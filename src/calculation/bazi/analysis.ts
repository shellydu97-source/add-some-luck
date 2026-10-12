import { getSolarTermDateTime } from './lunarTypescriptAdapter'
import {
  BRANCH_ELEMENTS,
  STEM_META,
  getNaYin,
  getTenGod,
  getTwelveStage,
  isEarthlyBranch,
  isHeavenlyStem,
} from './rules'
import type {
  BaziCalculationSuccess,
  EarthlyBranch,
  FiveElement,
  HeavenlyStem,
  PillarKey,
  TenGod,
  TwelveStage,
} from './types'

export const BAZI_ANALYSIS_RULE_VERSION = 'bazi-facts-weighted-year-day-shensha-1.1.0'

export interface BaziRelationFact {
  kind: '天干五合' | '地支六合' | '地支六冲' | '地支相害' | '地支相破' | '地支三合' | '地支三会' | '地支相刑'
  text: string
  evidence: string[]
}

export interface BaziShenShaHit {
  name: '天乙贵人' | '文昌贵人' | '禄神' | '驿马' | '桃花' | '华盖' | '将星'
  target: string
  basis: string
}

export interface BaziFlowAnalysis {
  ganZhi: string
  stem: HeavenlyStem
  branch: EarthlyBranch
  stemTenGod: TenGod
  stemElement: FiveElement
  branchElement: FiveElement
  naYin: string
  twelveStage: TwelveStage
  relations: BaziRelationFact[]
  shenSha: BaziShenShaHit[]
}

export interface BaziNatalAnalysis {
  ruleVersion: typeof BAZI_ANALYSIS_RULE_VERSION
  dayStem?: HeavenlyStem
  dayBranch?: EarthlyBranch
  weightedTenGodCounts: Partial<Record<TenGod, number>>
  weightedElementCounts: Record<FiveElement, number>
  tenGodCounts: Partial<Record<TenGod, number>>
  relations: BaziRelationFact[]
  shenSha: BaziShenShaHit[]
}

const PILLAR_LABELS: Record<PillarKey, string> = { year: '年柱', month: '月柱', day: '日柱', time: '时柱' }

const STEM_COMBINES: Array<readonly [HeavenlyStem, HeavenlyStem]> = [
  ['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸'],
]

const BRANCH_PAIR_RULES: Array<{
  kind: BaziRelationFact['kind']
  pairs: Array<readonly [EarthlyBranch, EarthlyBranch]>
}> = [
  { kind: '地支六合', pairs: [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']] },
  { kind: '地支六冲', pairs: [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']] },
  { kind: '地支相害', pairs: [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']] },
  { kind: '地支相破', pairs: [['子', '酉'], ['丑', '辰'], ['寅', '亥'], ['卯', '午'], ['巳', '申'], ['未', '戌']] },
]

const BRANCH_GROUP_RULES: Array<{
  kind: '地支三合' | '地支三会' | '地支相刑'
  branches: readonly [EarthlyBranch, EarthlyBranch, EarthlyBranch]
  suffix?: string
}> = [
  { kind: '地支三合', branches: ['申', '子', '辰'], suffix: '水局' },
  { kind: '地支三合', branches: ['亥', '卯', '未'], suffix: '木局' },
  { kind: '地支三合', branches: ['寅', '午', '戌'], suffix: '火局' },
  { kind: '地支三合', branches: ['巳', '酉', '丑'], suffix: '金局' },
  { kind: '地支三会', branches: ['寅', '卯', '辰'], suffix: '东方木' },
  { kind: '地支三会', branches: ['巳', '午', '未'], suffix: '南方火' },
  { kind: '地支三会', branches: ['申', '酉', '戌'], suffix: '西方金' },
  { kind: '地支三会', branches: ['亥', '子', '丑'], suffix: '北方水' },
  { kind: '地支相刑', branches: ['寅', '巳', '申'] },
  { kind: '地支相刑', branches: ['丑', '戌', '未'] },
]

const SELF_PUNISH_BRANCHES: EarthlyBranch[] = ['辰', '午', '酉', '亥']

const TIAN_YI: Record<HeavenlyStem, EarthlyBranch[]> = {
  甲: ['丑', '未'], 乙: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'], 戊: ['丑', '未'],
  己: ['子', '申'], 庚: ['丑', '未'], 辛: ['寅', '午'], 壬: ['卯', '巳'], 癸: ['卯', '巳'],
}

const WEN_CHANG: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
}

const LU_SHEN: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
}

const DAY_BRANCH_GROUPS: Array<{
  sources: EarthlyBranch[]
  targets: Record<'驿马' | '桃花' | '华盖' | '将星', EarthlyBranch>
}> = [
  { sources: ['申', '子', '辰'], targets: { 驿马: '寅', 桃花: '酉', 华盖: '辰', 将星: '子' } },
  { sources: ['寅', '午', '戌'], targets: { 驿马: '申', 桃花: '卯', 华盖: '戌', 将星: '午' } },
  { sources: ['巳', '酉', '丑'], targets: { 驿马: '亥', 桃花: '午', 华盖: '丑', 将星: '酉' } },
  { sources: ['亥', '卯', '未'], targets: { 驿马: '巳', 桃花: '子', 华盖: '未', 将星: '卯' } },
]

function availablePillars(result: BaziCalculationSuccess) {
  return (Object.entries(result.pillars) as Array<[PillarKey, BaziCalculationSuccess['pillars'][PillarKey]]>)
    .filter((entry): entry is [PillarKey, Extract<BaziCalculationSuccess['pillars'][PillarKey], { status: 'available' }>] => entry[1].status === 'available')
}

function dayPillar(result: BaziCalculationSuccess) {
  const pillar = result.pillars.day
  return pillar.status === 'available' ? pillar : undefined
}

function isPair(a: string, b: string, pair: readonly [string, string]) {
  return (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
}

function uniqueRelations(relations: BaziRelationFact[]) {
  const seen = new Set<string>()
  return relations.filter((relation) => {
    const key = `${relation.kind}:${[...relation.evidence].sort().join('|')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pairRelations(
  sources: Array<{ label: string; stem: HeavenlyStem; branch: EarthlyBranch }>,
) {
  const relations: BaziRelationFact[] = []
  for (let firstIndex = 0; firstIndex < sources.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < sources.length; secondIndex++) {
      const first = sources[firstIndex]
      const second = sources[secondIndex]
      if (STEM_COMBINES.some((pair) => isPair(first.stem, second.stem, pair))) {
        relations.push({
          kind: '天干五合',
          text: `${first.label}${first.stem}与${second.label}${second.stem}构成天干五合`,
          evidence: [`${first.label}${first.stem}`, `${second.label}${second.stem}`],
        })
      }
      for (const rule of BRANCH_PAIR_RULES) {
        if (!rule.pairs.some((pair) => isPair(first.branch, second.branch, pair))) continue
        relations.push({
          kind: rule.kind,
          text: `${first.label}${first.branch}与${second.label}${second.branch}构成${rule.kind.replace('地支', '')}`,
          evidence: [`${first.label}${first.branch}`, `${second.label}${second.branch}`],
        })
      }
      if (isPair(first.branch, second.branch, ['子', '卯'])) {
        relations.push({
          kind: '地支相刑',
          text: `${first.label}${first.branch}与${second.label}${second.branch}构成子卯刑`,
          evidence: [`${first.label}${first.branch}`, `${second.label}${second.branch}`],
        })
      }
      if (first.branch === second.branch && SELF_PUNISH_BRANCHES.includes(first.branch)) {
        relations.push({
          kind: '地支相刑',
          text: `${first.label}与${second.label}同见${first.branch}，构成自刑条件`,
          evidence: [`${first.label}${first.branch}`, `${second.label}${second.branch}`],
        })
      }
    }
  }
  return relations
}

function groupRelations(sources: Array<{ label: string; branch: EarthlyBranch }>) {
  const relations: BaziRelationFact[] = []
  const branches = new Set(sources.map((source) => source.branch))
  for (const rule of BRANCH_GROUP_RULES) {
    if (!rule.branches.every((branch) => branches.has(branch))) continue
    const evidence = rule.branches.map((branch) => `${sources.find((source) => source.branch === branch)?.label ?? '命局'}${branch}`)
    relations.push({
      kind: rule.kind,
      text: `${rule.branches.join('、')}齐见，构成${rule.kind.replace('地支', '')}${rule.suffix ? `（${rule.suffix}）` : ''}条件`,
      evidence,
    })
  }
  return relations
}

function shenShaForBranch(dayStem: HeavenlyStem, dayBranch: EarthlyBranch, targetBranch: EarthlyBranch, target: string, yearBranch?: EarthlyBranch) {
  const hits: BaziShenShaHit[] = []
  if (TIAN_YI[dayStem].includes(targetBranch)) hits.push({ name: '天乙贵人', target, basis: `按日干${dayStem}查，见${targetBranch}` })
  if (WEN_CHANG[dayStem] === targetBranch) hits.push({ name: '文昌贵人', target, basis: `按日干${dayStem}查，见${targetBranch}` })
  if (LU_SHEN[dayStem] === targetBranch) hits.push({ name: '禄神', target, basis: `按日干${dayStem}查，见${targetBranch}` })
  const group = DAY_BRANCH_GROUPS.find((item) => item.sources.includes(dayBranch))
  if (group) {
    for (const [name, branch] of Object.entries(group.targets) as Array<[BaziShenShaHit['name'], EarthlyBranch]>) {
      if (branch === targetBranch) hits.push({ name, target, basis: `按日支${dayBranch}所在三合组查，见${targetBranch}` })
    }
  }
  if (yearBranch) {
    const yearGroup = DAY_BRANCH_GROUPS.find((item) => item.sources.includes(yearBranch))
    if (yearGroup) for (const [name, branch] of Object.entries(yearGroup.targets) as Array<[BaziShenShaHit['name'], EarthlyBranch]>) {
      if (branch === targetBranch) hits.push({ name, target, basis: `按年支${yearBranch}所在三合组查，见${targetBranch}` })
    }
  }
  return hits
}

export function activeBaziYear(instant = new Date()) {
  const year = Number(new Intl.DateTimeFormat('en', { timeZone:'Asia/Shanghai',year:'numeric' }).format(instant))
  const boundary = getSolarTermDateTime(year,'立春')
  return boundary && instant.getTime() < new Date(boundary.replace(' ','T') + '+08:00').getTime() ? year - 1 : year
}

export const DISTRIBUTION_WEIGHTS = { stem: 1, hidden: [1, 0.5, 0.3], month: 1.5 } as const

export function analyzeBaziNatal(result: BaziCalculationSuccess): BaziNatalAnalysis {
  const day = dayPillar(result)
  const tenGodCounts: Partial<Record<TenGod, number>> = {}
  const weightedTenGodCounts: Partial<Record<TenGod, number>> = {}
  const weightedElementCounts: Record<FiveElement, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  const sources = availablePillars(result).map(([key, pillar]) => ({
    key, label: PILLAR_LABELS[key], stem: pillar.gan, branch: pillar.zhi, pillar,
  }))
  for (const { key, pillar } of sources) {
    weightedElementCounts[pillar.fiveElements.stem] += DISTRIBUTION_WEIGHTS.stem
    const stemGod = day ? getTenGod(day.gan,pillar.gan) : undefined
    if (key !== 'day' && stemGod) weightedTenGodCounts[stemGod] = (weightedTenGodCounts[stemGod] ?? 0) + DISTRIBUTION_WEIGHTS.stem
    pillar.hiddenStems.forEach((stem, i) => {
      const weight = DISTRIBUTION_WEIGHTS.hidden[i] * (key === 'month' ? DISTRIBUTION_WEIGHTS.month : 1)
      weightedElementCounts[STEM_META[stem].element] += weight
      const god = pillar.hiddenTenGods[i]
      weightedTenGodCounts[god] = (weightedTenGodCounts[god] ?? 0) + weight
    })
    if (pillar.stemTenGod !== '日主') tenGodCounts[pillar.stemTenGod] = (tenGodCounts[pillar.stemTenGod] ?? 0) + 1
    for (const god of pillar.hiddenTenGods) tenGodCounts[god] = (tenGodCounts[god] ?? 0) + 1
  }
  const shenSha = day
    ? sources.flatMap((source) => shenShaForBranch(day.gan, day.zhi, source.branch, source.label, result.pillars.year.status === 'available' ? result.pillars.year.zhi : undefined))
    : []
  return {
    ruleVersion: BAZI_ANALYSIS_RULE_VERSION,
    dayStem: day?.gan,
    dayBranch: day?.zhi,
    tenGodCounts, weightedTenGodCounts, weightedElementCounts,
    relations: uniqueRelations([...pairRelations(sources), ...groupRelations(sources)]),
    shenSha,
  }
}

export function analyzeBaziFlow(result: BaziCalculationSuccess, ganZhi: string, label = '所选运势'): BaziFlowAnalysis | undefined {
  const day = dayPillar(result)
  const stem = ganZhi.slice(0, 1)
  const branch = ganZhi.slice(1, 2)
  if (!day || !isHeavenlyStem(stem) || !isEarthlyBranch(branch)) return undefined
  const natalSources = availablePillars(result).map(([key, pillar]) => ({ label: PILLAR_LABELS[key], stem: pillar.gan, branch: pillar.zhi }))
  const flowSource = { label, stem, branch }
  const sources = [...natalSources, flowSource]
  const relations = uniqueRelations([
    ...pairRelations(sources).filter((relation) => relation.evidence.some((item) => item.startsWith(label))),
    ...groupRelations(sources).filter((relation) => relation.evidence.some((item) => item.startsWith(label))),
  ])
  return {
    ganZhi,
    stem,
    branch,
    stemTenGod: getTenGod(day.gan, stem),
    stemElement: STEM_META[stem].element,
    branchElement: BRANCH_ELEMENTS[branch],
    naYin: getNaYin(ganZhi) ?? '未知',
    twelveStage: getTwelveStage(day.gan, branch),
    relations,
    shenSha: shenShaForBranch(day.gan, day.zhi, branch, label, result.pillars.year.status === 'available' ? result.pillars.year.zhi : undefined),
  }
}

import type { EarthlyBranch, FiveElement, HeavenlyStem, TenGod, TwelveStage, YinYang } from './types'

export const HEAVENLY_STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const EARTHLY_BRANCHES: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export const STEM_META: Record<HeavenlyStem, { element: FiveElement; yinYang: YinYang }> = {
  甲: { element: '木', yinYang: '阳' }, 乙: { element: '木', yinYang: '阴' },
  丙: { element: '火', yinYang: '阳' }, 丁: { element: '火', yinYang: '阴' },
  戊: { element: '土', yinYang: '阳' }, 己: { element: '土', yinYang: '阴' },
  庚: { element: '金', yinYang: '阳' }, 辛: { element: '金', yinYang: '阴' },
  壬: { element: '水', yinYang: '阳' }, 癸: { element: '水', yinYang: '阴' },
}

export const BRANCH_ELEMENTS: Record<EarthlyBranch, FiveElement> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

export const HIDDEN_STEMS: Record<EarthlyBranch, HeavenlyStem[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
}

const tenGodRows: Record<HeavenlyStem, TenGod[]> = {
  甲: ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'],
  乙: ['劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印'],
  丙: ['偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官'],
  丁: ['正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀'],
  戊: ['七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财'],
  己: ['正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财'],
  庚: ['偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官'],
  辛: ['正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神'],
  壬: ['食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财'],
  癸: ['伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩'],
}

export const TEN_GODS: Record<HeavenlyStem, Record<HeavenlyStem, TenGod>> = Object.fromEntries(
  HEAVENLY_STEMS.map((dayStem) => [dayStem, Object.fromEntries(HEAVENLY_STEMS.map((target, index) => [target, tenGodRows[dayStem][index]]))]),
) as Record<HeavenlyStem, Record<HeavenlyStem, TenGod>>

function pairMap(pairs: Array<[string, string]>) {
  return Object.fromEntries(pairs.flatMap(([pair, value]) => [[pair.slice(0, 2), value], [pair.slice(2, 4), value]])) as Record<string, string>
}

export const NA_YIN = pairMap([
  ['甲子乙丑', '海中金'], ['丙寅丁卯', '炉中火'], ['戊辰己巳', '大林木'], ['庚午辛未', '路旁土'], ['壬申癸酉', '剑锋金'],
  ['甲戌乙亥', '山头火'], ['丙子丁丑', '涧下水'], ['戊寅己卯', '城头土'], ['庚辰辛巳', '白蜡金'], ['壬午癸未', '杨柳木'],
  ['甲申乙酉', '泉中水'], ['丙戌丁亥', '屋上土'], ['戊子己丑', '霹雳火'], ['庚寅辛卯', '松柏木'], ['壬辰癸巳', '长流水'],
  ['甲午乙未', '沙中金'], ['丙申丁酉', '山下火'], ['戊戌己亥', '平地木'], ['庚子辛丑', '壁上土'], ['壬寅癸卯', '金箔金'],
  ['甲辰乙巳', '覆灯火'], ['丙午丁未', '天河水'], ['戊申己酉', '大驿土'], ['庚戌辛亥', '钗钏金'], ['壬子癸丑', '桑柘木'],
  ['甲寅乙卯', '大溪水'], ['丙辰丁巳', '沙中土'], ['戊午己未', '天上火'], ['庚申辛酉', '石榴木'], ['壬戌癸亥', '大海水'],
])

const twelveStageRows: Record<HeavenlyStem, TwelveStage[]> = {
  甲: ['沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养', '长生'],
  乙: ['病', '衰', '帝旺', '临官', '冠带', '沐浴', '长生', '养', '胎', '绝', '墓', '死'],
  丙: ['胎', '养', '长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝'],
  丁: ['绝', '墓', '死', '病', '衰', '帝旺', '临官', '冠带', '沐浴', '长生', '养', '胎'],
  戊: ['胎', '养', '长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝'],
  己: ['绝', '墓', '死', '病', '衰', '帝旺', '临官', '冠带', '沐浴', '长生', '养', '胎'],
  庚: ['死', '墓', '绝', '胎', '养', '长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病'],
  辛: ['长生', '养', '胎', '绝', '墓', '死', '病', '衰', '帝旺', '临官', '冠带', '沐浴'],
  壬: ['帝旺', '衰', '病', '死', '墓', '绝', '胎', '养', '长生', '沐浴', '冠带', '临官'],
  癸: ['临官', '冠带', '沐浴', '长生', '养', '胎', '绝', '墓', '死', '病', '衰', '帝旺'],
}

export const TWELVE_STAGES: Record<HeavenlyStem, Record<EarthlyBranch, TwelveStage>> = Object.fromEntries(
  HEAVENLY_STEMS.map((stem) => [stem, Object.fromEntries(EARTHLY_BRANCHES.map((branch, index) => [branch, twelveStageRows[stem][index]]))]),
) as Record<HeavenlyStem, Record<EarthlyBranch, TwelveStage>>

export const JIA_ZI = Array.from({ length: 60 }, (_, index) => `${HEAVENLY_STEMS[index % 10]}${EARTHLY_BRANCHES[index % 12]}`)

const XUN_KONG = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑']

export function isHeavenlyStem(value: string): value is HeavenlyStem { return HEAVENLY_STEMS.includes(value as HeavenlyStem) }
export function isEarthlyBranch(value: string): value is EarthlyBranch { return EARTHLY_BRANCHES.includes(value as EarthlyBranch) }
export function getTenGod(dayStem: HeavenlyStem, targetStem: HeavenlyStem) { return TEN_GODS[dayStem][targetStem] }
export function getNaYin(ganZhi: string) { return NA_YIN[ganZhi] }
export function getTwelveStage(stem: HeavenlyStem, branch: EarthlyBranch) { return TWELVE_STAGES[stem][branch] }

export function getXun(ganZhi: string) {
  const index = JIA_ZI.indexOf(ganZhi)
  if (index < 0) return undefined
  return `${JIA_ZI[Math.floor(index / 10) * 10]}旬`
}

export function getXunKong(ganZhi: string) {
  const index = JIA_ZI.indexOf(ganZhi)
  return index < 0 ? undefined : XUN_KONG[Math.floor(index / 10)]
}

import type { FiveElement, HexagramDefinition, HexagramPalaceStage, HexagramSpecialType, TrigramDefinition, TrigramKey } from './types'
import zhouyiTexts from '../../data/zhouyiTexts.json'

export const trigramDefinitions: Record<TrigramKey, TrigramDefinition> = {
  qian: { key: 'qian', name: '乾', symbol: '☰', bits: '111', element: '金' },
  dui: { key: 'dui', name: '兑', symbol: '☱', bits: '110', element: '金' },
  li: { key: 'li', name: '离', symbol: '☲', bits: '101', element: '火' },
  zhen: { key: 'zhen', name: '震', symbol: '☳', bits: '100', element: '木' },
  xun: { key: 'xun', name: '巽', symbol: '☴', bits: '011', element: '木' },
  kan: { key: 'kan', name: '坎', symbol: '☵', bits: '010', element: '水' },
  gen: { key: 'gen', name: '艮', symbol: '☶', bits: '001', element: '土' },
  kun: { key: 'kun', name: '坤', symbol: '☷', bits: '000', element: '土' },
}

export const trigramByBits = new Map(Object.values(trigramDefinitions).map((trigram) => [trigram.bits, trigram]))
const trigramOrder: TrigramKey[] = ['qian', 'dui', 'li', 'zhen', 'xun', 'kan', 'gen', 'kun']

const kingWenNumbers: Record<TrigramKey, number[]> = {
  qian: [1, 10, 13, 25, 44, 6, 33, 12],
  dui: [43, 58, 49, 17, 28, 47, 31, 45],
  li: [14, 38, 30, 21, 50, 64, 56, 35],
  zhen: [34, 54, 55, 51, 32, 40, 62, 16],
  xun: [9, 61, 37, 42, 57, 59, 53, 20],
  kan: [5, 60, 63, 3, 48, 29, 39, 8],
  gen: [26, 41, 22, 27, 18, 4, 52, 23],
  kun: [11, 19, 36, 24, 46, 7, 15, 2],
}

const names = [
  '乾为天', '坤为地', '水雷屯', '山水蒙', '水天需', '天水讼', '地水师', '水地比', '风天小畜', '天泽履', '地天泰', '天地否', '天火同人', '火天大有', '地山谦', '雷地豫',
  '泽雷随', '山风蛊', '地泽临', '风地观', '火雷噬嗑', '山火贲', '山地剥', '地雷复', '天雷无妄', '山天大畜', '山雷颐', '泽风大过', '坎为水', '离为火', '泽山咸', '雷风恒',
  '天山遁', '雷天大壮', '火地晋', '地火明夷', '风火家人', '火泽睽', '水山蹇', '雷水解', '山泽损', '风雷益', '泽天夬', '天风姤', '泽地萃', '地风升', '泽水困', '水风井',
  '泽火革', '火风鼎', '震为雷', '艮为山', '风山渐', '雷泽归妹', '雷火丰', '火山旅', '巽为风', '兑为泽', '风水涣', '水泽节', '风泽中孚', '雷山小过', '水火既济', '火水未济',
] as const

const basicMeanings = [
  '强调创造、担当与持续自强。', '强调承载、配合与顺势而行。', '事物处在初生阶段，需要梳理混乱并逐步建立秩序。', '面对未知时先学习、求证，再形成判断。',
  '条件尚在汇集，适合耐心准备并等待时机。', '观点或利益存在分歧，需要明确边界与证据。', '强调组织、纪律与共同目标。', '强调亲近、协作与辨认可以信任的关系。',
  '以小步积累形成约束和推动力。', '在规则与风险之间谨慎行进。', '上下沟通顺畅，适合维持交流与协作。', '联系受阻时，需要先处理隔阂与闭塞。',
  '强调求同存异以及公开合作。', '资源较为充足，重点在于妥善持有与使用。', '以谦逊调节位置和力量。', '动力被唤起，也需要避免沉浸于轻松表象。',
  '随势调整，但仍要保留自己的判断。', '积累的问题需要被整理、修复和更新。', '逐步接近与观察，适合建立长期视角。', '通过观察全局来调整自己的位置。',
  '需要清晰处理阻碍，建立可以执行的规则。', '重视外在呈现，同时核对内在是否扎实。', '旧结构逐层剥落，适合保存核心并减少消耗。', '经历低点后开始回返，适合恢复基本节奏。',
  '减少妄念与预设，以真实行动回应当下。', '积累与约束并重，先保存力量再决定行动。', '关注输入、养护和日常习惯如何塑造结果。', '承载接近极限，需要调整结构和负荷。',
  '面对反复风险时，以稳定和训练保持方向。', '强调清晰、依附与持续照亮。', '通过彼此感应建立联系，也要保持分寸。', '长期关系需要稳定原则和持续调整。',
  '适时退让可以保存空间和主动性。', '力量扩张时尤其需要克制与规则。', '逐步显现与前进，适合让能力被看见。', '外部受压时保护内在清明与核心价值。',
  '以清楚的分工和边界维持共同生活。', '差异已经显现，适合寻找仍可合作的部分。', '阻碍当前进路时，先调整方向与支援条件。', '困难开始松动，后续仍需要收尾和复盘。',
  '做减法以恢复平衡，把资源留给更重要之处。', '有针对性地增加投入，让已有基础得到发展。', '需要果断说明问题，同时留意行动方式。', '相遇带来影响，重点在于识别边界和持续性。',
  '人事汇集时，需要建立共同秩序和归属。', '积累与上升依赖稳定步骤，不宜跳过基础。', '受限环境中保存内在秩序，寻找可移动的空间。', '持续使用的资源需要维护其来源和公共性。',
  '旧方式需要更新，变化前先明确新的秩序。', '通过调整结构完成更新与转化。', '突发动力带来行动，也需要在震动后恢复秩序。', '知道何时停止，有助于重新建立边界。',
  '按阶段渐进，重视积累与关系中的次序。', '关系或位置转换较快，需要重新确认角色与承诺。', '信息和成果集中显现，注意盛大背后的持续性。', '身处过渡阶段时，轻装、守序并辨认落脚点。',
  '以柔和、持续的方式进入并影响局面。', '交流和愉悦有助于连接，也要避免只取悦表面。', '分散僵结，让信息与资源重新流动。', '用清晰尺度约束行动，避免过度或失控。',
  '以真诚和一致性建立信任。', '处理局部与细节，不宜用过大的动作解决小问题。', '事情接近完成，仍需维持秩序与警觉。', '阶段尚未完成，辨认次序后继续推进。',
] as const

export const palaceSequences: Record<TrigramKey, string[]> = {
  qian: ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
  kan: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
  gen: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
  zhen: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
  xun: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
  li: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
  kun: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
  dui: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
}

const shiLines = [6, 1, 2, 3, 4, 5, 4, 3]
const palaceStages: HexagramPalaceStage[] = ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂']
const sixClashNames = new Set(['乾为天', '兑为泽', '离为火', '震为雷', '巽为风', '坎为水', '艮为山', '坤为地', '雷天大壮', '天雷无妄'])
const sixHarmonyNames = new Set(['天地否', '泽水困', '火山旅', '雷地豫', '水泽节', '山火贲', '地雷复', '地天泰'])
const hexagramSeed = new Map<number, Omit<HexagramDefinition, 'palace' | 'palaceName' | 'palaceElement' | 'palaceSequence' | 'palaceStage' | 'specialTypes' | 'shiLine' | 'yingLine'>>()

for (const upper of trigramOrder) {
  kingWenNumbers[upper].forEach((number, lowerIndex) => {
    const lower = trigramOrder[lowerIndex]!
    const classicalText = zhouyiTexts[number - 1]!
    hexagramSeed.set(number, { number, name: names[number - 1]!, upper, lower, judgment: classicalText.judgment, lineTexts: classicalText.lineTexts as HexagramDefinition['lineTexts'], basicMeaning: basicMeanings[number - 1]! })
  })
}

export const hexagramDefinitions: HexagramDefinition[] = Array.from({ length: 64 }, (_, index) => {
  const seed = hexagramSeed.get(index + 1)!
  const palaceEntry = Object.entries(palaceSequences).find(([, sequence]) => sequence.includes(seed.name))!
  const palace = palaceEntry[0] as TrigramKey
  const palaceSequence = palaceEntry[1].indexOf(seed.name)
  const shiLine = shiLines[palaceSequence]!
  const yingLine = ((shiLine + 2) % 6) + 1
  const specialTypes: HexagramSpecialType[] = [
    ...(sixClashNames.has(seed.name) ? ['六冲' as const] : []),
    ...(sixHarmonyNames.has(seed.name) ? ['六合' as const] : []),
  ]
  return {
    ...seed,
    palace,
    palaceName: trigramDefinitions[palace].name,
    palaceElement: trigramDefinitions[palace].element,
    palaceSequence,
    palaceStage: palaceStages[palaceSequence]!,
    specialTypes,
    shiLine,
    yingLine,
  }
})

export const hexagramByNumber = new Map(hexagramDefinitions.map((hexagram) => [hexagram.number, hexagram]))
export const hexagramByTrigrams = new Map(hexagramDefinitions.map((hexagram) => [`${hexagram.upper}:${hexagram.lower}`, hexagram]))

export const naJiaByTrigram: Record<TrigramKey, { lower: [string, string, string]; upper: [string, string, string] }> = {
  qian: { lower: ['甲子', '甲寅', '甲辰'], upper: ['壬午', '壬申', '壬戌'] },
  kun: { lower: ['乙未', '乙巳', '乙卯'], upper: ['癸丑', '癸亥', '癸酉'] },
  zhen: { lower: ['庚子', '庚寅', '庚辰'], upper: ['庚午', '庚申', '庚戌'] },
  xun: { lower: ['辛丑', '辛亥', '辛酉'], upper: ['辛未', '辛巳', '辛卯'] },
  kan: { lower: ['戊寅', '戊辰', '戊午'], upper: ['戊申', '戊戌', '戊子'] },
  li: { lower: ['己卯', '己丑', '己亥'], upper: ['己酉', '己未', '己巳'] },
  gen: { lower: ['丙辰', '丙午', '丙申'], upper: ['丙戌', '丙子', '丙寅'] },
  dui: { lower: ['丁巳', '丁卯', '丁丑'], upper: ['丁亥', '丁酉', '丁未'] },
}

export const branchElements: Record<string, FiveElement> = {
  子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土',
}

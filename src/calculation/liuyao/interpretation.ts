import { branchElements } from './data'
import type { FiveElement, LiuyaoCalculationResult, LiuyaoLine } from './types'

export interface LiuyaoEvidenceBlock {
  title: string
  content: string
  evidence: string[]
}

export interface LiuyaoMovingLineReading {
  lineIndex: number
  originalText: string
  plainExplanation: string
  impact: string
  evidence: string[]
}

export interface LiuyaoDetailedInterpretation {
  overview: {
    coreTheme: string
    modernJudgment: string
    overallState: string
    evidence: string[]
  }
  movingLines: LiuyaoMovingLineReading[]
  movingClue: string
  changeDirection?: {
    direction: string
    relationship: string
    evidence: string[]
  }
  relationRules: string[]
  relationReadings: LiuyaoEvidenceBlock[]
  summary: {
    drivers: string
    resistance: string
    changes: string
    advice: string
    evidence: string[]
  }
  uncertainty: string
}

const positionMeanings: Record<number, string> = {
  1: '事情的起点、根基与最初动作',
  2: '内部配合、日常承接与稳定条件',
  3: '由内向外的转折、压力与取舍',
  4: '外部环境开始介入后的应对方式',
  5: '核心位置、主要决策与统筹责任',
  6: '阶段顶点、收束与过度之后的调整',
}

const relationMeanings = {
  兄弟: '同类、协作、竞争或资源分配',
  父母: '规则、文书、信息、保护与承载',
  子孙: '产出、缓解、表达与实际行动',
  官鬼: '责任、约束、压力与风险事项',
  妻财: '资源、成果、投入与可支配条件',
} as const

const spiritMeanings = {
  青龙: '资源、助力或较顺畅的表达',
  朱雀: '消息、沟通、公开表达与争议',
  勾陈: '牵连、旧事、程序或推进迟缓',
  腾蛇: '反复、疑虑、想象与信息待核',
  白虎: '压力、冲突、损耗与需要谨慎处理的部分',
  玄武: '隐藏信息、边界不清或尚未公开的因素',
} as const

const generating: Record<FiveElement, FiveElement> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const controlling: Record<FiveElement, FiveElement> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

function elementRelationship(from: FiveElement, to: FiveElement) {
  if (from === to) return `${from}与${to}同类，力量方向较一致`
  if (generating[from] === to) return `${from}生${to}，原爻力量向变化结果输出`
  if (generating[to] === from) return `${to}生${from}，变化结果对原爻形成承接`
  if (controlling[from] === to) return `${from}克${to}，原爻对变化结果形成制约`
  return `${to}克${from}，变化结果反过来约束原爻`
}

function lineFact(line: LiuyaoLine) {
  return `第${line.index}爻：${line.label}，${line.naJia}${line.element}，${line.relation}，${line.spirit}${line.shiYing ? `，临${line.shiYing}` : ''}`
}

function movingLineReading(result: LiuyaoCalculationResult, line: LiuyaoLine): LiuyaoMovingLineReading {
  const direction = line.yinYang === 'yin' ? '阴爻转为阳爻' : '阳爻转为阴爻'
  const relationChange = line.relation === line.changedRelation
    ? `六亲仍为${line.relation}`
    : `六亲由${line.relation}转为${line.changedRelation}`
  return {
    lineIndex: line.index,
    originalText: result.original.lineTexts[line.index - 1],
    plainExplanation: `这一爻位于${positionMeanings[line.index]}。当前以${line.relation}呈现，主要观察${relationMeanings[line.relation]}；${line.spirit}只补充“${spiritMeanings[line.spirit]}”这一象征性侧面，不能单独决定结论。`,
    impact: `${direction}，纳甲由${line.naJia}${line.element}转为${line.changedNaJia}${line.changedElement}，${relationChange}。${elementRelationship(line.element, line.changedElement)}。`,
    evidence: [lineFact(line), `变爻：${line.changedNaJia}${line.changedElement} · ${line.changedRelation}`, `原爻辞：${result.original.lineTexts[line.index - 1]}`],
  }
}

function relationToEnvironment(lineElement: FiveElement, environmentElement: FiveElement, label: string) {
  if (lineElement === environmentElement) return `${label}${environmentElement}与该爻同类，可作为同向背景观察`
  if (generating[environmentElement] === lineElement) return `${label}${environmentElement}生该爻${lineElement}，环境对该爻有承接作用`
  if (generating[lineElement] === environmentElement) return `该爻${lineElement}生${label}${environmentElement}，自身力量向环境输出`
  if (controlling[environmentElement] === lineElement) return `${label}${environmentElement}克该爻${lineElement}，环境构成约束`
  return `该爻${lineElement}克${label}${environmentElement}，需要投入力量处理外部条件`
}

export function createLiuyaoDetailedInterpretation(result: LiuyaoCalculationResult): LiuyaoDetailedInterpretation {
  const movingLines = result.lines.filter((line) => line.moving).map((line) => movingLineReading(result, line))
  const shiLine = result.lines.find((line) => line.shiYing === '世')!
  const yingLine = result.lines.find((line) => line.shiYing === '应')!
  const monthElement = branchElements[result.calendar.monthBranch]
  const dayBranch = result.calendar.dayGanZhi.slice(-1)
  const dayElement = branchElements[dayBranch]
  const voidLines = result.lines.filter((line) => result.calendar.xunKong.includes(line.branch))
  const movingFacts = result.lines.filter((line) => line.moving)

  const relationReadings: LiuyaoEvidenceBlock[] = [
    {
      title: '世爻与应爻',
      content: `世爻在第${shiLine.index}爻，以${shiLine.relation}、${shiLine.naJia}${shiLine.element}呈现，可作为提问者立场的观察点；应爻在第${yingLine.index}爻，以${yingLine.relation}、${yingLine.naJia}${yingLine.element}呈现，可作为外部对象或环境反馈的观察点。${elementRelationship(shiLine.element, yingLine.element)}。`,
      evidence: [lineFact(shiLine), lineFact(yingLine)],
    },
    {
      title: '六亲与六神',
      content: `${result.lines.map((line) => line.relation).filter((value, index, values) => values.indexOf(value) === index).map((relation) => `${relation}对应${relationMeanings[relation]}`).join('；')}。六神用于补充情境质感，本卦动爻${movingFacts.length ? `临${movingFacts.map((line) => `${line.spirit}（${spiritMeanings[line.spirit]}）`).join('、')}` : '为空，因此不从六神单独扩大判断'}。`,
      evidence: result.lines.map(lineFact),
    },
    {
      title: '月建、日辰与旬空',
      content: `月建为${result.calendar.monthBranch}${monthElement ?? ''}，日辰为${result.calendar.dayGanZhi}${dayElement ?? ''}。${monthElement ? relationToEnvironment(shiLine.element, monthElement, '月建') : ''}；${dayElement ? relationToEnvironment(shiLine.element, dayElement, '日辰') : ''}。旬空为${result.calendar.xunKong}，${voidLines.length ? `${voidLines.map((line) => `第${line.index}爻${line.branch}`).join('、')}落入旬空，相关信号的即时性需要保守观察` : '本卦六爻没有落入旬空'}；旬空不等于事情必然不存在。`,
      evidence: [`月建：${result.calendar.monthBranch}`, `日辰：${result.calendar.dayGanZhi}`, `旬空：${result.calendar.xunKong}`, ...voidLines.map(lineFact)],
    },
    {
      title: '动爻、变爻与生克',
      content: movingFacts.length
        ? movingFacts.map((line) => `第${line.index}爻${line.relation}发动，${elementRelationship(line.element, line.changedElement)}，并由${line.changedRelation}承接变化`).join('；') + '。这些关系描述力量方向，不直接等同于吉凶。'
        : '本卦没有动爻，六爻阴阳与纳甲关系保持不变，当前更适合围绕本卦与世应关系观察，而不人为制造变化方向。',
      evidence: movingFacts.length ? movingFacts.flatMap((line) => [lineFact(line), `变爻：${line.changedNaJia}${line.changedElement} · ${line.changedRelation}`]) : [`本卦与变卦均为第${result.original.number}卦${result.original.name}`],
    },
  ]

  const movingClue = movingLines.length === 0
    ? '无动爻，变卦同本卦。当前变化信号较少，应以本卦主题、世应和日月环境作为主要观察依据。'
    : movingLines.length === 1
      ? `只有第${movingLines[0]!.lineIndex}爻发动，变化线索相对集中，优先核对这一爻所在位置与六亲所指的现实事项。`
      : `共有${movingLines.length}个动爻，变化由下往上依次经过${movingLines.map((line) => `第${line.lineIndex}爻`).join('、')}；应分别核对各爻事实，不把其中一爻当作唯一答案。`

  const driverLines = movingFacts.filter((line) => line.relation === '父母' || line.relation === '子孙' || line.relation === '妻财')
  const resistanceLines = movingFacts.filter((line) => line.relation === '官鬼' || voidLines.includes(line))
  const driver = driverLines.length
    ? `${driverLines.map((line) => `第${line.index}爻${line.relation}`).join('、')}发动，为信息承接、实际行动或资源变化提供推动线索。`
    : `主要推动因素来自世爻第${shiLine.index}爻的${shiLine.relation}定位，以及月建、日辰对它的实际支持程度。`
  const resistance = resistanceLines.length
    ? `${resistanceLines.map((line) => `第${line.index}爻${line.relation}${voidLines.includes(line) ? '且入旬空' : ''}`).join('、')}需要优先核对，可能对应约束、延迟或尚未落实的信息。`
    : `卦中没有动爻官鬼或动爻旬空形成的集中阻力，仍需留意应爻第${yingLine.index}爻所代表的外部反馈。`

  return {
    overview: {
      coreTheme: `本卦为第${result.original.number}卦${result.original.name}，核心主题是：${result.original.basicMeaning}`,
      modernJudgment: result.original.judgment
        ? `卦辞“${result.original.judgment}”保留古义表达；落实到当前阅读，可先理解为：${result.original.basicMeaning}`
        : `本卦没有单列卦辞，当前以卦名、卦序和基础卦义作为主题依据：${result.original.basicMeaning}`,
      overallState: result.movingLines.length
        ? `当前处于“${result.original.name}”向“${result.changed.name}”变化的过程中，${result.movingLines.length}个动爻说明变化发生在${result.movingLines.map((index) => positionMeanings[index]).join('、')}。`
        : `当前以“${result.original.name}”的主题为主，无动爻表示排盘中没有明确的阴阳翻转；这不等于现实静止，而是本次卦象未给出独立变爻。`,
      evidence: [`本卦：第${result.original.number}卦${result.original.name}`, `卦辞：${result.original.judgment || '无'}`, `基础卦义：${result.original.basicMeaning}`, `动爻：${result.movingLines.length ? result.movingLines.join('、') : '无'}`],
    },
    movingLines,
    movingClue,
    changeDirection: result.movingLines.length ? {
      direction: `变卦为第${result.changed.number}卦${result.changed.name}，代表动爻完成阴阳变化后形成的发展方向。其基础主题是：${result.changed.basicMeaning}`,
      relationship: `本卦“${result.original.name}”描述当前结构，变卦“${result.changed.name}”描述动爻变化后的结构；两者之间的桥梁是${result.movingLines.map((line) => `第${line}爻`).join('、')}，不能跳过动爻直接把变卦当作确定结果。`,
      evidence: [`本卦：第${result.original.number}卦${result.original.name}`, `变卦：第${result.changed.number}卦${result.changed.name}`, ...movingFacts.map(lineFact)],
    } : undefined,
    relationRules: [
      '世爻用于观察提问者或事情主体，应爻用于观察对方、对象或外部环境；两者是关系位置，不自动代表吉凶。',
      '六亲依据各爻五行与卦宫五行的生克关系确定；六神只补充情境象征，不能单独下结论。',
      '月建与日辰用于观察当下环境对各爻的扶助或制约；旬空提示即时性和落实程度需要核对，不等于绝对无效。',
      '动爻显示本次排盘中的变化位置，变爻说明阴阳翻转后的关系；生克描述力量方向，不自动等同于成败。',
      '本地规则不自动选择用神。若要围绕具体问题选择用神，需要另行说明选择依据和备选解释。',
    ],
    relationReadings,
    summary: {
      drivers: driver,
      resistance,
      changes: movingClue,
      advice: '先把世爻、应爻和每个动爻对应到可核实的现实角色或事项，再观察日月环境所示的支持与制约。保留备选解释，用后续事实复盘，不据此作绝对成败或精确时间判断。',
      evidence: [lineFact(shiLine), lineFact(yingLine), ...movingFacts.map(lineFact), `月建：${result.calendar.monthBranch}`, `日辰：${result.calendar.dayGanZhi}`, `旬空：${result.calendar.xunKong}`],
    },
    uncertainty: '本解读只依据当前卦象、纳甲、世应、六亲、六神、月建、日辰和旬空进行本地规则整理；未自动选择用神，也不提供绝对成败、精确应期或替代现实决策。',
  }
}

function displayDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value))
}

const liuyaoCopyPrompt = '请结合我提出的问题，对以上六爻排盘进行详细解读。必须以现有卦象和排盘数据为依据，不得修改本卦、变卦、动爻或排盘字段。请说明用神选择、旺衰、生克、世应和动变依据，并区分排盘事实、规则推断、不确定性与现实建议。不要使用绝对化或恐吓式表达。'

export function buildLiuyaoCopyText(input: {
  question?: string
  castAt: string
  result: LiuyaoCalculationResult
  interpretation: LiuyaoDetailedInterpretation
}) {
  const { result, interpretation } = input
  const lines = [
    '【六爻完整解读信息】',
    `用户原问题：${input.question?.trim() || '未填写问题'}`,
    `起卦时间：${displayDateTime(input.castAt)}`,
    '',
    '【排盘事实】',
    ...result.lines.map((line) => `第${line.index}爻（由下往上）：${line.label}（${line.yinYang === 'yang' ? '阳爻' : '阴爻'}）`),
    `本卦：第${result.original.number}卦 ${result.original.name}（${result.original.palaceName}宫 · ${result.original.palaceElement}）`,
    `变卦：第${result.changed.number}卦 ${result.changed.name}${result.movingLines.length ? '' : '（无动爻，与本卦相同）'}`,
    `动爻：${result.movingLines.length ? result.movingLines.map((line) => `第${line}爻`).join('、') : '无'}`,
    `八宫归属：${result.original.palaceName}宫 · ${result.original.palaceElement}`,
    `卦辞：${result.original.judgment || '无'}`,
    ...result.movingLines.map((line) => `第${line}爻爻辞：${result.original.lineTexts[line - 1]}`),
    `月建：${result.calendar.monthBranch}`,
    `日辰：${result.calendar.dayGanZhi}`,
    `旬空：${result.calendar.xunKong}`,
    '',
    '【六爻排盘】',
    ...[...result.lines].reverse().map((line) => `第${line.index}爻：${line.spirit}｜${line.shiYing ?? '—'}｜${line.relation}｜纳甲${line.naJia}${line.element}｜${line.label}${line.moving ? `｜变${line.changedNaJia}${line.changedElement} ${line.changedRelation}` : ''}`),
    '',
    '【本地详细解读】',
    `本卦核心主题：${interpretation.overview.coreTheme}`,
    `卦辞现代解释：${interpretation.overview.modernJudgment}`,
    `当前整体状态：${interpretation.overview.overallState}`,
    ...interpretation.movingLines.flatMap((line) => [
      `第${line.lineIndex}爻原爻辞：${line.originalText}`,
      `通俗解释：${line.plainExplanation}`,
      `对整体方向的影响：${line.impact}`,
    ]),
    `主要变化线索：${interpretation.movingClue}`,
    ...(interpretation.changeDirection ? [
      `变卦方向：${interpretation.changeDirection.direction}`,
      `本卦与变卦关系：${interpretation.changeDirection.relationship}`,
    ] : []),
    '规则依据：',
    ...interpretation.relationRules.map((rule) => `- ${rule}`),
    ...interpretation.relationReadings.map((reading) => `${reading.title}：${reading.content}\n依据：${reading.evidence.join('；')}`),
    `主要推动因素：${interpretation.summary.drivers}`,
    `主要阻力：${interpretation.summary.resistance}`,
    `值得观察的变化：${interpretation.summary.changes}`,
    `行动建议：${interpretation.summary.advice}`,
    `不确定性：${interpretation.uncertainty}`,
    '',
    liuyaoCopyPrompt,
  ]
  return lines.join('\n')
}

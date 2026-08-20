import type { TarotOrientation, TarotSpread } from '../models/types'

export interface TarotReadingCard {
  id: string
  nameZh: string
  nameEn: string
  orientation: TarotOrientation
  position: string
  arcana: 'major' | 'minor'
  suit?: string
  rank?: string
  element: string
  keywords: string[]
  basicMeaning: string
}

export interface TarotReadingSection {
  id: string
  title: string
  content: string
  evidence: string[]
}

export interface TarotSpreadInterpretation {
  spread: TarotSpread
  spreadName: string
  summary: string
  sections: TarotReadingSection[]
  patterns: string[]
  uncertainty: string
}

const spreadNames: Record<TarotSpread, string> = {
  single: '单牌',
  three: '三牌',
  'dual-path': '五张双路径',
}

const suitDetails: Record<string, { name: string; element: string }> = {
  wands: { name: '权杖', element: '火' },
  cups: { name: '圣杯', element: '水' },
  swords: { name: '宝剑', element: '风' },
  pentacles: { name: '星币', element: '土' },
}

const rankLabels: Record<string, string> = {
  ace: '一', two: '二', three: '三', four: '四', five: '五', six: '六', seven: '七',
  eight: '八', nine: '九', ten: '十', page: '侍从', knight: '骑士', queen: '王后', king: '国王',
}

export function getTarotElement(arcana: 'major' | 'minor', suit?: string) {
  return arcana === 'major' ? '大阿卡纳主题' : suitDetails[suit ?? '']?.element ?? '未分类'
}

function orientationLabel(card: TarotReadingCard) {
  return card.orientation === 'reversed' ? '逆位' : '正位'
}

function cardFact(card: TarotReadingCard) {
  const detail = card.arcana === 'major'
    ? '大阿卡纳'
    : `${suitDetails[card.suit ?? '']?.name ?? card.suit ?? '小阿卡纳'}${rankLabels[card.rank ?? ''] ?? ''} · ${card.element}元素`
  return `${card.position}：${card.nameZh}（${orientationLabel(card)}，${detail}）`
}

function cardFocus(card: TarotReadingCard) {
  const keywords = card.keywords.slice(0, 2).join('、') || '观察与调整'
  const direct = card.orientation === 'upright'
  switch (card.position) {
    case '当前提示':
      return `${card.nameZh}${orientationLabel(card)}把当前主题落在“${keywords}”。${direct ? '这股力量可以直接转成观察或行动。' : '先辨认其中的延迟、内耗或边界，再决定下一步。'}`
    case '现状':
      return `现状位的${card.nameZh}${orientationLabel(card)}描述眼下最明显的背景：“${keywords}”。${direct ? '已有条件相对可见，可以从事实层面确认。' : '部分信息或感受尚未理顺，现状不宜被过早定性。'}`
    case '阻碍':
      return `阻碍位由${card.nameZh}${orientationLabel(card)}占据，卡点更接近“${keywords}”。${direct ? '这是一项需要正面处理的现实任务。' : '阻力可能来自内部失衡或尚未澄清的条件。'}`
    case '建议':
      return `建议位的${card.nameZh}${orientationLabel(card)}给出的操作方向是“${keywords}”。${direct ? '适合从小范围尝试并观察反馈。' : '建议先修正节奏和前提，不把逆位理解成禁止行动。'}`
    case '当前状态':
      return `当前状态位由${card.nameZh}${orientationLabel(card)}呈现，两条路径共同从“${keywords}”出发。${direct ? '当前基础较清楚，可据此比较后续路径。' : '比较之前仍需补齐信息、边界或心理准备。'}`
    case 'A 路径发展':
      return `A 路径发展位呈现${card.nameZh}${orientationLabel(card)}，“${keywords}”是推进过程中的主要机制。${direct ? '它能为 A 提供持续支点。' : 'A 在执行中需要为这处摩擦预留调整空间。'}`
    case 'A 路径结果':
      return `A 路径结果位由${card.nameZh}${orientationLabel(card)}描绘，较可能把关注点带向“${keywords}”。${direct ? '这是 A 值得争取的阶段状态。' : '它提示 A 的后段仍有收尾或重新校准，不是确定失败。'}`
    case 'B 路径发展':
      return `B 路径发展位的动力来自${card.nameZh}${orientationLabel(card)}，过程会反复触及“${keywords}”。${direct ? 'B 的推进方式相对明确。' : 'B 需要控制消耗，并及时核对方向是否偏移。'}`
    case 'B 路径结果':
      return `B 路径结果位落在${card.nameZh}${orientationLabel(card)}，最终关注更偏向“${keywords}”。${direct ? '这是 B 可能形成的阶段成果。' : '它更像后段的条件提醒，不应写成命定结局。'}`
    default:
      return `${card.position}由${card.nameZh}${orientationLabel(card)}呈现，重点落在“${keywords}”。`
  }
}

function countValues(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    if (value) counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

function repeatedEntries(values: string[]) {
  return Object.entries(countValues(values)).filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1])
}

function analysePatterns(cards: TarotReadingCard[]) {
  const patterns: string[] = []
  const majors = cards.filter((card) => card.arcana === 'major')
  const reversed = cards.filter((card) => card.orientation === 'reversed')
  const repeatedSuit = repeatedEntries(cards.map((card) => card.suit ?? ''))
  const repeatedRank = repeatedEntries(cards.filter((card) => card.arcana === 'minor').map((card) => card.rank ?? ''))
  const repeatedKeywords = repeatedEntries(cards.flatMap((card) => card.keywords))
  const elements = new Set(cards.filter((card) => card.arcana === 'minor').map((card) => card.element))

  if (majors.length >= 2) patterns.push(`${majors.length} 张大阿卡纳同时出现，说明这组牌更强调阶段性选择和核心态度，而不只是执行细节。`)
  if (reversed.length && reversed.length < cards.length) patterns.push(`正逆位并存：${cards.length - reversed.length} 张正位、${reversed.length} 张逆位，推进力量与需要校准的部分同时存在。`)
  if (reversed.length === cards.length && cards.length > 1) patterns.push('全部牌面为逆位，适合先处理阻滞、边界与信息不完整，再决定是否加速。')
  if (repeatedSuit.length) {
    const [suit, count] = repeatedSuit[0]!
    patterns.push(`${suitDetails[suit]?.name ?? suit}重复 ${count} 次，${suitDetails[suit]?.element ?? ''}元素主题被强化。`)
  }
  if (repeatedRank.length) {
    const [rank, count] = repeatedRank[0]!
    patterns.push(`数字或宫廷角色“${rankLabels[rank] ?? rank}”重复 ${count} 次，相同阶段特征在不同位置互相呼应。`)
  }
  if (repeatedKeywords.length) {
    const [keyword, count] = repeatedKeywords[0]!
    patterns.push(`关键词“${keyword}”出现 ${count} 次，是本牌阵最明确的重复信号之一。`)
  }
  if (elements.has('火') && elements.has('水')) patterns.push('火与水元素同时出现，行动速度与情绪承受之间可能需要重新配比。')
  if (elements.has('风') && elements.has('土')) patterns.push('风与土元素同时出现，想法和沟通需要接受现实资源与执行条件的检验。')
  if (!patterns.length) patterns.push('牌面没有形成明显的重复花色、数字或关键词，解读重点应回到各位置的具体职责。')
  return patterns
}

function tensionText(cards: TarotReadingCard[], patterns: string[]) {
  const reversed = cards.filter((card) => card.orientation === 'reversed')
  if (reversed.length) {
    return `主要张力来自${reversed.map((card) => `${card.position}的${card.nameZh}逆位`).join('、')}。它们并不等于失败，而是提醒相应位置仍有条件、节奏或边界需要核对。${patterns[0] ?? ''}`
  }
  return `牌面整体较为直接，主要矛盾不在“能不能”，而在不同位置的侧重点如何排序。${patterns[0] ?? ''}`
}

function pathStrengthAndRisk(development: TarotReadingCard, outcome: TarotReadingCard) {
  const strengths = [development, outcome].filter((card) => card.orientation === 'upright')
  const risks = [development, outcome].filter((card) => card.orientation === 'reversed')
  const strengthText = strengths.length
    ? `优势在于${strengths.map((card) => `${card.position}的“${card.keywords[0] ?? card.nameZh}”`).join('与')}可以形成直接支撑`
    : '优势需要通过主动澄清条件和控制投入来逐步建立'
  const riskText = risks.length
    ? `风险集中在${risks.map((card) => `${card.position}的“${card.keywords[0] ?? card.nameZh}”`).join('与')}，应预留复核和调整空间`
    : '风险主要是推进过快时忽略边界与现实反馈'
  return `${strengthText}；${riskText}。`
}

export function createTarotSpreadInterpretation(spread: TarotSpread, cards: TarotReadingCard[]): TarotSpreadInterpretation {
  const patterns = analysePatterns(cards)
  const byPosition = new Map(cards.map((card) => [card.position, card]))
  const sections: TarotReadingSection[] = []

  if (spread === 'single') {
    const card = cards[0]!
    sections.push(
      { id: 'theme', title: '当前主题', content: cardFocus(card), evidence: [cardFact(card)] },
      { id: 'reminder', title: '核心提醒', content: `${card.nameZh}${orientationLabel(card)}把注意力放在“${card.keywords.slice(0, 2).join('、')}”。${patterns[0]}`, evidence: [cardFact(card), ...patterns.slice(0, 1)] },
      { id: 'action', title: '行动建议', content: `先把“${card.keywords[0] ?? '当前主题'}”转成一个可验证的小步骤，再根据现实反馈调整；这张牌提供的是观察角度，不替代现实判断。`, evidence: [cardFact(card)] },
    )
  } else if (spread === 'three') {
    cards.forEach((card) => sections.push({ id: `position-${card.id}`, title: card.position, content: cardFocus(card), evidence: [cardFact(card)] }))
    const current = byPosition.get('现状') ?? cards[0]!
    const obstacle = byPosition.get('阻碍') ?? cards[1]!
    const advice = byPosition.get('建议') ?? cards[2]!
    sections.push(
      {
        id: 'development', title: '整体发展脉络',
        content: `脉络从${current.nameZh}${orientationLabel(current)}所示的“${current.keywords[0] ?? '现状'}”出发，经过${obstacle.nameZh}${orientationLabel(obstacle)}代表的“${obstacle.keywords[0] ?? '阻碍'}”，最后把可操作的出口交给${advice.nameZh}${orientationLabel(advice)}。三张牌需要按位置顺序阅读，不能把“建议”当成已经发生的结果。`,
        evidence: cards.map(cardFact),
      },
      { id: 'tension', title: '主要矛盾', content: tensionText(cards, patterns), evidence: [...cards.map(cardFact), ...patterns] },
      { id: 'action', title: '行动建议', content: `优先处理“阻碍”位置的${obstacle.keywords[0] ?? '限制条件'}，再试行“建议”位置的${advice.keywords[0] ?? '调整方向'}；保留复盘点，不把一次牌面当作确定结论。`, evidence: [cardFact(obstacle), cardFact(advice)] },
    )
  } else {
    cards.forEach((card) => sections.push({ id: `position-${card.id}`, title: card.position, content: cardFocus(card), evidence: [cardFact(card)] }))
    const current = byPosition.get('当前状态') ?? cards[0]!
    const aDevelopment = byPosition.get('A 路径发展') ?? cards[1]!
    const aOutcome = byPosition.get('A 路径结果') ?? cards[2]!
    const bDevelopment = byPosition.get('B 路径发展') ?? cards[3]!
    const bOutcome = byPosition.get('B 路径结果') ?? cards[4]!
    sections.push(
      {
        id: 'difference', title: 'A / B 核心差异',
        content: `两条路径都从${current.nameZh}${orientationLabel(current)}的当前状态出发。A 更突出“${aDevelopment.keywords[0] ?? aDevelopment.nameZh} → ${aOutcome.keywords[0] ?? aOutcome.nameZh}”，B 更突出“${bDevelopment.keywords[0] ?? bDevelopment.nameZh} → ${bOutcome.keywords[0] ?? bOutcome.nameZh}”。差异在推进方式和需要承担的风险，不代表其中一条必然成功。`,
        evidence: [cardFact(current), cardFact(aDevelopment), cardFact(aOutcome), cardFact(bDevelopment), cardFact(bOutcome)],
      },
      { id: 'path-a', title: 'A 路径：优势与风险', content: pathStrengthAndRisk(aDevelopment, aOutcome), evidence: [cardFact(aDevelopment), cardFact(aOutcome)] },
      { id: 'path-b', title: 'B 路径：优势与风险', content: pathStrengthAndRisk(bDevelopment, bOutcome), evidence: [cardFact(bDevelopment), cardFact(bOutcome)] },
      {
        id: 'action', title: '克制的行动建议',
        content: `比较两条路径时，分别核对资源、可逆性和最坏情况下的承受能力。可先验证 A 的“${aDevelopment.keywords[0] ?? '发展条件'}”与 B 的“${bDevelopment.keywords[0] ?? '发展条件'}”，再根据现实反馈选择，而不是只看结果位置。`,
        evidence: [cardFact(aDevelopment), cardFact(bDevelopment), ...patterns],
      },
    )
  }

  const summary = (() => {
    if (spread === 'single') {
      const card = cards[0]!
      return `${card.nameZh}${orientationLabel(card)}把本次重点放在“${card.keywords.slice(0, 2).join('、') || '当前主题'}”。`
    }
    if (spread === 'three') {
      const current = byPosition.get('现状') ?? cards[0]!
      const obstacle = byPosition.get('阻碍') ?? cards[1]!
      const advice = byPosition.get('建议') ?? cards[2]!
      return `牌阵从“${current.keywords[0] ?? current.nameZh}”展开，主要卡点是“${obstacle.keywords[0] ?? obstacle.nameZh}”，可从“${advice.keywords[0] ?? advice.nameZh}”开始调整。`
    }
    const aDevelopment = byPosition.get('A 路径发展') ?? cards[1]!
    const aOutcome = byPosition.get('A 路径结果') ?? cards[2]!
    const bDevelopment = byPosition.get('B 路径发展') ?? cards[3]!
    const bOutcome = byPosition.get('B 路径结果') ?? cards[4]!
    return `A 路径更偏向“${aDevelopment.keywords[0] ?? aDevelopment.nameZh} → ${aOutcome.keywords[0] ?? aOutcome.nameZh}”，B 路径更偏向“${bDevelopment.keywords[0] ?? bDevelopment.nameZh} → ${bOutcome.keywords[0] ?? bOutcome.nameZh}”；适合结合现实条件比较两边的代价与可行性。`
  })()

  return {
    spread,
    spreadName: spreadNames[spread],
    summary,
    sections,
    patterns,
    uncertainty: '塔罗牌面用于整理视角与行动选项，不构成确定预测；现实判断仍应结合可核实信息与实际条件。',
  }
}

function displayDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value))
}

const tarotCopyPrompt = '请结合我提出的问题，对以上塔罗牌阵进行完整解读。请逐项说明判断依据，综合比较各位置之间的关系，不要改变牌面和正逆位，不要使用绝对化或恐吓式表达，并区分牌面事实、解释与现实建议。'

export function buildTarotCopyText(input: {
  question?: string
  drawnAt: string
  cards: TarotReadingCard[]
  interpretation: TarotSpreadInterpretation
}) {
  const { interpretation, cards } = input
  const lines = [
    '【塔罗完整解读信息】',
    `用户原问题：${input.question?.trim() || '未填写问题'}`,
    `抽牌时间：${displayDateTime(input.drawnAt)}`,
    `牌阵类型：${interpretation.spreadName}`,
    '',
    '【牌面事实】',
    ...cards.flatMap((card, index) => [
      `${index + 1}. ${card.position}`,
      `牌名：${card.nameZh}${card.nameEn ? ` / ${card.nameEn}` : ''}`,
      `方向：${orientationLabel(card)}`,
      `类别：${card.arcana === 'major' ? '大阿卡纳' : `小阿卡纳 · ${suitDetails[card.suit ?? '']?.name ?? card.suit ?? ''} · ${card.element}元素 · ${rankLabels[card.rank ?? ''] ?? card.rank ?? ''}`}`,
      `关键词：${card.keywords.join('、') || '无'}`,
      `基础牌义：${card.basicMeaning}`,
      '',
    ]),
    '【本地综合解读】',
    interpretation.summary,
    ...interpretation.sections.flatMap((section) => [
      `${section.title}：${section.content}`,
      `依据：${section.evidence.join('；')}`,
    ]),
    `牌面关系：${interpretation.patterns.join('；')}`,
    `不确定性：${interpretation.uncertainty}`,
    '',
    tarotCopyPrompt,
  ]
  return lines.join('\n')
}

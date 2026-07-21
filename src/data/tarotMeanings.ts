import type { TarotCard } from '../models/types'
import { tarotCards } from './tarotCards'

export interface TarotMeaning {
  uprightKeywords: string[]
  reversedKeywords: string[]
  uprightMeaning: string
  reversedMeaning: string
}

export interface TarotKnowledgeCard extends TarotCard, TarotMeaning {}

const majorMeanings: TarotMeaning[] = [
  { uprightKeywords: ['开始', '自由', '好奇'], reversedKeywords: ['冒进', '准备不足', '边界'], uprightMeaning: '新的开始带来开放尝试的空间，适合保持好奇并留意脚下。', reversedMeaning: '行动前需要再检查准备和边界，避免只凭一时冲动。' },
  { uprightKeywords: ['主动', '资源', '创造'], reversedKeywords: ['分散', '误导', '执行脱节'], uprightMeaning: '已有资源可以被主动组织起来，适合把想法转成具体行动。', reversedMeaning: '资源或注意力较分散，表达与执行可能不同步。' },
  { uprightKeywords: ['直觉', '观察', '内在'], reversedKeywords: ['噪音', '迟疑', '信息不全'], uprightMeaning: '适合安静观察并听取内在感受，不必急着给出结论。', reversedMeaning: '信息尚不完整，直觉可能被焦虑或外界噪音干扰。' },
  { uprightKeywords: ['滋养', '丰盛', '创造'], reversedKeywords: ['透支', '失衡', '忽视自己'], uprightMeaning: '事物正在获得滋养，适合让创意和关系逐步生长。', reversedMeaning: '付出可能失衡，需要照顾自己的时间、身体与资源。' },
  { uprightKeywords: ['结构', '责任', '秩序'], reversedKeywords: ['僵化', '控制', '权责失衡'], uprightMeaning: '清晰的结构和责任边界有助于稳定推进。', reversedMeaning: '控制过强或规则缺乏弹性，可能压缩调整空间。' },
  { uprightKeywords: ['传统', '学习', '共同规则'], reversedKeywords: ['质疑', '旧框架', '自主'], uprightMeaning: '可从成熟经验、共同规则或可靠导师处获得帮助。', reversedMeaning: '旧框架未必适合眼前情况，需要重新检视其前提。' },
  { uprightKeywords: ['关系', '选择', '一致'], reversedKeywords: ['摇摆', '分歧', '期待不清'], uprightMeaning: '选择与关系都需要回到真实价值观，确认彼此是否一致。', reversedMeaning: '期待和立场尚未说清，选择容易在拉扯中摇摆。' },
  { uprightKeywords: ['推进', '专注', '掌控方向'], reversedKeywords: ['失速', '拉扯', '方向偏移'], uprightMeaning: '把力量集中在同一方向，能让事情更有节奏地推进。', reversedMeaning: '相反力量正在拉扯，需要重新校准目标和行动方式。' },
  { uprightKeywords: ['耐心', '勇气', '自控'], reversedKeywords: ['耗竭', '自我怀疑', '情绪化'], uprightMeaning: '温和而坚定的力量比强硬压制更能维持长期行动。', reversedMeaning: '精力或信心不足，容易被即时情绪带动。' },
  { uprightKeywords: ['独处', '反思', '寻找'], reversedKeywords: ['封闭', '疏离', '回避反馈'], uprightMeaning: '暂时独处有助于辨认自己的判断标准与真正需求。', reversedMeaning: '过度封闭可能错过外部反馈，也可能把思考变成回避。' },
  { uprightKeywords: ['周期', '转折', '变化'], reversedKeywords: ['停滞', '重复', '抗拒变化'], uprightMeaning: '局面处在周期转折中，需要给不可控因素留出位置。', reversedMeaning: '变化暂缓或旧循环重复，适合观察其中的固定模式。' },
  { uprightKeywords: ['公平', '事实', '责任'], reversedKeywords: ['偏差', '失衡', '标准不一'], uprightMeaning: '依据事实和一致标准作出权衡，并承担相应责任。', reversedMeaning: '信息或标准不对称，需要重新核对依据和责任边界。' },
  { uprightKeywords: ['暂停', '换角度', '放下'], reversedKeywords: ['拖延', '僵持', '无效等待'], uprightMeaning: '暂停与换角度观察，可能带来此前看不到的理解。', reversedMeaning: '停滞过久，需要确认等待是否仍有实际价值。' },
  { uprightKeywords: ['结束', '转变', '更新'], reversedKeywords: ['抗拒', '留恋', '难以收尾'], uprightMeaning: '旧阶段正在结束，腾出空间才能让新状态形成。', reversedMeaning: '对变化仍有阻力，未完成的告别拖慢了更新。' },
  { uprightKeywords: ['调和', '节制', '整合'], reversedKeywords: ['过度', '失衡', '节奏冲突'], uprightMeaning: '不同需要可以通过耐心调和，逐步找到合适比例。', reversedMeaning: '节奏或投入失衡，需要减少互相冲突的安排。' },
  { uprightKeywords: ['欲望', '依赖', '束缚'], reversedKeywords: ['松绑', '觉察', '恢复选择'], uprightMeaning: '看见欲望、依赖或惯性如何影响选择，是重要的第一步。', reversedMeaning: '束缚开始被识别，可以逐步恢复自己的选择权。' },
  { uprightKeywords: ['突变', '揭示', '重建'], reversedKeywords: ['延迟变化', '余震', '内在崩解'], uprightMeaning: '旧结构突然松动，隐藏的问题因此被迫显现。', reversedMeaning: '变化可能被延后，但结构中的问题仍需要面对。' },
  { uprightKeywords: ['希望', '修复', '方向'], reversedKeywords: ['失望', '信心不足', '需要落地'], uprightMeaning: '修复正在发生，长期方向值得以小步行动持续靠近。', reversedMeaning: '信心暂时不足，适合回到能够验证的小步骤。' },
  { uprightKeywords: ['模糊', '想象', '潜意识'], reversedKeywords: ['澄清', '迷雾消退', '核实'], uprightMeaning: '信息仍带有模糊和投射，需要给感受空间也需要核实。', reversedMeaning: '迷雾逐渐散开，但细节仍不适合仓促定论。' },
  { uprightKeywords: ['清晰', '活力', '喜悦'], reversedKeywords: ['延迟', '表达受阻', '短暂低落'], uprightMeaning: '局面更清晰，活力与成果也更容易被看见。', reversedMeaning: '积极面仍然存在，但表达或进展可能有所延迟。' },
  { uprightKeywords: ['复盘', '觉醒', '回应'], reversedKeywords: ['逃避总结', '迟疑', '旧题重现'], uprightMeaning: '回顾经验并回应真正重要的召唤，有助于作出阶段决定。', reversedMeaning: '迟迟不愿总结时，旧问题容易换一种形式再次出现。' },
  { uprightKeywords: ['完成', '整合', '新周期'], reversedKeywords: ['未收尾', '缺口', '接近完成'], uprightMeaning: '一个周期走向完成，经验被整合后可以进入下一阶段。', reversedMeaning: '已经接近完成，但仍有具体收尾事项需要处理。' },
]

const suitThemes = {
  wands: { uprightKeywords: ['行动', '动力', '创造'], reversedKeywords: ['分散', '受阻', '急躁'], upright: '行动、动力与创造', reversed: '动力分散或行动受阻' },
  cups: { uprightKeywords: ['感受', '关系', '交流'], reversedKeywords: ['失衡', '压抑', '沟通不畅'], upright: '感受、关系与情绪交流', reversed: '情绪失衡或沟通不畅' },
  swords: { uprightKeywords: ['思考', '沟通', '判断'], reversedKeywords: ['混乱', '冲突', '内耗'], upright: '思考、沟通与判断', reversed: '思路混乱或冲突内耗' },
  pentacles: { uprightKeywords: ['资源', '现实', '积累'], reversedKeywords: ['失衡', '迟缓', '不稳定'], upright: '资源、现实条件与稳定积累', reversed: '资源配置失衡或进展迟缓' },
} as const

const rankPhases: Record<string, { uprightKeywords: string[]; reversedKeywords: string[]; upright: string; reversed: string }> = {
  ace: { uprightKeywords: ['起点', '机会'], reversedKeywords: ['延后', '未成熟'], upright: '出现新的起点和可能性', reversed: '起点尚未成熟或机会被延后' },
  two: { uprightKeywords: ['平衡', '选择'], reversedKeywords: ['摇摆', '不协调'], upright: '需要比较、平衡或建立配合', reversed: '两端难以协调，选择暂不稳定' },
  three: { uprightKeywords: ['协作', '初步成果'], reversedKeywords: ['配合不顺', '尚未成形'], upright: '开始协作、扩展并看见初步成果', reversed: '协作不顺或成果尚未成形' },
  four: { uprightKeywords: ['稳定', '巩固'], reversedKeywords: ['松动', '不安'], upright: '进入稳定、停驻或巩固阶段', reversed: '稳定感不足，原有安排需要松动' },
  five: { uprightKeywords: ['挑战', '摩擦'], reversedKeywords: ['缓和', '余波'], upright: '出现摩擦、缺口或现实挑战', reversed: '冲突有缓和空间，但问题仍需处理' },
  six: { uprightKeywords: ['过渡', '调整'], reversedKeywords: ['停滞', '旧题牵制'], upright: '从前一阶段过渡并获得调整机会', reversed: '过渡不顺，旧问题仍在牵制' },
  seven: { uprightKeywords: ['评估', '坚持'], reversedKeywords: ['失去耐心', '策略有误'], upright: '需要评估、坚持并保护已有进展', reversed: '耐心下降或策略需要重新检查' },
  eight: { uprightKeywords: ['加速', '练习'], reversedKeywords: ['受阻', '重复消耗'], upright: '节奏加快，进入持续行动或练习', reversed: '进度受阻，重复劳动需要调整' },
  nine: { uprightKeywords: ['接近成果', '边界'], reversedKeywords: ['疲惫', '防线松动'], upright: '接近阶段成果，同时保持必要边界', reversed: '压力累积，恢复与边界不足' },
  ten: { uprightKeywords: ['完成周期', '承担'], reversedKeywords: ['过载', '未收尾'], upright: '一个周期达到高点并承担相应结果', reversed: '负担过重或收尾尚未完成' },
  page: { uprightKeywords: ['学习', '消息'], reversedKeywords: ['经验不足', '消息待核'], upright: '以学习者姿态接触新的信息', reversed: '经验不足，消息需要进一步核实' },
  knight: { uprightKeywords: ['推进', '投入'], reversedKeywords: ['冒进', '反复'], upright: '带着明确动力向目标推进', reversed: '推进过急或方向反复' },
  queen: { uprightKeywords: ['成熟', '内在稳定'], reversedKeywords: ['耗竭', '照顾失衡'], upright: '以内在稳定和成熟方式管理主题', reversed: '内在资源不足或照顾失衡' },
  king: { uprightKeywords: ['责任', '经验'], reversedKeywords: ['僵化', '权责失衡'], upright: '以责任、经验和整体视角处理主题', reversed: '权责失衡或判断过于僵化' },
}

function meaningFor(card: TarotCard): TarotMeaning {
  if (card.arcana === 'major') return majorMeanings[card.order]!
  const theme = suitThemes[card.suit ?? 'wands']
  const phase = rankPhases[card.rank ?? 'ace']!
  return {
    uprightKeywords: [...theme.uprightKeywords, ...phase.uprightKeywords],
    reversedKeywords: [...theme.reversedKeywords, ...phase.reversedKeywords],
    uprightMeaning: `${theme.upright}：${phase.upright}。`,
    reversedMeaning: `${theme.reversed}：${phase.reversed}。`,
  }
}

export const tarotKnowledgeCards: TarotKnowledgeCard[] = tarotCards.map((card) => ({ ...card, ...meaningFor(card) }))
export const tarotKnowledgeMap = new Map(tarotKnowledgeCards.map((card) => [card.id, card]))

export function getTarotKnowledge(cardId: string) {
  return tarotKnowledgeMap.get(cardId)
}

export function getTarotMeaning(cardId: string) {
  const card = getTarotKnowledge(cardId)
  return card ? {
    uprightKeywords: card.uprightKeywords,
    reversedKeywords: card.reversedKeywords,
    uprightMeaning: card.uprightMeaning,
    reversedMeaning: card.reversedMeaning,
  } : undefined
}

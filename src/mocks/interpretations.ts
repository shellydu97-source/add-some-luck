import type { Interpretation, RecordType } from '../models/types'

const common: Omit<Interpretation, 'headline' | 'conclusion' | 'evidence'> = {
  support: ['演示结果中的两项信息方向一致。'],
  conflicts: ['另有一项信息方向不同，因此不宜下绝对结论。'],
  uncertainty: '当前内容来自固定 mock，且未接入真实计算，不能用于实际判断。',
  advice: ['把可验证的现实信息放在前面。', '涉及医疗、法律或投资时，请使用对应专业意见。'],
}

export const interpretationMocks: Record<RecordType, Interpretation> = {
  bazi: {
    ...common,
    headline: '结构有侧重，但信息仍不完整',
    conclusion: '这是一份用于验证信息层级的八字解读快照，不代表真实命盘结论。',
    evidence: ['四柱与十神均为固定示例字段。', '大运时间轴尚未接入历法计算。'],
  },
  astrology: {
    ...common,
    headline: '可先看不依赖宫位的部分',
    conclusion: '当前星盘只用于演示页面结构；出生时间不精确时，宫位相关信息可信度更低。',
    evidence: ['行星落座与相位均为固定示例。', '宫位制仍为 system_default。'],
  },
  liuyao: {
    ...common,
    headline: '条件未定，暂不适合仓促推进',
    conclusion: '示例卦中存在推进与牵制并存的结构，只能作为流程演示。',
    evidence: ['本卦、变卦及动爻来自可复现 mock。', '世应、六亲、六神、纳甲为固定示例。'],
  },
  meihua: {
    ...common,
    headline: '先核对本卦、互卦、变卦与体用关系',
    conclusion: '梅花易数的本地基础说明只整理结构化卦象，不替代现实证据。',
    evidence: ['起卦数字、动爻与体用关系均保存于记录快照。'],
  },
  tarot: {
    ...common,
    headline: '先区分事实与当前投射',
    conclusion: '固定示例牌面提示先梳理条件，再比较路径；不代表事情必然如此发展。',
    evidence: ['牌序与正逆位由固定种子确定。', '问题文本不会改变已固定的牌。'],
  },
}

export function mockReply(type: RecordType, question: string) {
  const subject = question.length > 18 ? `${question.slice(0, 18)}…` : question
  return `这是关于“${subject}”的演示回复。它只引用当前已固定的${type === 'tarot' ? '牌面' : type === 'liuyao' || type === 'meihua' ? '卦象' : '盘面'}，不会更换底层结果。现有 mock 信息不足以支持更确定的判断。`
}

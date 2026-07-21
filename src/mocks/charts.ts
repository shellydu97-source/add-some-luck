export const baziOverviewMock = {
  pillars: ['甲子', '示例', '丙寅', '示例'],
  currentLuck: '2028—2037 · 固定示例',
  currentYear: '2026 · 固定示例',
}

export const baziRowsMock = [
  { label: '主星', values: ['示例', '示例', '示例', '示例'] },
  { label: '天干', values: ['甲', '示例', '丙', '示例'] },
  { label: '地支', values: ['子', '示例', '寅', '示例'] },
  { label: '藏干', values: ['示例', '示例', '示例', '示例'] },
  { label: '副星', values: ['示例', '示例', '示例', '示例'] },
  { label: '星运', values: ['示例', '示例', '示例', '示例'] },
  { label: '自坐', values: ['示例', '示例', '示例', '示例'] },
  { label: '空亡', values: ['示例', '示例', '示例', '示例'] },
  { label: '纳音', values: ['示例', '示例', '示例', '示例'] },
]

export const baziProfessionalMock = [
  { label: '十神关系', value: '固定示例' },
  { label: '阴阳五行分布', value: '固定示例' },
  { label: '合、冲、刑、害、破', value: '固定示例' },
  { label: '十二长生', value: '固定示例' },
  { label: '神煞', value: '固定示例' },
  { label: '格局、旺衰、喜忌', value: '待真实算法规则确认' },
]

export const luckCyclesMock = ['2018', '2028', '2038', '2048']
export const annualFortuneMock = ['2025', '2026', '2027', '2028']

export const astrologySummaryMock = [
  { label: '太阳', value: '狮子座 · 示例', confidence: '不依赖宫位' },
  { label: '月亮', value: '双子座 · 示例', confidence: '不依赖宫位' },
  { label: '上升', value: '固定示例', confidence: '依赖出生时间' },
]

export const planetsMock = [
  { body: '太阳', sign: '狮子座', degree: '07°13′', house: '第 10 宫', retrograde: '否' },
  { body: '月亮', sign: '双子座', degree: '18°20′', house: '第 8 宫', retrograde: '否' },
  { body: '金星', sign: '处女座', degree: '04°11′', house: '第 11 宫', retrograde: '否' },
  { body: '火星', sign: '天秤座', degree: '22°06′', house: '第 12 宫', retrograde: '是 · 示例' },
]

export const housesMock = [
  { house: '第 1 宫', cusp: '天秤座 12°30′', ruler: '金星 · 示例' },
  { house: '第 4 宫', cusp: '摩羯座 09°18′', ruler: '土星 · 示例' },
  { house: '第 7 宫', cusp: '白羊座 12°30′', ruler: '火星 · 示例' },
  { house: '第 10 宫', cusp: '巨蟹座 09°18′', ruler: '月亮 · 示例' },
]

export const aspectsMock = [
  { first: '太阳', aspect: '拱 △', second: '月亮', orb: '2°10′' },
  { first: '金星', aspect: '刑 □', second: '火星', orb: '1°45′' },
  { first: '月亮', aspect: '六合 ⚹', second: '水星', orb: '3°02′' },
]

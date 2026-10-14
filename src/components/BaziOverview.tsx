import type { BaziCalculationSuccess, BaziLuckCycle, HeavenlyStem } from '../calculation/bazi'
import { getTenGod } from '../calculation/bazi/rules'
import { termGlossary } from '../data/termGlossary'
import TermHelp from './TermHelp'
import { Card, SectionHeading } from './UI'

const SEASON: Record<string, string> = { 寅: '春季，木当令', 卯: '春季，木当令', 辰: '春末，土当令', 巳: '夏季，火当令', 午: '夏季，火当令', 未: '夏末，土当令', 申: '秋季，金当令', 酉: '秋季，金当令', 戌: '秋末，土当令', 亥: '冬季，水当令', 子: '冬季，水当令', 丑: '冬末，土当令' }

function tenGodLine(stemLabel: string, ganZhi: string, dayStem: HeavenlyStem) {
  const god = getTenGod(dayStem, ganZhi[0] as HeavenlyStem)
  const plain = termGlossary[god]?.plain?.split('。')[0]
  return <>{stemLabel}{ganZhi}，天干{ganZhi[0]}对你来说是<TermHelp term={god} />{plain ? `，${plain}。` : '。'}</>
}

// Plain facts only: who the day master is, the birth season, and the current luck and year.
export default function BaziOverview({ result, cycle, year }: { result: BaziCalculationSuccess; cycle?: BaziLuckCycle; year?: string }) {
  const { day, month } = result.pillars
  const dayStem = day.status === 'available' ? day.gan : undefined
  return <Card><SectionHeading title="命盘速览" />
    <p>{day.status === 'available' ? <>你的<TermHelp term="日主" />是{day.gan}，五行属{day.fiveElements.stem}，代表你自己。</> : '出生时间不足以确定日主，请核对出生信息。'}</p>
    <p>{month.status === 'available' ? <>你生在{SEASON[month.zhi]}（<TermHelp term="月令" />{month.zhi}）。</> : '出生日期正好在换月的节气附近，需要确认出生时间。'}</p>
    {dayStem && cycle && <p>{tenGodLine('当前大运是', cycle.ganZhi, dayStem)}</p>}
    {dayStem && year && <p>{tenGodLine('今年流年是', year, dayStem)}</p>}
    {!cycle && <p className="helper">大运需要准确的出生时间才能排出。</p>}
  </Card>
}

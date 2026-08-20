import { useMemo, useState } from 'react'
import { calculateAlmanac } from '../calculation/almanac'
import DatePicker from '../components/DatePicker'
import TopBar from '../components/TopBar'
import { Button, Card, SectionHeading } from '../components/UI'
import { formatDateParts, parseDateParts, shiftDate } from '../utils/date'

function shanghaiToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}/${value.month}/${value.day}`
}

function ChipList({ items, empty = '无特别事项' }: { items: string[]; empty?: string }) {
  return <div className="almanac-chip-list">{items.length ? items.map((item) => <span key={item}>{item}</span>) : <span className="muted-chip">{empty}</span>}</div>
}

export default function TodayPage() {
  const [date, setDate] = useState(shanghaiToday)
  const result = useMemo(() => {
    try { return { value: calculateAlmanac(date) } }
    catch (error) { return { error: error instanceof Error ? error.message : '当前日期无法生成黄历。' } }
  }, [date])

  function moveDay(amount: number) {
    const parts = parseDateParts(date)
    if (parts) setDate(formatDateParts(shiftDate(parts, amount, 'day')))
  }

  return <div className="today-page almanac-page">
    <TopBar title="今日黄历" eyebrow="择日参考" />
    <Card className="almanac-date-nav">
      <Button className="secondary almanac-arrow" onClick={() => moveDay(-1)} aria-label="前一天">←</Button>
      <DatePicker label="选择日期" value={date} onChange={setDate} minYear={1901} allowFuture required />
      <Button className="secondary almanac-arrow" onClick={() => moveDay(1)} aria-label="后一天">→</Button>
      <Button className="secondary almanac-today" onClick={() => setDate(shanghaiToday())}>今天</Button>
    </Card>

    {'error' in result ? <Card><p className="field-error">{result.error}</p></Card> : <>
      <Card className="almanac-hero">
        <div><span className="summary-label">{result.value.solarDate} · 星期{result.value.week}</span><h2>{result.value.pillars.year}年 · {result.value.pillars.month}月 · {result.value.pillars.day}日</h2><p>{result.value.lunarYear}{result.value.zodiac}年 · 农历{result.value.lunarDate}</p></div>
        {(result.value.solarTerm || result.value.festivals.length > 0) && <div className="almanac-special"><b>{result.value.solarTerm || result.value.festivals[0]}</b>{result.value.festivals.map((item) => <span key={item}>{item}</span>)}</div>}
      </Card>

      <div className="almanac-yi-ji">
        <Card className="almanac-good"><SectionHeading title="宜" /><ChipList items={result.value.yi} /></Card>
        <Card className="almanac-caution"><SectionHeading title="忌" /><ChipList items={result.value.ji} /></Card>
      </div>

      <Card><SectionHeading title="今日值日" /><div className="almanac-facts">
        <div><span>十二建星</span><b>{result.value.dayOfficer}日</b></div><div><span>值神</span><b>{result.value.tianShen.name} · {result.value.tianShen.luck}</b></div>
        <div><span>星宿</span><b>{result.value.xiu.name}宿 · {result.value.xiu.luck}</b></div><div><span>冲煞</span><b>冲{result.value.chong} · 煞{result.value.sha}</b></div>
      </div></Card>

      <Card><SectionHeading title="吉神与凶煞" /><div className="almanac-spirit-grid"><div><b>吉神宜趋</b><ChipList items={result.value.jiShen} /></div><div><b>凶神宜忌</b><ChipList items={result.value.xiongSha} /></div></div></Card>

      <Card><SectionHeading title="方位与日忌" />
        <div className="almanac-facts three"><div><span>喜神</span><b>{result.value.positions.xi}</b></div><div><span>福神</span><b>{result.value.positions.fu}</b></div><div><span>财神</span><b>{result.value.positions.cai}</b></div></div>
        <div className="almanac-notes"><div><b>彭祖百忌</b><p>{result.value.pengZu.join('；')}</p></div><div><b>胎神方位</b><p>{result.value.taiShen}</p></div></div>
      </Card>
    </>}
  </div>
}

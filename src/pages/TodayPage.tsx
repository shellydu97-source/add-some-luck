import { useMemo } from 'react'
import { analyzeBaziFlow, calculateBazi, calculateBaziFlowDate, type TenGod } from '../calculation/bazi'
import PersonSwitcher from '../components/PersonSwitcher'
import TermHelp from '../components/TermHelp'
import TopBar from '../components/TopBar'
import { Card, ConfidenceNote, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import { getActiveProfile, useAppStore } from '../storage/store'

const tenGodFocus: Record<TenGod, { theme: string; note: string }> = {
  比肩: { theme: '自主与协作', note: '适合把自己的判断说清楚，也留意同伴之间的分工。' },
  劫财: { theme: '竞争与取舍', note: '涉及资源或共同决定时，先把边界和优先级讲明白。' },
  食神: { theme: '表达与推进', note: '适合把已有想法落成具体步骤，避免只停在构想里。' },
  伤官: { theme: '调整与表达', note: '表达会更直接，重要沟通可以先理顺事实和语气。' },
  偏财: { theme: '机会与流动', note: '容易接触临时机会，也要留意时间、精力和预算的分配。' },
  正财: { theme: '秩序与落实', note: '适合处理清单、账目和需要持续完成的现实事项。' },
  七杀: { theme: '压力与行动', note: '事情可能更催促，先抓关键任务，避免被紧迫感带着走。' },
  正官: { theme: '责任与规则', note: '适合处理正式事项，重要承诺和流程需要逐项确认。' },
  偏印: { theme: '观察与转换', note: '适合换个角度研究问题，但要防止信息过多而迟迟不动。' },
  正印: { theme: '学习与支持', note: '适合学习、整理资料，也可以主动寻求可靠经验。' },
}

function todayInShanghai() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return { input: `${value.year}/${value.month}/${value.day}`, display: `${value.year}年${value.month}月${value.day}日` }
}

function availableGanZhi(calendar: ReturnType<typeof calculateBaziFlowDate>, key: 'year' | 'month' | 'day') {
  if (!calendar.ok) return '—'
  const value = calendar[key]
  return value.status === 'available' ? value.ganZhi : value.candidates.join(' / ')
}

export default function TodayPage() {
  const store = useAppStore()
  const profile = getActiveProfile(store)
  const today = useMemo(() => todayInShanghai(), [])
  const calendar = useMemo(() => calculateBaziFlowDate(today.input), [today.input])
  const bazi = useMemo(() => profile ? calculateBazi(profile) : undefined, [profile])
  const analysis = useMemo(() => {
    if (!bazi?.ok || !calendar.ok || calendar.day.status !== 'available') return undefined
    return analyzeBaziFlow(bazi, calendar.day.ganZhi, '今日流日')
  }, [bazi, calendar])
  const focus = analysis ? tenGodFocus[analysis.stemTenGod] : undefined

  return <div className="today-page">
    <TopBar title="今日运势" eyebrow={today.display} action={<PersonSwitcher compact />} />

    <Card className="today-calendar-card">
      <span className="summary-label">今日干支</span>
      <h2>{availableGanZhi(calendar, 'year')}年 · {availableGanZhi(calendar, 'month')}月 · {availableGanZhi(calendar, 'day')}日</h2>
      <p className="helper">{calendar.ok ? calendar.lunarDate : calendar.error.message}</p>
    </Card>

    {!profile && <EmptyState title="选择人物后查看个人提示" action={<LinkButton to="/profiles/new">建立人物档案</LinkButton>}>今天的日期信息可以直接查看；个人部分需要出生资料。</EmptyState>}

    {profile && !bazi?.ok && <EmptyState title="暂时无法生成个人提示" action={<LinkButton to={`/profiles/${profile.id}/edit`}>检查出生信息</LinkButton>}>请先核对出生日期、历法和闰月信息。</EmptyState>}

    {profile && bazi?.ok && <>
      <Card className="today-focus-card">
        <div className="card-kicker"><span>{profile.name} · 今日重点</span></div>
        <h2>{focus?.theme ?? '按当日节奏安排事情'}</h2>
        <p>{focus?.note ?? '今天的个人流日信息暂时无法完整生成，请以实际情况为准。'}</p>
        {analysis && <div className="chip-row">
          <span className="chip"><TermHelp term={analysis.stemTenGod} />{analysis.stemTenGod}</span>
          <span className="chip">{analysis.stemElement}{analysis.branchElement}</span>
          <span className="chip"><TermHelp term="十二长生" />{analysis.twelveStage}</span>
          <span className="chip"><TermHelp term="纳音" />{analysis.naYin}</span>
        </div>}
      </Card>

      {analysis && <Card>
        <SectionHeading title="今天与命盘的关系" />
        {!!analysis.shenSha.length && <div className="today-fact-block"><b>今日神煞</b><div className="chip-row">{analysis.shenSha.map((item, index) => <span className="chip" key={`${item.name}-${index}`}><TermHelp term={item.name} />{item.name}</span>)}</div></div>}
        {!!analysis.relations.length && <ul className="plain-list today-relations">{analysis.relations.map((item, index) => <li key={`${item.kind}-${index}`}><b>{item.kind}</b>：{item.text}</li>)}</ul>}
        {!analysis.shenSha.length && !analysis.relations.length && <p className="helper">今天没有命中当前收录的常用神煞或完整干支关系。</p>}
        <p className="fact-boundary">以上是当天干支与原命盘形成的结构信息，不等同于确定会发生的事情。</p>
      </Card>}

      {profile.timeAccuracy === 'unknown' && <ConfidenceNote>出生时间未知，今日信息不使用时柱相关内容。</ConfidenceNote>}
      <LinkButton to={`/charts/${profile.id}/bazi`}>查看完整命理与运势</LinkButton>
    </>}
  </div>
}

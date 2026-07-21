import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import PersonSwitcher from '../components/PersonSwitcher'
import { Button, Card, ConfidenceNote, DemoBadge, EmptyState, LinkButton, Segmented, SectionHeading } from '../components/UI'
import { getActiveProfile, useAppStore } from '../storage/store'
import { getMockFortune } from '../mocks/fortune'
import type { FortunePeriodType } from '../models/types'

const periods = [
  { value: 'day' as const, label: '每日' }, { value: 'week' as const, label: '每周' }, { value: 'month' as const, label: '每月' },
]
const dimensionLabels = { relationships: '感情与人际', work: '工作与学习', finance: '财务节奏', wellbeing: '情绪与状态' }

function shiftAnchor(anchor: Date, period: FortunePeriodType, direction: number) {
  const next = new Date(anchor)
  if (period === 'month') next.setMonth(next.getMonth() + direction)
  else next.setDate(next.getDate() + direction * (period === 'week' ? 7 : 1))
  return next
}

export default function TodayPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPeriod = searchParams.get('period')
  const [period, setPeriodState] = useState<FortunePeriodType>(initialPeriod === 'week' || initialPeriod === 'month' ? initialPeriod : 'day')
  const [anchor, setAnchor] = useState(() => new Date())
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'mock'; content: string }>>([])
  const store = useAppStore()
  const profile = getActiveProfile(store)

  if (!profile) return <>
    <TopBar title="运势" />
    <EmptyState title="先建立命盘" action={<LinkButton to="/profiles/new?onboarding=1">建立人物档案</LinkButton>}>个人日、周、月运势需要人物信息；当前不会展示假个人运势。</EmptyState>
  </>

  const fortune = getMockFortune(profile.id, period, anchor)
  const now = new Date()
  const isCurrent = period === 'month'
    ? anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth()
    : fortune.startDate <= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` && fortune.endDate >= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  function setPeriod(next: FortunePeriodType) { setPeriodState(next); setSearchParams({ period: next }) }
  function submitFollowUp() {
    if (!question.trim()) return
    setMessages((current) => [...current, { role: 'user', content: question.trim() }, { role: 'mock', content: '这是页面内固定 mock 回复：当前运势尚未接入真实推演或 AI，现有演示信息不足以支持更具体的判断。' }])
    setQuestion('')
  }

  return <>
    <TopBar title="运势" eyebrow={`${fortune.startDate} — ${fortune.endDate}`} action={<PersonSwitcher compact />} />
    <Segmented value={period} options={periods} onChange={setPeriod} label="运势周期" />
    <div className="period-controls"><Button className="secondary" onClick={() => setAnchor((current) => shiftAnchor(current, period, -1))}>← 前一周期</Button><Button className="secondary" disabled={isCurrent} onClick={() => setAnchor(new Date())}>回到当前</Button><Button className="secondary" onClick={() => setAnchor((current) => shiftAnchor(current, period, 1))}>后一周期 →</Button></div>
    <ConfidenceNote>当前全部为固定演示内容，未根据人物命盘进行真实日、周或月运势推演。</ConfidenceNote>
    {profile.timeAccuracy === 'unknown' && <ConfidenceNote>出生时间不足，上升、宫位、时柱相关运势依据不可可靠生成；下方只展示信息框架。</ConfidenceNote>}
    {profile.normalizationStatus !== 'normalized' && <ConfidenceNote>出生信息尚未真实标准化，时区、历法和地点相关内容均为未处理状态。</ConfidenceNote>}

    <Card className="hero-card"><div className="hero-label"><span>综合趋势</span><DemoBadge /></div><h2 className="hero-title">先核对，再推进</h2><div className="chip-row">{fortune.keywords.map((item) => <span className="chip" key={item}>{item}</span>)}</div><p className="helper">{fortune.summary}</p></Card>
    <div className="fortune-dimensions">{Object.entries(fortune.dimensions).map(([key, item]) => <Card key={key}><div className="card-kicker"><span>{dimensionLabels[key as keyof typeof dimensionLabels]}</span><span className="trend-label">{item.trend}</span></div><p>{item.summary}</p></Card>)}</div>
    <Card><SectionHeading title="八字依据" side={<DemoBadge />} /><h3>{fortune.baziView.headline}</h3><p className="helper">{fortune.baziView.conclusion}</p><ul className="plain-list">{fortune.baziView.evidence.map((item) => <li key={item}>{item}</li>)}</ul></Card>
    <Card><SectionHeading title="星象依据" side={<DemoBadge />} /><h3>{fortune.astrologyView.headline}</h3><p className="helper">{fortune.astrologyView.conclusion}</p><ul className="plain-list">{fortune.astrologyView.evidence.map((item) => <li key={item}>{item}</li>)}</ul></Card>
    <Card><SectionHeading title="一致或冲突信息" /><p className="helper">{fortune.alignment}</p><ul className="plain-list">{fortune.combinedView.conflicts.map((item) => <li key={item}>{item}</li>)}</ul></Card>
    <Card className="uncertainty-card"><SectionHeading title="不确定性与可信度" /><p>{fortune.combinedView.uncertainty}</p></Card>
    <Card><SectionHeading title="现实建议" /><ul className="plain-list">{[...fortune.suggestions, ...fortune.cautions].map((item) => <li key={item}>{item}</li>)}</ul></Card>
    <Card className="follow-up-card"><SectionHeading title="继续追问" side={<DemoBadge label="页面内 mock" />} /><p className="helper">本轮对话只保留在当前页面内，不写入正式占验记录，刷新后会清空。</p>{!!messages.length && <div className="chat-list">{messages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}><b>{message.role === 'user' ? '你' : '演示回复'}</b><p>{message.content}</p></div>)}</div>}<div className="follow-up-input"><textarea rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="围绕本期运势继续问…" /><Button onClick={submitFollowUp}>发送</Button></div></Card>
  </>
}

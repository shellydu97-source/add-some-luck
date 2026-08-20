import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import AiReadingPanel from '../components/AiReadingPanel'
import ChartHeader from '../components/ChartHeader'
import DatePicker from '../components/DatePicker'
import TermHelp from '../components/TermHelp'
import { Button, Card, ConfidenceNote, LinkButton, Segmented, SectionHeading } from '../components/UI'
import {
  analyzeBaziFlow,
  analyzeBaziNatal,
  calculateBazi,
  calculateBaziFlowDate,
  calculateBaziLuckYearDetails,
  type BaziFlowAnalysis,
  type BaziAnnualItem,
  type BaziFlowPeriod,
  type BaziLuckCycle,
  type BaziPillar,
  type BaziNatalAnalysis,
  type PillarKey,
} from '../calculation/bazi'
import { accuracyLabels } from '../models/labels'
import { useAppStore } from '../storage/store'
import { createBasicInterpretation, createRecord } from '../utils/record'

type Tab = 'overview' | 'chart' | 'fortune'
type FortuneTab = 'dayun' | 'liunian' | 'liuyue' | 'liuri'
type PillarField = 'tenGod' | 'gan' | 'zhi' | 'hidden' | 'hiddenGods' | 'elements' | 'stage' | 'selfStage' | 'xun' | 'xunKong' | 'naYin'

const options = [
  { value: 'overview' as const, label: '总览' },
  { value: 'chart' as const, label: '排盘' },
  { value: 'fortune' as const, label: '运势' },
]

const fortuneOptions = [
  { value: 'dayun' as const, label: '大运' },
  { value: 'liunian' as const, label: '流年' },
  { value: 'liuyue' as const, label: '流月' },
  { value: 'liuri' as const, label: '流日' },
]

const CORE_FIELDS = [
  ['主星', 'tenGod'], ['天干', 'gan'], ['地支', 'zhi'], ['五行', 'elements'],
] as const satisfies ReadonlyArray<readonly [string, PillarField]>

const DETAIL_FIELDS = [
  ['藏干', 'hidden'], ['藏干十神', 'hiddenGods'], ['十二长生', 'stage'], ['自坐', 'selfStage'],
  ['旬', 'xun'], ['旬空', 'xunKong'], ['纳音', 'naYin'],
] as const satisfies ReadonlyArray<readonly [string, PillarField]>

const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'time']
const PILLAR_LABELS: Record<PillarKey, string> = { year: '年柱', month: '月柱', day: '日柱', time: '时柱' }
const ELEMENTS = ['木', '火', '土', '金', '水'] as const
const TEN_GOD_ORDER = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'] as const

function todayInShanghai() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}/${value.month}/${value.day}`
}

function pillarSummary(pillar: BaziPillar) {
  if (pillar.status === 'available') return pillar.ganZhi
  if (pillar.status === 'ambiguous') return `候选 ${pillar.candidates.join(' / ')}`
  return '时柱未知'
}

function pillarField(pillar: BaziPillar, field: PillarField) {
  if (pillar.status === 'ambiguous') return `候选：${pillar.candidates.join(' / ')}`
  if (pillar.status === 'unavailable') return '未生成'
  const values = {
    tenGod: pillar.stemTenGod,
    gan: pillar.gan,
    zhi: pillar.zhi,
    hidden: pillar.hiddenStems.join('·'),
    hiddenGods: pillar.hiddenTenGods.join('·'),
    elements: `${pillar.fiveElements.stem}·${pillar.fiveElements.branch}`,
    stage: pillar.twelveStage,
    selfStage: pillar.selfStage,
    xun: pillar.xun,
    xunKong: pillar.xunKong,
    naYin: pillar.naYin,
  }
  return values[field]
}

function PillarTable({ pillars, fields }: { pillars: Record<PillarKey, BaziPillar>; fields: ReadonlyArray<readonly [string, PillarField]> }) {
  return <div className="bazi-table">
    <div></div>{PILLAR_KEYS.map((key) => <b key={key}>{PILLAR_LABELS[key]}</b>)}
    {fields.flatMap(([label, field]) => [
      <span key={`${field}-label`}>{label}</span>,
      ...PILLAR_KEYS.map((key) => <span key={`${field}-${key}`} title={pillars[key].status === 'available' ? undefined : pillars[key].reason}>{pillarField(pillars[key], field)}</span>),
    ])}
  </div>
}

function offsetText(offset: { years: number; months: number; days: number; hours: number }) {
  const parts = [offset.years && `${offset.years} 年`, offset.months && `${offset.months} 个月`, offset.days && `${offset.days} 天`, offset.hours && `${offset.hours} 小时`].filter(Boolean)
  return parts.length ? parts.join(' ') : '0 天'
}

function periodText(period?: BaziFlowPeriod) {
  if (!period) return '—'
  return period.status === 'available' ? period.ganZhi : period.candidates.join(' / ')
}

function PeriodCard({ label, period }: { label: string; period: BaziFlowPeriod }) {
  return <Card className="flow-period-card"><span>{label}</span><h3>{periodText(period)}</h3>{period.status === 'available'
    ? <small>{period.xun} · 空亡 {period.xunKong}</small>
    : <small>{period.reason}</small>}</Card>
}

function NatalFacts({ analysis, compact = false }: { analysis: BaziNatalAnalysis; compact?: boolean }) {
  const tenGods = TEN_GOD_ORDER.filter((name) => analysis.tenGodCounts[name]).map((name) => ({ name, count: analysis.tenGodCounts[name]! }))
  const shenSha = analysis.shenSha
  const relations = analysis.relations
  return <>
    <Card>
      <SectionHeading title="十神结构" side={<span className="helper">显干与藏干出现次数</span>} />
      <div className="bazi-fact-chips">{tenGods.map((item) => <span className="chip" key={item.name}><TermHelp term={item.name} /><b>{item.name}</b> × {item.count}</span>)}</div>
      <p className="fact-boundary">这里展示十神在原局中的客观出现位置与次数，不直接等同于旺衰、格局或吉凶。</p>
    </Card>
    <Card>
      <SectionHeading title="常用神煞" side={<span className="helper">按日干、日支查表</span>} />
      {shenSha.length ? <div className="bazi-fact-list">{shenSha.slice(0, compact ? 5 : undefined).map((item, index) => <div key={`${item.name}-${item.target}-${index}`}><b><TermHelp term={item.name} />{item.name}</b><span>{item.target}</span><small>{item.basis}</small></div>)}</div> : <p className="helper">当前可确定的柱中，没有命中本版收录的常用神煞。</p>}
      {compact && shenSha.length > 5 && <p className="helper">完整位置可在“排盘”页查看。</p>}
    </Card>
    <Card>
      <SectionHeading title="原局干支关系" />
      {relations.length ? <ul className="plain-list bazi-relation-list">{relations.slice(0, compact ? 4 : undefined).map((item, index) => <li key={`${item.kind}-${index}`}><b>{item.kind}</b>：{item.text}</li>)}</ul> : <p className="helper">当前可确定的柱中，没有形成本版收录的完整合、冲、刑、害、破组合。</p>}
      <p className="fact-boundary">这里只标记结构关系，不判断是否成化，也不把单一关系直接解释为好或坏。</p>
    </Card>
  </>
}

function FlowFacts({ analysis, label }: { analysis?: BaziFlowAnalysis; label: string }) {
  if (!analysis) return null
  return <Card className="flow-facts-card">
    <SectionHeading title={`${label}与原局`} />
    <div className="flow-fact-grid">
      <div><span>天干十神 <TermHelp term={analysis.stemTenGod} /></span><b>{analysis.stem} · {analysis.stemTenGod}</b></div>
      <div><span>五行</span><b>{analysis.stemElement} · {analysis.branchElement}</b></div>
      <div><span>十二长生 <TermHelp term="十二长生" /></span><b>{analysis.twelveStage}</b></div>
      <div><span>纳音 <TermHelp term="纳音" /></span><b>{analysis.naYin}</b></div>
    </div>
    {!!analysis.shenSha.length && <div className="flow-fact-section"><b>本期神煞</b><div className="chip-row">{analysis.shenSha.map((item, index) => <span className="chip" title={item.basis} key={`${item.name}-${index}`}><TermHelp term={item.name} />{item.name}</span>)}</div></div>}
    {!!analysis.relations.length && <details className="inline-facts"><summary>查看与原局的干支关系</summary><ul className="plain-list">{analysis.relations.map((item, index) => <li key={`${item.kind}-${index}`}><b>{item.kind}</b>：{item.text}</li>)}</ul></details>}
    {!analysis.shenSha.length && !analysis.relations.length && <p className="helper">本期未命中本版收录的常用神煞或完整干支关系。</p>}
  </Card>
}

function activeCycleAt(cycles: BaziLuckCycle[], date: string) {
  const point = `${date.replaceAll('/', '-')} 12:00:00`
  return cycles.find((cycle, index) => cycle.startSolarDateTime <= point && (!cycles[index + 1] || point < cycles[index + 1].startSolarDateTime))
}

function annualForCycle(cycle: BaziLuckCycle | undefined, selectedYear: number | undefined, currentYear: number) {
  return cycle?.annual.find((item) => item.year === selectedYear)
    ?? cycle?.annual.find((item) => item.year === currentYear)
    ?? cycle?.annual[0]
}

function shortBoundary(value: string) {
  return value.slice(5, 16).replace('-', '/').replace(' ', ' ')
}

export default function BaziPage() {
  const { profileId } = useParams()
  const profiles = useAppStore((state) => state.profiles)
  const profile = profiles.find((item) => item.id === profileId)
  const [tab, setTab] = useState<Tab>('overview')
  const [fortuneTab, setFortuneTab] = useState<FortuneTab>('dayun')
  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number>()
  const [selectedYear, setSelectedYear] = useState<number>()
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>()
  const [today] = useState(todayInShanghai)
  const [selectedFlowDate, setSelectedFlowDate] = useState(today)
  const [aiRecordSession, setAiRecordSession] = useState<{ profileId: string; recordId: string }>()
  const result = useMemo(() => profile ? calculateBazi(profile) : undefined, [profile])
  const natalAnalysis = useMemo(() => result?.ok ? analyzeBaziNatal(result) : undefined, [result])
  const currentFlow = useMemo(() => calculateBaziFlowDate(today), [today])
  const selectedFlow = useMemo(() => calculateBaziFlowDate(selectedFlowDate), [selectedFlowDate])
  const currentYear = Number(today.slice(0, 4))
  const currentCycle = result?.ok && result.luck ? activeCycleAt(result.luck.cycles, today) : undefined
  const activeCycle = result?.ok && result.luck
    ? result.luck.cycles.find((item) => item.index === selectedCycleIndex) ?? currentCycle ?? result.luck.cycles[0]
    : undefined
  const activeAnnual = annualForCycle(activeCycle, selectedYear, currentYear)
  const yearDetails = useMemo(() => profile && activeAnnual
    ? calculateBaziLuckYearDetails(profile, activeAnnual.year)
    : undefined, [profile, activeAnnual])
  const activeMonth = yearDetails?.ok
    ? yearDetails.months.find((month) => month.index === selectedMonthIndex) ?? yearDetails.months[0]
    : undefined
  const currentDayAnalysis = result?.ok && currentFlow.ok && currentFlow.day.status === 'available'
    ? analyzeBaziFlow(result, currentFlow.day.ganZhi, '今日流日')
    : undefined

  if (!profile) return <Navigate to={profiles.length ? '/charts' : '/welcome'} replace />
  if (!result) return null

  function ensureAiRecord(aiQuestion?: string) {
    if (aiRecordSession && aiRecordSession.profileId === profileId) return aiRecordSession.recordId
    if (!profile || !result?.ok) throw new Error('八字结果尚未生成')
    const created = createRecord({
      profile, type: 'bazi', question: aiQuestion, rawResult: { result, analysis: natalAnalysis },
      interpretation: createBasicInterpretation('八字基础排盘', PILLAR_KEYS.map((key) => pillarSummary(result.pillars[key])).join(' · ')),
    })
    useAppStore.getState().createRecordSnapshot(created)
    setAiRecordSession({ profileId: profile.id, recordId: created.id })
    return created.id
  }

  function selectCycle(cycle: BaziLuckCycle) {
    setSelectedCycleIndex(cycle.index)
    setSelectedYear(cycle.annual.find((item) => item.year === currentYear)?.year ?? cycle.annual[0]?.year)
    setSelectedMonthIndex(undefined)
  }

  function selectAnnual(year: BaziAnnualItem) {
    setSelectedYear(year.year)
    setSelectedMonthIndex(undefined)
  }

  return <>
    <ChartHeader profile={profile} type="bazi" />
    <Segmented value={tab} options={options} onChange={setTab} label="八字内容" />

    {!result.ok && <Card>
      <div className="card-kicker"><span>无法生成命盘</span></div>
      <h2>{result.error.message}</h2>
      <p className="helper">原始档案仍已保留，请核对公历 / 农历、闰月和日期。</p>
      <LinkButton to={`/profiles/${profile.id}/edit`} secondary>编辑出生信息</LinkButton>
    </Card>}

    {result.ok && <>
      {tab === 'overview' && <>
        <Card className="hero-card">
          <div className="card-kicker"><span>三 / 四柱摘要 <TermHelp term="四柱" /></span></div>
          <h2 className="hero-title">{PILLAR_KEYS.map((key) => pillarSummary(result.pillars[key])).join(' · ')}</h2>
          <div className="chip-row">
            {result.luck
              ? <><span className="chip">大运：{result.luck.directionLabel}</span><span className="chip">起运：{result.luck.startSolarDateTime.slice(0, 10)}</span></>
              : <span className="chip">出生时间未知，运势时间轴不完整</span>}
          </div>
        </Card>
        {result.warnings.filter((warning) => !warning.startsWith('V1 ') && !warning.includes('真太阳时')).map((warning) => <ConfidenceNote key={warning}>{warning}</ConfidenceNote>)}
        <div className="summary-grid bazi-overview-summary">
          <Card><span className="summary-label">日主</span><h3>{result.pillars.day.status === 'available' ? result.pillars.day.gan : '待确定'}</h3><p className="helper">{result.pillars.day.status === 'available' ? `${result.pillars.day.fiveElements.stem} · ${result.pillars.day.ganZhi}日` : pillarSummary(result.pillars.day)}</p></Card>
          <Card><span className="summary-label">当前大运</span><h3>{currentCycle?.ganZhi ?? '待确定'}</h3><p className="helper">{currentCycle ? `${currentCycle.startYear}—${currentCycle.endYear}` : '需要明确出生时间'}</p></Card>
          <Card><span className="summary-label">今日流日</span><h3>{currentFlow.ok ? periodText(currentFlow.day) : '无法生成'}</h3><p className="helper">{currentDayAnalysis ? `${currentDayAnalysis.stemTenGod} · ${currentDayAnalysis.stemElement}${currentDayAnalysis.branchElement}` : currentFlow.ok ? `${periodText(currentFlow.year)}流年 · ${periodText(currentFlow.month)}流月` : currentFlow.error.message}</p></Card>
        </div>
        <Card>
          <SectionHeading title="五行分布" side={<span className="helper">天干与地支计数</span>} />
          <div className="element-counts">{ELEMENTS.map((element) => <div key={element}><b>{result.fiveElementCounts[element]}</b><span>{element}</span></div>)}</div>
        </Card>
        {natalAnalysis && <NatalFacts analysis={natalAnalysis} compact />}
        <Card>
          <SectionHeading title="出生信息" />
          <ul className="compact-list">
            <li><span>出生日期</span><b>{profile.calendarType === 'solar' ? '公历' : `农历${profile.lunarLeapMonth ? '·闰月' : ''}`} {profile.rawBirthDate}</b></li>
            <li><span>出生时间</span><b>{profile.rawBirthTime || '未知'}</b></li>
            <li><span>出生地点</span><b>{profile.birthPlaceText || profile.city || '未填写'}</b></li>
            {profile.timeAccuracy !== 'exact_minute' && <li><span>时间可信度</span><b>{accuracyLabels[profile.timeAccuracy]}</b></li>}
          </ul>
        </Card>
        <AiReadingPanel key={profile.id} module="bazi" context={{ result, analysis: natalAnalysis }} recordId={aiRecordSession?.profileId === profile.id ? aiRecordSession.recordId : undefined} ensureRecord={ensureAiRecord} allowQuestionInput title="了解这份八字排盘" />
      </>}

      {tab === 'chart' && <>
        <Card>
          <div className="card-kicker"><span>四柱排盘 <TermHelp term="四柱" /></span></div>
          <PillarTable pillars={result.pillars} fields={CORE_FIELDS} />
        </Card>
        <Card>
          <SectionHeading title="五行分布" side={<span className="helper">天干与地支计数</span>} />
          <div className="element-counts">{ELEMENTS.map((element) => <div key={element}><b>{result.fiveElementCounts[element]}</b><span>{element}</span></div>)}</div>
        </Card>
        <details className="result-disclosure"><summary>查看藏干、十神、纳音等详细字段</summary><Card><PillarTable pillars={result.pillars} fields={DETAIL_FIELDS} /></Card></details>
        {natalAnalysis && <NatalFacts analysis={natalAnalysis} />}
      </>}

      {tab === 'fortune' && <>
        <Segmented value={fortuneTab} options={fortuneOptions} onChange={setFortuneTab} label="运势层级" scrollable />
        {!result.luck && fortuneTab !== 'liuri' && <ConfidenceNote>出生时间未知或位于换柱交界，无法可靠生成大运、流年和完整流月时间轴；流日仍可按所选日期查看。</ConfidenceNote>}

        {fortuneTab === 'dayun' && result.luck && <>
          <Card>
            <SectionHeading title="起运信息" />
            <ul className="compact-list">
              <li><span>大运方向</span><b>{result.luck.directionLabel}</b></li>
              <li><span>起运折算</span><b>{offsetText(result.luck.startOffset)}</b></li>
              <li><span>起运时间</span><b>{result.luck.startSolarDateTime}</b></li>
            </ul>
          </Card>
          <Card>
            <SectionHeading title="大运时间轴" side={<span className="helper">点击切换</span>} />
            <div className="timeline">{result.luck.cycles.map((cycle) => <button type="button" onClick={() => selectCycle(cycle)} className={`timeline-item ${activeCycle?.index === cycle.index ? 'active' : ''}`} key={cycle.index}><b>{cycle.ganZhi}</b><span>{cycle.startYear}—{cycle.endYear}</span><span>{cycle.startAge}—{cycle.endAge} 岁</span></button>)}</div>
          </Card>
          {activeCycle && <><Card className="selected-fortune-card"><span>当前选择</span><h2>{activeCycle.ganZhi}大运</h2><p>{activeCycle.startSolarDateTime.slice(0, 16)} 起 · {activeCycle.startAge}—{activeCycle.endAge} 岁</p><Button className="compact-button" onClick={() => setFortuneTab('liunian')}>查看这步大运的流年</Button></Card><FlowFacts analysis={analyzeBaziFlow(result, activeCycle.ganZhi, '所选大运')} label="所选大运" /></>}
        </>}

        {fortuneTab === 'liunian' && result.luck && activeCycle && <>
          <Card>
            <SectionHeading title={`${activeCycle.ganZhi}大运的流年`} side={<span className="helper">{activeCycle.startYear}—{activeCycle.endYear}</span>} />
            <div className="year-list">{activeCycle.annual.map((year) => <button type="button" className={activeAnnual?.year === year.year ? 'active' : ''} onClick={() => selectAnnual(year)} key={year.year}><b>{year.year} · {year.ganZhi}</b><span>{year.age} 岁 · {year.xun} · 空亡 {year.xunKong}</span></button>)}</div>
          </Card>
          {activeAnnual && <><Card className="selected-fortune-card"><span>当前选择</span><h2>{activeAnnual.year} · {activeAnnual.ganZhi}流年</h2><p>{activeAnnual.age} 岁 · {activeAnnual.xun} · 空亡 {activeAnnual.xunKong}</p><Button className="compact-button" onClick={() => setFortuneTab('liuyue')}>查看这一年的流月</Button></Card><FlowFacts analysis={analyzeBaziFlow(result, activeAnnual.ganZhi, '所选流年')} label="所选流年" /></>}
        </>}

        {fortuneTab === 'liuyue' && result.luck && <>
          {!yearDetails?.ok && <ConfidenceNote>{yearDetails?.error.message ?? '请先选择一个流年。'}</ConfidenceNote>}
          {yearDetails?.ok && <>
            <ConfidenceNote>流月以“节”交接，不按公历每月 1 日切换；下列起止时间均来自对应节气时刻。</ConfidenceNote>
            <Card>
              <SectionHeading title={`${yearDetails.year.year} · ${yearDetails.year.ganZhi}流月`} />
              <div className="month-list">{yearDetails.months.map((month) => <button type="button" className={activeMonth?.index === month.index ? 'active' : ''} onClick={() => setSelectedMonthIndex(month.index)} key={month.index}><b>{month.name} · {month.ganZhi}</b><span>{shortBoundary(month.startSolarDateTime)}—{shortBoundary(month.endSolarDateTime)}</span></button>)}</div>
            </Card>
            {activeMonth && <><Card className="selected-fortune-card"><span>当前选择</span><h2>{activeMonth.name} · {activeMonth.ganZhi}流月</h2><p>{activeMonth.startSolarDateTime.slice(0, 16)} 起，至 {activeMonth.endSolarDateTime.slice(0, 16)} 前</p><small>{activeMonth.xun} · 空亡 {activeMonth.xunKong}</small></Card><FlowFacts analysis={analyzeBaziFlow(result, activeMonth.ganZhi, '所选流月')} label="所选流月" /></>}
          </>}
        </>}

        {fortuneTab === 'liuri' && <>
          <Card>
            <DatePicker label="选择日期" value={selectedFlowDate} onChange={setSelectedFlowDate} allowFuture required />
            {selectedFlow.ok && <p className="helper">{selectedFlow.solarDate} · {selectedFlow.lunarDate}</p>}
          </Card>
          {!selectedFlow.ok && <ConfidenceNote>{selectedFlow.error.message}</ConfidenceNote>}
          {selectedFlow.ok && <div className="summary-grid flow-date-summary">
            <PeriodCard label="所处流年" period={selectedFlow.year} />
            <PeriodCard label="所处流月" period={selectedFlow.month} />
            <PeriodCard label="当日干支" period={selectedFlow.day} />
          </div>}
          {selectedFlow.ok && selectedFlow.year.status === 'available' && <FlowFacts analysis={analyzeBaziFlow(result, selectedFlow.year.ganZhi, '所处流年')} label="所处流年" />}
          {selectedFlow.ok && selectedFlow.month.status === 'available' && <FlowFacts analysis={analyzeBaziFlow(result, selectedFlow.month.ganZhi, '所处流月')} label="所处流月" />}
          {selectedFlow.ok && selectedFlow.day.status === 'available' && <FlowFacts analysis={analyzeBaziFlow(result, selectedFlow.day.ganZhi, '所选流日')} label="所选流日" />}
        </>}
      </>}
    </>}
  </>
}

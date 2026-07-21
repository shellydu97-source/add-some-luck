import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AstrologyWheel from '../components/AstrologyWheel'
import AiReadingPanel from '../components/AiReadingPanel'
import ChartHeader from '../components/ChartHeader'
import { Card, ConfidenceNote, Segmented, SectionHeading } from '../components/UI'
import type { AstrologyCalculationResult, DailyPlanetRange } from '../calculation/astrology/types'
import { aspectLabels, bodyLabels, formatDegree, zodiacLabels } from '../calculation/astrology/format'
import { ASPECT_DYNAMICS, BODY_THEMES, HOUSE_THEMES, SIGN_STYLES, countAstrologyBalance, emphasizedHouses, tightestAspects } from '../calculation/astrology/presentation'
import { useAppStore } from '../storage/store'
import { createBasicInterpretation, createRecord } from '../utils/record'

type Tab = 'overview' | 'planets' | 'houses' | 'aspects'
const options = [
  { value: 'overview' as const, label: '总览' },
  { value: 'planets' as const, label: '行星' },
  { value: 'houses' as const, label: '宫位' },
  { value: 'aspects' as const, label: '相位' },
]
const motionLabels = { direct: '', retrograde: '逆行', changes: '状态可能变化' }

function RangeValue({ range }: { range: DailyPlanetRange }) {
  const sign = range.signCandidates.map((item) => zodiacLabels[item]).join(' / ')
  const rangeDegrees = range.degreeInSignRange
    ? `${formatDegree(range.degreeInSignRange.min)}—${formatDegree(range.degreeInSignRange.max)}`
    : '跨星座，不显示单一度数'
  return <><b>{sign}</b><span>{rangeDegrees}</span>{range.signAmbiguous && <em>结果存在歧义</em>}</>
}

function ErrorState({ result, profileId }: { result: Extract<AstrologyCalculationResult, { ok: false }>; profileId: string }) {
  const title = {
    location_unconfirmed: '出生地点待确认', unsupported_location: '该地区暂未支持', invalid_date: '出生日期无效',
    invalid_lunar_date: '农历日期无效', invalid_leap_month: '闰月信息无效', invalid_time: '出生时间无效',
    placidus_unavailable: '当前结果无法生成', calculation_failed: '当前结果无法生成',
  }[result.error.code]
  const canEdit = ['location_unconfirmed', 'unsupported_location', 'invalid_date', 'invalid_lunar_date', 'invalid_leap_month', 'invalid_time'].includes(result.error.code)
  const message = result.error.code === 'placidus_unavailable'
    ? '当前出生地点无法生成宫位，请检查出生信息。'
    : result.error.code === 'calculation_failed'
      ? '星盘生成失败，请稍后重试。'
      : result.error.message
  return <Card className="astrology-error" role="alert"><div className="error-mark">!</div><h2>{title}</h2><p>{message}</p>{canEdit && <Link className="button secondary" to={`/profiles/${profileId}/edit`}>编辑出生信息</Link>}</Card>
}

function Overview({ result }: { result: Exclude<AstrologyCalculationResult, { ok: false }> }) {
  if (result.precision === 'day-range') {
    const sun = result.planetRanges.find((item) => item.body === 'sun')!
    const moon = result.planetRanges.find((item) => item.body === 'moon')!
    return <>
      <div className="summary-grid range-summary">
        <Card><div className="card-kicker">太阳</div><div className="range-summary-value"><RangeValue range={sun} /></div></Card>
        <Card><div className="card-kicker">月亮</div><div className="range-summary-value"><RangeValue range={moon} /></div></Card>
      </div>
      <BirthAndCalculationInfo result={result} />
    </>
  }
  const sun = result.planets.find((item) => item.body === 'sun')!
  const moon = result.planets.find((item) => item.body === 'moon')!
  const summaries = [{ label: '太阳', value: sun }, { label: '月亮', value: moon }, { label: '上升', value: result.ascendant }]
  const balance = countAstrologyBalance(result.planets)
  const focusedHouses = emphasizedHouses(result.planets).filter((item) => item.count > 1).slice(0, 3)
  const closestAspects = tightestAspects(result.aspects, 4)
  return <>
    <Card className="chart-card astrology-chart-card"><div className="card-kicker"><span>本命盘</span></div><AstrologyWheel result={result} /></Card>
    <div className="summary-grid">
      {summaries.map(({ label, value }) => <Card key={label}><div className="card-kicker">{label}</div><h3>{zodiacLabels[value.sign]}</h3><p className="helper">{formatDegree(value.degreeInSign)}</p></Card>)}
    </div>
    <Card>
      <SectionHeading title="星盘结构" />
      <div className="astrology-balance-grid">
        <div><b>元素分布</b><div className="chip-row">{Object.entries(balance.elements).map(([name, count]) => <span className="chip" key={name}>{name} {count}</span>)}</div></div>
        <div><b>行动模式</b><div className="chip-row">{Object.entries(balance.modalities).map(([name, count]) => <span className="chip" key={name}>{name} {count}</span>)}</div></div>
      </div>
      {!!focusedHouses.length && <div className="astrology-focus-houses"><b>行星较集中的生活领域</b>{focusedHouses.map((item) => <p key={item.house}>第 {item.house} 宫 · {item.count} 颗星体：{item.theme}</p>)}</div>}
      <p className="fact-boundary">元素、模式和宫位集中度按十颗星体的落点计数，用来帮助阅读结构，不代表吉凶或强弱评分。</p>
    </Card>
    {!!closestAspects.length && <Card>
      <SectionHeading title="最紧密的主要相位" side={<span className="helper">容许度越小越接近精确相位</span>} />
      <div className="astrology-key-aspects">{closestAspects.map((aspect) => <div key={`${aspect.first}-${aspect.type}-${aspect.second}`}><b>{bodyLabels[aspect.first]} {aspectLabels[aspect.type]} {bodyLabels[aspect.second]}</b><span>容许度 {formatDegree(aspect.orbDeg)}</span><p>{ASPECT_DYNAMICS[aspect.type]}</p></div>)}</div>
    </Card>}
    <BirthAndCalculationInfo result={result} />
  </>
}

function BirthAndCalculationInfo({ result }: { result: Exclude<AstrologyCalculationResult, { ok: false }> }) {
  const input = result.normalizedInput
  const location = input.location
  return <Card><SectionHeading title="出生信息" /><ul className="compact-list">
    <li><span>出生日期</span><b>{input.sourceDate.year}/{String(input.sourceDate.month).padStart(2, '0')}/{String(input.sourceDate.day).padStart(2, '0')} · {input.sourceCalendar === 'lunar' ? '农历输入' : '公历'}</b></li>
    <li><span>出生时间</span><b>{input.localTime ? `${String(input.localTime.hour).padStart(2, '0')}:${String(input.localTime.minute).padStart(2, '0')}` : '未知 / 非精确分钟'}</b></li>
    <li><span>出生地点</span><b>{location.canonicalName}</b></li>
  </ul></Card>
}

function Planets({ result }: { result: Exclude<AstrologyCalculationResult, { ok: false }> }) {
  if (result.precision === 'day-range') return <Card><SectionHeading title="行星当日范围" /><div className="range-planet-list">{result.planetRanges.map((range) => <div key={range.body}><strong>{bodyLabels[range.body]}</strong><div><RangeValue range={range} /><p>{BODY_THEMES[range.body]}</p></div><small>{motionLabels[range.motionStatus]}</small></div>)}</div></Card>
  return <><Card><SectionHeading title="行星" /><div className="data-table planet-table"><b>星体</b><b>星座</b><b>座内度数</b><b>逆行</b><b>宫位</b>{result.planets.flatMap((planet) => [
    <span key={`${planet.body}-body`}>{bodyLabels[planet.body]}</span>, <span key={`${planet.body}-sign`}>{zodiacLabels[planet.sign]}</span>,
    <span key={`${planet.body}-degree`}>{formatDegree(planet.degreeInSign)}</span>, <span key={`${planet.body}-retro`}>{planet.retrograde ? '逆行' : '—'}</span>, <span key={`${planet.body}-house`}>第 {planet.house} 宫</span>,
  ])}</div></Card><Card><SectionHeading title="逐项阅读" /><div className="astrology-reading-list">{result.planets.map((planet) => <details key={planet.body}><summary><span><b>{bodyLabels[planet.body]}</b>在{zodiacLabels[planet.sign]} · 第 {planet.house} 宫</span>{planet.retrograde && <em>逆行</em>}</summary><p><b>{bodyLabels[planet.body]}</b>主要关联{BODY_THEMES[planet.body]}；<b>{zodiacLabels[planet.sign]}</b>体现{SIGN_STYLES[planet.sign]}的表达方式；<b>第 {planet.house} 宫</b>对应{HOUSE_THEMES[planet.house]}。完整理解还要结合相位，不把单一落点当成确定的人格结论。</p></details>)}</div></Card></>
}

function Houses({ result }: { result: Exclude<AstrologyCalculationResult, { ok: false }> }) {
  if (result.precision === 'day-range') return <Card><SectionHeading title="宫位" /><ConfidenceNote>出生时间未知或不够精确，无法显示宫位。</ConfidenceNote></Card>
  return <Card><SectionHeading title="十二宫" /><div className="data-table house-table astrology-house-table"><b>宫位</b><b>宫头星座</b><b>宫头度数</b><b>生活领域</b>{result.houses.flatMap((house) => [<span key={`${house.house}-house`}>第 {house.house} 宫</span>, <span key={`${house.house}-sign`}>{zodiacLabels[house.sign]}</span>, <span key={`${house.house}-degree`}>{formatDegree(house.degreeInSign)}</span>, <span key={`${house.house}-theme`}>{HOUSE_THEMES[house.house]}</span>])}</div></Card>
}

function Aspects({ result }: { result: Exclude<AstrologyCalculationResult, { ok: false }> }) {
  if (result.precision === 'day-range') return <Card><SectionHeading title="相位" /><ConfidenceNote>出生时间未知或不够精确，无法显示精确相位。</ConfidenceNote></Card>
  const sorted = tightestAspects(result.aspects, result.aspects.length)
  return <><Card><SectionHeading title="主要相位" side={<span className="helper">按容许度由小到大</span>} /><div className="data-table aspect-table astrology-aspect-table"><b>星体 A</b><b>相位</b><b>星体 B</b><b>实际夹角</b><b>实际容许度</b>{sorted.flatMap((aspect, index) => [
    <span key={`${index}-first`}>{bodyLabels[aspect.first]}</span>, <span key={`${index}-type`}>{aspectLabels[aspect.type]}</span>, <span key={`${index}-second`}>{bodyLabels[aspect.second]}</span>,
    <span key={`${index}-angle`}>{formatDegree(aspect.separationDeg)}</span>, <span key={`${index}-orb`}>{formatDegree(aspect.orbDeg)}</span>,
  ])}</div></Card><Card><SectionHeading title="相位关系说明" /><div className="astrology-reading-list">{sorted.map((aspect) => <details key={`${aspect.first}-${aspect.type}-${aspect.second}`}><summary><span><b>{bodyLabels[aspect.first]}</b> {aspectLabels[aspect.type]} <b>{bodyLabels[aspect.second]}</b></span><em>{formatDegree(aspect.orbDeg)}</em></summary><p>{BODY_THEMES[aspect.first]}与{BODY_THEMES[aspect.second]}之间形成联系。{ASPECT_DYNAMICS[aspect.type]}。这是结构说明，不单独推导具体事件。</p></details>)}</div></Card></>
}

export default function AstrologyPage() {
  const { profileId = '' } = useParams()
  const profiles = useAppStore((state) => state.profiles)
  const profile = profiles.find((item) => item.id === profileId)
  const [tab, setTab] = useState<Tab>('overview')
  const [calculation, setCalculation] = useState<{ profileId: string; result: AstrologyCalculationResult }>()
  const [aiRecordSession, setAiRecordSession] = useState<{ profileId: string; recordId: string }>()

  useEffect(() => {
    if (!profile) return
    let active = true
    import('../calculation/astrology/adapter').then(({ calculateAstrology }) => calculateAstrology({
      calendarType: profile.calendarType,
      rawBirthDate: profile.rawBirthDate,
      lunarLeapMonth: profile.lunarLeapMonth,
      rawBirthTime: profile.rawBirthTime,
      timeAccuracy: profile.timeAccuracy,
      birthPlaceText: profile.birthPlaceText,
      countryCode: profile.countryCode,
      birthLocation: profile.birthLocation,
    })).then((result) => { if (active) setCalculation({ profileId: profile.id, result }) }).catch(() => {
      if (active) setCalculation({ profileId: profile.id, result: { ok: false, error: { code: 'calculation_failed', message: '当前星盘无法生成，请稍后重试。' } } })
    })
    return () => { active = false }
  }, [profile])

  if (!profile) return <Navigate to={profiles.length ? '/charts' : '/welcome'} replace />
  const result = calculation?.profileId === profile.id ? calculation.result : undefined
  const loading = !result

  function ensureAiRecord(aiQuestion?: string) {
    if (aiRecordSession && aiRecordSession.profileId === profileId) return aiRecordSession.recordId
    if (!profile || !result?.ok) throw new Error('星盘结果尚未生成')
    const created = createRecord({
      profile, type: 'astrology', question: aiQuestion, rawResult: { result },
      interpretation: createBasicInterpretation('本命星盘', result.precision === 'exact' ? '已保存本命盘基础结果' : '已保存出生当日行星范围'),
    })
    useAppStore.getState().createRecordSnapshot(created)
    setAiRecordSession({ profileId: profile.id, recordId: created.id })
    return created.id
  }
  return <>
    <ChartHeader profile={profile} type="astrology" />
    <Segmented value={tab} options={options} onChange={setTab} label="星盘内容" scrollable />
    {loading && <Card className="calculation-loading"><span className="loading-orbit" />正在生成星盘…</Card>}
    {!loading && result && !result.ok && <ErrorState result={result} profileId={profile.id} />}
    {!loading && result?.ok && tab === 'overview' && <><Overview result={result} /><AiReadingPanel key={profile.id} module="astrology" context={{ result }} recordId={aiRecordSession?.profileId === profile.id ? aiRecordSession.recordId : undefined} ensureRecord={ensureAiRecord} allowQuestionInput title="了解这份本命星盘" /></>}
    {!loading && result?.ok && tab === 'planets' && <Planets result={result} />}
    {!loading && result?.ok && tab === 'houses' && <Houses result={result} />}
    {!loading && result?.ok && tab === 'aspects' && <Aspects result={result} />}
  </>
}

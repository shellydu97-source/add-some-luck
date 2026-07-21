import { useNavigate } from 'react-router-dom'
import {
  calculateMeihuaByNumbers, calculateMeihuaByObjectCount, calculateMeihuaBySoundCount,
  calculateMeihuaBySpecifiedTime, calculateMeihuaByText, calculateMeihuaByThreeNumbers,
  calculateMeihuaByTime, createMeihuaBasicInterpretation, type MeihuaCalculationResult,
} from '../calculation/meihua'
import AiReadingPanel from '../components/AiReadingPanel'
import TopBar from '../components/TopBar'
import { Button, Card, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import type { MeihuaDraft } from '../models/types'
import { getDraft, useAppStore } from '../storage/store'
import { formatDate } from '../utils/text'
import { createRecord, GUEST_PROFILE_ID } from '../utils/record'

function calculateResult(draft: MeihuaDraft) {
  if (!draft.state.lockedAt || !draft.state.method) throw new Error('起卦信息尚未锁定。')
  switch (draft.state.method) {
    case 'time': return calculateMeihuaByTime(draft.state.lockedAt)
    case 'specified_time': return calculateMeihuaBySpecifiedTime(draft.state.specifiedLocalDateTime!)
    case 'numbers': return calculateMeihuaByNumbers(draft.state.firstNumber!, draft.state.secondNumber!)
    case 'three_numbers': return calculateMeihuaByThreeNumbers(draft.state.firstNumber!, draft.state.secondNumber!, draft.state.thirdNumber!)
    case 'text': return calculateMeihuaByText(draft.state.sourceText!)
    case 'object_count': return calculateMeihuaByObjectCount(draft.state.observedCount!, draft.state.lockedAt)
    case 'sound_count': return calculateMeihuaBySoundCount(draft.state.observedCount!, draft.state.lockedAt)
  }
}

const methodLabels: Record<NonNullable<MeihuaDraft['state']['method']>, string> = {
  time: '当前时间起卦', specified_time: '指定时间起卦', numbers: '两数起卦', three_numbers: '三数起卦',
  text: '文字字数起卦', object_count: '物数起卦', sound_count: '声音起卦',
}

function resultContext(result: MeihuaCalculationResult) {
  return {
    method: result.method,
    sourceNumbers: result.sourceNumbers,
    calendar: result.calendar,
    original: result.original,
    mutual: result.mutual,
    changed: result.changed,
    movingLine: result.movingLine,
    movingLineText: result.movingLineText,
    bodyTrigram: result.bodyTrigram,
    useTrigram: result.useTrigram,
    bodyPosition: result.bodyPosition,
    usePosition: result.usePosition,
    bodyUseRelation: result.bodyUseRelation,
  }
}

export default function MeihuaResultPage() {
  const navigate = useNavigate()
  const store = useAppStore()
  const draft = getDraft(store, 'meihua')
  if (!draft || !draft.state.locked || !draft.state.lockedAt || !draft.state.method) return <><TopBar title="梅花易数结果" back /><EmptyState title="结果尚未锁定" action={<LinkButton to="/divination/meihua/cast">继续起卦</LinkButton>}>确认起卦方式后即可查看结果。</EmptyState></>
  const activeDraft = draft
  const method = activeDraft.state.method as NonNullable<MeihuaDraft['state']['method']>
  const lockedAt = activeDraft.state.lockedAt!
  let result: MeihuaCalculationResult
  try {
    result = calculateResult(activeDraft)
  } catch (caught) {
    return <><TopBar title="梅花易数结果" back /><EmptyState title="当前结果无法生成" action={<LinkButton to="/divination/meihua/cast">返回检查</LinkButton>}>{caught instanceof Error ? caught.message : '请重新检查起卦信息。'}</EmptyState></>
  }
  const profile = activeDraft.profileId === GUEST_PROFILE_ID ? undefined : store.profiles.find((item) => item.id === activeDraft.profileId)
  const interpretation = createMeihuaBasicInterpretation(result)
  const rawResult = { lockedAt, ...resultContext(result), engineVersion: result.engineVersion, adapterVersion: result.adapterVersion, ruleVersion: result.ruleVersion }

  function ensureRecord() {
    const existing = activeDraft.state.recordId && store.records.find((record) => record.id === activeDraft.state.recordId)
    if (existing) return existing.id
    const created = createRecord({ profile, type: 'meihua', question: activeDraft.question, category: activeDraft.category, rawResult, interpretation })
    store.createRecordSnapshot(created)
    store.upsertDraft({ ...activeDraft, state: { ...activeDraft.state, recordId: created.id } })
    return created.id
  }

  return <>
    <TopBar title="梅花易数结果" eyebrow={methodLabels[method]} back action={<span className="chip">{profile?.name ?? '未关联人物'}</span>} />
    {activeDraft.question && <Card className="question-summary"><span>本次问题</span><p>{activeDraft.question}</p></Card>}
    <Card className="hero-card result-hero">
      <div className="card-kicker"><span>本卦 → 变卦</span></div>
      <h2>第 {result.original.number} 卦 · {result.original.name}</h2>
      <span className="result-arrow">↓</span>
      <h2>第 {result.changed.number} 卦 · {result.changed.name}</h2>
      <div className="chip-row"><span className="chip">第 {result.movingLine} 爻动</span><span className="chip">{result.bodyUseRelation.label}</span></div>
    </Card>

    <Card>
      <SectionHeading title="卦象结构" />
      <div className="meihua-sequence">
        <div><span>本卦</span><b>{result.original.name}</b><small>{result.original.upper.symbol}{result.original.lower.symbol}</small></div>
        <i>→</i>
        <div><span>互卦</span><b>{result.mutual.name}</b><small>{result.mutual.upper.symbol}{result.mutual.lower.symbol}</small></div>
        <i>→</i>
        <div><span>变卦</span><b>{result.changed.name}</b><small>{result.changed.upper.symbol}{result.changed.lower.symbol}</small></div>
      </div>
      <dl className="reading-summary-list">
        <div><dt>体卦 · 主方</dt><dd>{result.bodyTrigram.symbol} {result.bodyTrigram.name} · {result.bodyTrigram.element}</dd></div>
        <div><dt>用卦 · 所问之事</dt><dd>{result.useTrigram.symbol} {result.useTrigram.name} · {result.useTrigram.element}</dd></div>
        <div><dt>体用关系</dt><dd>{result.bodyUseRelation.label}</dd></div>
      </dl>
    </Card>

    <Card className="interpretation-card summary-reading">
      <SectionHeading title="基础说明" />
      <p className="reading-intro">{result.bodyUseRelation.summary}</p>
      <div className="reading-sections">
        <section className="reading-section"><h3>卦辞</h3><blockquote className="hexagram-text">{result.original.judgment}</blockquote></section>
        <section className="reading-section"><h3>第 {result.movingLine} 爻</h3><blockquote className="hexagram-text">{result.movingLineText}</blockquote></section>
      </div>
    </Card>

    <AiReadingPanel key={activeDraft.id} module="meihua" question={activeDraft.question} context={{ lockedAt, ...resultContext(result) }} recordId={activeDraft.state.recordId} ensureRecord={ensureRecord} title="结合卦象回答你的问题" />

    <details className="result-disclosure"><summary>查看起卦依据</summary><Card>
      <ul className="compact-list">
        <li><span>起卦时间</span><b>{formatDate(lockedAt, true)}</b></li>
        {result.calendar && <><li><span>农历</span><b>{result.calendar.lunarYear}年{result.calendar.isLeapMonth ? '闰' : ''}{result.calendar.lunarMonth}月{result.calendar.lunarDay}日</b></li><li><span>年支 / 时支</span><b>{result.calendar.yearBranch} / {result.calendar.hourBranch}</b></li></>}
        {result.method === 'specified_time' && <li><span>指定时间</span><b>{result.sourceNumbers.specifiedLocalDateTime?.replace('T', ' ')}</b></li>}
        {result.method === 'numbers' && <li><span>输入数字</span><b>{result.sourceNumbers.firstNumber} / {result.sourceNumbers.secondNumber}</b></li>}
        {result.method === 'three_numbers' && <li><span>输入数字</span><b>{result.sourceNumbers.firstNumber} / {result.sourceNumbers.secondNumber} / {result.sourceNumbers.thirdNumber}</b></li>}
        {result.method === 'text' && <><li><span>起卦文字</span><b>{result.sourceNumbers.sourceText}</b></li><li><span>汉字数量</span><b>{result.sourceNumbers.characterCount}</b></li></>}
        {(result.method === 'object_count' || result.method === 'sound_count') && <li><span>{result.method === 'object_count' ? '物品数量' : '声音次数'}</span><b>{result.sourceNumbers.observedCount}</b></li>}
        <li><span>上卦数 / 下卦数 / 动爻数</span><b>{result.sourceNumbers.upperTotal} / {result.sourceNumbers.lowerTotal} / {result.sourceNumbers.movingTotal}</b></li>
      </ul>
    </Card></details>

    <div className="button-row"><LinkButton to="/divination" secondary>返回起卦</LinkButton><Button onClick={() => navigate(`/records/${ensureRecord()}`)}>{activeDraft.state.recordId ? '查看已保存记录' : '保存到记录'}</Button></div>
  </>
}

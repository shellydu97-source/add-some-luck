import { buildMeihuaContext } from '../ai/context'
import { Link } from 'react-router-dom'
import AiReadingPanel from '../components/AiReadingPanel'
import HexagramHelp from '../components/HexagramHelp'
import TermHelp from '../components/TermHelp'
import TopBar from '../components/TopBar'
import { Card, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import type { MeihuaDraft } from '../models/types'
import { getDraft, useAppStore } from '../storage/store'
import { formatDate } from '../utils/text'
import { GUEST_PROFILE_ID } from '../utils/record'
import { buildMeihuaOutcome, isMeihuaComplete, saveDivinationRecord } from '../utils/divinationRecords'
import AutoSaveRecord from '../components/AutoSaveRecord'

const methodLabels: Record<NonNullable<MeihuaDraft['state']['method']>, string> = {
  time: '当前时间起卦', specified_time: '指定时间起卦', numbers: '两数起卦', three_numbers: '三数起卦',
  text: '文字字数起卦', object_count: '物数起卦', sound_count: '声音起卦',
}

export default function MeihuaResultPage() {
  const store = useAppStore()
  const draft = getDraft(store, 'meihua')
  if (!draft || !isMeihuaComplete(draft)) return <><TopBar title="梅花易数结果" back /><EmptyState title="结果尚未锁定" action={<LinkButton to="/divination/meihua/cast">继续起卦</LinkButton>}>确认起卦方式后即可查看结果。</EmptyState></>
  const activeDraft = draft
  const method = activeDraft.state.method as NonNullable<MeihuaDraft['state']['method']>
  let outcome: ReturnType<typeof buildMeihuaOutcome>
  try {
    outcome = buildMeihuaOutcome(activeDraft)
  } catch (caught) {
    return <><TopBar title="梅花易数结果" back /><EmptyState title="当前结果无法生成" action={<LinkButton to="/divination/meihua/cast">返回检查</LinkButton>}>{caught instanceof Error ? caught.message : '请重新检查起卦信息。'}</EmptyState></>
  }
  const { lockedAt, result, judgement } = outcome
  const profile = activeDraft.profileId === GUEST_PROFILE_ID ? undefined : store.profiles.find((item) => item.id === activeDraft.profileId)
  const subjectLabel = profile?.name ?? activeDraft.temporarySubject?.name?.trim() ?? '临时测算'
  const savedRecord = store.records.find((record) => record.id === activeDraft.state.recordId)

  return <>
    <TopBar title="梅花易数结果" eyebrow={methodLabels[method]} back action={<span className="chip">{subjectLabel}</span>} />
    {activeDraft.question && <Card className="question-summary"><span>本次问题</span><p>{activeDraft.question}</p></Card>}
    <Card className="hero-card result-hero">
      <div className="card-kicker"><span>本卦 → 变卦</span></div>
      <h2><HexagramHelp hexagram={result.original} movingLines={[result.movingLine]} context="本次起卦最初得到的卦象。" /></h2>
      <span className="result-arrow">↓</span>
      <h2><HexagramHelp hexagram={result.changed} context="本卦动爻变化后形成的卦象。" /></h2>
      <div className="chip-row"><span className="chip">第 {result.movingLine} 爻动</span><span className="chip">{result.bodyUseRelation.label}</span></div>
    </Card>

    <AutoSaveRecord draftId={activeDraft.id} />
    {savedRecord && <p className="auto-saved-note"><span>已自动保存到记录</span><Link to={`/records/${savedRecord.id}`}>查看记录</Link></p>}
    <Card className="interpretation-card"><SectionHeading title={judgement.tendency} /><ul className="plain-list">{judgement.reasons.map(r => <li key={r}>{r}</li>)}</ul><p>{judgement.advice}</p><p className="term-chip-row"><span>相关术语：</span>{['体卦', '用卦', '体用关系', '卦气', '旺相休囚死', '互卦'].map((term) => <TermHelp key={term} term={term} />)}</p></Card>
    <Card>
      <SectionHeading title="卦象结构" />
      <div className="meihua-sequence">
        <div><span><TermHelp term="本卦" /></span><b>{result.original.name}</b><small>{result.original.upper.symbol}{result.original.lower.symbol}</small></div>
        <i>→</i>
        <div><span><TermHelp term="互卦" /></span><b>{result.mutual.name}</b><small>{result.mutual.upper.symbol}{result.mutual.lower.symbol}</small></div>
        <i>→</i>
        <div><span><TermHelp term="变卦" /></span><b>{result.changed.name}</b><small>{result.changed.upper.symbol}{result.changed.lower.symbol}</small></div>
      </div>
      <div className="meihua-secondary-sequence">
        <div><span><TermHelp term="错卦" /></span><b>{result.opposite.name}</b><small>{result.opposite.upper.symbol}{result.opposite.lower.symbol}</small></div>
        <div><span><TermHelp term="综卦" /></span><b>{result.reversed.name}</b><small>{result.reversed.upper.symbol}{result.reversed.lower.symbol}</small></div>
      </div>
      <dl className="reading-summary-list">
        <div><dt><TermHelp term="体卦" label="体卦 · 主方" /></dt><dd>{result.bodyTrigram.symbol} {result.bodyTrigram.name} · {result.bodyTrigram.element}</dd></div>
        <div><dt><TermHelp term="用卦" label="用卦 · 所问之事" /></dt><dd>{result.useTrigram.symbol} {result.useTrigram.name} · {result.useTrigram.element}</dd></div>
        <div><dt><TermHelp term="体用关系" /></dt><dd>{result.bodyUseRelation.label}</dd></div>
      </dl>
    </Card>

    <Card className="interpretation-card summary-reading local-answer-card">
      <SectionHeading title="卦辞与动爻" />
      <p className="reading-intro">{result.bodyUseRelation.summary}</p>
      <div className="reading-sections">
        <section className="reading-section"><h3>卦辞</h3><blockquote className="hexagram-text">{result.original.judgment}</blockquote></section>
        <section className="reading-section"><h3>第 {result.movingLine} 爻</h3><blockquote className="hexagram-text">{result.movingLineText}</blockquote></section>
      </div>
      <p className="helper">点击卦名可以查看完整卦辞和六爻原文。</p>
    </Card>

    <AiReadingPanel key={activeDraft.id} module="meihua" question={activeDraft.question} context={buildMeihuaContext(result,judgement,lockedAt)} draftId={activeDraft.id} category={activeDraft.category} recordId={activeDraft.state.recordId} ensureRecord={() => saveDivinationRecord(activeDraft.id) ?? ''} title="结合卦象回答你的问题" />

    <details className="result-disclosure"><summary>查看起卦依据</summary><Card>
      <p className="helper">子时按当天计算；时间起卦年数取农历年支序数。卦气按节令月建，互卦与变用卦分别对固定体卦判断生克。</p>
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

    <div className="button-row"><LinkButton to="/divination" secondary>返回占卜</LinkButton>{savedRecord && <LinkButton to={`/records/${savedRecord.id}`}>查看记录</LinkButton>}</div>
  </>
}

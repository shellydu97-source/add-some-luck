import { buildTarotContext } from '../ai/context'
import { Link } from 'react-router-dom'
import { buildTarotCopyText } from '../calculation/tarotInterpretation'
import AutoSaveRecord from '../components/AutoSaveRecord'
import AiReadingPanel from '../components/AiReadingPanel'
import TarotCardVisual from '../components/TarotCardVisual'
import TopBar from '../components/TopBar'
import { Button, Card, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import { getDraft, useAppStore } from '../storage/store'
import { copyText } from '../utils/clipboard'
import { GUEST_PROFILE_ID } from '../utils/record'
import { buildTarotOutcome, isTarotComplete, saveDivinationRecord } from '../utils/divinationRecords'

const spreadNames = { single: '单牌', three: '三牌', 'dual-path': '双路径' }

export default function TarotResultPage() {
  const store = useAppStore()
  const draft = getDraft(store, 'tarot')
  if (!draft || !isTarotComplete(draft)) return <><TopBar title="塔罗结果" back /><EmptyState title="结果尚未确认" action={<LinkButton to="/divination/tarot/draw">继续抽牌</LinkButton>}>抽满并确认后才能查看固定结果。</EmptyState></>
  const activeDraft = draft
  const spread = draft.state.spread!
  const profile = activeDraft.profileId === GUEST_PROFILE_ID ? undefined : store.profiles.find((item) => item.id === activeDraft.profileId)
  const subjectLabel = profile?.name ?? activeDraft.temporarySubject?.name?.trim() ?? '临时测算'

  const { cards, localInterpretation } = buildTarotOutcome(activeDraft)
  const savedRecord = store.records.find((record) => record.id === activeDraft.state.recordId)

  async function handleCopy() {
    try {
      await copyText(buildTarotCopyText({ question: activeDraft.question, drawnAt: activeDraft.createdAt, cards, interpretation: localInterpretation }))
      store.setNotice('已复制，可以粘贴到你常用的大模型中。')
    } catch {
      store.setNotice('复制失败，请稍后重试。')
    }
  }

  return <>
    <TopBar title="塔罗结果" eyebrow={spreadNames[spread]} back action={<span className="chip">{subjectLabel}</span>} />
    {activeDraft.question.trim() && <Card className="question-summary"><span>本次问题</span><p>{activeDraft.question}</p></Card>}
    <div className="revealed-cards">{cards.map((card) => <div className="revealed-wrap" key={card.id}><TarotCardVisual card={card} orientation={card.orientation} keywords={card.keywords} basicMeaning={card.basicMeaning} position={card.position} /><strong>{card.position}</strong><small>{card.orientation === 'reversed' ? '逆位' : '正位'}</small></div>)}</div>

    <AutoSaveRecord draftId={activeDraft.id} />
    {savedRecord && <p className="auto-saved-note"><span>已自动保存到记录</span><Link to={`/records/${savedRecord.id}`}>查看记录</Link></p>}
    <Card className="local-answer-card summary-reading">
      <SectionHeading title="基础答案" />
      <p className="local-answer-lead">{localInterpretation.summary}</p>
      <p className="fact-boundary">这是牌阵与固定牌义形成的基础答案，不需要调用智能解读。点击每张牌可以继续查看对应位置、关键词和基础牌义。</p>
    </Card>

    <AiReadingPanel key={activeDraft.id} module="tarot" question={activeDraft.question} context={buildTarotContext(spread,cards,activeDraft.createdAt)} draftId={activeDraft.id} category={activeDraft.category} recordId={activeDraft.state.recordId} ensureRecord={() => saveDivinationRecord(activeDraft.id) ?? ''} title="结合这组牌回答你的问题" />

    <details className="result-disclosure"><summary>查看牌阵基础分析</summary><Card className="interpretation-card">
      <p className="reading-intro">{localInterpretation.summary}</p>
      <div className="reading-sections">{localInterpretation.sections.map((section) => <section className="reading-section" key={section.id}><h3>{section.title}</h3><p>{section.content}</p><details className="reading-evidence"><summary>查看判断依据</summary><ul>{section.evidence.map((evidence, index) => <li key={`${section.id}-${index}`}>{evidence}</li>)}</ul></details></section>)}</div>
      {!!localInterpretation.patterns.length && <div className="pattern-summary"><h3>牌面关系</h3><ul>{localInterpretation.patterns.map((pattern, index) => <li key={`${pattern}-${index}`}>{pattern}</li>)}</ul></div>}
      <p className="reading-uncertainty">{localInterpretation.uncertainty}</p>
    </Card></details>

    <details className="result-disclosure"><summary>查看每张牌的关键词与基础牌义</summary><Card><ul className="position-readings">{cards.map((card) => <li key={card.id}><b>{card.position} · {card.nameZh}（{card.orientation === 'reversed' ? '逆位' : '正位'}）</b><div className="chip-row">{card.keywords.map((keyword) => <span className="chip" key={keyword}>{keyword}</span>)}</div><p>{card.basicMeaning}</p></li>)}</ul></Card></details>
    <Button className="copy-reading-button secondary" onClick={handleCopy}>复制完整牌面信息</Button>
    <div className="button-row"><LinkButton to="/divination" secondary>返回占卜</LinkButton>{savedRecord && <LinkButton to={`/records/${savedRecord.id}`}>查看记录</LinkButton>}</div>
  </>
}

import { useNavigate } from 'react-router-dom'
import { spreadPositions } from '../calculation/tarotMock'
import TarotRoller from '../components/TarotRoller'
import TopBar from '../components/TopBar'
import { Button, ConfidenceNote, EmptyState, LinkButton } from '../components/UI'
import { useFlowExitGuard } from '../hooks/useFlowExitGuard'
import { getDraft, useAppStore } from '../storage/store'

export default function TarotDrawPage() {
  const navigate = useNavigate()
  const draft = useAppStore((state) => getDraft(state, 'tarot'))
  const upsertDraft = useAppStore((state) => state.upsertDraft)
  const reduceMotion = useAppStore((state) => state.reduceMotion)
  const ready = !!draft?.state.spread && !!draft.state.drawMode
  const required = draft?.state.spread ? spreadPositions[draft.state.spread].length : 0
  useFlowExitGuard(ready && !draft.state.revealed)

  if (!draft?.state.spread || !draft.state.drawMode) return <><TopBar title="抽牌" back /><EmptyState title="抽牌方式尚未选择" action={<LinkButton to="/divination/tarot/method">选择抽牌方式</LinkButton>}>选择仪式抽牌或系统抽牌后继续。</EmptyState></>
  const activeDraft = draft
  const spread = draft.state.spread

  function updateState(state: typeof activeDraft.state) { upsertDraft({ ...activeDraft, state }) }
  function reveal() {
    if (activeDraft.state.selected.length !== required) return
    updateState({ ...activeDraft.state, phase: 'revealed', revealed: true })
    navigate('/divination/tarot/result')
  }

  return <>
    <TopBar title={activeDraft.state.drawMode === 'ritual' ? '仪式抽牌' : '系统抽牌'} eyebrow={`已选 ${activeDraft.state.selected.length} / ${required}`} back />
    <ConfidenceNote>本次抽牌结果已经固定，暂停、刷新或返回都不会改变。</ConfidenceNote>
    {activeDraft.state.drawMode === 'ritual' ? <TarotRoller state={activeDraft.state} required={required} reduceMotion={reduceMotion} onChange={updateState} /> : <div className="system-draw-stage"><div className="tarot-deck system-deck">{activeDraft.state.selected.map((cardId, index) => <div className="tarot-back selected" key={cardId}><b>{index + 1}</b></div>)}</div><p className="helper center">系统已经锁定 {required} 张牌，尚未翻开。</p></div>}
    <div className="draw-positions">{spreadPositions[spread].map((position, index) => <div className={activeDraft.state.selected[index] ? 'filled' : ''} key={position}><span>{index + 1}</span><b>{position}</b></div>)}</div>
    {activeDraft.state.revealed ? <Button onClick={() => navigate('/divination/tarot/result')}>查看结果</Button> : <Button disabled={activeDraft.state.selected.length !== required} onClick={reveal}>确认抽牌并统一翻开</Button>}
  </>
}

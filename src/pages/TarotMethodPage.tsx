import { Navigate, useNavigate } from 'react-router-dom'
import { spreadPositions } from '../calculation/tarotMock'
import TopBar from '../components/TopBar'
import { Button, Card, ConfidenceNote, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import { getDraft, useAppStore } from '../storage/store'

export default function TarotMethodPage() {
  const navigate = useNavigate()
  const draft = useAppStore((state) => getDraft(state, 'tarot'))
  const upsertDraft = useAppStore((state) => state.upsertDraft)
  const reduceMotion = useAppStore((state) => state.reduceMotion)
  if (!draft?.state.spread) return <><TopBar title="选择抽牌方式" back /><EmptyState title="还没有选择牌阵" action={<LinkButton to="/divination/tarot/spread">选择牌阵</LinkButton>}>先确定需要抽取几张牌。</EmptyState></>
  if (draft.state.revealed) return <Navigate to="/divination/tarot/result" replace />
  const activeDraft = draft
  const spread = draft.state.spread
  const required = spreadPositions[spread].length

  function chooseRitual() {
    upsertDraft({ ...activeDraft, state: { ...activeDraft.state, drawMode: 'ritual', phase: reduceMotion ? 'paused' : 'rolling', selected: [], cursor: 0, revealed: false } })
    navigate('/divination/tarot/draw')
  }

  function chooseSystem() {
    upsertDraft({ ...activeDraft, state: { ...activeDraft.state, drawMode: 'system', phase: 'complete', selected: activeDraft.state.deckOrder.slice(0, required), cursor: required, revealed: false } })
    navigate('/divination/tarot/draw')
  }

  return <>
    <TopBar title="选择抽牌方式" eyebrow="第 3 步" back />
    <ConfidenceNote>两种方式使用同一副已经洗好的 78 张牌，牌序与正逆位不会中途改变。</ConfidenceNote>
    <div className="card-grid method-choice-grid">
      <Card className="method-choice"><SectionHeading title="仪式抽牌" side={<span className="chip">逐张选择</span>} /><p className="helper">牌背持续滚动；点击暂停，锁定中央候选牌，重复直到抽满。</p><Button onClick={chooseRitual}>开始仪式抽牌</Button></Card>
      <Card className="method-choice"><SectionHeading title="系统抽牌" side={<span className="chip">一次完成</span>} /><p className="helper">从洗好的牌序中一次取出前 {required} 张。</p><Button className="secondary" onClick={chooseSystem}>替我抽牌</Button></Card>
    </div>
  </>
}

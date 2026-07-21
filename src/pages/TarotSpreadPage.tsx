import { Navigate, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { ConfidenceNote, EmptyState, LinkButton } from '../components/UI'
import type { TarotSpread } from '../models/types'
import { getDraft, useAppStore } from '../storage/store'

const spreads: Array<{ id: TarotSpread; name: string; count: number; description: string }> = [
  { id: 'single', name: '单牌', count: 1, description: '当前提示' },
  { id: 'three', name: '三牌', count: 3, description: '现状 / 阻碍 / 建议' },
  { id: 'dual-path', name: '双路径', count: 5, description: '当前状态 / A发展 / A结果 / B发展 / B结果' },
]

export default function TarotSpreadPage() {
  const navigate = useNavigate()
  const draft = useAppStore((state) => getDraft(state, 'tarot'))
  const upsertDraft = useAppStore((state) => state.upsertDraft)
  if (!draft) return <><TopBar title="选择牌阵" back /><EmptyState title="还没有塔罗草稿" action={<LinkButton to="/divination/tarot/question">返回塔罗占问</LinkButton>}>问题可以留空，但需要先开始一次新的抽牌流程。</EmptyState></>
  if (draft.state.revealed) return <Navigate to="/divination/tarot/result" replace />
  const activeDraft = draft

  function choose(spread: TarotSpread) {
    upsertDraft({ ...activeDraft, state: { ...activeDraft.state, spread, drawMode: undefined, phase: 'idle', selected: [], cursor: 0, revealed: false, recordId: undefined } })
    navigate('/divination/tarot/method')
  }

  return <>
    <TopBar title="选择牌阵" eyebrow="第 2 步" back />
    {activeDraft.state.isChoice && <ConfidenceNote>双路径牌阵适合展示 A、B 两个方向，但不会生成优劣结论。</ConfidenceNote>}
    <div className="spread-list">{spreads.map((spread) => <button className={`spread-option ${activeDraft.state.isChoice && spread.id === 'dual-path' ? 'recommended' : ''}`} onClick={() => choose(spread.id)} key={spread.id}><div className="spread-symbols">{Array.from({ length: spread.count }, (_, index) => <i key={index} />)}</div><div><div className="spread-title"><b>{spread.name}</b><span>{spread.count} 张</span>{activeDraft.state.isChoice && spread.id === 'dual-path' && <em>推荐</em>}</div><p>{spread.description}</p></div><span className="link-arrow">→</span></button>)}</div>
  </>
}

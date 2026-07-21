import { Navigate, useNavigate } from 'react-router-dom'
import { coinTossToLine } from '../calculation/liuyao'
import LiuyaoCoin from '../components/LiuyaoCoin'
import TopBar from '../components/TopBar'
import { Button, Card, ConfidenceNote, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import { useFlowExitGuard } from '../hooks/useFlowExitGuard'
import type { CoinToss } from '../models/types'
import { getDraft, useAppStore } from '../storage/store'

export default function LiuyaoConfirmPage() {
  const navigate = useNavigate()
  const draft = useAppStore((state) => getDraft(state, 'liuyao'))
  const upsertDraft = useAppStore((state) => state.upsertDraft)
  useFlowExitGuard(!!draft && !draft.state.locked)
  if (!draft || draft.state.casts.length !== 6) return <><TopBar title="确认原始六爻" back /><EmptyState title="六爻尚未完成" action={<LinkButton to="/divination/liuyao/cast">继续起爻</LinkButton>}>完成六次起爻后再统一确认。</EmptyState></>
  if (draft.state.locked) return <Navigate to="/divination/liuyao/result" replace />
  const activeDraft = draft

  function toggleCoin(lineIndex: number, coinIndex: number) {
    if (activeDraft.state.locked) return
    const casts = activeDraft.state.casts.map((toss, index) => {
      if (index !== lineIndex) return toss
      const coins = toss.coins.map((side, current) => current === coinIndex ? (side === 'yang' ? 'yin' : 'yang') : side) as CoinToss['coins']
      return { coins }
    })
    upsertDraft({ ...activeDraft, state: { ...activeDraft.state, casts, editingIndex: lineIndex } })
  }

  function lockResult() {
    upsertDraft({ ...activeDraft, state: { ...activeDraft.state, editingIndex: undefined, locked: true, lockedAt: new Date().toISOString() } })
    navigate('/divination/liuyao/result')
  }

  return <>
    <TopBar title="确认原始六爻" eyebrow="确认后锁定" back />
    <ConfidenceNote>最终确认前可以点击任意一枚铜钱翻面；确认后，六次原始结果将锁定。</ConfidenceNote>
    {!activeDraft.state.coinConventionVersion && <Card className="duplicate-card"><h3>旧草稿请逐爻核对</h3><p className="helper">系统不会擅自翻转旧草稿，请按铜钱图案核对这六次结果。</p></Card>}
    <div className="confirm-lines">{activeDraft.state.casts.map((toss, lineIndex) => { const line = coinTossToLine(toss); return <Card key={lineIndex}><SectionHeading title={`第 ${lineIndex + 1} 爻 · ${line.label}`} side={<span className="chip">由下往上</span>} /><div className="coin-row compact-coins">{toss.coins.map((side, coinIndex) => <LiuyaoCoin side={side} interactive compact ariaLabel={`第 ${lineIndex + 1} 爻第 ${coinIndex + 1} 枚铜钱，点击翻面`} onClick={() => toggleCoin(lineIndex, coinIndex)} key={coinIndex} />)}</div></Card> })}</div>
    <Button onClick={lockResult}>确认并锁定原始六爻</Button>
  </>
}

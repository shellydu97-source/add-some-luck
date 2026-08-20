import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { coinTossToLine, createDigitalCoinToss, LIUYAO_COIN_CONVENTION_VERSION } from '../calculation/liuyao'
import LiuyaoCoin from '../components/LiuyaoCoin'
import TopBar from '../components/TopBar'
import { Button, Card, ConfidenceNote, EmptyState, LinkButton, Segmented } from '../components/UI'
import { useFlowExitGuard } from '../hooks/useFlowExitGuard'
import type { CoinToss, LiuyaoMethod } from '../models/types'
import { getDraft, useAppStore } from '../storage/store'

const methodOptions = [{ value: 'digital' as const, label: '数字投掷' }, { value: 'manual' as const, label: '手动录入' }]

function YaoLine({ toss }: { toss: CoinToss }) {
  const line = coinTossToLine(toss)
  const broken = line.value === 6 || line.value === 8
  return <div className="yao-row"><span className={`yao-line ${broken ? 'broken' : ''}`} /><small>{line.label}</small></div>
}

export default function LiuyaoCastPage() {
  const navigate = useNavigate()
  const draft = useAppStore((state) => getDraft(state, 'liuyao'))
  const upsertDraft = useAppStore((state) => state.upsertDraft)
  const [manualCoins, setManualCoins] = useState<CoinToss['coins']>(['yang', 'yang', 'yang'])
  useFlowExitGuard(!!draft && !draft.state.locked)
  if (!draft) return <><TopBar title="六爻起爻" back /><EmptyState title="还没有六爻草稿" action={<LinkButton to="/divination/liuyao/question">返回六爻占问</LinkButton>}>问题可以留空，但需要先开始一次新流程。</EmptyState></>
  if (draft.state.locked) return <Navigate to="/divination/liuyao/result" replace />
  const activeDraft = draft

  function update(method: LiuyaoMethod) {
    if (activeDraft.state.method === method) return
    if (activeDraft.state.casts.length && !window.confirm('切换起爻方式会清空已经完成的爻，确定继续吗？')) return
    upsertDraft({ ...activeDraft, state: { ...activeDraft.state, method, coinConventionVersion: LIUYAO_COIN_CONVENTION_VERSION, casts: [], editingIndex: undefined, locked: false, lockedAt: undefined } })
  }

  function append(toss: CoinToss, method: LiuyaoMethod) {
    if (activeDraft.state.casts.length >= 6) return
    const casts = [...activeDraft.state.casts, toss]
    upsertDraft({ ...activeDraft, state: { ...activeDraft.state, method, coinConventionVersion: LIUYAO_COIN_CONVENTION_VERSION, casts } })
    if (casts.length === 6) navigate('/divination/liuyao/confirm')
  }

  function digitalCast() {
    append(createDigitalCoinToss(), 'digital')
  }

  function toggleManual(index: number) {
    setManualCoins((coins) => coins.map((side, coinIndex) => coinIndex === index ? (side === 'yang' ? 'yin' : 'yang') : side) as CoinToss['coins'])
  }

  function confirmManual() {
    append({ coins: [...manualCoins] as CoinToss['coins'] }, 'manual')
    setManualCoins(['yang', 'yang', 'yang'])
  }

  const lastCast = activeDraft.state.casts.at(-1)
  const complete = activeDraft.state.casts.length === 6
  return <>
    <TopBar title="六爻起爻" eyebrow={`第 ${Math.min(activeDraft.state.casts.length + 1, 6)} / 6 爻`} back />
    <ConfidenceNote>每次投掷三枚铜钱组成一爻，共进行六次；第一次为初爻，结果由下往上排列。</ConfidenceNote>
    {!activeDraft.state.coinConventionVersion && activeDraft.state.casts.length > 0 && <Card className="duplicate-card"><h3>请重新核对旧草稿</h3><p className="helper">这份草稿来自旧版铜钱展示，系统不会自动改变原始结果。请按每枚铜钱的图案逐爻核对后再确认。</p></Card>}
    <Segmented value={activeDraft.state.method ?? 'digital'} options={methodOptions} onChange={update} label="起爻方式" />
    <Card><div className="card-kicker"><span>当前问题</span><span className="chip">{activeDraft.category}</span></div><h3>{activeDraft.question || '未填写问题'}</h3><p className="helper">占问者性别：{activeDraft.state.querentGender === 'male' ? '男' : activeDraft.state.querentGender === 'female' ? '女' : '未填写'}</p>{activeDraft.state.timeRange && <p className="helper">观察范围：{activeDraft.state.timeRange}</p>}</Card>
    <Card className="casting-stage">
      {complete
        ? <Button onClick={() => navigate('/divination/liuyao/confirm')}>检查并确认六爻</Button>
        : activeDraft.state.method === 'manual'
          ? <><p className="helper center">点击铜钱即可翻面，调整好后确认本爻。</p><div className="coin-row manual-coins">{manualCoins.map((side, index) => <LiuyaoCoin side={side} interactive ariaLabel={`第 ${index + 1} 枚铜钱，点击翻面`} onClick={() => toggleManual(index)} key={index} />)}</div><Button onClick={confirmManual}>确认第 {activeDraft.state.casts.length + 1} 爻</Button></>
          : <><div className="coin-row" aria-label="上一次铜钱结果">{lastCast ? lastCast.coins.map((side, index) => <LiuyaoCoin side={side} ariaLabel={`第 ${index + 1} 枚铜钱`} key={index} />) : [0, 1, 2].map((item) => <span className="coin empty" aria-hidden="true" key={item}>?</span>)}</div><Button onClick={digitalCast}>投掷第 {activeDraft.state.casts.length + 1} 爻</Button></>}
      <div className="yao-stack">{activeDraft.state.casts.map((toss, index) => <YaoLine toss={toss} key={index} />)}{Array.from({ length: 6 - activeDraft.state.casts.length }, (_, index) => <div className="yao-row placeholder" key={`p-${index}`}><span /><small>待起爻</small></div>)}</div>
      <p className="helper center">下方为初爻，上方为第六爻</p>
    </Card>
  </>
}

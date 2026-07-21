import { useEffect, useMemo, useRef, useState } from 'react'
import type { TarotDraftState } from '../models/types'
import { getRitualLane } from '../utils/tarotRoller'
import { Button, Card } from './UI'

const CARD_STEP = 92
export const TAROT_ROLL_SPEED_PX_PER_SECOND = 264

export default function TarotRoller({ state, required, reduceMotion, onChange }: {
  state: TarotDraftState
  required: number
  reduceMotion: boolean
  onChange: (state: TarotDraftState) => void
}) {
  const [cursor, setCursor] = useState(state.cursor)
  const cursorRef = useRef(state.cursor)
  const offsetRef = useRef(0)
  const laneRef = useRef<HTMLDivElement>(null)
  const remaining = useMemo(() => state.deckOrder.filter((cardId) => !state.selected.includes(cardId)), [state.deckOrder, state.selected])
  const current = remaining.length ? remaining[((cursor % remaining.length) + remaining.length) % remaining.length] : undefined
  const lane = useMemo(() => getRitualLane(remaining, cursor), [remaining, cursor])

  function applyOffset(offset: number) {
    if (laneRef.current) laneRef.current.style.transform = `translate3d(${-offset}px, 0, 0)`
  }

  function setCurrentCursor(next: number) {
    cursorRef.current = next
    setCursor(next)
  }

  function resetOffset() {
    offsetRef.current = 0
    applyOffset(0)
  }

  useEffect(() => {
    if (state.phase !== 'rolling' || reduceMotion || !remaining.length) return
    let frame = 0
    let previous = performance.now()

    const tick = (time: number) => {
      const elapsed = Math.min(48, Math.max(0, time - previous))
      previous = time
      offsetRef.current += elapsed * TAROT_ROLL_SPEED_PX_PER_SECOND / 1000
      if (offsetRef.current >= CARD_STEP) {
        const steps = Math.floor(offsetRef.current / CARD_STEP)
        offsetRef.current %= CARD_STEP
        setCurrentCursor(cursorRef.current + steps)
      }
      applyOffset(offsetRef.current)
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [state.phase, reduceMotion, remaining.length])

  function startRolling() {
    resetOffset()
    onChange({ ...state, phase: reduceMotion ? 'paused' : 'rolling', cursor: cursorRef.current })
  }

  function pause() {
    const candidateCursor = cursorRef.current + (offsetRef.current >= CARD_STEP / 2 ? 1 : 0)
    setCurrentCursor(candidateCursor)
    resetOffset()
    onChange({ ...state, phase: 'paused', cursor: candidateCursor })
  }

  function nextCandidate() {
    const next = cursorRef.current + 1
    setCurrentCursor(next)
    resetOffset()
    onChange({ ...state, phase: 'paused', cursor: next })
  }

  function selectCurrent() {
    if (!current || state.selected.includes(current) || state.selected.length >= required) return
    const selected = [...state.selected, current]
    resetOffset()
    onChange({
      ...state,
      selected,
      cursor: cursorRef.current,
      phase: selected.length === required ? 'complete' : reduceMotion ? 'paused' : 'rolling',
    })
  }

  return <Card className="tarot-roller-card">
    <div className="tarot-lane-window" aria-label="仪式抽牌牌流" data-phase={state.phase}>
      <div className="tarot-center-marker" aria-hidden="true" />
      <div className="tarot-lane-track" ref={laneRef} data-cursor={cursor}>
        {lane.map((cardId, index) => <div className="tarot-back roller-card" data-card-id={cardId} key={`${cardId}-${index}`}><span>加点<br />好运</span></div>)}
      </div>
    </div>
    <p className="helper center ritual-motion-note">
      {reduceMotion
        ? '已开启降低动态效果：候选牌只会在点击后离散切换。'
        : state.phase === 'rolling'
          ? '牌流正在持续滚动，点击暂停会锁定中央候选牌。'
          : '牌序和正逆位已经固定，暂停与返回都不会重新随机。'}
    </p>
    {state.phase === 'idle' && <Button onClick={startRolling}>{reduceMotion ? '显示候选牌' : '开始滚动'}</Button>}
    {state.phase === 'rolling' && <Button onClick={pause}>暂停牌流</Button>}
    {state.phase === 'paused' && <div className="button-row">
      {reduceMotion
        ? <Button className="secondary" onClick={nextCandidate}>切换候选牌</Button>
        : <Button className="secondary" onClick={startRolling}>继续滚动</Button>}
      <Button onClick={selectCurrent}>选定中央牌</Button>
    </div>}
    {state.phase === 'complete' && <p className="selection-complete">已锁定 {state.selected.length} 张牌，等待统一翻开。</p>}
  </Card>
}

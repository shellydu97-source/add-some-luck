import { useState } from 'react'
import type { TarotCard, TarotOrientation } from '../models/types'

const suitSymbols = { wands: '✦', cups: '◡', swords: '†', pentacles: '✺' } as const
const majorSymbols = ['◌', '✦', '☾', '❀', '▦', '⌂', '♡', '➶', '∞', '⌕', '◉', '⚖', '⌛', '◇', '≈', '⛓', '⚡', '☆', '☽', '☀', '♩', '◎']
const pipCounts: Record<string, number> = { ace: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
const courtMarks: Record<string, string> = { page: 'P', knight: 'N', queen: 'Q', king: 'K' }

interface Props {
  card: Pick<TarotCard, 'id' | 'nameZh' | 'nameEn' | 'arcana' | 'suit' | 'rank' | 'order'>
  orientation: TarotOrientation
  keywords: string[]
  basicMeaning: string
  position: string
}

export default function TarotCardVisual({ card, orientation, keywords, basicMeaning, position }: Props) {
  const [open, setOpen] = useState(false)
  const symbol = card.arcana === 'major' ? majorSymbols[card.order] ?? '✦' : suitSymbols[card.suit ?? 'wands']
  const count = card.rank ? pipCounts[card.rank] : undefined
  const court = card.rank ? courtMarks[card.rank] : undefined
  return <>
    <button type="button" className="tarot-card-button" onClick={() => setOpen(true)} aria-label={`查看${position}${card.nameZh}基础牌义`}>
      <span className={`tarot-art tarot-${card.suit ?? 'major'} ${orientation === 'reversed' ? 'is-reversed' : ''}`}>
        <span className="tarot-art-corner">{card.arcana === 'major' ? card.order : court ?? count}</span>
        <span className="tarot-art-symbols">{count ? Array.from({ length: count }, (_, index) => <i key={index}>{symbol}</i>) : <i className="tarot-major-symbol">{court ?? symbol}</i>}</span>
        <span className="tarot-art-name">{card.nameZh}</span>
      </span>
    </button>
    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><section className="tarot-help-sheet" role="dialog" aria-modal="true" aria-label={`${card.nameZh}基础牌义`} onClick={(event) => event.stopPropagation()}>
      <div className="sheet-heading"><div><span className="eyebrow">{position}</span><h2>{card.nameZh}</h2><p className="helper">{card.nameEn} · {orientation === 'reversed' ? '逆位' : '正位'}</p></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="关闭牌义说明">×</button></div>
      <div className="chip-row">{keywords.map((keyword) => <span className="chip" key={keyword}>{keyword}</span>)}</div>
      <p className="tarot-help-meaning">{basicMeaning}</p>
      <p className="fact-boundary">这是这张牌在当前正逆位下的基础牌义，结合问题时还需要同时看牌阵位置和其他牌。</p>
      <button type="button" className="button secondary" onClick={() => setOpen(false)}>关闭</button>
    </section></div>}
  </>
}

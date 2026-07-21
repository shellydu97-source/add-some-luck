import type { CoinSide } from '../models/types'

interface LiuyaoCoinProps {
  side: CoinSide
  interactive?: boolean
  compact?: boolean
  ariaLabel?: string
  onClick?: () => void
}

function CoinArtwork({ side }: { side: CoinSide }) {
  return <span className={`coin-art coin-art-${side}`} aria-hidden="true">
    <span className="coin-hole" />
    {side === 'yin' ? <>
      <i className="coin-inscription coin-inscription-top">乾</i>
      <i className="coin-inscription coin-inscription-right">隆</i>
      <i className="coin-inscription coin-inscription-bottom">通</i>
      <i className="coin-inscription coin-inscription-left">宝</i>
    </> : <>
      <i className="coin-back-mark coin-back-mark-left" />
      <i className="coin-back-mark coin-back-mark-right" />
    </>}
  </span>
}

export default function LiuyaoCoin({ side, interactive = false, compact = false, ariaLabel = '铜钱', onClick }: LiuyaoCoinProps) {
  const className = `coin${compact ? ' compact-coin' : ''}${interactive ? ' interactive-coin' : ''}`
  if (interactive) {
    return <button type="button" className={className} aria-label={ariaLabel} onClick={onClick}><CoinArtwork side={side} /></button>
  }
  return <span className={className} role="img" aria-label={ariaLabel}><CoinArtwork side={side} /></span>
}

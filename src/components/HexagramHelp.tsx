import { useState } from 'react'

interface HexagramLike {
  number: number
  name: string
  judgment: string
  lineTexts: readonly string[]
  upper: { name: string; symbol?: string; element?: string }
  lower: { name: string; symbol?: string; element?: string }
}

const lineLabels = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

export default function HexagramHelp({
  hexagram, movingLines = [], label, context,
}: {
  hexagram: HexagramLike
  movingLines?: number[]
  label?: string
  context?: string
}) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className="hexagram-help-trigger" onClick={() => setOpen(true)}>
      {label ?? `第 ${hexagram.number} 卦 · ${hexagram.name}`}<span aria-hidden="true">ⓘ</span>
    </button>
    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <section className="hexagram-help-sheet" role="dialog" aria-modal="true" aria-label={`${hexagram.name}基础说明`} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-heading"><div><span className="eyebrow">卦象基础说明</span><h2>{hexagram.name}</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="关闭卦象说明">×</button></div>
        <div className="hexagram-trigrams"><div><span>上卦</span><b>{hexagram.upper.symbol} {hexagram.upper.name}{hexagram.upper.element ? ` · ${hexagram.upper.element}` : ''}</b></div><div><span>下卦</span><b>{hexagram.lower.symbol} {hexagram.lower.name}{hexagram.lower.element ? ` · ${hexagram.lower.element}` : ''}</b></div></div>
        <div className="hexagram-help-section"><b>卦辞</b><p>{hexagram.judgment}</p></div>
        {context && <div className="hexagram-help-section"><b>在本次结果中的位置</b><p>{context}</p></div>}
        <div className="hexagram-help-section"><b>六爻原文</b><ol className="hexagram-line-list">{hexagram.lineTexts.map((text, index) => <li className={movingLines.includes(index + 1) ? 'active' : ''} key={`${hexagram.number}-${index}`}><b>{lineLabels[index]}</b><span>{text}</span></li>)}</ol></div>
        <button type="button" className="button secondary" onClick={() => setOpen(false)}>关闭</button>
      </section>
    </div>}
  </>
}

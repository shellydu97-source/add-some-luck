import { useState } from 'react'
import { termGlossary } from '../data/termGlossary'

export default function TermHelp({ term }: { term: string }) {
  const [open, setOpen] = useState(false)
  const entry = termGlossary[term]
  return <>
    <button type="button" className="term-help-button" onClick={() => setOpen(true)} aria-label={`查看${term}术语说明`}>?</button>
    {open && <div className="modal-backdrop"><section className="term-help-sheet" role="dialog" aria-modal="true" aria-label={`${term}术语说明`}>
      <div className="sheet-heading"><div><span className="eyebrow">术语帮助</span><h2>{term}</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="关闭术语说明">×</button></div>
      <p>{entry?.definition ?? '这是排盘中的一个结构字段，需要与其他信息一起理解。'}</p>
      {entry?.note && <p className="helper">{entry.note}</p>}
      <p className="fact-boundary">单个术语不能独立决定吉凶或现实结果。</p>
      <button type="button" className="button secondary" onClick={() => setOpen(false)}>关闭</button>
    </section></div>}
  </>
}

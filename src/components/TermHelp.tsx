import { useState } from 'react'
import type { ReactNode } from 'react'
import { termGlossary } from '../data/termGlossary'

export default function TermHelp({ term, label }: { term: string; label?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const entry = termGlossary[term]
  return <>
    <button type="button" className="term-help-link" onClick={() => setOpen(true)} aria-label={`查看${term}说明`}>{label ?? term}</button>
    {open && <div className="modal-backdrop"><section className="term-help-sheet" role="dialog" aria-modal="true" aria-label={`${term}术语说明`}>
      <div className="sheet-heading"><div><span className="eyebrow">术语帮助</span><h2>{term}</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="关闭术语说明">×</button></div>
      <div className="term-help-sections">
        <section><h3>是什么</h3><p>{entry?.definition ?? '这是排盘里的一个专业字段，需要和其他信息一起看。'}</p></section>
        {entry?.plain && <section><h3>通俗地说</h3><p>{entry.plain}</p></section>}
        {entry?.howToRead && <section><h3>在结果里怎么看</h3><p>{entry.howToRead}</p></section>}
      </div>
      <button type="button" className="button secondary" onClick={() => setOpen(false)}>关闭</button>
    </section></div>}
  </>
}

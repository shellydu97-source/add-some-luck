import { useState } from 'react'

export default function TermHelp({ term }: { term: string }) {
  const [open, setOpen] = useState(false)
  const descriptions: Record<string, string> = {
    四柱: '四柱由年柱、月柱、日柱和时柱组成。出生时间未知时，只显示可以确定的三柱。',
    专业细盘: '细盘汇总藏干、十神、五行、纳音、十二长生、旬与旬空等信息。',
  }
  return <>
    <button type="button" className="term-help-button" onClick={() => setOpen(true)} aria-label={`查看${term}术语说明`}>?</button>
    {open && <div className="modal-backdrop"><section className="term-help-sheet" role="dialog" aria-modal="true" aria-label={`${term}术语说明`}>
      <div className="sheet-heading"><div><span className="eyebrow">术语帮助</span><h2>{term}</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="关闭术语说明">×</button></div>
      <p>{descriptions[term] ?? '查看这个术语的简要说明。'}</p>
      <button type="button" className="button secondary" onClick={() => setOpen(false)}>关闭</button>
    </section></div>}
  </>
}

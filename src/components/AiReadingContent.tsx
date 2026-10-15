import type { AiReading } from '../models/types'
export default function AiReadingContent({reading}:{reading:AiReading}) {
 return <div className="ai-reading-content">
  <p className="ai-direct-answer">{reading.directAnswer}</p>
  {reading.incomplete && <p className="helper">回答被截断了，可以点“重新生成完整回答”。</p>}
  {!!reading.basis?.length && <details className="ai-reading-details"><summary>查看依据</summary><ul>{reading.basis.map((b,i)=><li key={i}>{b}</li>)}</ul></details>}
  {!!reading.advice?.length && <div className="ai-advice"><b>建议</b><ul>{reading.advice.map((b,i)=><li key={i}>{b}</li>)}</ul></div>}
  {/* Older structured saved readings are still displayed without rewriting them. */}
  {reading.summary && <p className="ai-summary">{reading.summary}</p>}
  {!!reading.uncertainty?.length && <details className="ai-reading-details"><summary>查看当时的补充说明</summary><ul>{reading.uncertainty.map((b,i)=><li key={i}>{b}</li>)}</ul></details>}
  {!!reading.sections?.length && <details className="ai-reading-details"><summary>查看已保存的详细分析</summary>{reading.sections.map((s,i)=><section key={i}><h3>{s.title}</h3><p>{s.content}</p><ul>{s.evidence.map((b,j)=><li key={j}>{b}</li>)}</ul></section>)}</details>}
 </div>
}

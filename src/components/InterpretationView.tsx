import type { Interpretation } from '../models/types'
import { Card, DemoBadge, SectionHeading } from './UI'

export default function InterpretationView({ data }: { data: Interpretation }) {
  return <div className="interpretation-stack">
    <Card className="headline-card">
      <div className="card-kicker"><span>演示解读结构</span><DemoBadge label="固定演示数据" /></div>
      <h2>{data.headline}</h2><p>{data.conclusion}</p>
    </Card>
    <Card>
      <SectionHeading title="判断依据" />
      <ul className="evidence-list">{data.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
    </Card>
    <Card>
      <SectionHeading title="支持信息" />
      <ul className="plain-list">{data.support.map((item) => <li key={item}>{item}</li>)}</ul>
    </Card>
    <Card>
      <SectionHeading title="冲突信息或其他解释" />
      <ul className="plain-list">{data.conflicts.map((item) => <li key={item}>{item}</li>)}</ul>
    </Card>
    <Card className="uncertainty-card"><SectionHeading title="不确定性与可信度" /><p>{data.uncertainty}</p></Card>
    <Card><SectionHeading title="现实建议" /><ul className="plain-list">{data.advice.map((item) => <li key={item}>{item}</li>)}</ul></Card>
  </div>
}

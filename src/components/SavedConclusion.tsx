import type { Interpretation } from '../models/types'
import { Card, SectionHeading } from './UI'
export default function SavedConclusion({ interpretation: i }: { interpretation: Interpretation }) {
  return <Card><SectionHeading title="当时的结论" /><h3>{i.headline}</h3><p>{i.conclusion}</p>{([['判断依据', i.evidence], ['支持因素', i.support], ['需要留意', i.conflicts], ['现实建议', i.advice]] as const).map(([title,items]) => items?.length ? <div key={title}><h4>{title}</h4><ul className="plain-list">{items.map((text,index) => <li key={index}>{text}</li>)}</ul></div> : null)}{i.uncertainty && <p className="helper">{i.uncertainty}</p>}</Card>
}

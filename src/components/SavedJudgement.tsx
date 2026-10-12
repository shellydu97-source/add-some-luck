import { calculateLiuyao } from '../calculation/liuyao'
import { judgeLiuyao, USE_GOD_OPTIONS, type LiuyaoJudgement, type UseGod } from '../calculation/liuyao/judgement'
import type { CoinToss, DivinationRecord, Gender } from '../models/types'
import { useAppStore } from '../storage/store'
import { Card, SectionHeading } from './UI'
export default function SavedJudgement({ record }: { record: DivinationRecord }) {
  const setOverride = useAppStore(s => s.setLiuyaoUseGodOverride)
  if (!record.rawResult.judgement) return null
  let judgement = record.rawResult.judgement as Pick<LiuyaoJudgement, 'tendency' | 'reasons' | 'advice' | 'uncertainty'>
  if (record.type === 'liuyao' && record.liuyaoUseGodOverride && Array.isArray(record.rawResult.coinTosses)) {
    judgement = judgeLiuyao(calculateLiuyao(record.rawResult.coinTosses as CoinToss[], String(record.rawResult.castCompletedAt ?? record.rawResult.lockedAt)), record.category, record.liuyaoUseGodOverride, record.rawResult.querentGender as Gender | undefined)
  }
  return <Card><SectionHeading title={record.liuyaoUseGodOverride ? '当前用神判断' : '保存时的判断'} /><h3>{judgement.tendency}</h3><ul className="plain-list">{judgement.reasons.map(r => <li key={r}>{r}</li>)}</ul>
    {record.type === 'liuyao' && <label className="field"><span>用神（可改选，原始快照保留）</span><select value={record.liuyaoUseGodOverride ?? (judgement as LiuyaoJudgement).useGod.relation} onChange={e => setOverride(record.id,e.target.value as UseGod)}>{USE_GOD_OPTIONS.map(g => <option key={g}>{g}</option>)}</select></label>}
    <p>{judgement.advice}</p><p className="helper">{judgement.uncertainty}</p>
  </Card>
}

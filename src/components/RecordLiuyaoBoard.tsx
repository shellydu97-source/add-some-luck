import { calculateLiuyao } from '../calculation/liuyao'
import { judgeLiuyao, type LiuyaoJudgement } from '../calculation/liuyao/judgement'
import type { CoinToss, DivinationRecord, Gender } from '../models/types'
import { readSnapshot } from '../utils/snapshot'
import LiuyaoBoard from './LiuyaoBoard'

// Rebuilds the board from the immutable coin tosses; older records without them simply skip it.
export default function RecordLiuyaoBoard({ record }: { record: DivinationRecord }) {
  if (record.type !== 'liuyao') return null
  const raw = readSnapshot(record.rawResult)
  if (!Array.isArray(raw.coinTosses) || raw.coinTosses.length !== 6) return null
  const castAt = String(raw.castCompletedAt ?? raw.lockedAt ?? record.createdAt)
  let board: { result: ReturnType<typeof calculateLiuyao>; judgement?: LiuyaoJudgement } | undefined
  try {
    const result = calculateLiuyao(raw.coinTosses as CoinToss[], castAt)
    const judgement = record.liuyaoUseGodOverride
      ? judgeLiuyao(result, record.category, record.liuyaoUseGodOverride, raw.querentGender as Gender | undefined)
      : raw.judgement as LiuyaoJudgement | undefined
    board = { result, judgement }
  } catch {
    board = undefined
  }
  return board ? <LiuyaoBoard result={board.result} judgement={board.judgement} castAt={castAt} subjectLabel={record.profileNameSnapshot} /> : null
}

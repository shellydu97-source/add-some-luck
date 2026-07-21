import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { DivinationDraft } from '../models/types'
import { useAppStore } from '../storage/store'
import { Card } from './UI'

function draftPath(draft: DivinationDraft) {
  if (draft.type === 'liuyao') {
    const state = draft.state
    if (state?.casts.length === 6) return state.locked ? '/divination/liuyao/result' : '/divination/liuyao/confirm'
    return state?.method ? '/divination/liuyao/cast' : '/divination/liuyao/question'
  }
  if (draft.type === 'meihua') {
    if (draft.state.locked) return '/divination/meihua/result'
    return draft.state.method ? '/divination/meihua/cast' : '/divination/meihua/question'
  }
  const state = draft.state
  if (!state?.spread) return '/divination/tarot/spread'
  if (!state.drawMode) return '/divination/tarot/method'
  if (state.revealed) return '/divination/tarot/result'
  return '/divination/tarot/draw'
}

export default function DraftRecoveryPanel() {
  const drafts = useAppStore((state) => state.drafts)
  const profiles = useAppStore((state) => state.profiles)
  const remove = useAppStore((state) => state.deleteDraft)
  const [now] = useState(() => Date.now())
  const visible = drafts.filter((draft) => !draft.state.recordId)
  if (!visible.length) return null
  return <details className="draft-recovery"><summary><span>未完成流程</span><span>{visible.length} 条&nbsp;›</span></summary><div className="draft-list">{visible.map((draft) => {
    const expired = !('legacyImported' in draft.state && draft.state.legacyImported) && now - new Date(draft.updatedAt).getTime() > 30 * 864e5
    const person = draft.profileId === 'guest' ? '未关联人物' : profiles.find((profile) => profile.id === draft.profileId)?.name ?? '已删除人物'
    const label = draft.type === 'liuyao' ? '六爻' : draft.type === 'meihua' ? '梅花易数' : '塔罗'
    return <Card key={draft.id}><div className="card-kicker"><span>{label} · {person}</span><span className="chip">{'legacyImported' in draft.state && draft.state.legacyImported ? '旧版导入草稿' : expired ? '超过 30 天' : '可恢复'}</span></div><h3>{draft.question || '未填写问题'}</h3><p className="helper">{expired ? '不会自动恢复，可手动继续或删除。' : '流程状态已保存。'}</p><div className="button-row"><Link className="button secondary" to={draftPath(draft)} state={{ resumeDraftId: draft.id }}>继续流程</Link><button className="button danger" onClick={() => { if (window.confirm('删除这份未完成流程？')) remove(draft.id) }}>删除草稿</button></div></Card>
  })}</div></details>
}

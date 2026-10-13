import { useState } from 'react'
import { Link } from 'react-router-dom'
import { draftPath } from '../utils/draftPath'
import { useAppStore } from '../storage/store'
import { Card } from './UI'

export default function DraftRecoveryPanel() {
  const drafts = useAppStore((state) => state.drafts)
  const profiles = useAppStore((state) => state.profiles)
  const remove = useAppStore((state) => state.deleteDraft)
  const [now] = useState(() => Date.now())
  const visible = drafts.filter((draft) => !draft.state.recordId && draft.type !== 'astrology' && (draft.type !== 'bazi' || draft.id === `ai-bazi-${draft.profileId}-${profiles.find(p=>p.id===draft.profileId)?.updatedAt}`))
  if (!visible.length) return null
  return <details className="draft-recovery"><summary><span>未完成流程</span><span>{visible.length} 条&nbsp;›</span></summary><div className="draft-list">{visible.map((draft) => {
    const expired = !('legacyImported' in draft.state && draft.state.legacyImported) && now - new Date(draft.updatedAt).getTime() > 30 * 864e5
    const person = draft.profileId === 'guest'
      ? (draft.temporarySubject?.name?.trim() ? `临时测算 · ${draft.temporarySubject.name.trim()}` : '临时测算')
      : profiles.find((profile) => profile.id === draft.profileId)?.name ?? '已删除人物'
    const label = draft.type === 'liuyao' ? '六爻' : draft.type === 'meihua' ? '梅花易数' : draft.type === 'bazi' ? '八字解读' : '塔罗'
    return <Card key={draft.id}><div className="card-kicker"><span>{label} · {person}</span><span className="chip">{'legacyImported' in draft.state && draft.state.legacyImported ? '旧版导入草稿' : expired ? '超过 30 天' : '可恢复'}</span></div><h3>{draft.question || draft.ai?.question || '未填写问题'}</h3><p className="helper">{expired ? '不会自动恢复，可手动继续或删除。' : '流程状态已保存。'}</p><div className="button-row"><Link className="button secondary" to={draftPath(draft)} state={{ resumeDraftId: draft.id }}>继续流程</Link><button className="button danger" onClick={() => { if (window.confirm('删除这份未完成流程？')) remove(draft.id) }}>删除草稿</button></div></Card>
  })}</div></details>
}

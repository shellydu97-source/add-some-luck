import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DivinationDraft } from '../models/types'
import { useAppStore } from '../storage/store'
import { draftPath } from '../utils/draftPath'
import { Button, Card } from './UI'

export default function UnfinishedFlowPrompt({ draft, resumed }: { draft?: DivinationDraft; resumed?: DivinationDraft }) {
  const navigate = useNavigate()
  const remove = useAppStore(s => s.deleteDraft)
  const [dismissed, setDismissed] = useState(false)
  if (!draft || draft.state.recordId || resumed || dismissed) return null
  return <div className="flow-confirm-backdrop"><Card><div role="dialog" aria-modal="true" aria-label="还有未完成流程"><h2>还有未完成流程</h2><p>{draft.question || '上次流程尚未保存'}</p><div className="button-row"><Button onClick={() => navigate(draftPath(draft), { state: { resumeDraftId: draft.id } })}>继续上次</Button><Button className="secondary" onClick={() => { remove(draft.id); setDismissed(true) }}>放弃上次并开始新的</Button></div></div></Card></div>
}

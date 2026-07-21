import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { Button, Card, ConfidenceNote } from '../components/UI'
import { categoryOptions } from '../models/labels'
import type { DivinationRecord, MeihuaDraft } from '../models/types'
import { getActiveProfile, getDraft, useAppStore } from '../storage/store'
import { makeId } from '../utils/id'
import { GUEST_PROFILE_ID } from '../utils/record'
import { getRequestedDraft } from '../utils/draftEntry'

export default function MeihuaQuestionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useAppStore()
  const profile = getActiveProfile(store)
  const previous = getDraft(store, 'meihua')
  const entryState = location.state as { question?: string; resumeDraftId?: string } | null
  const resumed = getRequestedDraft(previous, entryState?.resumeDraftId)
  const [question, setQuestion] = useState(entryState?.question ?? resumed?.question ?? '')
  const [category, setCategory] = useState(resumed?.category ?? categoryOptions[0])
  const [duplicate, setDuplicate] = useState<DivinationRecord>()

  function submit(force = false) {
    const normalizedQuestion = question.trim()
    if (!force && normalizedQuestion) {
      const found = store.findDuplicate(profile?.id ?? GUEST_PROFILE_ID, 'meihua', normalizedQuestion)
      if (found) { setDuplicate(found); return }
    }
    const now = new Date().toISOString()
    const draft: MeihuaDraft = {
      id: makeId('draft-meihua'), type: 'meihua', profileId: profile?.id ?? GUEST_PROFILE_ID,
      question: normalizedQuestion, category, createdAt: now, updatedAt: now,
      state: { method: 'time', locked: false },
    }
    store.upsertDraft(draft)
    navigate('/divination/meihua/cast')
  }

  return <>
    <TopBar title="梅花易数" eyebrow="第 1 步 · 问题选填" back />
    <ConfidenceNote>可以围绕一件具体的事起卦；问题留空也可以，结果会按本次数字与卦象保存。</ConfidenceNote>
    <Card>
      <label className="field"><span>你想了解什么</span><textarea rows={4} maxLength={120} value={question} onChange={(event) => { setQuestion(event.target.value); setDuplicate(undefined) }} placeholder="可以留空；例如：这件事接下来应留意什么？" /></label>
      <label className="field"><span>问题分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
    </Card>
    {duplicate && <Card className="duplicate-card"><h3>最近问过同样的问题</h3><p className="helper">可以先查看上次记录，也可以重新起卦。</p><div className="button-row"><Link className="button secondary" to={`/records/${duplicate.id}`}>查看旧记录</Link><Button onClick={() => submit(true)}>重新起卦</Button></div></Card>}
    {!duplicate && <Button onClick={() => submit()}>下一步：选择起卦方式</Button>}
  </>
}

import UnfinishedFlowPrompt from '../components/UnfinishedFlowPrompt'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import DivinationSubjectField, { TEMPORARY_SUBJECT_ID } from '../components/DivinationSubjectField'
import { Button, Card, ConfidenceNote } from '../components/UI'
import { categoryOptions } from '../models/labels'
import type { DivinationRecord, MeihuaDraft } from '../models/types'
import { getActiveProfile, getDraft, useAppStore } from '../storage/store'
import { makeId } from '../utils/id'
import { GUEST_PROFILE_ID } from '../utils/record'
import { getRequestedDraft } from '../utils/draftEntry'

export default function MeihuaQuestionPage() {
  const location = useLocation()
  return <QuestionContent key={location.key} />
}

function QuestionContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useAppStore()
  const profile = getActiveProfile(store)
  const previous = getDraft(store, 'meihua')
  const entryState = location.state as { question?: string; resumeDraftId?: string } | null
  const resumed = getRequestedDraft(previous, entryState?.resumeDraftId)
  const resumedProfileExists = store.profiles.some((item) => item.id === resumed?.profileId)
  const initialSubjectId = resumed ? (resumedProfileExists ? resumed.profileId : TEMPORARY_SUBJECT_ID) : (profile?.id ?? TEMPORARY_SUBJECT_ID)
  const [question, setQuestion] = useState(entryState?.question ?? resumed?.question ?? '')
  const [category, setCategory] = useState(resumed?.category ?? categoryOptions[0])
  const [subjectId, setSubjectId] = useState(initialSubjectId)
  const [temporaryName, setTemporaryName] = useState(resumed?.temporarySubject?.name ?? '')
  const [duplicate, setDuplicate] = useState<DivinationRecord>()

  function submit(force = false) {
    const normalizedQuestion = question.trim()
    const selectedProfile = store.profiles.find((item) => item.id === subjectId)
    const recordProfileId = selectedProfile?.id ?? GUEST_PROFILE_ID
    if (!force && normalizedQuestion) {
      const found = store.findDuplicate(recordProfileId, 'meihua', normalizedQuestion)
      if (found) { setDuplicate(found); return }
    }
    const now = new Date().toISOString()
    const draft: MeihuaDraft = {
      id: makeId('draft-meihua'), type: 'meihua', profileId: recordProfileId,
      question: normalizedQuestion, category, createdAt: now, updatedAt: now,
      temporarySubject: selectedProfile ? undefined : { name: temporaryName.trim() || undefined },
      state: { method: 'time', locked: false },
    }
    store.upsertDraft(resumed ? { ...draft, id: resumed.id, createdAt: resumed.createdAt, randomSeed: resumed.randomSeed, state: resumed.state, ai: resumed.ai } : draft)
    navigate('/divination/meihua/cast')
  }

  return <>
    <UnfinishedFlowPrompt draft={previous} resumed={resumed} />
    <TopBar title="梅花易数" eyebrow="第 1 步 · 问题选填" back />
    <ConfidenceNote>可以围绕一件具体的事起卦；问题留空也可以，结果会按本次数字与卦象保存。</ConfidenceNote>
    <Card>
      <DivinationSubjectField profiles={store.profiles} subjectId={subjectId} temporaryName={temporaryName} onSubjectChange={setSubjectId} onTemporaryNameChange={setTemporaryName} />
      <label className="field"><span>你想了解什么</span><textarea rows={4} maxLength={120} value={question} onChange={(event) => { setQuestion(event.target.value); setDuplicate(undefined) }} placeholder="可以留空；例如：这件事接下来应留意什么？" /></label>
      <label className="field"><span>问题分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
    </Card>
    {duplicate && <Card className="duplicate-card"><h3>最近问过同样的问题</h3><p className="helper">可以先查看上次记录，也可以重新占问。</p><div className="button-row"><Link className="button secondary" to={`/records/${duplicate.id}`}>查看旧记录</Link><Button onClick={() => submit(true)}>重新占问</Button></div></Card>}
    {!duplicate && <Button onClick={() => submit()}>下一步：选择推演方式</Button>}
  </>
}

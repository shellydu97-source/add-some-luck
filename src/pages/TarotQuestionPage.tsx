import { saveDivinationRecord } from '../utils/divinationRecords'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import DivinationSubjectField, { TEMPORARY_SUBJECT_ID } from '../components/DivinationSubjectField'
import { Button, Card, ConfidenceNote } from '../components/UI'
import { categoryOptions } from '../models/labels'
import type { DivinationRecord, TarotDraft } from '../models/types'
import { createTarotSession } from '../calculation/tarotMock'
import { createRandomToken } from '../calculation/random'
import { getActiveProfile, getDraft, useAppStore } from '../storage/store'
import { makeId } from '../utils/id'
import { GUEST_PROFILE_ID } from '../utils/record'
import { getRequestedDraft } from '../utils/draftEntry'

export default function TarotQuestionPage() {
  const location = useLocation()
  return <QuestionContent key={location.key} />
}

function QuestionContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const store = useAppStore()
  const profile = getActiveProfile(store)
  const previous = getDraft(store, 'tarot')
  const entryState = location.state as { question?: string; resumeDraftId?: string } | null
  const resumed = getRequestedDraft(previous, entryState?.resumeDraftId)
  const resumedProfileExists = store.profiles.some((item) => item.id === resumed?.profileId)
  const initialSubjectId = resumed ? (resumedProfileExists ? resumed.profileId : TEMPORARY_SUBJECT_ID) : (profile?.id ?? TEMPORARY_SUBJECT_ID)
  const [question, setQuestion] = useState(entryState?.question ?? resumed?.question ?? '')
  const [category, setCategory] = useState(resumed?.category ?? categoryOptions[0])
  const [isChoice, setIsChoice] = useState(resumed?.state.isChoice ?? false)
  const [subjectId, setSubjectId] = useState(initialSubjectId)
  const [temporaryName, setTemporaryName] = useState(resumed?.temporarySubject?.name ?? '')
  const [duplicate, setDuplicate] = useState<DivinationRecord>()

  function submit(force = false) {
    const normalizedQuestion = question.trim()
    const selectedProfile = store.profiles.find((item) => item.id === subjectId)
    const recordProfileId = selectedProfile?.id ?? GUEST_PROFILE_ID
    if (!force && normalizedQuestion) {
      const found = store.findDuplicate(recordProfileId, 'tarot', normalizedQuestion)
      if (found) { setDuplicate(found); return }
    }
    const session = createTarotSession()
    const now = new Date().toISOString()
    const draft: TarotDraft = {
      id: makeId('draft-tarot'),
      type: 'tarot',
      profileId: recordProfileId,
      question: normalizedQuestion,
      category,
      createdAt: now,
      updatedAt: now,
      randomSeed: createRandomToken(),
      temporarySubject: selectedProfile ? undefined : { name: temporaryName.trim() || undefined },
      state: {
        isChoice,
        phase: 'idle',
        deckOrder: session.deckOrder,
        orientations: session.orientations,
        selected: [],
        cursor: 0,
        revealed: false,
      },
    }
    // A finished earlier flow is kept as a record before the new flow replaces it.
    if (previous && !resumed) saveDivinationRecord(previous.id)
    store.upsertDraft(resumed ? { ...draft, id: resumed.id, createdAt: resumed.createdAt, randomSeed: resumed.randomSeed, state: resumed.state, ai: resumed.ai } : draft)
    navigate('/divination/tarot/spread')
  }

  return <>
    <TopBar title="塔罗占问" eyebrow="第 1 步 · 问题选填" back />
    <ConfidenceNote>问题可以帮助后续解读；留空也可以正常抽牌。</ConfidenceNote>
    <Card><DivinationSubjectField profiles={store.profiles} subjectId={subjectId} temporaryName={temporaryName} onSubjectChange={setSubjectId} onTemporaryNameChange={setTemporaryName} /><label className="field"><span>问题（选填）</span><textarea rows={4} maxLength={120} value={question} onChange={(event) => { setQuestion(event.target.value); setDuplicate(undefined) }} placeholder="可以留空；例如：两个选择分别可能怎样发展？" /></label><label className="field"><span>问题分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="radio-option"><input type="checkbox" checked={isChoice} onChange={(event) => setIsChoice(event.target.checked)} />这是一个 A / B 选择题</label></Card>
    {duplicate && <Card className="duplicate-card"><h3>最近问过同样的问题</h3><p className="helper">可以先看看上次的记录，也可以重新抽牌。</p><div className="button-row"><Link className="button secondary" to={`/records/${duplicate.id}`}>查看旧记录</Link><Button onClick={() => submit(true)}>重新抽牌</Button></div></Card>}
    {!duplicate && <Button onClick={() => submit()}>下一步：选择牌阵</Button>}
  </>
}

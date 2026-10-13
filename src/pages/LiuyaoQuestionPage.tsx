import UnfinishedFlowPrompt from '../components/UnfinishedFlowPrompt'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LIUYAO_COIN_CONVENTION_VERSION } from '../calculation/liuyao'
import TopBar from '../components/TopBar'
import DivinationSubjectField, { TEMPORARY_SUBJECT_ID } from '../components/DivinationSubjectField'
import { Button, Card, ConfidenceNote } from '../components/UI'
import { categoryOptions } from '../models/labels'
import type { DivinationRecord, Gender, LiuyaoDraft } from '../models/types'
import { getActiveProfile, getDraft, useAppStore } from '../storage/store'
import { makeId } from '../utils/id'
import { GUEST_PROFILE_ID } from '../utils/record'
import { getRequestedDraft } from '../utils/draftEntry'

export default function LiuyaoQuestionPage() {
  const location = useLocation()
  return <QuestionContent key={location.key} />
}

function QuestionContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useAppStore()
  const profile = getActiveProfile(store)
  const previous = getDraft(store, 'liuyao')
  const entryState = location.state as { question?: string; resumeDraftId?: string } | null
  const resumed = getRequestedDraft(previous, entryState?.resumeDraftId)
  const resumedProfileExists = store.profiles.some((item) => item.id === resumed?.profileId)
  const initialSubjectId = resumed ? (resumedProfileExists ? resumed.profileId : TEMPORARY_SUBJECT_ID) : (profile?.id ?? TEMPORARY_SUBJECT_ID)
  const [question, setQuestion] = useState(entryState?.question ?? resumed?.question ?? '')
  const [category, setCategory] = useState(resumed?.category ?? '')
  const [timeRange, setTimeRange] = useState(resumed?.state.timeRange ?? '')
  const [subjectId, setSubjectId] = useState(initialSubjectId)
  const [temporaryName, setTemporaryName] = useState(resumed?.temporarySubject?.name ?? '')
  const [temporaryGender, setTemporaryGender] = useState<Gender | undefined>(resumed?.temporarySubject?.gender ?? resumed?.state.querentGender)
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState<DivinationRecord>()

  function submit(force = false) {
    const normalizedQuestion = question.trim()
    const selectedProfile = store.profiles.find((item) => item.id === subjectId)
    if (!normalizedQuestion) { setError('请填写本次问题'); return }
    if (!category) { setError('请选择问题分类'); return }
    if (category === '感情' && !(selectedProfile?.gender ?? temporaryGender)) { setError('感情占问请确认占问者性别，以便建议用神'); return }
    setError('')
    const recordProfileId = selectedProfile?.id ?? GUEST_PROFILE_ID
    if (!force && normalizedQuestion) {
      const found = store.findDuplicate(recordProfileId, 'liuyao', normalizedQuestion)
      if (found) { setDuplicate(found); return }
    }
    const now = new Date().toISOString()
    const draft: LiuyaoDraft = {
      id: makeId('draft-liuyao'),
      type: 'liuyao',
      profileId: recordProfileId,
      question: normalizedQuestion,
      category,
      createdAt: now,
      updatedAt: now,
      randomSeed: makeId('liuyao-seed'),
      temporarySubject: selectedProfile ? undefined : { name: temporaryName.trim() || undefined, gender: temporaryGender },
      state: { querentGender: selectedProfile?.gender ?? temporaryGender, coinConventionVersion: LIUYAO_COIN_CONVENTION_VERSION, timeRange: timeRange.trim(), casts: [], locked: false },
    }
    store.upsertDraft(resumed ? { ...draft, id: resumed.id, createdAt: resumed.createdAt, randomSeed: resumed.randomSeed, state: resumed.state, ai: resumed.ai } : draft)
    navigate('/divination/liuyao/cast')
  }

  return <>
    <UnfinishedFlowPrompt draft={previous} resumed={resumed} />
    <TopBar title="六爻占问" eyebrow="第 1 步 · 明确问题" back />
    <ConfidenceNote>一事一占；想清楚再起卦；同一件事短期内不要反复占。</ConfidenceNote>
    <Card>
      <DivinationSubjectField profiles={store.profiles} subjectId={subjectId} temporaryName={temporaryName} temporaryGender={temporaryGender} includeGender onSubjectChange={setSubjectId} onTemporaryNameChange={setTemporaryName} onTemporaryGenderChange={setTemporaryGender} />
      <label className="field"><span>问题 *</span><textarea rows={4} maxLength={120} value={question} onChange={(event) => { setQuestion(event.target.value); setDuplicate(undefined) }} placeholder="例如：这次出行是否能按计划进行？" /></label>
      <label className="field"><span>问题分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">请选择分类</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field"><span>观察时间范围（选填）</span><input value={timeRange} onChange={(event) => setTimeRange(event.target.value)} placeholder="例如：未来两周" /></label>
    </Card>
    {error && <p className="field-error">{error}</p>}
    {duplicate && <Card className="duplicate-card"><h3>最近问过同样的问题</h3><p className="helper">可以先看看上次的变化，也可以重新占问。</p><div className="button-row"><Link className="button secondary" to={`/records/${duplicate.id}`}>查看旧记录</Link><Button onClick={() => submit(true)}>重新占问</Button></div></Card>}
    {!duplicate && <Button onClick={() => submit()}>下一步：选择起爻方式</Button>}
  </>
}

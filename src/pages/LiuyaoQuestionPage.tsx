import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LIUYAO_COIN_CONVENTION_VERSION } from '../calculation/liuyao'
import TopBar from '../components/TopBar'
import { Button, Card, ConfidenceNote, Segmented } from '../components/UI'
import { categoryOptions } from '../models/labels'
import type { DivinationRecord, Gender, LiuyaoDraft } from '../models/types'
import { getActiveProfile, getDraft, useAppStore } from '../storage/store'
import { makeId } from '../utils/id'
import { GUEST_PROFILE_ID } from '../utils/record'
import { getRequestedDraft } from '../utils/draftEntry'

const genderOptions = [
  { value: 'female' as const, label: '女' },
  { value: 'male' as const, label: '男' },
]

export default function LiuyaoQuestionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useAppStore()
  const profile = getActiveProfile(store)
  const previous = getDraft(store, 'liuyao')
  const entryState = location.state as { question?: string; resumeDraftId?: string } | null
  const resumed = getRequestedDraft(previous, entryState?.resumeDraftId)
  const [question, setQuestion] = useState(entryState?.question ?? resumed?.question ?? '')
  const [category, setCategory] = useState(resumed?.category ?? categoryOptions[0])
  const [timeRange, setTimeRange] = useState(resumed?.state.timeRange ?? '')
  const [querentGender, setQuerentGender] = useState<Gender>(resumed?.state.querentGender ?? profile?.gender ?? 'female')
  const [duplicate, setDuplicate] = useState<DivinationRecord>()

  function submit(force = false) {
    const normalizedQuestion = question.trim()
    if (!force && normalizedQuestion) {
      const found = store.findDuplicate(profile?.id ?? GUEST_PROFILE_ID, 'liuyao', normalizedQuestion)
      if (found) { setDuplicate(found); return }
    }
    const now = new Date().toISOString()
    const draft: LiuyaoDraft = {
      id: makeId('draft-liuyao'),
      type: 'liuyao',
      profileId: profile?.id ?? GUEST_PROFILE_ID,
      question: normalizedQuestion,
      category,
      createdAt: now,
      updatedAt: now,
      randomSeed: makeId('liuyao-seed'),
      state: { querentGender, coinConventionVersion: LIUYAO_COIN_CONVENTION_VERSION, timeRange: timeRange.trim(), casts: [], locked: false },
    }
    store.upsertDraft(draft)
    navigate('/divination/liuyao/cast')
  }

  return <>
    <TopBar title="六爻起卦" eyebrow="第 1 步 · 问题选填" back />
    <ConfidenceNote>写清楚一件最关心的事，后续解读会更贴近你的问题；留空也可以起卦。</ConfidenceNote>
    <Card>
      <label className="field"><span>问题（选填）</span><textarea rows={4} maxLength={120} value={question} onChange={(event) => { setQuestion(event.target.value); setDuplicate(undefined) }} placeholder="可以留空；例如：这次出行是否能按计划进行？" /></label>
      <div className="field"><span>占问者性别</span><Segmented value={querentGender} options={genderOptions} onChange={setQuerentGender} label="占问者性别" /></div>
      <label className="field"><span>问题分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field"><span>观察时间范围（选填）</span><input value={timeRange} onChange={(event) => setTimeRange(event.target.value)} placeholder="例如：未来两周" /></label>
    </Card>
    {duplicate && <Card className="duplicate-card"><h3>最近问过同样的问题</h3><p className="helper">可以先看看上次的变化，也可以重新起卦。</p><div className="button-row"><Link className="button secondary" to={`/records/${duplicate.id}`}>查看旧记录</Link><Button onClick={() => submit(true)}>重新起卦</Button></div></Card>}
    {!duplicate && <Button onClick={() => submit()}>下一步：选择起爻方式</Button>}
  </>
}

import { readSnapshot } from '../utils/snapshot'
import { buildRecordContext } from '../ai/context'
import SavedConclusion from '../components/SavedConclusion'
import SavedJudgement from '../components/SavedJudgement'
import RecordLiuyaoBoard from '../components/RecordLiuyaoBoard'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import DatePicker from '../components/DatePicker'
import AiReadingPanel from '../components/AiReadingPanel'
import SnapshotResult from '../components/RecordSnapshotResult'
import TopBar from '../components/TopBar'
import { Button, Card, ConfidenceNote, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import { accuracyLabels, recordTypeLabels, verificationLabels } from '../models/labels'
import type { DivinationRecord, Interpretation, VerificationStatus } from '../models/types'
import { useAppStore } from '../storage/store'
import { formatDate } from '../utils/text'
import { isRecordTypeVisible } from '../config/features'

const verificationOptions = Object.entries(verificationLabels) as [VerificationStatus, string][]

export default function RecordDetailPage() {
  const { recordId } = useParams()
  const record = useAppStore((state) => state.records.find((item) => item.id === recordId))
  if (!record) return <>
      <TopBar title="记录详情" back />
      <EmptyState title="找不到这条记录" action={<LinkButton to="/records">返回记录</LinkButton>}>它可能已被移除，或链接已经失效。</EmptyState>
      </>
  if (!isRecordTypeVisible(record.type)) return <Navigate to="/records" replace />
  return <RecordDetailContent key={record.id} record={record} />
}

function RecordDetailContent({ record }: { record: DivinationRecord }) {
  const navigate = useNavigate()
  const updateRecordVerification = useAppStore((state) => state.updateRecordVerification)
  const deleteRecord = useAppStore((state) => state.deleteRecord)
  const [verificationStatus, setStatus] = useState<VerificationStatus>(record.verificationStatus)
  const [verificationResult, setVerificationResult] = useState(record.verificationResult ?? '')
  const [verificationDate, setVerificationDate] = useState(record.verificationDate ?? '')
  const [notes, setNotes] = useState(record.notes ?? '')
  const accuracy = record.profileSnapshot?.timeAccuracy

  function saveMeta() {
    updateRecordVerification(record.id, { verificationStatus, verificationDate, verificationResult, notes })
  }

  function removeRecord() {
    if (!window.confirm('删除这条记录？原始结果、解读和追踪内容都会一并删除，且无法恢复。')) return
    deleteRecord(record.id)
    navigate('/records', { replace: true })
  }

  return <>
    <TopBar title="记录详情" eyebrow={`${recordTypeLabels[record.type]} · ${formatDate(record.createdAt, true)}`} back />
    <ConfidenceNote>保存后的原始问题、人物信息及牌面或卦象不会改变；验证结果与备注可以继续更新。</ConfidenceNote>
    <Card>
      <div className="card-kicker">
      <span>原始问题</span>{record.category && <span className="chip">{record.category}</span>}</div>
      <h2>{record.question || '未填写问题'}</h2>{!record.question && record.questionAddedLater && <p>后来补充的问题：{record.questionAddedLater}</p>}<ul className="compact-list record-meta">
      <li>
      <span>当时人物</span>
      <b>{record.profileNameSnapshot}</b>
      </li>{accuracy && (record.type === 'bazi' || record.type === 'astrology') && <li>
      <span>出生时间可信度</span>
      <b>{accuracyLabels[accuracy]}</b>
      </li>}<li>
      <span>创建时间</span>
      <b>{formatDate(record.createdAt, true)}</b>
      </li>
      </ul>
      </Card>
    {/* Records with a rule-based judgement show it once; older records show their saved conclusion. */}
    {readSnapshot(record.rawResult).judgement
      ? <SavedJudgement record={record} />
      : <SavedConclusion interpretation={readSnapshot(record.rawResult).savedInterpretation as Interpretation ?? record.interpretation} />}
    <RecordLiuyaoBoard record={record} />
    <AiReadingPanel module={record.type} question={record.question || record.questionAddedLater} context={buildRecordContext(record)} category={record.category} timeRange={readSnapshot(record.rawResult).timeRange as string | undefined} useGod={record.liuyaoUseGodOverride} recordId={record.id} ensureRecord={() => record.id} allowQuestionInput={!record.question} title="继续查看和追问" />
    <Card>
      <SectionHeading title="结果追踪" side={<span className="chip">{verificationLabels[verificationStatus]}</span>} />
      <div className="verification-grid">{verificationOptions.map(([value, label]) => <label className="radio-option" key={value}>
      <input type="radio" checked={verificationStatus === value} onChange={() => setStatus(value)} />{label}</label>)}</div>
      <DatePicker label="验证日期" value={verificationDate} onChange={setVerificationDate} allowFuture />
      <label className="field">
      <span>实际结果</span>
      <textarea rows={3} value={verificationResult} onChange={(event) => setVerificationResult(event.target.value)} placeholder="记录后来实际发生了什么" />
      </label>
      <label className="field">
      <span>用户备注</span>
      <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="其他需要保留的信息" />
      </label>
      <Button onClick={saveMeta}>保存追踪信息</Button>
      </Card>
    <details className="result-disclosure">
      <summary>查看原始牌面或卦象</summary>
      <Card>
      <SnapshotResult record={record} />
      </Card>
      </details>
    <div className="record-danger-zone">
      <Button className="danger" onClick={removeRecord}>删除这条记录</Button>
      </div>
  </>
}

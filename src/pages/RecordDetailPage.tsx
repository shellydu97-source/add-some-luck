import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DatePicker from '../components/DatePicker'
import AiReadingPanel from '../components/AiReadingPanel'
import LiuyaoCoin from '../components/LiuyaoCoin'
import TopBar from '../components/TopBar'
import { Button, Card, ConfidenceNote, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import { accuracyLabels, recordTypeLabels, verificationLabels } from '../models/labels'
import type { DivinationRecord, VerificationStatus } from '../models/types'
import { useAppStore } from '../storage/store'
import { formatDate } from '../utils/text'

const verificationOptions = Object.entries(verificationLabels) as [VerificationStatus, string][]

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function GenericRawResult({ data }: { data: Record<string, unknown> }) {
  const hiddenKeys = new Set(['engineVersion', 'adapterVersion', 'ruleVersion', 'coordinateDataVersion', 'calculationVersion'])
  return <ul className="raw-result">{Object.entries(data).filter(([key]) => !hiddenKeys.has(key)).map(([key, value]) => <li key={key}><span>{key}</span><b>{typeof value === 'string' ? value : JSON.stringify(value)}</b></li>)}</ul>
}

function TarotRawResult({ data }: { data: Record<string, unknown> }) {
  const cards = Array.isArray(data.cards) ? data.cards.map(object) : []
  return <div className="record-tarot-cards">{cards.map((card, index) => <div className="record-tarot-card" key={String(card.id ?? index)}><span>{String(card.position ?? `位置 ${index + 1}`)}</span><b>{String(card.nameZh ?? card.id ?? '未知牌')}</b><small>{card.orientation === 'reversed' ? '逆位' : '正位'}</small>{Array.isArray(card.keywords) && <div className="chip-row">{card.keywords.map((keyword) => <span className="chip" key={String(keyword)}>{String(keyword)}</span>)}</div>}<p>{String(card.basicMeaning ?? '')}</p></div>)}</div>
}

function LiuyaoRawResult({ data }: { data: Record<string, unknown> }) {
  const lines = Array.isArray(data.lines) ? data.lines.map(object) : []
  const original = object(data.original)
  const changed = object(data.changed)
  const originalName = original.name ? `第 ${String(original.number)} 卦 · ${String(original.name)}` : String(data.originalHexagram ?? '已保存卦象')
  const changedName = changed.name ? `第 ${String(changed.number)} 卦 · ${String(changed.name)}` : String(data.changedHexagram ?? '已保存卦象')
  return <><div className="record-hexagram"><div><span>本卦</span><b>{originalName}</b></div><span>→</span><div><span>变卦</span><b>{changedName}</b></div></div><div className="result-lines">{[...lines].reverse().map((line, reverseIndex) => { const coins = Array.isArray(line.coins) ? line.coins : []; const index = Number(line.index ?? lines.length - reverseIndex); return <div className="result-line" key={index}><b>第 {index} 爻</b><div className="mini-coins">{coins.map((side, coinIndex) => <LiuyaoCoin side={side === 'yang' || side === 'heads' ? 'yang' : 'yin'} compact ariaLabel={`第 ${coinIndex + 1} 枚铜钱`} key={coinIndex} />)}</div><span>{String(line.label ?? '')}</span></div> })}</div>{lines.some((line) => line.naJia) && <details className="professional-details record-professional"><summary>查看详细排盘</summary><div className="table-scroll"><table className="professional-table"><thead><tr><th>爻位</th><th>六神</th><th>世应</th><th>六亲</th><th>纳甲</th><th>变卦</th></tr></thead><tbody>{[...lines].reverse().map((line) => <tr key={String(line.index)}><td>{String(line.index)}</td><td>{String(line.spirit ?? '')}</td><td>{String(line.shiYing ?? '')}</td><td>{String(line.relation ?? '')}</td><td>{String(line.naJia ?? '')} · {String(line.element ?? '')}</td><td>{String(line.changedNaJia ?? '')} · {String(line.changedRelation ?? '')}</td></tr>)}</tbody></table></div></details>}</>
}

function MeihuaRawResult({ data }: { data: Record<string, unknown> }) {
  const original = object(data.original)
  const mutual = object(data.mutual)
  const changed = object(data.changed)
  const body = object(data.bodyTrigram)
  const use = object(data.useTrigram)
  const relation = object(data.bodyUseRelation)
  return <>
    <div className="meihua-sequence">
      <div><span>本卦</span><b>{String(original.name ?? '已保存卦象')}</b></div><i>→</i>
      <div><span>互卦</span><b>{String(mutual.name ?? '已保存卦象')}</b></div><i>→</i>
      <div><span>变卦</span><b>{String(changed.name ?? '已保存卦象')}</b></div>
    </div>
    <ul className="compact-list record-meta">
      <li><span>动爻</span><b>第 {String(data.movingLine ?? '')} 爻</b></li>
      <li><span>体卦</span><b>{String(body.name ?? '')} · {String(body.element ?? '')}</b></li>
      <li><span>用卦</span><b>{String(use.name ?? '')} · {String(use.element ?? '')}</b></li>
      <li><span>体用关系</span><b>{String(relation.label ?? '')}</b></li>
    </ul>
  </>
}

function SnapshotResult({ record }: { record: DivinationRecord }) {
  if (record.type === 'tarot') return <TarotRawResult data={record.rawResult} />
  if (record.type === 'liuyao') return <LiuyaoRawResult data={record.rawResult} />
  if (record.type === 'meihua') return <MeihuaRawResult data={record.rawResult} />
  return <GenericRawResult data={record.rawResult} />
}

function aiContextForRecord(record: DivinationRecord): Record<string, unknown> {
  if (record.type === 'tarot') {
    const { spread, drawMode, cards } = record.rawResult
    return { spread, drawMode, cards, drawnAt: record.createdAt }
  }
  if (record.type === 'liuyao') {
    const { method, lockedAt, coinTosses, original, changed, movingLines, lines, calendar, lowerTrigram, upperTrigram } = record.rawResult
    return { method, lockedAt, coinTosses, original, changed, movingLines, lines, calendar, lowerTrigram, upperTrigram }
  }
  return record.rawResult
}

export default function RecordDetailPage() {
  const { recordId } = useParams()
  const record = useAppStore((state) => state.records.find((item) => item.id === recordId))
  if (!record) return <><TopBar title="记录详情" back /><EmptyState title="找不到这条记录" action={<LinkButton to="/records">返回记录</LinkButton>}>它可能已被移除，或链接已经失效。</EmptyState></>
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
    <Card><div className="card-kicker"><span>原始问题</span>{record.category && <span className="chip">{record.category}</span>}</div><h2>{record.question || '未填写问题'}</h2><ul className="compact-list record-meta"><li><span>当时人物</span><b>{record.profileNameSnapshot}</b></li>{accuracy && (record.type === 'bazi' || record.type === 'astrology') && <li><span>出生时间可信度</span><b>{accuracyLabels[accuracy]}</b></li>}<li><span>创建时间</span><b>{formatDate(record.createdAt, true)}</b></li></ul></Card>
    <AiReadingPanel module={record.type} question={record.question} context={aiContextForRecord(record)} recordId={record.id} ensureRecord={() => record.id} allowQuestionInput={!record.question} title="继续查看和追问" />
    <Card><SectionHeading title="结果追踪" side={<span className="chip">{verificationLabels[verificationStatus]}</span>} /><div className="verification-grid">{verificationOptions.map(([value, label]) => <label className="radio-option" key={value}><input type="radio" checked={verificationStatus === value} onChange={() => setStatus(value)} />{label}</label>)}</div><DatePicker label="验证日期" value={verificationDate} onChange={setVerificationDate} allowFuture /><label className="field"><span>实际结果</span><textarea rows={3} value={verificationResult} onChange={(event) => setVerificationResult(event.target.value)} placeholder="记录后来实际发生了什么" /></label><label className="field"><span>用户备注</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="其他需要保留的信息" /></label><Button onClick={saveMeta}>保存追踪信息</Button></Card>
    <details className="result-disclosure"><summary>查看原始牌面或卦象</summary><Card><SnapshotResult record={record} /></Card></details>
    <div className="record-danger-zone"><Button className="danger" onClick={removeRecord}>删除这条记录</Button></div>
  </>
}

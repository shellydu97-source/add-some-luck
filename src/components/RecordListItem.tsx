import { Link } from 'react-router-dom'
import { firstAnswerSentence } from '../ai/reading'
import { Card } from './UI'
import type { DivinationRecord } from '../models/types'
import { recordTypeLabels, verificationLabels } from '../models/labels'
import { formatDate } from '../utils/text'

export default function RecordListItem({record,managing,selected,onToggle,onDelete}:{record:DivinationRecord;managing:boolean;selected:boolean;onToggle:(id:string)=>void;onDelete:(id:string)=>void}) {
  return <div className={`record-list-item ${managing ? 'is-managing' : ''}`}>{managing && <label className="record-select">
      <input type="checkbox" checked={selected} onChange={() => onToggle(record.id)} />
      <span>选择</span>
      </label>}<Link className="click-card" to={managing ? '#' : `/records/${record.id}`} onClick={(event) => { if (managing) { event.preventDefault(); onToggle(record.id) } }}>
      <Card className="record-list-card">
      <div className="record-type-mark">{recordTypeLabels[record.type].slice(0, 1)}</div>
      <div className="record-main">
      <div className="card-kicker">
      <span>{recordTypeLabels[record.type]} · {record.profileNameSnapshot}</span>
      <span>{formatDate(record.createdAt)}</span>
      </div>
      <h3>{record.question || record.questionAddedLater || '未填写问题'}</h3>
      <p className="helper line-clamp">{firstAnswerSentence(record.aiInterpretations?.at(-1)?.directAnswer) || record.interpretation.headline}</p>
      <div className="chip-row compact-row">{record.category && <span className="chip">{record.category}</span>}{record.aiInterpretations?.length ? <span className="chip dark-chip">已有解读</span> : null}<span className="chip">{verificationLabels[record.verificationStatus]}</span>
      </div>
      </div>
      <span className="link-arrow">→</span>
      </Card>
      </Link>{!managing && <button type="button" className="record-delete-button" onClick={() => onDelete(record.id)} aria-label={`删除${record.question || '未填写问题'}记录`}>删除</button>}</div>
}

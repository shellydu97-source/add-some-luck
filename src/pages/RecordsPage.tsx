import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { Card, EmptyState, Segmented, SectionHeading } from '../components/UI'
import { categoryOptions, recordTypeLabels, verificationLabels } from '../models/labels'
import type { RecordType, VerificationStatus } from '../models/types'
import { useAppStore } from '../storage/store'
import { formatDate, normalizeQuestion } from '../utils/text'
import { GUEST_PROFILE_ID } from '../utils/record'
import { isRecordTypeVisible } from '../config/features'

type TypeFilter = 'all' | RecordType
type VerificationFilter = 'all' | VerificationStatus

export default function RecordsPage() {
  const records = useAppStore((state) => state.records)
  const profiles = useAppStore((state) => state.profiles)
  const deleteRecord = useAppStore((state) => state.deleteRecord)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [profileId, setProfileId] = useState('all')
  const [category, setCategory] = useState('all')
  const [time, setTime] = useState('all')
  const [verification, setVerification] = useState<VerificationFilter>('all')
  const [now] = useState(() => Date.now())
  const visibleRecords = useMemo(() => records.filter((record) => isRecordTypeVisible(record.type)), [records])
  const filtered = useMemo(() => visibleRecords.filter((record) => {
    const text = normalizeQuestion(`${record.question ?? ''}${record.profileNameSnapshot}${record.category ?? ''}${record.interpretation.headline}`)
    const timeLimit = time === '7' ? now - 7 * 864e5 : time === '30' ? now - 30 * 864e5 : 0
    return (!query || text.includes(normalizeQuestion(query)))
      && (type === 'all' || record.type === type)
      && (profileId === 'all' || record.profileId === profileId)
      && (category === 'all' || record.category === category)
      && (verification === 'all' || record.verificationStatus === verification)
      && (!timeLimit || new Date(record.createdAt).getTime() >= timeLimit)
  }), [visibleRecords, query, type, profileId, category, time, verification, now])

  function removeRecord(id: string) {
    if (!window.confirm('删除这条记录？原始结果、解读和追踪内容都会一并删除，且无法恢复。')) return
    deleteRecord(id)
  }

  return <>
    <TopBar title="记录" eyebrow="结果追踪与复盘" />
    <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索问题、人物或类型" aria-label="搜索记录" />
    <Segmented value={type} onChange={setType} label="记录类型" scrollable options={[{ value: 'all', label: '全部' }, { value: 'liuyao', label: '六爻' }, { value: 'meihua', label: '梅花' }, { value: 'tarot', label: '塔罗' }, { value: 'bazi', label: '八字' }]} />
    <details className="filter-panel"><summary>更多筛选</summary><div className="filter-grid"><label className="field"><span>人物</span><select value={profileId} onChange={(event) => setProfileId(event.target.value)}><option value="all">全部人物</option>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}{visibleRecords.some((record) => record.profileId === GUEST_PROFILE_ID) && <option value={GUEST_PROFILE_ID}>未关联人物</option>}</select></label><label className="field"><span>分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">全部分类</option><option value="命盘">命盘</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>时间</span><select value={time} onChange={(event) => setTime(event.target.value)}><option value="all">全部时间</option><option value="7">近 7 天</option><option value="30">近 30 天</option></select></label><label className="field"><span>验证状态</span><select value={verification} onChange={(event) => setVerification(event.target.value as VerificationFilter)}><option value="all">全部状态</option>{Object.entries(verificationLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div></details>
    <SectionHeading title={`${filtered.length} 条记录`} />
    {!filtered.length ? <EmptyState title="没有找到记录">换个筛选条件，或先完成一次八字命盘、塔罗、六爻或梅花易数。</EmptyState> : filtered.map((record) => <div className="record-list-item" key={record.id}><Link className="click-card" to={`/records/${record.id}`}><Card className="record-list-card"><div className="record-type-mark">{recordTypeLabels[record.type].slice(0, 1)}</div><div className="record-main"><div className="card-kicker"><span>{recordTypeLabels[record.type]} · {record.profileNameSnapshot}</span><span>{formatDate(record.createdAt)}</span></div><h3>{record.question || '未填写问题'}</h3><p className="helper line-clamp">{record.aiInterpretations?.at(-1)?.summary || record.interpretation.headline}</p><div className="chip-row compact-row">{record.category && <span className="chip">{record.category}</span>}{record.aiInterpretations?.length ? <span className="chip dark-chip">已有解读</span> : null}<span className="chip">{verificationLabels[record.verificationStatus]}</span></div></div><span className="link-arrow">→</span></Card></Link><button type="button" className="record-delete-button" onClick={() => removeRecord(record.id)} aria-label={`删除${record.question || '未填写问题'}记录`}>删除</button></div>)}
  </>
}

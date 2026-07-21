import { useState } from 'react'
import type { DivinationRecord, RecordType } from '../models/types'
import { mockReply } from '../interpretation/mockAdapter'
import { makeId } from '../utils/id'
import { useAppStore } from '../storage/store'
import { Button, Card, DemoBadge, SectionHeading } from './UI'

interface Props {
  record?: DivinationRecord
  ensureRecord?: () => DivinationRecord
  type: RecordType
}

export default function FollowUp({ record, ensureRecord, type }: Props) {
  const [value, setValue] = useState('')
  const appendRecordFollowUps = useAppStore((state) => state.appendRecordFollowUps)
  const liveRecord = useAppStore((state) => state.records.find((item) => item.id === record?.id)) ?? record

  function submit() {
    if (!value.trim()) return
    const target = liveRecord ?? ensureRecord?.()
    if (!target) return
    const now = new Date().toISOString()
    const messages = [
      { id: makeId('message'), role: 'user' as const, content: value.trim(), createdAt: now },
      { id: makeId('message'), role: 'mock' as const, content: mockReply(type, value.trim()), createdAt: now },
    ]
    appendRecordFollowUps(target.id, messages)
    setValue('')
  }

  return <Card className="follow-up-card">
    <SectionHeading title="继续追问" side={<DemoBadge label="假回复" />} />
    <p className="helper">追问会保存到对应记录，但不会更换已经固定的盘面、卦象或牌面。</p>
    {!!liveRecord?.followUpMessages.length && <div className="chat-list">{liveRecord.followUpMessages.map((message) => (
      <div className={`chat-bubble ${message.role}`} key={message.id}><b>{message.role === 'user' ? '你' : '演示解读'}</b><p>{message.content}</p></div>
    ))}</div>}
    <div className="follow-up-input"><textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="围绕当前结果继续问…" rows={2} /><Button onClick={submit}>发送</Button></div>
  </Card>
}

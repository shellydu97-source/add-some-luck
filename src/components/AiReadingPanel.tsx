import { useEffect, useState } from 'react'
import { getAiServiceStatus, requestAiReading } from '../ai/client'
import type { AiConversationMessage, AiInterpretationSnapshot, AiModule, AiReading } from '../models/types'
import { useAppStore } from '../storage/store'
import { makeId } from '../utils/id'
import { Button, Card } from './UI'

interface AiReadingPanelProps {
  module: AiModule
  question?: string
  context: Record<string, unknown>
  recordId?: string
  ensureRecord: (question?: string) => string
  allowQuestionInput?: boolean
  title?: string
}

const resultLabels: Record<AiModule, string> = {
  tarot: '牌面与正逆位',
  liuyao: '卦象与排盘',
  meihua: '本卦、互卦、变卦与体用关系',
  bazi: '八字排盘',
  astrology: '本命星盘',
}

function ReadingContent({ reading }: { reading: AiReading }) {
  return <div className="ai-reading-content">
    {reading.directAnswer && <p className="ai-direct-answer">{reading.directAnswer}</p>}
    {reading.summary && <p className="ai-summary">{reading.summary}</p>}
    {!!reading.sections.length && <details className="ai-reading-details">
      <summary>查看完整分析与依据</summary>
      <div className="ai-section-list">{reading.sections.map((section, index) => <section key={`${section.title}-${index}`}>
        <h3>{section.title}</h3>
        <p>{section.content}</p>
        {!!section.evidence.length && <ul className="plain-list">{section.evidence.map((item, evidenceIndex) => <li key={`${item}-${evidenceIndex}`}>{item}</li>)}</ul>}
      </section>)}</div>
      {!!reading.uncertainty.length && <div className="ai-boundary"><b>需要保留的不确定性</b><ul>{reading.uncertainty.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>}
    </details>}
    {!!reading.advice.length && <div className="ai-advice"><b>现实建议</b><ul>{reading.advice.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>}
  </div>
}

function readingToConversationContent(reading: AiReading) {
  return [
    reading.directAnswer,
    reading.summary ? `简要结论：${reading.summary}` : '',
    ...reading.sections.map((section) => [
      `${section.title}：${section.content}`,
      section.evidence.length ? `依据：${section.evidence.join('；')}` : '',
    ].filter(Boolean).join('\n')),
    reading.uncertainty.length ? `仍需保留的不确定性：${reading.uncertainty.join('；')}` : '',
    reading.advice.length ? `现实建议：${reading.advice.join('；')}` : '',
  ].filter(Boolean).join('\n\n')
}

export default function AiReadingPanel({ module, question = '', context, recordId, ensureRecord, allowQuestionInput = false, title = '结合问题解读' }: AiReadingPanelProps) {
  const [sessionRecordId, setSessionRecordId] = useState(recordId)
  const effectiveRecordId = recordId ?? sessionRecordId
  const storedRecord = useAppStore((state) => state.records.find((item) => item.id === effectiveRecordId))
  const appendInterpretation = useAppStore((state) => state.appendRecordAiInterpretation)
  const appendMessages = useAppStore((state) => state.appendRecordAiMessages)
  const setNotice = useAppStore((state) => state.setNotice)
  const latestStored = storedRecord?.aiInterpretations?.at(-1)
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null)
  const [askedQuestion, setAskedQuestion] = useState(question)
  const [sessionReading, setSessionReading] = useState<AiReading>()
  const [followUp, setFollowUp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getAiServiceStatus(controller.signal).then(setServiceAvailable).catch(() => setServiceAvailable(false))
    return () => controller.abort()
  }, [])

  const reading = latestStored ?? sessionReading
  const messages = storedRecord?.aiMessages ?? []
  const conversationForApi = [
    ...(reading ? [{ role: 'assistant' as const, content: readingToConversationContent(reading) }] : []),
    ...messages.map(({ role, content, reading: messageReading }) => ({
      role,
      content: messageReading ? readingToConversationContent(messageReading) : content,
    })),
  ]

  function resolveRecordId(currentQuestion?: string) {
    if (sessionRecordId) return sessionRecordId
    const createdId = ensureRecord(currentQuestion)
    setSessionRecordId(createdId)
    return createdId
  }

  async function generateReading() {
    setLoading(true)
    setError('')
    try {
      const response = await requestAiReading({ module, action: 'interpret', question: askedQuestion.trim(), context })
      const id = resolveRecordId(askedQuestion.trim())
      const snapshot: AiInterpretationSnapshot = {
        id: makeId('ai-reading'), module, question: askedQuestion.trim(), createdAt: new Date().toISOString(),
        provider: response.meta.provider, model: response.meta.model, promptVersion: response.meta.promptVersion,
        usage: response.usage, ...response.reading,
      }
      appendInterpretation(id, snapshot)
      setSessionReading(response.reading)
      setNotice('解读已生成并保存到记录。')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '智能解读暂时不可用')
    } finally {
      setLoading(false)
    }
  }

  async function askFollowUp(content = followUp) {
    const trimmed = content.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError('')
    try {
      const id = resolveRecordId(askedQuestion.trim())
      const response = await requestAiReading({
        module, action: 'followup', question: askedQuestion.trim(), followUpQuestion: trimmed,
        context, messages: conversationForApi,
      })
      const now = new Date().toISOString()
      const newMessages: AiConversationMessage[] = [
        { id: makeId('ai-message'), role: 'user', content: trimmed, createdAt: now },
        { id: makeId('ai-message'), role: 'assistant', content: readingToConversationContent(response.reading), reading: response.reading, createdAt: new Date().toISOString() },
      ]
      appendMessages(id, newMessages)
      setFollowUp('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '追问暂时无法回答')
    } finally {
      setLoading(false)
    }
  }

  return <Card className="ai-reading-panel">
    <div className="ai-panel-heading"><div><span>智能解读</span><h2>{title}</h2></div>{serviceAvailable === true && <span className="ai-status-dot">可用</span>}</div>
    {!reading && <>
      <p className="helper">会根据本次已经确定的{resultLabels[module]}回答，不会改变原始结果。</p>
      {(allowQuestionInput || !question.trim()) && <label className="field ai-question-field"><span>你最想了解什么</span><textarea rows={3} value={askedQuestion} onChange={(event) => setAskedQuestion(event.target.value)} placeholder="例如：这件事我现在最该留意什么？" /></label>}
      {serviceAvailable === false
        ? <p className="ai-unavailable">智能解读暂未开启，基础结果仍可正常查看和保存。</p>
        : <Button onClick={generateReading} disabled={loading || serviceAvailable !== true}>{loading ? '正在整理结果…' : askedQuestion.trim() ? '结合问题生成解读' : '生成基础解读'}</Button>}
    </>}
    {reading && <>
      <ReadingContent reading={reading} />
      {!!reading.suggestedQuestions.length && <div className="ai-suggestions"><span>可以继续问</span>{reading.suggestedQuestions.map((item, index) => <button type="button" key={`${item}-${index}`} onClick={() => askFollowUp(item)} disabled={loading}>{item}</button>)}</div>}
      {!!messages.length && <div className="chat-list ai-chat-list">{messages.map((message) => <div className={`chat-bubble ${message.role}`} key={message.id}><b>{message.role === 'user' ? '你' : '智能解读'}</b>{message.reading ? <ReadingContent reading={message.reading} /> : <p>{message.content}</p>}</div>)}</div>}
      <div className="follow-up-input"><textarea rows={2} value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="继续问，我会结合刚才的结果回答" /><Button onClick={() => askFollowUp()} disabled={loading || !followUp.trim()}>{loading ? '回答中' : '发送'}</Button></div>
    </>}
    {error && <p className="field-error ai-error">{error}</p>}
  </Card>
}

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  calculateMeihuaByNumbers, calculateMeihuaByObjectCount, calculateMeihuaBySoundCount,
  calculateMeihuaBySpecifiedTime, calculateMeihuaByText, calculateMeihuaByThreeNumbers,
  calculateMeihuaByTime, normalizeMeihuaText, shanghaiLocalDateTimeToInstant,
} from '../calculation/meihua'
import DatePicker from '../components/DatePicker'
import TimePicker from '../components/TimePicker'
import { normalizeTimeInput } from '../utils/time'
import TopBar from '../components/TopBar'
import { Button, Card, ConfidenceNote, EmptyState, LinkButton } from '../components/UI'
import { useFlowExitGuard } from '../hooks/useFlowExitGuard'
import type { MeihuaDraftState, MeihuaMethod } from '../models/types'
import { getDraft, useAppStore } from '../storage/store'

const methodOptions: { value: MeihuaMethod; label: string; hint: string; mark: string }[] = [
  { value: 'time', label: '当前时间', hint: '用点击按钮的此刻起卦', mark: '今' },
  { value: 'specified_time', label: '指定时间', hint: '为已经发生的时刻起卦', mark: '时' },
  { value: 'numbers', label: '两个数字', hint: '分别取上卦和下卦', mark: '二' },
  { value: 'three_numbers', label: '三个数字', hint: '分别取上卦、下卦和动爻', mark: '三' },
  { value: 'text', label: '一段文字', hint: '按一句话的汉字数量起卦', mark: '文' },
  { value: 'object_count', label: '看到的数量', hint: '按眼前可数物品的数量起卦', mark: '物' },
  { value: 'sound_count', label: '听到的次数', hint: '按连续声音出现的次数起卦', mark: '声' },
]

function currentShanghaiInput() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

function positiveInteger(value: string) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

export default function MeihuaCastPage() {
  const navigate = useNavigate()
  const draft = useAppStore((state) => getDraft(state, 'meihua'))
  const upsertDraft = useAppStore((state) => state.upsertDraft)
  const [method, setMethod] = useState<MeihuaMethod>(draft?.state.method ?? 'time')
  const [firstNumber, setFirstNumber] = useState(draft?.state.firstNumber ? String(draft.state.firstNumber) : '')
  const [secondNumber, setSecondNumber] = useState(draft?.state.secondNumber ? String(draft.state.secondNumber) : '')
  const [thirdNumber, setThirdNumber] = useState(draft?.state.thirdNumber ? String(draft.state.thirdNumber) : '')
  const [specifiedLocalDateTime, setSpecifiedLocalDateTime] = useState(draft?.state.specifiedLocalDateTime ?? currentShanghaiInput)
  // Date and time are edited separately so a half-typed date never garbles the time field.
  const [specifiedDate, setSpecifiedDate] = useState(() => specifiedLocalDateTime.slice(0, 10).replaceAll('-', '/'))
  const [specifiedTime, setSpecifiedTime] = useState(() => specifiedLocalDateTime.slice(11, 16))
  const [sourceText, setSourceText] = useState(draft?.state.sourceText ?? '')
  const [observedCount, setObservedCount] = useState(draft?.state.observedCount ? String(draft.state.observedCount) : '')
  const [error, setError] = useState('')
  useFlowExitGuard(!!draft && !draft.state.locked)

  if (!draft) return <><TopBar title="梅花易数" back /><EmptyState title="还没有梅花易数草稿" action={<LinkButton to="/divination/meihua/question">重新开始</LinkButton>}>请先建立一次新的起卦流程。</EmptyState></>
  if (draft.state.locked) return <Navigate to="/divination/meihua/result" replace />
  const activeDraft = draft

  function updateSpecified(date: string, time: string) {
    setSpecifiedDate(date)
    setSpecifiedTime(time)
    const value = `${date.replaceAll('/', '-')}T${normalizeTimeInput(time) ?? time}`
    setSpecifiedLocalDateTime(value)
    setError('')
    persistState({ method, specifiedLocalDateTime: value })
  }

  function persistState(patch: Partial<MeihuaDraftState>) {
    upsertDraft({ ...activeDraft, state: { ...activeDraft.state, ...patch } })
  }

  function chooseMethod(value: MeihuaMethod) {
    setMethod(value)
    setError('')
    persistState({
      method: value, firstNumber: undefined, secondNumber: undefined, thirdNumber: undefined,
      specifiedLocalDateTime: undefined, sourceText: undefined, observedCount: undefined,
    })
  }

  function lockResult() {
    const now = new Date().toISOString()
    let lockedAt = now
    let lockedState: Partial<MeihuaDraftState> = { method }
    try {
      if (method === 'time') {
        calculateMeihuaByTime(now)
      } else if (method === 'specified_time') {
        calculateMeihuaBySpecifiedTime(specifiedLocalDateTime)
        lockedAt = shanghaiLocalDateTimeToInstant(specifiedLocalDateTime).toISOString()
        lockedState = { ...lockedState, specifiedLocalDateTime }
      } else if (method === 'numbers') {
        const first = Number(firstNumber)
        const second = Number(secondNumber)
        calculateMeihuaByNumbers(first, second)
        lockedState = { ...lockedState, firstNumber: first, secondNumber: second }
      } else if (method === 'three_numbers') {
        const first = Number(firstNumber)
        const second = Number(secondNumber)
        const third = Number(thirdNumber)
        calculateMeihuaByThreeNumbers(first, second, third)
        lockedState = { ...lockedState, firstNumber: first, secondNumber: second, thirdNumber: third }
      } else if (method === 'text') {
        calculateMeihuaByText(sourceText)
        lockedState = { ...lockedState, sourceText: sourceText.trim() }
      } else {
        const count = Number(observedCount)
        if (method === 'object_count') calculateMeihuaByObjectCount(count, now)
        else calculateMeihuaBySoundCount(count, now)
        lockedState = { ...lockedState, observedCount: count }
      }
      persistState({ ...lockedState, locked: true, lockedAt })
      navigate('/divination/meihua/result')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '起卦信息无效。')
    }
  }

  const normalizedCharacterCount = Array.from(normalizeMeihuaText(sourceText)).length
  const actionLabel: Record<MeihuaMethod, string> = {
    time: '按此刻起卦', specified_time: '按指定时间起卦', numbers: '用这两个数字起卦',
    three_numbers: '用这三个数字起卦', text: '用这段文字起卦', object_count: '用这个数量起卦', sound_count: '用这个次数起卦',
  }

  return <>
    <TopBar title="选择推演方式" eyebrow="确认后锁定结果" back />
    <ConfidenceNote>选择最符合当下情境的一种方式即可；确认后，输入和卦象都会保持不变。</ConfidenceNote>
    <div className="meihua-method-grid" role="radiogroup" aria-label="梅花易数起卦方式">{methodOptions.map((option) => <button
      type="button" role="radio" aria-checked={method === option.value} className={`meihua-method-option${method === option.value ? ' active' : ''}`}
      onClick={() => chooseMethod(option.value)} key={option.value}
    ><span>{option.mark}</span><b>{option.label}</b><small>{option.hint}</small></button>)}</div>

    <Card><div className="card-kicker"><span>本次问题</span><span className="chip">{activeDraft.category}</span></div><h3>{activeDraft.question || '未填写问题'}</h3></Card>

    {method === 'time' && <Card className="casting-stage"><div className="method-mark large-method-mark">今</div><h2>以点击按钮的此刻起卦</h2><p className="helper center">结果锁定后，刷新或返回页面都不会改变起卦时间与卦象。</p></Card>}

    {method === 'specified_time' && <Card><div className="datetime-fields">
      <DatePicker label="日期" value={specifiedDate} allowFuture minYear={1901} onChange={(date) => updateSpecified(date, specifiedTime)} />
      <TimePicker label="时间" value={specifiedTime} onChange={(time) => updateSpecified(specifiedDate, time)} />
    </div><p className="helper">适合按某件事情实际发生或出现念头的时间起卦。</p></Card>}

    {(method === 'numbers' || method === 'three_numbers') && <Card>
      <div className={`number-entry-grid${method === 'three_numbers' ? ' three' : ''}`}>
        <label className="field"><span>第一个数字</span><input inputMode="numeric" value={firstNumber} onChange={(event) => { setFirstNumber(event.target.value); setError(''); persistState({ method, firstNumber: positiveInteger(event.target.value) }) }} placeholder="正整数" /></label>
        <label className="field"><span>第二个数字</span><input inputMode="numeric" value={secondNumber} onChange={(event) => { setSecondNumber(event.target.value); setError(''); persistState({ method, secondNumber: positiveInteger(event.target.value) }) }} placeholder="正整数" /></label>
        {method === 'three_numbers' && <label className="field"><span>第三个数字</span><input inputMode="numeric" value={thirdNumber} onChange={(event) => { setThirdNumber(event.target.value); setError(''); persistState({ method, thirdNumber: positiveInteger(event.target.value) }) }} placeholder="正整数" /></label>}
      </div>
      <p className="helper">凭当下直觉输入正整数，不需要刻意寻找“吉利数字”。</p>
    </Card>}

    {method === 'text' && <Card><label className="field"><span>用于起卦的一句话</span><textarea rows={4} value={sourceText} maxLength={160} onChange={(event) => { setSourceText(event.target.value); setError(''); persistState({ method, sourceText: event.target.value }) }} placeholder="请输入 11 至 100 个汉字" /></label><div className="field-meta"><span>标点和空格不计</span><b>{normalizedCharacterCount} / 100</b></div></Card>}

    {(method === 'object_count' || method === 'sound_count') && <Card><label className="field"><span>{method === 'object_count' ? '看到的物品数量' : '连续听到的声音次数'}</span><input inputMode="numeric" value={observedCount} onChange={(event) => { setObservedCount(event.target.value); setError(''); persistState({ method, observedCount: positiveInteger(event.target.value) }) }} placeholder="正整数" /></label><p className="helper">{method === 'object_count' ? '只记录当下第一眼明确可数的同类物品。' : '只记录同一段连续、清楚可数的声音。'}</p></Card>}

    {error && <p className="field-error">{error}</p>}
    <Button onClick={lockResult}>{actionLabel[method]}</Button>
  </>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarType } from '../models/types'
import { daysInMonth, formatDateParts, getTodayParts, MIN_BIRTH_YEAR, normalizeDateInput, parseDateParts, validateDateInput } from '../utils/date'

const ITEM_HEIGHT = 44

export function Wheel({ label, values, value, format, onChange }: {
  label: string
  values: number[]
  value: number
  format: (value: number) => string
  onChange: (value: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const index = Math.max(0, values.indexOf(value))
    ref.current?.scrollTo?.({ top: index * ITEM_HEIGHT })
  }, [value, values])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function handleScroll() {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const index = Math.max(0, Math.min(values.length - 1, Math.round((ref.current?.scrollTop ?? 0) / ITEM_HEIGHT)))
      if (values[index] !== value) onChange(values[index])
    }, 80)
  }

  return <div className="date-wheel-wrap"><b>{label}</b><div className="date-wheel" ref={ref} role="listbox" aria-label={label} onScroll={handleScroll}>
    {values.map((item) => <button type="button" role="option" aria-selected={item === value} className={item === value ? 'selected' : ''} onClick={() => onChange(item)} key={item}>{format(item)}</button>)}
  </div></div>
}

export default function DatePicker({ label, value, onChange, calendarType = 'solar', allowFuture = false, minYear = MIN_BIRTH_YEAR, required = false, lunarLeapMonth = false, onLunarLeapMonthChange }: {
  label: string
  value: string
  onChange: (value: string) => void
  calendarType?: CalendarType
  allowFuture?: boolean
  minYear?: number
  required?: boolean
  lunarLeapMonth?: boolean
  onLunarLeapMonthChange?: (value: boolean) => void
}) {
  const today = getTodayParts()
  const maxYear = allowFuture ? today.year + 20 : today.year
  const initial = parseDateParts(value) ?? { year: today.year, month: 1, day: 1 }
  const [open, setOpen] = useState(false)
  const [draftText, setDraftText] = useState(value)
  const [parts, setParts] = useState(initial)
  const [original, setOriginal] = useState(value)
  const [error, setError] = useState('')
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index), [maxYear, minYear])
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), [])
  const maxDay = daysInMonth(parts.year, parts.month, calendarType)
  const selectedDay = Math.min(parts.day, maxDay)
  const days = useMemo(() => Array.from({ length: maxDay }, (_, index) => index + 1), [maxDay])

  function openPicker() {
    const parsed = parseDateParts(value)
    setOriginal(value)
    setDraftText(value)
    setParts(parsed ?? { year: today.year, month: 1, day: 1 })
    setError('')
    setOpen(true)
  }

  function updateParts(next: typeof parts) {
    const clamped = { ...next, day: Math.min(next.day, daysInMonth(next.year, next.month, calendarType)) }
    setParts(clamped)
    setDraftText(formatDateParts(clamped))
    setError('')
  }

  function updateDraftText(next: string) {
    setDraftText(next)
    const parsed = parseDateParts(next)
    if (parsed && parsed.year >= minYear && parsed.year <= maxYear && parsed.month >= 1 && parsed.month <= 12) {
      setParts({ ...parsed, day: Math.max(1, Math.min(parsed.day, daysInMonth(parsed.year, parsed.month, calendarType))) })
    }
  }

  function closePicker() {
    if (draftText !== original && !window.confirm('日期有未确认修改，确定关闭吗？')) return
    setOpen(false)
  }

  function confirm() {
    const normalized = normalizeDateInput(draftText || formatDateParts({ ...parts, day: selectedDay }))
    const message = validateDateInput(normalized, { calendarType, minYear, maxYear, allowFuture })
    if (message) { setError(message); return }
    onChange(normalized)
    setDraftText(normalized)
    setError('')
    setOpen(false)
  }

  function updateInline(next: string) {
    onChange(next)
    if (error) setError('')
  }

  function blurInline() {
    if (!value.trim() && !required) { setError(''); onChange(''); return }
    const normalized = normalizeDateInput(value)
    const message = validateDateInput(normalized, { calendarType, minYear, maxYear, allowFuture })
    setError(message)
    if (!message) onChange(normalized)
  }

  return <div className="field date-picker-field">
    <span>{label}{required ? ' *' : ''}</span>
    <div className="date-input-row"><input inputMode="numeric" value={value} onChange={(event) => updateInline(event.target.value)} onBlur={blurInline} placeholder="YYYY/MM/DD" aria-invalid={!!error} /><button type="button" onClick={openPicker}>滚轮选择</button></div>
    {calendarType === 'lunar' && <label className="inline-check"><input type="checkbox" checked={lunarLeapMonth} onChange={(event) => onLunarLeapMonthChange?.(event.target.checked)} />所选月份为闰月</label>}
    {error && <p className="field-error date-error">{error}</p>}
    {open && <div className="modal-backdrop"><section className="date-sheet" role="dialog" aria-modal="true" aria-label={`${label}选择器`}>
      <div className="sheet-heading"><div><span className="eyebrow">手动输入或滚动选择</span><h2>{label}</h2></div><button type="button" className="icon-button" onClick={closePicker} aria-label="关闭日期选择器">×</button></div>
      <input className="date-manual-input" inputMode="numeric" value={draftText} onChange={(event) => updateDraftText(event.target.value)} placeholder="YYYY/MM/DD" />
      <div className="date-wheels">
        <Wheel label="年" values={years} value={parts.year} format={(item) => String(item)} onChange={(year) => updateParts({ ...parts, year })} />
        <Wheel label="月" values={months} value={parts.month} format={(item) => `${item}月`} onChange={(month) => updateParts({ ...parts, month })} />
        <Wheel label="日" values={days} value={selectedDay} format={(item) => `${item}日`} onChange={(day) => updateParts({ ...parts, day })} />
      </div>
      <label className="field year-jump"><span>快速跳转年份</span><input type="number" min={minYear} max={maxYear} value={parts.year} onChange={(event) => updateParts({ ...parts, year: Math.max(minYear, Math.min(maxYear, Number(event.target.value) || minYear)) })} /></label>
      {error && <p className="field-error">{error}</p>}
      <button type="button" className="button" onClick={confirm}>确认日期</button>
    </section></div>}
  </div>
}

import { useId, useMemo, useState } from 'react'
import { Wheel } from './DatePicker'
import { normalizeTimeInput } from '../utils/time'

const HOURS = Array.from({ length: 24 }, (_, index) => index)
const MINUTES = Array.from({ length: 60 }, (_, index) => index)
const pad = (value: number) => String(value).padStart(2, '0')

// Native time inputs size themselves differently on iOS Safari and overflow their frame; this one stays inside it.
export default function TimePicker({ label, value, onChange, disabled = false, required = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
}) {
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const initial = useMemo(() => normalizeTimeInput(value)?.split(':').map(Number) ?? [12, 0], [value])
  const [hour, setHour] = useState(initial[0])
  const [minute, setMinute] = useState(initial[1])

  function openPicker() {
    setHour(initial[0])
    setMinute(initial[1])
    setOpen(true)
  }

  function blurInline() {
    if (!value.trim()) { setError(required ? '请填写时间' : ''); return }
    const normalized = normalizeTimeInput(value)
    if (!normalized) { setError('请按 时:分 填写，例如 09:30'); return }
    setError('')
    if (normalized !== value) onChange(normalized)
  }

  return <div className="field time-picker-field">
    <label htmlFor={inputId}>{label}{required ? ' *' : ''}</label>
    <div className="date-input-row">
      <input id={inputId} inputMode="numeric" value={value} disabled={disabled} onChange={(event) => { onChange(event.target.value); if (error) setError('') }} onBlur={blurInline} placeholder="时:分，例如 09:30" aria-invalid={!!error} />
      <button type="button" disabled={disabled} onClick={openPicker}>滚轮选择</button>
    </div>
    {error && <p className="field-error date-error">{error}</p>}
    {open && <div className="modal-backdrop"><section className="date-sheet" role="dialog" aria-modal="true" aria-label={`${label}选择器`}>
      <div className="sheet-heading"><div><span className="eyebrow">滚动选择</span><h2>{label}</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="关闭时间选择器">×</button></div>
      <p className="date-manual-input time-preview">{pad(hour)}:{pad(minute)}</p>
      <div className="date-wheels time-wheels">
        <Wheel label="时" values={HOURS} value={hour} format={(item) => `${pad(item)}时`} onChange={setHour} />
        <Wheel label="分" values={MINUTES} value={minute} format={(item) => `${pad(item)}分`} onChange={setMinute} />
      </div>
      <button type="button" className="button" onClick={() => { onChange(`${pad(hour)}:${pad(minute)}`); setError(''); setOpen(false) }}>确认时间</button>
    </section></div>}
  </div>
}

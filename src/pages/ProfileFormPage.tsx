import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DatePicker from '../components/DatePicker'
import BirthLocationPicker from '../components/BirthLocationPicker'
import TopBar from '../components/TopBar'
import { Button, Card } from '../components/UI'
import type { CalendarType, Gender } from '../models/types'
import { useAppStore } from '../storage/store'
import { MIN_BIRTH_YEAR, validateDateInput } from '../utils/date'
import { buildProfileInput, getSimpleProfileFields, type SimpleProfileFields } from '../utils/profileForm'
import { validateBaziBirthDate, correctBirthTime } from '../calculation/bazi'

export default function ProfileFormPage() {
  const { profileId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const existing = useAppStore((state) => state.profiles.find((item) => item.id === profileId))
  const saveProfile = useAppStore((state) => state.saveProfile)
  const [error, setError] = useState('')
  const [form, setForm] = useState<SimpleProfileFields>(() => getSimpleProfileFields(existing))
  const onboarding = searchParams.get('onboarding') === '1'
  const title = existing ? '编辑人物' : onboarding ? '建立人物档案' : '新建人物'

  function update<K extends keyof SimpleProfileFields>(key: K, value: SimpleProfileFields[K]) {
    setForm((current) => ({ ...current, [key]: value, ...(['rawBirthDate','rawBirthTime','unknownBirthTime','lunarLeapMonth'].includes(key) ? { daylightSavingStatus:'unknown' as const } : {}) }))
    if (error) setError('')
  }

  let needsDst = false
  try { needsDst = correctBirthTime(buildProfileInput(form, existing)).requiresDaylightSavingChoice } catch { /* date validation occurs on save */ }

  function save() {
    if (!form.gender) { setError('请选择性别'); return }
    if (!form.name.trim()) { setError('请填写姓名或昵称'); return }
    const birthError = validateDateInput(form.rawBirthDate, {
      calendarType: form.calendarType,
      minYear: MIN_BIRTH_YEAR,
      allowFuture: false,
    })
    if (birthError) { setError(birthError); return }
    const calendarError = validateBaziBirthDate({
      calendarType: form.calendarType,
      rawBirthDate: form.rawBirthDate,
      lunarLeapMonth: form.lunarLeapMonth,
    })
    if (calendarError) { setError(calendarError); return }

    const input = buildProfileInput(form, existing)
    if (needsDst && input.daylightSavingStatus === 'unknown') { setError('请确认出生时间是否按夏令时记录'); return }
    if (input.useTrueSolarTime === 'on' && !input.birthLocation) { setError('开启真太阳时需要选择出生城市'); return }
    const id = saveProfile({ ...input, id: existing?.id })
    navigate(`/charts/${id}/bazi`, { replace: onboarding })
  }

  return <>
    <TopBar title={title} back />
    <Card className="simple-profile-form">
      <label className="field">
        <span>姓名 / 昵称 *</span>
        <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="例如：小橙" />
      </label>

      <fieldset className="field fieldset">
        <legend>性别 *</legend>
        <div className="radio-grid">
          {([['female', '女'], ['male', '男']] as [Gender, string][]).map(([value, label]) => <label className="radio-option" key={value}>
            <input type="radio" checked={form.gender === value} onChange={() => update('gender', value)} />{label}
          </label>)}
        </div>
      </fieldset>

      <fieldset className="field fieldset">
        <legend>历法</legend>
        <div className="radio-grid">
          {([['solar', '公历'], ['lunar', '农历']] as [CalendarType, string][]).map(([value, label]) => <label className="radio-option" key={value}>
            <input type="radio" checked={form.calendarType === value} onChange={() => setForm((current) => ({ ...current, calendarType: value, daylightSavingStatus:'unknown', lunarLeapMonth: value === 'lunar' ? current.lunarLeapMonth : false }))} />{label}
          </label>)}
        </div>
      </fieldset>

      <DatePicker
        label="出生日期"
        required
        value={form.rawBirthDate}
        onChange={(value) => update('rawBirthDate', value)}
        calendarType={form.calendarType}
        minYear={MIN_BIRTH_YEAR}
        lunarLeapMonth={form.lunarLeapMonth}
        onLunarLeapMonthChange={(value) => update('lunarLeapMonth', value)}
      />

      <label className="field">
        <span>出生时间</span>
        <input
          type="time"
          disabled={form.unknownBirthTime}
          value={form.unknownBirthTime ? '' : form.rawBirthTime}
          onInput={(event) => update('rawBirthTime', event.currentTarget.value)}
        />
      </label>
      <label className="radio-option unknown-time-option">
        <input type="checkbox" checked={form.unknownBirthTime} onChange={(event) => update('unknownBirthTime', event.target.checked)} />
        不知道出生时间
      </label>
      {form.unknownBirthTime && <p className="helper unknown-time-note">命盘将降低时柱、上升和宫位的可信度。</p>}

      {needsDst && <label className="field"><span>这个时间是当时的钟表时间（夏令时）吗？ *</span><select value={form.daylightSavingStatus ?? 'unknown'} onChange={(e) => update('daylightSavingStatus', e.target.value as SimpleProfileFields['daylightSavingStatus'])}><option value="unknown">请选择</option><option value="applied">是，按夏令时记录</option><option value="not_applied">不是，已是标准时间</option></select></label>}
      <BirthLocationPicker
        value={form.birthPlaceText}
        selected={form.birthLocation}
        onChange={(birthPlaceText, birthLocation) => {
          setForm((current) => ({ ...current, birthPlaceText, birthLocation }))
          if (error) setError('')
        }}
      />
      <details className="professional-details"><summary>专业设置</summary>
        <label className="radio-option"><input type="checkbox" disabled={!form.birthLocation || form.unknownBirthTime} checked={form.useTrueSolarTime === 'on'} onChange={(e) => update('useTrueSolarTime', e.target.checked ? 'on' : 'off')} />使用真太阳时</label>
        {!form.birthLocation && <p className="helper">先选择出生城市，再开启真太阳时。</p>}
        <label className="field"><span>子时换日规则</span><select value={form.dayBoundaryRule ?? 'system_default'} onChange={(e) => update('dayBoundaryRule', e.target.value as SimpleProfileFields['dayBoundaryRule'])}><option value="system_default">默认：晚子时日柱不换</option><option value="zi-23">23:00 起按次日日柱和子时计算</option></select></label>
      </details>
    </Card>
    {error && <p className="field-error spaced-error">{error}</p>}
    <div className="profile-form-actions"><Button onClick={save}>保存档案</Button></div>
  </>
}

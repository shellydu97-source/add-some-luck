import { useEffect, useMemo, useState } from 'react'
import { loadChinaCities, toConfirmedBirthLocation, type ChinaCityRecord } from '../data/chinaCities'
import type { ConfirmedBirthLocation } from '../models/types'
import { Button } from './UI'

const municipalityNames = new Set(['北京市', '天津市', '上海市', '重庆市'])

export default function BirthLocationPicker({ value, selected, onChange }: {
  value: string
  selected?: ConfirmedBirthLocation
  onChange: (value: string, selected?: ConfirmedBirthLocation) => void
}) {
  const [cities, setCities] = useState<ChinaCityRecord[]>([])
  const [metadata, setMetadata] = useState<Awaited<ReturnType<typeof loadChinaCities>>['metadata']>()
  const [open, setOpen] = useState(false)
  const [draftProvince, setDraftProvince] = useState('')
  const [draftCity, setDraftCity] = useState<ChinaCityRecord>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void loadChinaCities().then((data) => {
      if (cancelled) return
      setCities(data.cities)
      setMetadata(data.metadata)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const provinces = useMemo(() => Array.from(new Set(cities.map((city) => city.province)))
    .sort((a, b) => {
      const aMunicipality = municipalityNames.has(a)
      const bMunicipality = municipalityNames.has(b)
      if (aMunicipality !== bMunicipality) return aMunicipality ? -1 : 1
      return a.localeCompare(b, 'zh-CN')
    }), [cities])

  const provinceCities = useMemo(
    () => cities.filter((city) => city.province === draftProvince),
    [cities, draftProvince],
  )
  const confirmed = selected?.userConfirmed === true && selected.canonicalName === value

  function openPicker() {
    const current = cities.find((city) => city.province === selected?.province && city.city === selected?.city)
    setDraftProvince(selected?.province ?? '')
    setDraftCity(current)
    setOpen(true)
  }

  function chooseProvince(nextProvince: string) {
    setDraftProvince(nextProvince)
    setDraftCity(municipalityNames.has(nextProvince)
      ? cities.find((city) => city.province === nextProvince)
      : undefined)
  }

  function confirmCity() {
    if (!metadata || !draftCity) return
    onChange(draftCity.canonicalName, toConfirmedBirthLocation(draftCity, metadata))
    setOpen(false)
  }

  return <div className="field birth-location-field">
    <span>出生地点</span>
    <button
      type="button"
      className={`location-picker-trigger ${confirmed ? 'confirmed' : ''}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={openPicker}
      disabled={loading}
    >
      <span className="location-trigger-text">
        <b>{confirmed ? `${selected.province} · ${selected.city}` : value.trim() || (loading ? '正在载入城市…' : '请选择出生地点')}</b>
        <small>{confirmed ? '已确认' : value.trim() ? '需要重新选择' : '选择省份和城市'}</small>
      </span>
      <span className="location-trigger-arrow" aria-hidden="true">›</span>
    </button>

    {!confirmed && value.trim() && <p className="location-warning">这个地点还没有确认具体城市，请重新选择。</p>}

    {open && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="location-sheet" role="dialog" aria-modal="true" aria-labelledby="birth-location-title">
        <div className="sheet-heading">
          <div><span className="eyebrow">先选省份，再选城市</span><h2 id="birth-location-title">选择出生地点</h2></div>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="关闭出生地点选择器">×</button>
        </div>

        <label className="location-select-field">
          <small>省份 / 自治区 / 直辖市</small>
          <select aria-label="选择出生省份" value={draftProvince} onChange={(event) => chooseProvince(event.target.value)}>
            <option value="">请选择</option>
            {provinces.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>

        {draftProvince && <div className="location-city-panel">
          <small className="location-city-heading">选择城市</small>
          <div className="location-city-list" role="listbox" aria-label={`${draftProvince}城市列表`}>
            {provinceCities.map((city) => {
              const isSelected = draftCity?.id === city.id
              return <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={isSelected ? 'selected' : ''}
                key={city.id}
                onClick={() => setDraftCity(city)}
              >
                <b>{city.city}</b>
                {isSelected && <span>已选</span>}
              </button>
            })}
          </div>
        </div>}

        <div className="location-sheet-actions">
          <Button className="secondary" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={confirmCity} disabled={!draftCity}>确定</Button>
        </div>
      </section>
    </div>}
  </div>
}

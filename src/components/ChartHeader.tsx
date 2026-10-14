import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Profile } from '../models/types'
import { featureFlags } from '../config/features'
import { useAppStore } from '../storage/store'
import TopBar from './TopBar'
import { ConfidenceNote, Segmented } from './UI'

// The chart header only names the person, switches between people and links to their birth details.
export default function ChartHeader({ profile, type }: { profile: Profile; type: 'bazi' | 'astrology' }) {
  const navigate = useNavigate()
  const profiles = useAppStore((state) => state.profiles)
  const setActiveProfile = useAppStore((state) => state.setActiveProfile)
  const [switching, setSwitching] = useState(false)
  function switchPerson(id: string) {
    setSwitching(false)
    setActiveProfile(id)
    navigate(`/charts/${id}/${type}`)
  }
  return <>
    <TopBar title={profile.name} eyebrow="命盘" back onBack={() => navigate('/charts')} action={<div className="top-actions-inline">
      {profiles.length > 1 && <button type="button" className="button secondary compact-button" onClick={() => setSwitching(true)}>切换人物</button>}
      <Link className="icon-button" to={`/profiles/${profile.id}/edit`} aria-label="编辑出生信息">✎</Link>
    </div>} />
    {switching && <div className="modal-backdrop" onClick={() => setSwitching(false)}><section className="date-sheet" role="dialog" aria-modal="true" aria-label="切换人物" onClick={(event) => event.stopPropagation()}>
      <div className="sheet-heading"><div><span className="eyebrow">命理</span><h2>切换人物</h2></div><button type="button" className="icon-button" onClick={() => setSwitching(false)} aria-label="关闭">×</button></div>
      <div className="person-switch-sheet">{profiles.map((item) => <button type="button" aria-current={item.id === profile.id} onClick={() => switchPerson(item.id)} key={item.id}>{item.name}{item.isDefault ? '（默认）' : ''}</button>)}</div>
    </section></div>}
    {featureFlags.astrology && <Segmented value={type} options={[{ value: 'bazi', label: '八字' }, { value: 'astrology', label: '星盘' }]} onChange={(next) => navigate(`/charts/${profile.id}/${next}`)} label="命盘类型" />}
    {type === 'bazi' && profile.timeAccuracy !== 'exact_minute' && <ConfidenceNote>
      {profile.timeAccuracy === 'unknown'
        ? '出生时间未知，无法显示时柱和精确起运时间。'
        : '出生时间不够精确，时柱与起运时间仅供参考。'}
    </ConfidenceNote>}
    {featureFlags.astrology && type === 'astrology' && (!profile.birthLocation || profile.timeAccuracy !== 'exact_minute') && <ConfidenceNote>
      {!profile.birthLocation
        ? '出生地点尚未选择，请先编辑出生信息。'
        : '出生时间未知或不够精确，无法显示上升、天顶和宫位。'}
    </ConfidenceNote>}
  </>
}

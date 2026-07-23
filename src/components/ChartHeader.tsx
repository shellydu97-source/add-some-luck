import { Link, useNavigate } from 'react-router-dom'
import type { Profile } from '../models/types'
import { featureFlags } from '../config/features'
import { useAppStore } from '../storage/store'
import TopBar from './TopBar'
import { ConfidenceNote, Segmented } from './UI'

export default function ChartHeader({ profile, type }: { profile: Profile; type: 'bazi' | 'astrology' }) {
  const navigate = useNavigate()
  const profiles = useAppStore((state) => state.profiles)
  const setActiveProfile = useAppStore((state) => state.setActiveProfile)
  function switchPerson(id: string) { setActiveProfile(id); navigate(`/charts/${id}/${type}`) }
  return <>
    <TopBar title="命盘" eyebrow={profile.name} action={<div className="top-actions-inline"><label className="person-switcher compact"><select aria-label="切换人物" value={profile.id} onChange={(event) => switchPerson(event.target.value)}>{profiles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><span>⌄</span></label><Link className="icon-button" to="/settings" aria-label="打开设置">⚙</Link></div>} />
    <div className="chart-toolbar">
      <Link to="/profiles/new">＋ 新建人物</Link>
      <Link to="/profiles">管理档案</Link>
      <Link to={`/profiles/${profile.id}/edit`}>编辑出生信息</Link>
    </div>
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

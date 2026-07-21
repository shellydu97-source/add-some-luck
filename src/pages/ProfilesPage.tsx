import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useAppStore } from '../storage/store'
import { accuracyLabels } from '../models/labels'
import { Card, EmptyState, LinkButton, SectionHeading } from '../components/UI'

export default function ProfilesPage() {
  const navigate = useNavigate()
  const profiles = useAppStore((state) => state.profiles)
  const setActiveProfile = useAppStore((state) => state.setActiveProfile)
  const setDefault = useAppStore((state) => state.setDefaultProfile)
  const remove = useAppStore((state) => state.deleteProfile)
  const [query, setQuery] = useState('')
  const filtered = profiles.filter((profile) => `${profile.name}${profile.city ?? ''}${profile.birthPlaceText}`.toLowerCase().includes(query.trim().toLowerCase()))
  function openChart(id: string, type: 'bazi' | 'astrology') { setActiveProfile(id); navigate(`/charts/${id}/${type}`) }
  function deleteProfile(id: string, name: string) { if (window.confirm(`删除“${name}”？已有记录会保留人物快照。`)) remove(id) }
  return <>
    <TopBar title="人物管理" eyebrow="人物与长期命盘" back />
    {!!profiles.length && <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索人物、城市或地点" aria-label="搜索人物" />}
    {!profiles.length ? <EmptyState title="还没有人物档案" action={<LinkButton to="/profiles/new">新建人物档案</LinkButton>}>先添加出生信息，再查看八字和星盘。</EmptyState> : <>
      <SectionHeading title={`${profiles.length} 个人物`} side={<Link className="text-link" to="/profiles/new">＋ 新建</Link>} />
      {filtered.map((profile) => <Card className={`profile-card ${profile.isDefault ? 'default' : ''}`} key={profile.id}>
        <div className="profile-header"><div>{profile.isDefault && <div className="chip-row compact-row"><span className="chip dark-chip">默认人物</span></div>}<h2>{profile.name}</h2><p className="helper">{profile.rawBirthDate} · {profile.rawBirthTime || '时间未知'} · {accuracyLabels[profile.timeAccuracy]}</p></div><Link className="icon-button" to={`/profiles/${profile.id}/edit`} aria-label={`编辑${profile.name}`}>✎</Link></div>
        <div className="button-row"><button className="button secondary" onClick={() => openChart(profile.id, 'bazi')}>八字</button><button className="button secondary" onClick={() => openChart(profile.id, 'astrology')}>星盘</button></div>
        <details><summary>更多操作</summary><div className="profile-actions">{!profile.isDefault && <button onClick={() => setDefault(profile.id)}>设为默认人物</button>}<Link to={`/profiles/${profile.id}/edit`}>编辑档案</Link><button className="danger-text" onClick={() => deleteProfile(profile.id, profile.name)}>删除</button></div></details>
      </Card>)}
      {!filtered.length && <EmptyState title="没有匹配的人物">换个名字、城市或地点试试。</EmptyState>}
      <LinkButton to="/profiles/new">＋ 新建人物档案</LinkButton>
    </>}
  </>
}

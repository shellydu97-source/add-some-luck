import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { calculateBazi, type BaziCalculationResult } from '../calculation/bazi'
import TopBar from '../components/TopBar'
import { Card, EmptyState, LinkButton } from '../components/UI'
import type { Profile } from '../models/types'
import { useAppStore } from '../storage/store'

const PILLARS = ['year', 'month', 'day', 'time'] as const

function chartSummary(result: BaziCalculationResult, now: Date) {
  if (!result.ok) return { pillars: '出生信息需要核对', luck: '' }
  const pillars = PILLARS.map((key) => {
    const pillar = result.pillars[key]
    return pillar.status === 'available' ? pillar.ganZhi : key === 'time' ? '时柱未知' : '待定'
  }).join(' · ')
  const point = now.getTime()
  const cycles = result.luck?.cycles ?? []
  const start = (value: string) => new Date(`${value.replace(' ', 'T')}+08:00`).getTime()
  const current = cycles.find((cycle, index) => point >= start(cycle.startSolarDateTime) && (!cycles[index + 1] || point < start(cycles[index + 1].startSolarDateTime)))
  return { pillars, luck: current ? `当前大运 ${current.ganZhi}（${current.startYear}—${current.endYear}）` : cycles.length ? '尚未起运' : '' }
}

// 「命理」 starts from the people; managing a person happens on their card instead of inside the chart.
export default function ChartLandingPage() {
  const navigate = useNavigate()
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  const profiles = useAppStore((state) => state.profiles)
  const setActiveProfile = useAppStore((state) => state.setActiveProfile)
  const setDefaultProfile = useAppStore((state) => state.setDefaultProfile)
  const deleteProfile = useAppStore((state) => state.deleteProfile)
  const ordered = useMemo(() => [...profiles].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)), [profiles])
  const summaries = useMemo(() => {
    const now = new Date()
    return new Map(profiles.map((profile) => [profile.id, chartSummary(calculateBazi(profile), now)]))
  }, [profiles])

  if (!hasHydrated) return <div className="route-loading">正在读取本地档案…</div>

  function open(profile: Profile) {
    setActiveProfile(profile.id)
    navigate(`/charts/${profile.id}/bazi`)
  }

  function remove(profile: Profile) {
    if (window.confirm(`删除“${profile.name}”？已有记录会保留当时的人物信息。`)) deleteProfile(profile.id)
  }

  return <>
    <TopBar title="命理" eyebrow="人物与命盘" />
    {!ordered.length
      ? <EmptyState title="还没有人物档案" action={<LinkButton to="/profiles/new">新建人物</LinkButton>}>添加出生信息后，就能查看八字命盘和运势。</EmptyState>
      : <div className="person-list">
        {ordered.map((profile) => {
          const summary = summaries.get(profile.id)
          return <Card className={`person-card ${profile.isDefault ? 'default' : ''}`} key={profile.id}>
            <button type="button" className="person-card-main" onClick={() => open(profile)} aria-label={`查看${profile.name}的命盘`}>
              <span className="person-card-name"><b>{profile.name}</b>{profile.isDefault && <span className="chip dark-chip">默认</span>}</span>
              <span className="person-card-pillars">{summary?.pillars}</span>
              {summary?.luck && <small>{summary.luck}</small>}
              <i aria-hidden="true">›</i>
            </button>
            <details className="person-card-menu">
              <summary aria-label={`管理${profile.name}`}>⋯</summary>
              <div className="profile-actions">
                <Link to={`/profiles/${profile.id}/edit`}>编辑出生信息</Link>
                {!profile.isDefault && <button type="button" onClick={() => setDefaultProfile(profile.id)}>设为默认</button>}
                <button type="button" className="danger-text" onClick={() => remove(profile)}>删除</button>
              </div>
            </details>
          </Card>
        })}
        <LinkButton to="/profiles/new" secondary>＋ 新建人物</LinkButton>
        <p className="fine-print">默认人物是每次打开应用时先显示的人。</p>
      </div>}
  </>
}

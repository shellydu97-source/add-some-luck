import { useAppStore } from '../storage/store'

export default function PersonSwitcher({ compact = false }: { compact?: boolean }) {
  const profiles = useAppStore((state) => state.profiles)
  const activeProfileId = useAppStore((state) => state.activeProfileId)
  const setActiveProfile = useAppStore((state) => state.setActiveProfile)
  if (!profiles.length) return <span className="chip muted-chip">暂无人物</span>
  return (
    <label className={`person-switcher ${compact ? 'compact' : ''}`}>
      <span className="sr-only">切换当前人物</span>
      <select value={activeProfileId} onChange={(event) => setActiveProfile(event.target.value)}>
        {profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}
      </select>
      <span aria-hidden="true">⌄</span>
    </label>
  )
}

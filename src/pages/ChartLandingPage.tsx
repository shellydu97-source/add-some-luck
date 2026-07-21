import { Navigate } from 'react-router-dom'
import { getActiveProfile, useAppStore } from '../storage/store'

export default function ChartLandingPage() {
  const store = useAppStore()
  if (!store.hasHydrated) return <div className="route-loading">正在读取本地档案…</div>
  const profile = getActiveProfile(store)
  if (!profile) return <Navigate to="/welcome" replace />
  return <Navigate to={`/charts/${profile.id}/bazi`} replace />
}

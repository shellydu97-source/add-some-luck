import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from '../storage/store'
import type { PrimaryNav } from '../models/types'

const navItems = [
  { id: 'charts' as const, to: '/charts', label: '命盘', icon: '◎' },
  { id: 'divination' as const, to: '/divination', label: '起卦', icon: '◇' },
  { id: 'records' as const, to: '/records', label: '记录', icon: '▤' },
]

export default function AppShell() {
  const location = useLocation()
  const notice = useAppStore((state) => state.notice)
  const setNotice = useAppStore((state) => state.setNotice)
  const setLastPrimaryRoute = useAppStore((state) => state.setLastPrimaryRoute)
  const storageRecovery = useAppStore((state) => state.storageRecovery)
  const dismissRecovery = useAppStore((state) => state.dismissStorageRecovery)
  const reduceMotion = useAppStore((state) => state.reduceMotion)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    let primary: PrimaryNav | undefined
    if (location.pathname.startsWith('/charts') || location.pathname.startsWith('/profiles')) primary = 'charts'
    else if (location.pathname.startsWith('/divination')) primary = 'divination'
    else if (location.pathname.startsWith('/records')) primary = 'records'
    if (primary) setLastPrimaryRoute(primary)
  }, [location.pathname, setLastPrimaryRoute])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])

  return (
    <div className={`app-shell ${reduceMotion ? 'reduce-motion' : ''}`}>
      {storageRecovery && <div className="storage-warning" role="alert"><p>{storageRecovery.message}</p><NavLink to="/settings">处理数据</NavLink><button onClick={dismissRecovery}>稍后处理</button></div>}
      <main className="page-container"><Outlet /></main>
      <nav className="bottom-nav" aria-label="一级导航">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => {
            const profileRoute = item.id === 'charts' && location.pathname.startsWith('/profiles')
            return isActive || profileRoute ? 'active' : ''
          }}>
            <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useAppStore } from '../storage/store'

const SPLASH_VISIBLE_MS = 300
const SPLASH_EXIT_MS = 200

type SplashPhase = 'visible' | 'leaving' | 'hidden'

export default function StartupSplash() {
  const reduceMotion = useAppStore(s => s.reduceMotion)
  const [phase, setPhase] = useState<SplashPhase>(() => {
    if (useAppStore.getState().reduceMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'hidden'
    try { if (sessionStorage.getItem('luck-splash-seen')) return 'hidden' } catch { /* unavailable storage */ }
    return 'visible'
  })

  const [shouldShow] = useState(() => phase !== 'hidden')
  useEffect(() => {
    if (!shouldShow) return
    try { sessionStorage.setItem('luck-splash-seen', '1') } catch { /* unavailable storage */ }
    document.body.classList.add('splash-active')
    const leaveTimer = window.setTimeout(() => setPhase('leaving'), SPLASH_VISIBLE_MS)
    const hideTimer = window.setTimeout(() => {
      setPhase('hidden')
      document.body.classList.remove('splash-active')
    }, SPLASH_VISIBLE_MS + SPLASH_EXIT_MS)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(hideTimer)
      document.body.classList.remove('splash-active')
    }
  }, [shouldShow])

  if (reduceMotion || phase === 'hidden') return null

  return <div className={`startup-splash ${phase === 'leaving' ? 'leaving' : ''}`} role="status" aria-label="加点好运正在打开">
    <div className="startup-splash-orbit" aria-hidden="true" />
    <div className="startup-splash-content">
      <picture><source srcSet="/brand-mark.webp" type="image/webp" /><img src="/brand-mark.png" alt="" aria-hidden="true" /></picture>
      <h1>加点好运</h1>
      <p>命运提供线索，人生由你作答</p>
    </div>
  </div>
}

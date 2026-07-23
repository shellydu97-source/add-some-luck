import { useEffect, useState } from 'react'

const SPLASH_VISIBLE_MS = 900
const SPLASH_EXIT_MS = 220

type SplashPhase = 'visible' | 'leaving' | 'hidden'

export default function StartupSplash() {
  const [phase, setPhase] = useState<SplashPhase>('visible')

  useEffect(() => {
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
  }, [])

  if (phase === 'hidden') return null

  return <div className={`startup-splash ${phase === 'leaving' ? 'leaving' : ''}`} role="status" aria-label="加点好运正在打开">
    <div className="startup-splash-orbit" aria-hidden="true" />
    <div className="startup-splash-content">
      <img src="/brand-mark.png" alt="" aria-hidden="true" />
      <h1>加点好运</h1>
      <p>命运提供线索，人生由你作答</p>
      <span className="startup-splash-progress" aria-hidden="true"><i /></span>
    </div>
  </div>
}

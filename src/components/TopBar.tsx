import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface Props { title: string; eyebrow?: string; back?: boolean; action?: ReactNode; onBack?: () => void }

export default function TopBar({ title, eyebrow, back, action, onBack }: Props) {
  const navigate = useNavigate()
  return (
    <header className="top-bar">
      <div className="top-bar-leading">
        {back && <button className="icon-button" onClick={() => onBack ? onBack() : navigate(-1)} aria-label="返回">←</button>}
        <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1></div>
      </div>
      <div className="top-bar-actions">{action ?? <Link className="icon-button" to="/settings" aria-label="设置">⚙</Link>}</div>
    </header>
  )
}

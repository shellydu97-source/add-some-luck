import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`card ${className}`} {...props}>{children}</section>
}

export function DemoBadge({ label = '演示数据' }: { label?: string }) {
  return <span className="demo-badge">{label}</span>
}

export function ConfidenceNote({ children }: { children: ReactNode }) {
  return <div className="confidence-note"><span aria-hidden="true">!</span><div>{children}</div></div>
}

interface SegmentedProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  label: string
  scrollable?: boolean
}

export function Segmented<T extends string>({ value, options, onChange, label, scrollable = false }: SegmentedProps<T>) {
  return <div className={`segmented ${scrollable ? 'scrollable' : ''}`} role="group" aria-label={label}>{options.map((item) => (
    <button key={item.value} className={value === item.value ? 'active' : ''} onClick={() => onChange(item.value)}>{item.label}</button>
  ))}</div>
}

export function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props}>{children}</button>
}

export function LinkButton({ to, children, secondary = false }: { to: string; children: ReactNode; secondary?: boolean }) {
  return <Link className={`button ${secondary ? 'secondary' : ''}`} to={to}>{children}</Link>
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-mark">○</div><h2>{title}</h2><p>{children}</p>{action}</div>
}

export function SectionHeading({ title, side }: { title: string; side?: ReactNode }) {
  return <div className="section-heading"><h2>{title}</h2>{side}</div>
}

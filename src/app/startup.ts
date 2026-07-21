import type { PrimaryNav } from '../models/types'

export function resolveStartupPath(profileCount: number, lastPrimaryNav: PrimaryNav) {
  if (profileCount === 0) return '/welcome'
  if (lastPrimaryNav === 'fortune') return '/charts'
  return `/${lastPrimaryNav}`
}

import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type CloudSyncStatus = 'disabled' | 'signed-out' | 'checking' | 'waiting' | 'syncing' | 'synced' | 'conflict' | 'error'

export interface CloudAccountValue {
  configured: boolean
  session: Session | null
  authLoading: boolean
  cloudDataReady: boolean
  syncStatus: CloudSyncStatus
  syncMessage: string
  lastSyncedAt?: string
  conflictSummary?: { local: { profiles: number; records: number; updatedAt: string }; cloud: { profiles: number; records: number; updatedAt: string } }
  clearLocalData: (deleteCloud?: boolean) => Promise<void>
  hasConflict: boolean
  passwordRecovery: boolean
  signUp: (email: string, password: string) => Promise<'signed-in' | 'check-email'>
  verifySignUpCode: (email: string, token: string) => Promise<void>
  resendSignUpCode: (email: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  verifyPasswordResetCode: (email: string, token: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  deleteAccount: () => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  keepCloudData: () => Promise<void>
  keepLocalData: () => Promise<void>
  mergeBoth: () => Promise<void>
}

export const CloudAccountContext = createContext<CloudAccountValue | undefined>(undefined)

export function useCloudAccount() {
  const context = useContext(CloudAccountContext)
  if (!context) throw new Error('useCloudAccount must be used within CloudAccountProvider')
  return context
}

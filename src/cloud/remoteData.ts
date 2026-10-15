import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDataState } from '../models/types'
import { migrateToV13 } from '../storage/migrations'
import { createEmptyAppData } from '../storage/appData'
import { hashAppData, pickSyncData } from './syncCore'
import { adoptDraftResults } from '../utils/divinationRecords'

export interface RemoteSnapshot { payload: AppDataState; dataHash: string; updatedAt: string; version: number }
export async function readRemote(client: SupabaseClient, userId: string): Promise<RemoteSnapshot | undefined> {
  const { data, error } = await client.from('user_app_data').select('payload,data_hash,updated_at,version').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return undefined
  const stored = migrateToV13({ ...createEmptyAppData(), ...data.payload })
  // Finished results that older versions left in synced drafts become records before drafts are dropped.
  // The hash stays that of the stored data, so adopted records count as a change and get uploaded.
  return { payload: adoptDraftResults(stored), dataHash: hashAppData(stored), updatedAt: String(data.updated_at), version: Number(data.version) }
}
export async function writeRemote(client: SupabaseClient, payload: AppDataState, expectedVersion: number): Promise<RemoteSnapshot> {
  const dataHash = hashAppData(payload)
  const { data, error } = await client.rpc('save_user_app_data', { p_payload: pickSyncData(payload), p_data_hash: dataHash, p_expected_version: expectedVersion })
  if (error) throw error
  return { payload, dataHash, updatedAt: new Date().toISOString(), version: Number(data) }
}
export function isVersionConflict(error: unknown) {
  return !!error && typeof error === 'object' && 'message' in error && String(error.message).includes('version_conflict')
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDataState } from '../models/types'
import { migrateToV13 } from '../storage/migrations'
import { createEmptyAppData } from '../storage/appData'
import { hashAppData, pickSyncData } from './syncCore'
import { adoptDraftResults, isLiuyaoComplete, isMeihuaComplete, isTarotComplete } from '../utils/divinationRecords'

export interface RemoteSnapshot { payload: AppDataState; dataHash: string; updatedAt: string; version: number; requiresDraftMigration?: boolean }
export async function readRemote(client: SupabaseClient, userId: string): Promise<RemoteSnapshot | undefined> {
  const { data, error } = await client.from('user_app_data').select('payload,data_hash,updated_at,version').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return undefined
  const stored = migrateToV13({ ...createEmptyAppData(), ...data.payload })
  const payload = adoptDraftResults(stored)
  // A failed conversion must never be followed by an upload that silently drops its source.
  if (payload.drafts.some((draft) => !draft.state.recordId && (
    draft.type === 'liuyao' ? isLiuyaoComplete(draft) : draft.type === 'meihua' ? isMeihuaComplete(draft) : draft.type === 'tarot' && isTarotComplete(draft)
  ))) throw new Error('旧版结果尚未完成迁移，云端原数据已保留。')
  const dataHash = hashAppData(payload)
  return { payload, dataHash, updatedAt: String(data.updated_at), version: Number(data.version), requiresDraftMigration: dataHash !== hashAppData(stored) }
}
export async function writeRemote(client: SupabaseClient, payload: AppDataState, expectedVersion: number, accessToken?: string): Promise<RemoteSnapshot> {
  const dataHash = hashAppData(payload)
  const request = client.rpc('save_user_app_data', { p_payload: pickSyncData(payload), p_data_hash: dataHash, p_expected_version: expectedVersion })
  // Do not let a shared client's newly signed-in account authenticate an older upload.
  if (accessToken) request.setHeader('Authorization', `Bearer ${accessToken}`)
  const { data, error } = await request
  if (error) throw error
  return { payload, dataHash, updatedAt: new Date().toISOString(), version: Number(data) }
}
export function isVersionConflict(error: unknown) {
  return !!error && typeof error === 'object' && 'message' in error && String(error.message).includes('version_conflict')
}

import type { AppDataState, DivinationDraft, Profile, RecordSnapshot } from '../models/types'
import { hasUserData } from '../storage/appData'

export interface CloudSyncMeta {
  userId: string
  lastSyncedHash: string
  lastSyncedAt: string
  dirty: boolean
}

export type InitialSyncDecision = 'upload' | 'download' | 'noop' | 'conflict'

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

export function hashAppData(data: AppDataState) {
  const text = stableSerialize(data)
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function decideInitialSync(input: {
  userId: string
  local: AppDataState
  localHash: string
  remoteHash?: string
  meta?: CloudSyncMeta
}): InitialSyncDecision {
  const { userId, local, localHash, remoteHash, meta } = input
  if (!remoteHash) return 'upload'
  if (remoteHash === localHash) return 'noop'

  if (meta?.userId === userId && meta.lastSyncedHash) {
    if (remoteHash === meta.lastSyncedHash && localHash !== meta.lastSyncedHash) return 'upload'
    if (localHash === meta.lastSyncedHash && remoteHash !== meta.lastSyncedHash) return 'download'
    return 'conflict'
  }

  return hasUserData(local) ? 'conflict' : 'download'
}

function latestByUpdatedAt<T extends { id: string; updatedAt: string }>(left: T | undefined, right: T) {
  if (!left) return right
  return new Date(right.updatedAt).getTime() >= new Date(left.updatedAt).getTime() ? right : left
}

function mergeProfiles(local: Profile[], remote: Profile[]) {
  const merged = new Map<string, Profile>()
  for (const profile of remote) merged.set(profile.id, profile)
  for (const profile of local) merged.set(profile.id, latestByUpdatedAt(merged.get(profile.id), profile))
  return [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

function mergeRecords(local: RecordSnapshot[], remote: RecordSnapshot[]) {
  const merged = new Map(remote.map((record) => [record.id, record]))
  for (const record of local) merged.set(record.id, record)
  return [...merged.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function mergeDrafts(local: DivinationDraft[], remote: DivinationDraft[]) {
  const merged = new Map<string, DivinationDraft>()
  for (const draft of remote) merged.set(draft.id, draft)
  for (const draft of local) merged.set(draft.id, latestByUpdatedAt(merged.get(draft.id), draft))
  return [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export function mergeAppData(local: AppDataState, remote: AppDataState): AppDataState {
  const profiles = mergeProfiles(local.profiles, remote.profiles)
  const activeProfileId = profiles.some((profile) => profile.id === local.activeProfileId)
    ? local.activeProfileId
    : profiles.some((profile) => profile.id === remote.activeProfileId)
      ? remote.activeProfileId
      : profiles[0]?.id ?? ''

  return {
    schemaVersion: '1.2',
    lastPrimaryRoute: local.lastPrimaryRoute,
    reduceMotion: local.reduceMotion,
    activeProfileId,
    profiles,
    records: mergeRecords(local.records, remote.records),
    drafts: mergeDrafts(local.drafts, remote.drafts),
  }
}

import type { AppDataState, Profile, RecordSnapshot, Tombstones } from '../models/types'

export type SyncBaseline = Record<'profiles' | 'records' | 'drafts', Record<string, Record<string, string>>>
export interface CloudSyncMeta {
  userId: string
  lastSyncedHash: string
  lastSyncedAt: string
  lastSyncedVersion?: number
  baseline?: SyncBaseline
  dirty: boolean
}
export type InitialSyncDecision = 'initialize' | 'upload' | 'download' | 'noop' | 'merge'
function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}
export function pickSyncData(data: AppDataState) {
  return { schemaVersion: data.schemaVersion, profiles: data.profiles, records: data.records, drafts: data.drafts, tombstones: data.tombstones ?? { profiles: {}, records: {}, drafts: {} } }
}
function hash(value: unknown) {
  let result = 0x811c9dc5
  const text = stableSerialize(value)
  for (let i = 0; i < text.length; i++) result = Math.imul(result ^ text.charCodeAt(i), 0x01000193)
  return (result >>> 0).toString(16).padStart(8, '0')
}
export function hashAppData(data: AppDataState) { return hash(pickSyncData(data)) }
export function decideInitialSync(input: { userId: string; local: AppDataState; localHash: string; remoteHash?: string; meta?: CloudSyncMeta; localOwnerId?: string }): InitialSyncDecision {
  const { userId, localHash, remoteHash, meta, localOwnerId } = input
  if (localOwnerId !== userId) return remoteHash ? 'download' : 'initialize'
  if (!remoteHash) return 'upload'
  if (remoteHash === localHash) return 'noop'
  if (meta?.userId === userId && meta.lastSyncedHash) {
    if (remoteHash === meta.lastSyncedHash) return 'upload'
    if (localHash === meta.lastSyncedHash && !meta.dirty) return 'download'
    return 'merge'
  }
  return meta?.dirty ? 'merge' : 'download'
}
const recordFields = ['questionAddedLater', 'liuyaoUseGodOverride', 'verificationStatus', 'verificationDate', 'verificationResult', 'verificationNote', 'notes'] as const
function mutableFields(kind: keyof SyncBaseline, item: object) {
  if (kind === 'records') return recordFields
  return Object.keys(item).filter((key) => !['id', 'createdAt', 'updatedAt'].includes(key))
}
export function createSyncBaseline(data: AppDataState): SyncBaseline {
  return Object.fromEntries((['profiles', 'records', 'drafts'] as const).map((kind) => [kind, Object.fromEntries(data[kind].map((item) => [item.id, Object.fromEntries(mutableFields(kind, item).map((key) => [key, hash((item as unknown as Record<string, unknown>)[key])]))]))])) as SyncBaseline
}
export function findSyncConflicts(local: AppDataState, remote: AppDataState, baseline?: SyncBaseline) {
  const conflicts: string[] = []
  for (const kind of ['profiles', 'records', 'drafts'] as const) {
    for (const item of local[kind]) {
      const other = remote[kind].find((r) => r.id === item.id)
      if (!other) continue
      const left = item as unknown as Record<string, unknown>, right = other as unknown as Record<string, unknown>
      const keys = new Set([...mutableFields(kind, item), ...mutableFields(kind, other)])
      for (const key of keys) {
        const l = hash(left[key]), r = hash(right[key]), base = baseline?.[kind][item.id]?.[key]
        if (l !== r && (!base || (l !== base && r !== base))) { conflicts.push(`${kind}:${item.id}:${key}`); break }
      }
    }
  }
  return conflicts
}
export function pruneTombstones(tombstones: Tombstones, now = Date.now()): Tombstones {
  const cutoff = now - 180 * 86400_000
  return Object.fromEntries(Object.entries(tombstones).map(([kind, entries]) => [kind, Object.fromEntries(Object.entries(entries as Record<string, string>).filter(([, date]) => Date.parse(date) >= cutoff))])) as unknown as Tombstones
}
function mergeTombstones(local: Tombstones, remote: Tombstones): Tombstones {
  const result: Tombstones = { profiles: {}, records: {}, drafts: {} }
  for (const kind of ['profiles', 'records', 'drafts'] as const) for (const [id, date] of [...Object.entries(local[kind]), ...Object.entries(remote[kind])]) if (!result[kind][id] || date > result[kind][id]) result[kind][id] = date
  return result
}
function union<T extends { id: string; createdAt?: string }>(local: T[] = [], remote: T[] = []) {
  return [...new Map([...remote, ...local].map((x) => [x.id, x])).values()].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id))
}
function mergeRecord(local: RecordSnapshot, remote: RecordSnapshot, baseline?: Record<string, string>): RecordSnapshot {
  // The local original snapshot is never overwritten by mutable cloud fields.
  const newer = (local.metaUpdatedAt ?? local.createdAt) > (remote.metaUpdatedAt ?? remote.createdAt) ? local : remote
  const merged = { ...local, metaUpdatedAt: newer.metaUpdatedAt }
  for (const key of recordFields) {
    const leftChanged = baseline && hash(local[key]) !== baseline[key]
    const rightChanged = baseline && hash(remote[key]) !== baseline[key]
    const source = leftChanged && !rightChanged ? local : rightChanged && !leftChanged ? remote : newer
    Object.assign(merged, { [key]: source[key] })
  }
  return { ...merged, followUpMessages: union(local.followUpMessages, remote.followUpMessages), aiInterpretations: union(local.aiInterpretations, remote.aiInterpretations), aiMessages: union(local.aiMessages, remote.aiMessages) }
}
export function mergeAppData(local: AppDataState, remote: AppDataState, baseline?: SyncBaseline): AppDataState {
  const tombstones = mergeTombstones(local.tombstones ?? { profiles: {}, records: {}, drafts: {} }, remote.tombstones ?? { profiles: {}, records: {}, drafts: {} })
  const alive = (kind: keyof Tombstones, item: { id: string; createdAt: string; updatedAt?: string }) => !tombstones[kind][item.id] || tombstones[kind][item.id] < (item.updatedAt ?? item.createdAt)
  const latest = <T extends { id: string; updatedAt: string }>(left: T[], right: T[]) => {
    const items = new Map(right.map((x) => [x.id, x]))
    for (const item of left) { const old = items.get(item.id); if (!old || item.updatedAt >= old.updatedAt) items.set(item.id, item) }
    return [...items.values()]
  }
  let profiles = latest(local.profiles, remote.profiles).filter((x) => alive('profiles', x)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  // Exactly one default survives a merge; normalize only this mutable flag.
  const defaultId = profiles.find((x) => x.isDefault)?.id ?? profiles[0]?.id
  profiles = profiles.map((x): Profile => ({ ...x, isDefault: x.id === defaultId }))
  const records = new Map(remote.records.map((x) => [x.id, x]))
  for (const item of local.records) { const old = records.get(item.id); records.set(item.id, old ? mergeRecord(item, old, baseline?.records[item.id]) : item) }
  return { ...local, schemaVersion: '1.3', tombstones: pruneTombstones(tombstones), profiles, records: [...records.values()].filter((x) => alive('records', x)).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)), drafts: latest(local.drafts, remote.drafts).filter((x) => alive('drafts', x)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)), activeProfileId: profiles.some((x) => x.id === local.activeProfileId) ? local.activeProfileId : defaultId ?? '' }
}

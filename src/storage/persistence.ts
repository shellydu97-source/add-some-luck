import type { StateStorage } from 'zustand/middleware'

export interface StorageRecoveryInfo {
  kind: 'corrupt' | 'migration'
  message: string
  backupKey: string
  raw: string
}

let recoveryInfo: StorageRecoveryInfo | undefined
const blockedNames = new Set<string>()
const migrationBackups = new Set<string>()

function saveBackup(name: string, raw: string, label: string) {
  const backupKey = `${name}-${label}-${Date.now()}`
  window.localStorage.setItem(backupKey, raw)
  return backupKey
}

export const safeLocalStorage: StateStorage = {
  getItem(name) {
    const raw = window.localStorage.getItem(name)
    if (raw === null) return null
    try {
      const parsed = JSON.parse(raw) as { version?: number }
      if ((parsed.version ?? 0) < 3 && !migrationBackups.has(name)) {
        saveBackup(name, raw, 'pre-v1-2-backup')
        migrationBackups.add(name)
      }
      return raw
    } catch {
      let backupKey = ''
      try { backupKey = saveBackup(name, raw, 'corrupt-backup') } catch { backupKey = '' }
      blockedNames.add(name)
      recoveryInfo = {
        kind: 'corrupt', raw, backupKey,
        message: backupKey
          ? `数据读取失败，原始内容已保留在 ${backupKey}。当前数据不会覆盖它。`
          : '数据读取失败，浏览器也无法创建额外备份；当前数据不会覆盖原始内容。',
      }
      return null
    }
  },
  setItem(name, value) {
    if (blockedNames.has(name)) return
    window.localStorage.setItem(name, value)
  },
  removeItem(name) {
    if (blockedNames.has(name)) throw new Error('本地数据处于保护状态，请先明确重置。')
    window.localStorage.removeItem(name)
  },
}

export function protectStorageAfterMigrationFailure(name: string, message: string) {
  const raw = window.localStorage.getItem(name) ?? ''
  let backupKey = ''
  try { if (raw) backupKey = saveBackup(name, raw, 'migration-failed-backup') } catch { backupKey = '' }
  blockedNames.add(name)
  recoveryInfo = { kind: 'migration', raw, backupKey, message }
}

export function getStorageRecoveryInfo() {
  return recoveryInfo
}

export function resetProtectedStorage(name: string) {
  blockedNames.delete(name)
  recoveryInfo = undefined
  window.localStorage.removeItem(name)
}

export function isStorageProtected(name: string) {
  return blockedNames.has(name)
}

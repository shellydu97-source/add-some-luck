import type { AppDataState } from '../models/types'
import { migrateToV12 } from './migrations'

export interface ExportEnvelope {
  schemaVersion: '1.2'
  exportedAt: string
  state: AppDataState
}

export function createExportEnvelope(state: AppDataState): ExportEnvelope {
  return { schemaVersion: '1.2', exportedAt: new Date().toISOString(), state: structuredClone(state) }
}

export function serializeExport(state: AppDataState) {
  return JSON.stringify(createExportEnvelope(state), null, 2)
}

export function parseImport(text: string): AppDataState {
  const parsed = JSON.parse(text) as { state?: unknown } | unknown
  const candidate = parsed && typeof parsed === 'object' && 'state' in parsed ? (parsed as { state: unknown }).state : parsed
  return migrateToV12(candidate)
}

export function downloadText(text: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

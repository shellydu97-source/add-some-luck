import type { RecordType } from '../models/types'

export const featureFlags = {
  astrology: false,
} as const

export function isRecordTypeVisible(type: RecordType) {
  return featureFlags.astrology || type !== 'astrology'
}

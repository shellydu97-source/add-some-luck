import type { DivinationDraft } from '../models/types'

export function getRequestedDraft<T extends DivinationDraft>(draft: T | undefined, resumeDraftId?: string) {
  if (!draft || draft.state.recordId || !resumeDraftId || draft.id !== resumeDraftId) return undefined
  return draft
}

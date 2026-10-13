import type { DivinationDraft } from '../models/types'

export function draftPath(draft: DivinationDraft) {
  if (draft.type === 'liuyao') {
    const state = draft.state
    if (state?.casts.length === 6) return state.locked ? '/divination/liuyao/result' : '/divination/liuyao/confirm'
    return state?.method ? '/divination/liuyao/cast' : '/divination/liuyao/question'
  }
  if (draft.type === 'meihua') {
    if (draft.state.locked) return '/divination/meihua/result'
    return draft.state.method ? '/divination/meihua/cast' : '/divination/meihua/question'
  }
  if (draft.type === 'bazi' || draft.type === 'astrology') return `/charts/${draft.profileId}/${draft.type}`
  const state = draft.state
  if (!state?.spread) return '/divination/tarot/spread'
  if (!state.drawMode) return '/divination/tarot/method'
  if (state.revealed) return '/divination/tarot/result'
  return '/divination/tarot/draw'
}


import type { TarotOrientation, TarotSpread } from '../models/types'
import { tarotCards, tarotCardMap } from '../data/tarotCards'
import { createSeededRandomSource, fisherYatesShuffle, randomInteger, webCryptoRandomSource, type RandomUint32Source } from './random'

export { tarotCards }

export const spreadPositions: Record<TarotSpread, string[]> = {
  single: ['当前提示'],
  three: ['现状', '阻碍', '建议'],
  'dual-path': ['当前状态', 'A 路径发展', 'A 路径结果', 'B 路径发展', 'B 路径结果'],
}

export function createTarotSession(sourceOrTestSeed?: RandomUint32Source | string) {
  const source = typeof sourceOrTestSeed === 'string'
    ? createSeededRandomSource(sourceOrTestSeed)
    : sourceOrTestSeed ?? webCryptoRandomSource
  const deckOrder = fisherYatesShuffle(tarotCards.map((card) => card.id), source)
  const orientations = Object.fromEntries(deckOrder.map((cardId) => [
    cardId,
    randomInteger(2, source) === 0 ? 'upright' : 'reversed',
  ])) as Record<string, TarotOrientation>
  return { deckOrder, orientations }
}

export function getTarotCard(cardId: string) {
  return tarotCardMap.get(cardId)
}

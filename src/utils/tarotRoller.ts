export const RITUAL_VISIBLE_CARD_COUNT = 9
const CENTER_INDEX = Math.floor(RITUAL_VISIBLE_CARD_COUNT / 2)

export function getRitualLane(cards: string[], cursor: number) {
  if (!cards.length) return []
  return Array.from({ length: RITUAL_VISIBLE_CARD_COUNT }, (_, index) => {
    const offset = index - CENTER_INDEX
    return cards[(cursor + offset + cards.length * 2) % cards.length]
  })
}

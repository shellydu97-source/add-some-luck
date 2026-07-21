import type { TarotCard } from '../models/types'

const major = [
  ['愚者', 'The Fool'], ['魔术师', 'The Magician'], ['女祭司', 'The High Priestess'], ['皇后', 'The Empress'],
  ['皇帝', 'The Emperor'], ['教皇', 'The Hierophant'], ['恋人', 'The Lovers'], ['战车', 'The Chariot'],
  ['力量', 'Strength'], ['隐者', 'The Hermit'], ['命运之轮', 'Wheel of Fortune'], ['正义', 'Justice'],
  ['倒吊人', 'The Hanged Man'], ['死神', 'Death'], ['节制', 'Temperance'], ['恶魔', 'The Devil'],
  ['高塔', 'The Tower'], ['星星', 'The Star'], ['月亮', 'The Moon'], ['太阳', 'The Sun'],
  ['审判', 'Judgement'], ['世界', 'The World'],
] as const

const suits = [
  { id: 'wands', zh: '权杖', en: 'Wands' },
  { id: 'cups', zh: '圣杯', en: 'Cups' },
  { id: 'swords', zh: '宝剑', en: 'Swords' },
  { id: 'pentacles', zh: '星币', en: 'Pentacles' },
] as const

const ranks = [
  { id: 'ace', zh: '首牌', en: 'Ace' },
  { id: 'two', zh: '二', en: 'Two' },
  { id: 'three', zh: '三', en: 'Three' },
  { id: 'four', zh: '四', en: 'Four' },
  { id: 'five', zh: '五', en: 'Five' },
  { id: 'six', zh: '六', en: 'Six' },
  { id: 'seven', zh: '七', en: 'Seven' },
  { id: 'eight', zh: '八', en: 'Eight' },
  { id: 'nine', zh: '九', en: 'Nine' },
  { id: 'ten', zh: '十', en: 'Ten' },
  { id: 'page', zh: '侍从', en: 'Page' },
  { id: 'knight', zh: '骑士', en: 'Knight' },
  { id: 'queen', zh: '王后', en: 'Queen' },
  { id: 'king', zh: '国王', en: 'King' },
] as const

export const tarotCards: TarotCard[] = [
  ...major.map(([nameZh, nameEn], order) => ({
    id: `major-${String(order).padStart(2, '0')}`,
    order,
    arcana: 'major' as const,
    rank: String(order),
    nameZh,
    nameEn,
  })),
  ...suits.flatMap((suit, suitIndex) => ranks.map((rank, rankIndex) => ({
    id: `${suit.id}-${rank.id}`,
    order: 22 + suitIndex * ranks.length + rankIndex,
    arcana: 'minor' as const,
    suit: suit.id,
    rank: rank.id,
    nameZh: `${suit.zh}${rank.zh}`,
    nameEn: `${rank.en} of ${suit.en}`,
  }))),
]

export const tarotCardMap = new Map(tarotCards.map((card) => [card.id, card]))

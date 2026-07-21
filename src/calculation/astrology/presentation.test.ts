import { describe, expect, it } from 'vitest'
import { countAstrologyBalance, emphasizedHouses, tightestAspects } from './presentation'
import type { AspectResult, PlanetPosition } from './types'

const planets = [
  { body: 'sun', sign: 'aries', house: 1 }, { body: 'moon', sign: 'leo', house: 1 },
  { body: 'mercury', sign: 'taurus', house: 2 }, { body: 'venus', sign: 'gemini', house: 3 },
] as PlanetPosition[]

describe('星盘客观阅读摘要', () => {
  it('只按十星体落座计数元素和模式', () => {
    const balance = countAstrologyBalance(planets)
    expect(balance.elements).toEqual({ 火: 2, 土: 1, 风: 1, 水: 0 })
    expect(balance.modalities).toEqual({ 开创: 1, 固定: 2, 变动: 1 })
  })

  it('按行星数量找宫位集中处，并按容许度选紧密相位', () => {
    expect(emphasizedHouses(planets)[0]).toMatchObject({ house: 1, count: 2 })
    const aspects = [
      { first: 'sun', second: 'moon', type: 'square', orbDeg: 4 },
      { first: 'venus', second: 'mars', type: 'trine', orbDeg: 0.4 },
    ] as AspectResult[]
    expect(tightestAspects(aspects, 1)[0].orbDeg).toBe(0.4)
  })
})

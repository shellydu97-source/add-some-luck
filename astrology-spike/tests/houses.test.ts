import { describe, expect, it } from 'vitest'
import { calculateAstrologySpike } from '../src/adapter.js'
import { calculatePlacidusHouses, placeInHouse, validateOppositeCusps } from '../src/houses.js'

const equalCusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320]

describe('house placement', () => {
  it('assigns an exact cusp to the following house', () => {
    expect(placeInHouse(20, equalCusps)).toBe(2)
    expect(placeInHouse(350, equalCusps)).toBe(1)
  })

  it('handles the 360-to-0 wrap without changing house order', () => {
    expect(placeInHouse(359.9, equalCusps)).toBe(1)
    expect(placeInHouse(0, equalCusps)).toBe(1)
    expect(placeInHouse(19.999, equalCusps)).toBe(1)
    expect(placeInHouse(20.001, equalCusps)).toBe(2)
  })

  it('keeps opposite Placidus cusps exactly 180 degrees apart', () => {
    const result = calculatePlacidusHouses(new Date('2000-01-01T12:00:00Z'), 31.22222, 121.45806)
    expect(result.ok).toBe(true)
    if (result.ok) expect(validateOppositeCusps(result.cusps)).toBe(true)
  })

  it('returns an explicit error and never falls back when Placidus cannot converge', () => {
    const result = calculatePlacidusHouses(new Date('2024-06-21T00:00:00Z'), 89, 116.39723)
    expect(result).toMatchObject({ ok: false, code: 'placidus_unavailable' })
  })
})

describe('unknown birth time', () => {
  it('does not generate ASC, MC, cusps, or planet houses', () => {
    const result = calculateAstrologySpike({
      utcDateTime: '2000-01-01T04:00:00.000Z',
      latitude: 31.22222,
      longitude: 121.45806,
      birthTimeKnown: false,
    })
    expect(result.ascendant).toBeUndefined()
    expect(result.midheaven).toBeUndefined()
    expect(result.houses).toBeUndefined()
    expect(result.planets.every((planet) => planet.house === undefined)).toBe(true)
  })
})

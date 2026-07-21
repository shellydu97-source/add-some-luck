import { describe, expect, it } from 'vitest'
import { ASPECT_RULES, calculateMajorAspects } from '../src/aspects.js'
import type { AstrologyBody, MajorAspect } from '../src/types.js'

const cases: Array<{ type: MajorAspect; angle: number; orb: number }> = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'sextile', angle: 60, orb: 4 },
  { type: 'square', angle: 90, orb: 6 },
  { type: 'trine', angle: 120, orb: 6 },
  { type: 'opposition', angle: 180, orb: 8 },
]

describe('major aspect rules', () => {
  it('locks the five requested aspect angles and orbs', () => {
    expect(ASPECT_RULES.map(({ type, angle, maxOrb }) => ({ type, angle, orb: maxOrb }))).toEqual(cases)
  })

  for (const testCase of cases) {
    it(`includes ${testCase.type} at its orb boundary and excludes it just outside`, () => {
      const makePlanets = (separation: number) => [
        { body: 'sun' as AstrologyBody, longitudeDeg: 0 },
        { body: 'moon' as AstrologyBody, longitudeDeg: separation },
      ]
      expect(calculateMajorAspects(makePlanets(testCase.angle + testCase.orb))).toHaveLength(1)
      expect(calculateMajorAspects(makePlanets(testCase.angle + testCase.orb + 0.0001))).toHaveLength(0)
    })
  }
})

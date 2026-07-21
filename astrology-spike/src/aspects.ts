import { angularSeparation } from './math.js'
import type { AspectResult, AstrologyBody, MajorAspect, PlanetPosition } from './types.js'

export const ASPECT_RULES: ReadonlyArray<{
  type: MajorAspect
  angle: 0 | 60 | 90 | 120 | 180
  maxOrb: number
}> = [
  { type: 'conjunction', angle: 0, maxOrb: 8 },
  { type: 'sextile', angle: 60, maxOrb: 4 },
  { type: 'square', angle: 90, maxOrb: 6 },
  { type: 'trine', angle: 120, maxOrb: 6 },
  { type: 'opposition', angle: 180, maxOrb: 8 },
]

export function calculateMajorAspects(planets: readonly Pick<PlanetPosition, 'body' | 'longitudeDeg'>[]): AspectResult[] {
  const aspects: AspectResult[] = []

  for (let firstIndex = 0; firstIndex < planets.length; firstIndex += 1) {
    const first = planets[firstIndex]
    if (!first) continue
    for (let secondIndex = firstIndex + 1; secondIndex < planets.length; secondIndex += 1) {
      const second = planets[secondIndex]
      if (!second) continue
      const separation = angularSeparation(first.longitudeDeg, second.longitudeDeg)
      const match = ASPECT_RULES
        .map((rule) => ({ rule, orb: Math.abs(separation - rule.angle) }))
        .filter(({ rule, orb }) => orb <= rule.maxOrb)
        .sort((a, b) => a.orb - b.orb)[0]
      if (!match) continue

      aspects.push({
        first: first.body as AstrologyBody,
        second: second.body as AstrologyBody,
        type: match.rule.type,
        exactAngleDeg: match.rule.angle,
        separationDeg: separation,
        orbDeg: match.orb,
        maxOrbDeg: match.rule.maxOrb,
      })
    }
  }

  return aspects
}

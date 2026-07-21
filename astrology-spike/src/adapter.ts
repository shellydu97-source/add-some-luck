import { calculateMajorAspects } from './aspects.js'
import { calculatePlacidusHouses, placeInHouse } from './houses.js'
import { calculatePlanetPositions } from './planets.js'
import type { AstrologySpikeResult, HouseCusp } from './types.js'

export interface AstrologySpikeInput {
  utcDateTime: string
  latitude: number
  longitude: number
  birthTimeKnown?: boolean
}

export function calculateAstrologySpike(input: AstrologySpikeInput): AstrologySpikeResult {
  const date = new Date(input.utcDateTime)
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid UTC date/time.')

  const birthTimeKnown = input.birthTimeKnown !== false
  const positions = calculatePlanetPositions(date)
  const baseResult = {
    engine: 'astronomy-engine' as const,
    engineVersion: '2.1.19' as const,
    adapterVersion: 'astrology-spike-0.1.0' as const,
    ruleVersion: 'cn-v1-tropical-geocentric-true-ecliptic-placidus-1.0.0' as const,
    settings: {
      timezone: 'Asia/Shanghai' as const,
      zodiac: 'tropical' as const,
      center: 'geocentric' as const,
      ecliptic: 'true-of-date' as const,
      houseSystem: 'placidus' as const,
    },
    utcDateTime: date.toISOString(),
    birthTimeKnown,
    latitude: input.latitude,
    longitude: input.longitude,
    aspects: calculateMajorAspects(positions),
  }

  if (!birthTimeKnown) return { ...baseResult, planets: positions }

  const houses = calculatePlacidusHouses(date, input.latitude, input.longitude)
  if (!houses.ok) throw new Error(`${houses.code}: ${houses.message}`)

  const planets = calculatePlanetPositions(date).map((planet) => ({
    ...planet,
    house: placeInHouse(planet.longitudeDeg, houses.cusps),
  }))
  const houseCusps = houses.cusps.map((longitudeDeg, index) => ({
    house: (index + 1) as HouseCusp['house'],
    longitudeDeg,
  }))

  return {
    ...baseResult,
    planets,
    ascendant: { longitudeDeg: houses.ascendant },
    midheaven: { longitudeDeg: houses.midheaven },
    houses: houseCusps,
  }
}

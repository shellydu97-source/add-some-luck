import { Body, Ecliptic, GeoVector } from 'astronomy-engine'
import { signedAngleDegrees } from './math.js'
import type { AstrologyBody, PlanetPosition } from './types.js'

const BODY_MAP: ReadonlyArray<readonly [AstrologyBody, Body]> = [
  ['sun', Body.Sun],
  ['moon', Body.Moon],
  ['mercury', Body.Mercury],
  ['venus', Body.Venus],
  ['mars', Body.Mars],
  ['jupiter', Body.Jupiter],
  ['saturn', Body.Saturn],
  ['uranus', Body.Uranus],
  ['neptune', Body.Neptune],
  ['pluto', Body.Pluto],
]

const SPEED_SAMPLE_DAYS = 0.05

function trueEclipticLongitude(body: Body, date: Date) {
  return Ecliptic(GeoVector(body, date, true)).elon
}

function longitudeSpeed(body: Body, date: Date) {
  const sampleMilliseconds = SPEED_SAMPLE_DAYS * 86_400_000
  const before = trueEclipticLongitude(body, new Date(date.getTime() - sampleMilliseconds))
  const after = trueEclipticLongitude(body, new Date(date.getTime() + sampleMilliseconds))
  return signedAngleDegrees(after - before) / (2 * SPEED_SAMPLE_DAYS)
}

export function calculatePlanetPositions(date: Date): PlanetPosition[] {
  return BODY_MAP.map(([body, engineBody]) => {
    const speed = longitudeSpeed(engineBody, date)
    return {
      body,
      longitudeDeg: trueEclipticLongitude(engineBody, date),
      longitudeSpeedDegPerDay: speed,
      retrograde: speed < 0,
    }
  })
}

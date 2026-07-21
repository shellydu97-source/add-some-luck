export type AstrologyBody =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'

export type MajorAspect = 'conjunction' | 'opposition' | 'square' | 'trine' | 'sextile'

export interface PlanetPosition {
  body: AstrologyBody
  longitudeDeg: number
  longitudeSpeedDegPerDay: number
  retrograde: boolean
  house?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
}

export interface AnglePosition {
  longitudeDeg: number
}

export interface HouseCusp {
  house: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  longitudeDeg: number
}

export interface AspectResult {
  first: AstrologyBody
  second: AstrologyBody
  type: MajorAspect
  exactAngleDeg: 0 | 60 | 90 | 120 | 180
  separationDeg: number
  orbDeg: number
  maxOrbDeg: number
}

export interface AstrologySpikeResult {
  engine: 'astronomy-engine'
  engineVersion: '2.1.19'
  adapterVersion: 'astrology-spike-0.1.0'
  ruleVersion: 'cn-v1-tropical-geocentric-true-ecliptic-placidus-1.0.0'
  settings: {
    timezone: 'Asia/Shanghai'
    zodiac: 'tropical'
    center: 'geocentric'
    ecliptic: 'true-of-date'
    houseSystem: 'placidus'
  }
  utcDateTime: string
  birthTimeKnown: boolean
  latitude: number
  longitude: number
  planets: PlanetPosition[]
  ascendant?: AnglePosition
  midheaven?: AnglePosition
  houses?: HouseCusp[]
  aspects: AspectResult[]
}

export type HouseCalculationResult =
  | {
      ok: true
      ascendant: number
      midheaven: number
      armc: number
      trueObliquity: number
      cusps: [number, number, number, number, number, number, number, number, number, number, number, number]
    }
  | {
      ok: false
      code: 'placidus_unavailable'
      message: string
    }

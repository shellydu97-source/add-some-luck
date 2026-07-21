import { MakeTime, SiderealTime, e_tilt } from 'astronomy-engine'
import { acosDeg, asinDeg, atan2Deg, cosDeg, forwardArcDegrees, normalizeDegrees, sinDeg, tanDeg } from './math'
import type { HouseCalculationResult } from './types'

const MAX_ITERATIONS = 100
const CONVERGENCE_DEGREES = 1e-10

function eclipticLongitudeFromRightAscension(rightAscension: number, obliquity: number) {
  return normalizeDegrees(atan2Deg(sinDeg(rightAscension), cosDeg(rightAscension) * cosDeg(obliquity)))
}

function declinationFromEclipticLongitude(eclipticLongitude: number, obliquity: number) {
  return asinDeg(sinDeg(obliquity) * sinDeg(eclipticLongitude))
}

function placidusIntermediateCusp(armc: number, latitude: number, obliquity: number, fraction: number, side: 'east' | 'west') {
  let rightAscension = normalizeDegrees(armc + (side === 'east' ? 1 : -1) * fraction * 90)
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    const eclipticLongitude = eclipticLongitudeFromRightAscension(rightAscension, obliquity)
    const declination = declinationFromEclipticLongitude(eclipticLongitude, obliquity)
    const risingArgument = -tanDeg(latitude) * tanDeg(declination)
    if (!Number.isFinite(risingArgument) || Math.abs(risingArgument) > 1) return undefined
    const semiDiurnalArc = acosDeg(Math.max(-1, Math.min(1, risingArgument)))
    const next = normalizeDegrees(armc + (side === 'east' ? 1 : -1) * fraction * semiDiurnalArc)
    const difference = Math.abs(((next - rightAscension + 540) % 360) - 180)
    rightAscension = next
    if (difference < CONVERGENCE_DEGREES) return eclipticLongitudeFromRightAscension(rightAscension, obliquity)
  }
  return undefined
}

export function calculatePlacidusHouses(date: Date, latitude: number, longitude: number): HouseCalculationResult {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, code: 'placidus_unavailable', message: '出生地点坐标无效，无法计算 Placidus 宫位。' }
  }
  const time = MakeTime(date)
  const armc = normalizeDegrees(SiderealTime(time) * 15 + longitude)
  const trueObliquity = e_tilt(time).tobl
  const midheaven = normalizeDegrees(atan2Deg(sinDeg(armc), cosDeg(armc) * cosDeg(trueObliquity)))
  const ascendant = normalizeDegrees(atan2Deg(-cosDeg(armc), sinDeg(armc) * cosDeg(trueObliquity) + tanDeg(latitude) * sinDeg(trueObliquity)) + 180)
  const cusp11 = placidusIntermediateCusp(armc, latitude, trueObliquity, 1 / 3, 'east')
  const cusp12 = placidusIntermediateCusp(armc, latitude, trueObliquity, 2 / 3, 'east')
  const cusp9 = placidusIntermediateCusp(armc, latitude, trueObliquity, 1 / 3, 'west')
  const cusp8 = placidusIntermediateCusp(armc, latitude, trueObliquity, 2 / 3, 'west')
  if ([cusp8, cusp9, cusp11, cusp12].some((value) => value === undefined)) {
    return { ok: false, code: 'placidus_unavailable', message: '该纬度下 Placidus 宫位无法稳定计算，未切换其他宫位制。' }
  }
  const c8 = cusp8 as number; const c9 = cusp9 as number; const c11 = cusp11 as number; const c12 = cusp12 as number
  const cusps: HouseCalculationResult & { ok: true } = {
    ok: true, ascendant, midheaven, armc, trueObliquity,
    cusps: [ascendant, normalizeDegrees(c8 + 180), normalizeDegrees(c9 + 180), normalizeDegrees(midheaven + 180), normalizeDegrees(c11 + 180), normalizeDegrees(c12 + 180), normalizeDegrees(ascendant + 180), c8, c9, midheaven, c11, c12],
  }
  for (let index = 0; index < 12; index += 1) {
    const current = cusps.cusps[index]; const next = cusps.cusps[(index + 1) % 12]
    if (current === undefined || next === undefined || forwardArcDegrees(current, next) <= 0 || forwardArcDegrees(current, next) >= 180) {
      return { ok: false, code: 'placidus_unavailable', message: 'Placidus 宫头顺序无效，未切换其他宫位制。' }
    }
  }
  return cusps
}

export function placeInHouse(longitude: number, cusps: readonly number[], cuspEpsilonDeg = 1e-9): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 {
  if (cusps.length !== 12) throw new Error('必须提供十二个宫头。')
  const normalizedLongitude = normalizeDegrees(longitude)
  for (let index = 0; index < 12; index += 1) {
    const cusp = cusps[index]
    if (cusp === undefined) throw new Error(`缺少第 ${index + 1} 宫宫头。`)
    const distance = Math.abs(((normalizedLongitude - cusp + 540) % 360) - 180)
    if (distance <= cuspEpsilonDeg) return (index + 1) as ReturnType<typeof placeInHouse>
  }
  for (let index = 0; index < 12; index += 1) {
    const start = cusps[index]; const end = cusps[(index + 1) % 12]
    if (start === undefined || end === undefined) throw new Error('宫头数据不完整。')
    if (forwardArcDegrees(start, normalizedLongitude) < forwardArcDegrees(start, end)) return (index + 1) as ReturnType<typeof placeInHouse>
  }
  throw new Error('无法确定行星宫位。')
}

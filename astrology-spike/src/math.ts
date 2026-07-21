export const DEG_TO_RAD = Math.PI / 180
export const RAD_TO_DEG = 180 / Math.PI

export function normalizeDegrees(value: number) {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

export function signedAngleDegrees(value: number) {
  const normalized = normalizeDegrees(value)
  return normalized > 180 ? normalized - 360 : normalized
}

export function forwardArcDegrees(start: number, end: number) {
  return normalizeDegrees(end - start)
}

export function angularSeparation(first: number, second: number) {
  return Math.abs(signedAngleDegrees(second - first))
}

export function sinDeg(value: number) { return Math.sin(value * DEG_TO_RAD) }
export function cosDeg(value: number) { return Math.cos(value * DEG_TO_RAD) }
export function tanDeg(value: number) { return Math.tan(value * DEG_TO_RAD) }
export function asinDeg(value: number) { return Math.asin(value) * RAD_TO_DEG }
export function acosDeg(value: number) { return Math.acos(value) * RAD_TO_DEG }
export function atan2Deg(y: number, x: number) { return Math.atan2(y, x) * RAD_TO_DEG }

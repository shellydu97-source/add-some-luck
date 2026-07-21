import { calculatePlacidusHouses } from '../dist/src/houses.js'
import { calculatePlanetPositions } from '../dist/src/planets.js'

const latitude = 39.9075
const longitude = 116.39723
const start = Date.parse('2024-09-01T00:00:00.000Z')
const end = start + 24 * 60 * 60 * 1000

function absoluteSunAscendantDistance(milliseconds) {
  const date = new Date(milliseconds)
  const houses = calculatePlacidusHouses(date, latitude, longitude)
  if (!houses.ok) throw new Error(houses.message)
  const sun = calculatePlanetPositions(date).find((planet) => planet.body === 'sun')
  if (!sun) throw new Error('Sun is missing.')
  return Math.abs(((sun.longitudeDeg - houses.ascendant + 540) % 360) - 180)
}

let best = start
for (let current = start; current <= end; current += 60_000) {
  if (absoluteSunAscendantDistance(current) < absoluteSunAscendantDistance(best)) best = current
}

let left = best - 120_000
let right = best + 120_000
for (let iteration = 0; iteration < 100; iteration += 1) {
  const first = left + (right - left) / 3
  const second = right - (right - left) / 3
  if (absoluteSunAscendantDistance(first) <= absoluteSunAscendantDistance(second)) right = second
  else left = first
}

const result = (left + right) / 2
console.log(JSON.stringify({
  utcDateTime: new Date(result).toISOString(),
  localDateTime: new Date(result + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00'),
  absoluteDifferenceDeg: absoluteSunAscendantDistance(result),
}, null, 2))

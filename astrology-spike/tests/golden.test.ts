import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { calculateAstrologySpike } from '../src/adapter.js'
import { calculateMajorAspects } from '../src/aspects.js'
import { forwardArcDegrees } from '../src/math.js'
import type { AstrologyBody } from '../src/types.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const samples = JSON.parse(await readFile(resolve(root, 'references/samples.json'), 'utf8')) as Array<{
  id: string
  utcDateTime: string
  latitude: number
  longitude: number
}>

interface GoldenExpected {
  swetest: {
    planets: Record<AstrologyBody, { longitudeDeg: number; speedDegPerDay: number }>
    houses: number[]
    ascendant: number
    midheaven: number
  }
  astrologMatrix: {
    houses: number[]
    ascendant: number
    midheaven: number
    bodyHouses: Record<string, number>
  }
  jplHorizons: Record<AstrologyBody, number>
}

function circularDifference(first: number, second: number) {
  return Math.abs(((first - second + 540) % 360) - 180)
}

const astrologBodyLabels: Record<AstrologyBody, string> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Merc', venus: 'Venu', mars: 'Mars',
  jupiter: 'Jupi', saturn: 'Satu', uranus: 'Uran', neptune: 'Nept', pluto: 'Plut',
}

describe('eight externally generated golden samples', () => {
  it('contains at least eight samples', () => {
    expect(samples.length).toBeGreaterThanOrEqual(8)
  })

  for (const sample of samples) {
    it(`${sample.id} stays within the declared external-tool gates`, async () => {
      const expected = JSON.parse(await readFile(
        resolve(root, 'references/raw', sample.id, 'expected.json'),
        'utf8',
      )) as GoldenExpected
      const actual = calculateAstrologySpike({ ...sample, birthTimeKnown: true })
      if (!actual.houses || !actual.ascendant || !actual.midheaven) throw new Error('Timed result is incomplete.')

      for (const planet of actual.planets) {
        expect(circularDifference(planet.longitudeDeg, expected.swetest.planets[planet.body].longitudeDeg) * 60).toBeLessThanOrEqual(1)
        expect(circularDifference(planet.longitudeDeg, expected.jplHorizons[planet.body]) * 60).toBeLessThanOrEqual(1)
        expect(planet.retrograde).toBe(expected.swetest.planets[planet.body].speedDegPerDay < 0)
        if (sample.id !== 'beijing-house-cusp-boundary') {
          expect(planet.house).toBe(expected.astrologMatrix.bodyHouses[astrologBodyLabels[planet.body]])
        }
      }

      expect(circularDifference(actual.ascendant.longitudeDeg, expected.swetest.ascendant) * 60).toBeLessThanOrEqual(1)
      expect(circularDifference(actual.midheaven.longitudeDeg, expected.swetest.midheaven) * 60).toBeLessThanOrEqual(1)
      expect(circularDifference(actual.ascendant.longitudeDeg, expected.astrologMatrix.ascendant) * 60).toBeLessThanOrEqual(1)
      expect(circularDifference(actual.midheaven.longitudeDeg, expected.astrologMatrix.midheaven) * 60).toBeLessThanOrEqual(1)

      for (let index = 0; index < 12; index += 1) {
        const actualCusp = actual.houses[index]
        const nextCusp = actual.houses[(index + 1) % 12]
        if (!actualCusp || !nextCusp) throw new Error('Missing house cusp.')
        expect(circularDifference(actualCusp.longitudeDeg, expected.swetest.houses[index] as number) * 60).toBeLessThanOrEqual(1)
        expect(circularDifference(actualCusp.longitudeDeg, expected.astrologMatrix.houses[index] as number) * 60).toBeLessThanOrEqual(1)
        expect(forwardArcDegrees(actualCusp.longitudeDeg, nextCusp.longitudeDeg)).toBeGreaterThan(0)
        expect(forwardArcDegrees(actualCusp.longitudeDeg, nextCusp.longitudeDeg)).toBeLessThan(180)
      }

      const expectedAspects = calculateMajorAspects(
        Object.entries(expected.swetest.planets).map(([body, position]) => ({
          body: body as AstrologyBody,
          longitudeDeg: position.longitudeDeg,
        })),
      ).map(({ first, second, type }) => `${first}:${second}:${type}`).sort()
      const actualAspects = actual.aspects.map(({ first, second, type }) => `${first}:${second}:${type}`).sort()
      expect(actualAspects).toEqual(expectedAspects)
    })
  }
})

describe('reference provenance artifacts', () => {
  it('records immutable tool settings and raw outputs for every sample', async () => {
    const metadata = JSON.parse(await readFile(resolve(root, 'references/tool-metadata.json'), 'utf8'))
    expect(metadata.tools.swetest.version).toBe('2.10.03')
    expect(metadata.tools.astrolog.version).toBe('8.00')
    expect(metadata.tools.astrolog.mode).toContain('Matrix')
    expect(metadata.tools.jplHorizons.service).toContain('Horizons')

    for (const sample of samples) {
      const directory = resolve(root, 'references/raw', sample.id)
      await expect(readFile(resolve(directory, 'swetest.txt'), 'utf8')).resolves.toContain('house  1')
      await expect(readFile(resolve(directory, 'astrolog-matrix.txt'), 'utf8')).resolves.toContain('Astrolog 8.00')
      await expect(readFile(resolve(directory, 'jpl-horizons.json'), 'utf8')).resolves.toContain('$$SOE')
    }
  })
})

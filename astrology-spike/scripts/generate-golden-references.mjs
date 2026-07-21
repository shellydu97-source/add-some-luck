import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { calculateAstrologySpike } from '../dist/src/adapter.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const samples = JSON.parse(await readFile(resolve(root, 'references/samples.json'), 'utf8'))
const swetestPath = process.env.SWETEST_PATH
  ?? resolve(process.env.LOCALAPPDATA ?? '', 'Temp/luck-astrology-validation-tools/swetest64.exe')
const astrologPath = process.env.ASTROLOG_PATH ?? 'C:/Temp/astrolog8-independent/astrolog.exe'
const bodyIds = {
  sun: '10', moon: '301', mercury: '199', venus: '299', mars: '499',
  jupiter: '599', saturn: '699', uranus: '799', neptune: '899', pluto: '999',
}
const bodyOrder = Object.keys(bodyIds)
const signOffsets = { Ari: 0, Tau: 30, Gem: 60, Can: 90, Leo: 120, Vir: 150, Lib: 180, Sco: 210, Sag: 240, Cap: 270, Aqu: 300, Pis: 330 }
const astrologCuspLabels = ['Asce', '2nd', '3rd', 'Nadi', '5th', '6th', 'Desc', '8th', '9th', 'Midh', '11th', '12th']

function run(executable, args, cwd, extraEnv = {}) {
  return execFileSync(executable, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, ...extraEnv },
  })
}

function directFileSha256(path) {
  return new Promise((resolveHash, reject) => {
    import('node:fs').then(({ createReadStream }) => {
      const hash = createHash('sha256')
      const stream = createReadStream(path)
      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('end', () => resolveHash(hash.digest('hex').toUpperCase()))
      stream.on('error', reject)
    })
  })
}

function utcParts(iso) {
  const date = new Date(iso)
  return {
    date: `${date.getUTCDate()}.${date.getUTCMonth() + 1}.${date.getUTCFullYear()}`,
    time: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}`,
  }
}

function localParts(iso) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
  if (!match) throw new Error(`Invalid local date: ${iso}`)
  return { year: match[1], month: Number(match[2]), day: Number(match[3]), time: `${match[4]}:${match[5]}:${match[6]}` }
}

function circularDifference(first, second) {
  return Math.abs(((first - second + 540) % 360) - 180)
}

function parseSwetest(raw) {
  const planetNameMap = {
    Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus', Mars: 'mars',
    Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus', Neptune: 'neptune', Pluto: 'pluto',
  }
  const planets = {}
  const houses = []
  let ascendant
  let midheaven
  for (const line of raw.split(/\r?\n/)) {
    const planet = line.match(/^(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)/)
    if (planet) planets[planetNameMap[planet[1]]] = { longitudeDeg: Number(planet[2]), speedDegPerDay: Number(planet[3]) }
    const house = line.match(/^house\s+(\d+)\s+(-?\d+\.\d+)/)
    if (house) houses[Number(house[1]) - 1] = Number(house[2])
    const asc = line.match(/^Ascendant\s+(-?\d+\.\d+)/)
    if (asc) ascendant = Number(asc[1])
    const mc = line.match(/^MC\s+(-?\d+\.\d+)/)
    if (mc) midheaven = Number(mc[1])
  }
  if (Object.keys(planets).length !== 10 || houses.length !== 12 || ascendant === undefined || midheaven === undefined) {
    throw new Error('Could not parse complete swetest output.')
  }
  return { planets, houses, ascendant, midheaven }
}

function astrologLongitude(degrees, sign, minutes, seconds) {
  return signOffsets[sign] + Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600
}

function parseAstrolog(raw) {
  const cusps = {}
  const bodyHouses = {}
  for (const line of raw.split(/\r?\n/)) {
    const cusp = line.match(/^(Asce|2nd|3rd|Nadi|5th|6th|Desc|8th|9th|Midh|11th|12th)\s*:\s*(\d+)(Ari|Tau|Gem|Can|Leo|Vir|Lib|Sco|Sag|Cap|Aqu|Pis)(\d+)'(\d+)"/)
    if (cusp) cusps[cusp[1]] = astrologLongitude(cusp[2], cusp[3], cusp[4], cusp[5])
    const body = line.match(/^(Sun|Moon|Merc|Venu|Mars|Jupi|Satu|Uran|Nept|Plut)\s*:.*\[\s*(\d+)(?:st|nd|rd|th) house\]/)
    if (body) bodyHouses[body[1]] = Number(body[2])
  }
  const orderedCusps = astrologCuspLabels.map((label) => cusps[label])
  if (orderedCusps.some((value) => value === undefined)) throw new Error('Could not parse Astrolog cusps.')
  return { houses: orderedCusps, ascendant: cusps.Asce, midheaven: cusps.Midh, bodyHouses }
}

function julianDate(iso) {
  return new Date(iso).getTime() / 86_400_000 + 2_440_587.5
}

function fetchHorizons(bodyId, iso) {
  const params = new URLSearchParams({
    format: 'json', COMMAND: `'${bodyId}'`, OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'", TLIST: `'${julianDate(iso).toFixed(9)}'`,
    QUANTITIES: "'31'", REF_SYSTEM: "'ICRF'", CAL_FORMAT: "'CAL'", TIME_DIGITS: "'SECONDS'", ANG_FORMAT: "'DEG'",
  })
  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`
  const powershell = resolve(process.env.SystemRoot ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe')
  let lastError
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const raw = run(powershell, [
        '-NoProfile', '-Command',
        "$ProgressPreference='SilentlyContinue'; (Invoke-RestMethod -Uri $env:HORIZONS_URL -TimeoutSec 30) | ConvertTo-Json -Depth 10 -Compress",
      ], root, { HORIZONS_URL: url })
      const payload = JSON.parse(raw)
      if (payload.error) throw new Error(payload.error)
      return payload
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function parseHorizonsLongitude(rawResult) {
  const between = rawResult.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/)
  if (!between) throw new Error('Horizons output has no data block.')
  const values = between[1].trim().match(/(-?\d+\.\d+)\s+(-?\d+\.\d+)\s*$/)
  if (!values) throw new Error('Could not parse Horizons ecliptic longitude.')
  return Number(values[1])
}

await mkdir(resolve(root, 'references/raw'), { recursive: true })
const summary = []

for (const sample of samples) {
  console.log(`Generating ${sample.id}...`)
  const outputDir = resolve(root, 'references/raw', sample.id)
  await mkdir(outputDir, { recursive: true })
  const utc = utcParts(sample.utcDateTime)
  const local = localParts(sample.localDateTime)
  const swetestArgs = [
    `-b${utc.date}`, `-ut${utc.time}`, '-p0123456789', '-fPls', '-head', '-emos', '-speed',
    `-house${sample.longitude},${sample.latitude},P`,
  ]
  const astrologArgs = [
    '-YQ', '0', '-qb', String(local.month), String(local.day), String(local.year), local.time,
    '0', '-8', String(-sample.longitude), String(sample.latitude), '-bm', '-b0', '-c', '0', '-C',
  ]
  const swetestRaw = run(swetestPath, swetestArgs, dirname(swetestPath))
  const astrologRaw = run(astrologPath, astrologArgs, dirname(astrologPath))
  const horizonsRaw = {}
  for (const body of bodyOrder) horizonsRaw[body] = fetchHorizons(bodyIds[body], sample.utcDateTime).result

  await writeFile(resolve(outputDir, 'input.json'), `${JSON.stringify({ ...sample, fixedTimezone: 'Asia/Shanghai' }, null, 2)}\n`)
  await writeFile(resolve(outputDir, 'swetest.txt'), swetestRaw)
  await writeFile(resolve(outputDir, 'astrolog-matrix.txt'), astrologRaw)
  await writeFile(resolve(outputDir, 'jpl-horizons.json'), `${JSON.stringify(horizonsRaw, null, 2)}\n`)

  const swetest = parseSwetest(swetestRaw)
  const astrolog = parseAstrolog(astrologRaw)
  const horizons = Object.fromEntries(bodyOrder.map((body) => [body, parseHorizonsLongitude(horizonsRaw[body])]))
  const actual = calculateAstrologySpike({
    utcDateTime: sample.utcDateTime,
    latitude: sample.latitude,
    longitude: sample.longitude,
    birthTimeKnown: true,
  })
  const planetErrors = Object.fromEntries(actual.planets.map((planet) => [planet.body, {
    swetestArcMinutes: circularDifference(planet.longitudeDeg, swetest.planets[planet.body].longitudeDeg) * 60,
    horizonsArcMinutes: circularDifference(planet.longitudeDeg, horizons[planet.body]) * 60,
    retrogradeMatchesSwetest: planet.retrograde === (swetest.planets[planet.body].speedDegPerDay < 0),
  }]))
  const cuspErrors = actual.houses.map((house, index) => ({
    house: house.house,
    swetestArcMinutes: circularDifference(house.longitudeDeg, swetest.houses[index]) * 60,
    astrologMatrixArcMinutes: circularDifference(house.longitudeDeg, astrolog.houses[index]) * 60,
  }))
  const comparison = {
    sampleId: sample.id,
    planetErrors,
    angleErrors: {
      ascendantSwetestArcMinutes: circularDifference(actual.ascendant.longitudeDeg, swetest.ascendant) * 60,
      midheavenSwetestArcMinutes: circularDifference(actual.midheaven.longitudeDeg, swetest.midheaven) * 60,
      ascendantAstrologMatrixArcMinutes: circularDifference(actual.ascendant.longitudeDeg, astrolog.ascendant) * 60,
      midheavenAstrologMatrixArcMinutes: circularDifference(actual.midheaven.longitudeDeg, astrolog.midheaven) * 60,
    },
    cuspErrors,
    maxima: {
      planetVsSwetestArcMinutes: Math.max(...Object.values(planetErrors).map((error) => error.swetestArcMinutes)),
      planetVsHorizonsArcMinutes: Math.max(...Object.values(planetErrors).map((error) => error.horizonsArcMinutes)),
      anglesAndCuspsVsSwetestArcMinutes: Math.max(
        circularDifference(actual.ascendant.longitudeDeg, swetest.ascendant) * 60,
        circularDifference(actual.midheaven.longitudeDeg, swetest.midheaven) * 60,
        ...cuspErrors.map((error) => error.swetestArcMinutes),
      ),
      anglesAndCuspsVsAstrologMatrixArcMinutes: Math.max(
        circularDifference(actual.ascendant.longitudeDeg, astrolog.ascendant) * 60,
        circularDifference(actual.midheaven.longitudeDeg, astrolog.midheaven) * 60,
        ...cuspErrors.map((error) => error.astrologMatrixArcMinutes),
      ),
    },
  }
  const expected = { sample, swetest, astrologMatrix: astrolog, jplHorizons: horizons }
  await writeFile(resolve(outputDir, 'expected.json'), `${JSON.stringify(expected, null, 2)}\n`)
  await writeFile(resolve(outputDir, 'comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`)
  summary.push(comparison)
}

const metadata = {
  generatedAt: new Date().toISOString(),
  tools: {
    swetest: {
      version: '2.10.03', mode: 'Moshier via -emos; no Swiss ephemeris files bundled or loaded',
      executableSha256: await directFileSha256(swetestPath), arguments: '-p0123456789 -fPls -head -emos -speed -house<lon>,<lat>,P',
    },
    astrolog: {
      version: '8.00', mode: 'Independent Matrix formulas via -bm; isolated executable directory contains no Swiss files',
      executableSha256: await directFileSha256(astrologPath), arguments: '-YQ 0 -qb <local> 0 -8 <-east-longitude> <latitude> -bm -b0 -c 0 -C',
    },
    jplHorizons: {
      service: 'NASA/JPL Horizons API', ephemerisShownInRawOutput: 'DE441',
      center: '500@399 geocentric', quantity: '31 observer-centered IAU76/80 ecliptic-of-date apparent longitude/latitude',
    },
  },
}
await writeFile(resolve(root, 'references/tool-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`)
await writeFile(resolve(root, 'references/comparison-summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
console.log('Reference generation complete.')

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'

const sourcePath = process.env.GEONAMES_CN_PATH
const divisionsPath = process.env.ADMIN_DIVISIONS_PC_PATH
if (!sourcePath || !divisionsPath) throw new Error('Set GEONAMES_CN_PATH and ADMIN_DIVISIONS_PC_PATH.')

const outputPath = resolve('src/data/chinaCities.json')
const sourceSha256 = process.env.GEONAMES_CN_ZIP_SHA256
  ?? '7B90B81D1B61AF90A38D93A97958E1A4DEBEFF9BD1B21A558785D16353D8B96A'
const divisionsSha256 = createHash('sha256').update(await readFile(divisionsPath)).digest('hex').toUpperCase()
const dataVersion = `cn-admin-2023-geonames-2026-${divisionsSha256.slice(0, 8).toLowerCase()}-${sourceSha256.slice(0, 8).toLowerCase()}`

const provinceNames = {
  '01': '安徽省', '02': '浙江省', '03': '江西省', '04': '江苏省', '05': '吉林省', '06': '青海省',
  '07': '福建省', '08': '黑龙江省', '09': '河南省', '10': '河北省', '11': '湖南省', '12': '湖北省',
  '13': '新疆维吾尔自治区', '14': '西藏自治区', '15': '甘肃省', '16': '广西壮族自治区',
  '18': '贵州省', '19': '辽宁省', '20': '内蒙古自治区', '21': '宁夏回族自治区',
  '22': '北京市', '23': '上海市', '24': '山西省', '25': '山东省', '26': '陕西省', '28': '天津市',
  '29': '云南省', '30': '广东省', '31': '海南省', '32': '四川省', '33': '重庆市',
}
const provinceCodeByName = new Map(Object.entries(provinceNames).map(([code, name]) => [name, code]))
const municipalities = new Set(['北京市', '天津市', '上海市', '重庆市'])
const featurePriority = { PPLC: 600, PPLA: 500, PPLA2: 400, PPLA3: 300, PPLA4: 200, PPL: 100 }
const seatAliasesByCode = {
  '1525': ['锡林浩特', 'Xilinhot'],
  '1529': ['巴彦浩特', 'Bayanhot'],
  '2224': ['延吉', 'Yanji'],
  '4331': ['吉首', 'Jishou'],
  '5223': ['兴义', 'Xingyi'],
  '5226': ['凯里', 'Kaili'],
  '5227': ['都匀', 'Duyun'],
  '5325': ['蒙自', 'Mengzi'],
  '5331': ['芒市', 'Mangshi'],
  '5333': ['泸水', 'Lushui'],
  '5334': ['香格里拉', 'Shangri-La'],
  '6229': ['临夏', 'Linxia'],
  '6230': ['合作', 'Hezuo'],
  '6322': ['海晏', 'Haiyan'],
  '6323': ['同仁', 'Tongren'],
  '6325': ['共和', 'Gonghe'],
  '6326': ['玛沁', 'Maqin'],
  '6327': ['玉树', 'Yushu'],
  '6328': ['德令哈', 'Delingha'],
  '6527': ['博乐', 'Bole'],
  '6528': ['库尔勒', 'Korla'],
  '6530': ['阿图什', 'Artux'],
  '429004': ['仙桃', 'Xiantao'],
  '429005': ['潜江', 'Qianjiang'],
  '429006': ['天门', 'Tianmen'],
  '429021': ['松柏', 'Songbai'],
  '659006': ['铁门关', 'Tiemenguan'],
  '659007': ['双河', 'Shuanghe'],
  '659008': ['可克达拉', 'Kokdala', 'Kekedala'],
  '659009': ['昆玉', 'Kunyu'],
  '659011': ['新星', 'Xinxing'],
  '659012': ['白杨', 'Baiyang'],
}
const wikidataCoordinateOverrides = {
  '659007': { latitude: 44.84, longitude: 82.3517, entityId: 'Q10930847', sourceModifiedAt: '2026-05-17' },
  '659009': { latitude: 37.209444, longitude: 79.290833, entityId: 'Q22704998', sourceModifiedAt: '2026-07-10' },
  '659011': { latitude: 42.795278, longitude: 93.746389, entityId: 'Q105300298', sourceModifiedAt: '2026-05-17' },
  '659012': { latitude: 46.724444444444444, longitude: 82.89583333333333, entityId: 'Q116265658', sourceModifiedAt: '2025-12-07' },
}

function normalizeName(name) {
  return name.trim().replace(/[\s·•]/g, '')
}

function shortName(name) {
  return normalizeName(name).replace(/(壮族苗族自治州|藏族羌族自治州|蒙古族藏族自治州|哈萨克自治州|土家族苗族自治州|布依族苗族自治州|傣族景颇族自治州|傈僳族自治州|回族自治州|藏族自治州|彝族自治州|白族自治州|苗族侗族自治州|朝鲜族自治州|蒙古族自治州|自治州|地区|市|盟|林区|县)$/u, '')
}

const divisions = JSON.parse(await readFile(divisionsPath, 'utf8'))
const targets = divisions.flatMap((province) => municipalities.has(province.name)
  ? [{ code: province.code, province: province.name, city: province.name }]
  : province.children.map((city) => ({ code: city.code, province: province.name, city: city.name })))
const candidatesByProvince = new Map()

const stream = createInterface({ input: createReadStream(sourcePath, { encoding: 'utf8' }), crlfDelay: Infinity })
for await (const line of stream) {
  const columns = line.split('\t')
  if (columns.length < 19 || columns[6] !== 'P' || columns[8] !== 'CN') continue
  const province = provinceNames[columns[10]]
  if (!province) continue
  const aliases = new Set([columns[1], columns[2], ...(columns[3] ?? '').split(',')]
    .filter(Boolean)
    .map((name) => normalizeName(name).toLowerCase()))
  if (!aliases.size) continue
  const candidate = {
    id: `geonames-${columns[0]}`,
    aliases,
    latitude: Number(columns[4]),
    longitude: Number(columns[5]),
    geoNamesId: Number(columns[0]),
    featureCode: columns[7],
    population: Number(columns[14]) || 0,
    sourceModifiedAt: columns[18],
  }
  const list = candidatesByProvince.get(province) ?? []
  list.push(candidate)
  candidatesByProvince.set(province, list)
}

function selectCandidate(target) {
  const full = normalizeName(target.city).toLowerCase()
  const short = shortName(target.city).toLowerCase()
  const seatAliases = (seatAliasesByCode[target.code] ?? []).map((name) => normalizeName(name).toLowerCase())
  const provinceCode = provinceCodeByName.get(target.province)
  const candidates = candidatesByProvince.get(target.province) ?? []
  const ranked = candidates.flatMap((candidate) => {
    const fullMatch = candidate.aliases.has(full)
    const shortMatch = candidate.aliases.has(short)
    const seatMatch = seatAliases.some((alias) => candidate.aliases.has(alias))
    if (!fullMatch && !shortMatch && !seatMatch) return []
    const score = (fullMatch ? 2500 : shortMatch ? 2000 : 1500) + (featurePriority[candidate.featureCode] ?? 0) + Math.log10(candidate.population + 1) * 10
    return [{ candidate, score }]
  }).sort((left, right) => right.score - left.score)
  const selected = ranked[0]?.candidate
  const canonicalName = target.province === target.city ? target.city : `${target.province} ${target.city}`
  if (!selected) {
    const override = wikidataCoordinateOverrides[target.code]
    if (!override) return undefined
    return {
      id: `admin-${target.code}-wikidata-${override.entityId}`,
      province: target.province,
      city: target.city,
      canonicalName,
      searchText: `${target.province}${target.city}${short}`.toLowerCase(),
      latitude: override.latitude,
      longitude: override.longitude,
      wikidataEntityId: override.entityId,
      featureCode: 'administrative-city',
      sourceModifiedAt: override.sourceModifiedAt,
      adminCode: target.code,
      geoNamesProvinceCode: provinceCode,
      coordinateSource: 'Wikidata structured data (CC0)',
    }
  }
  return {
    id: `admin-${target.code}-${selected.geoNamesId}`,
    province: target.province,
    city: target.city,
    canonicalName,
    searchText: `${target.province}${target.city}${short}`.toLowerCase(),
    latitude: selected.latitude,
    longitude: selected.longitude,
    geoNamesId: selected.geoNamesId,
    featureCode: selected.featureCode,
    sourceModifiedAt: selected.sourceModifiedAt,
    adminCode: target.code,
    geoNamesProvinceCode: provinceCode,
    coordinateSource: 'GeoNames CN country dump',
  }
}

const cities = targets.map(selectCandidate)
const missing = targets.filter((_, index) => !cities[index])
if (missing.length) {
  console.error(JSON.stringify({ missingCount: missing.length, missing }, null, 2))
  throw new Error(`GeoNames 中缺少 ${missing.length} 个省市代表坐标。`)
}

const sortedCities = cities.filter(Boolean).sort((left, right) => left.province.localeCompare(right.province, 'zh-CN') || left.city.localeCompare(right.city, 'zh-CN'))
const payload = {
  metadata: {
    dataVersion,
    generatedAt: '2026-07-14',
    coordinateSource: 'GeoNames CN country dump; selected Wikidata coordinate overrides',
    sourceUrl: 'https://download.geonames.org/export/dump/CN.zip',
    sourceSha256,
    administrativeDivisionSourceUrl: 'https://github.com/modood/Administrative-divisions-of-China/blob/master/dist/pc-code.json',
    administrativeDivisionSourceVersion: '2023-06-30',
    administrativeDivisionSourceSha256: divisionsSha256,
    coordinateReferenceSystem: 'WGS 84 decimal degrees',
    wikidataCoordinateOverrideSourceUrl: 'https://www.wikidata.org/wiki/Special:EntityData/{entityId}.json',
    wikidataCoordinateOverrideVersion: 'retrieved 2026-07-14',
    license: 'GeoNames CC BY 4.0; administrative divisions WTFPL; Wikidata structured data CC0',
    attribution: 'GeoNames; modood/Administrative-divisions-of-China; Wikidata contributors',
    scope: 'Mainland China province and city two-level list with representative city coordinates',
    timezone: 'Asia/Shanghai',
    count: sortedCities.length,
  },
  cities: sortedCities,
}

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
const outputHash = createHash('sha256').update(await readFile(outputPath)).digest('hex').toUpperCase()
console.log(JSON.stringify({ outputPath, cityCount: sortedCities.length, outputSha256: outputHash, dataVersion }, null, 2))

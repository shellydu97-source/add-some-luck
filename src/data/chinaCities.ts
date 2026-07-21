import type { ConfirmedBirthLocation } from '../models/types'

export interface ChinaCityRecord {
  id: string
  province: string
  city: string
  canonicalName: string
  searchText: string
  latitude: number
  longitude: number
  geoNamesId: number
  wikidataEntityId?: string
  featureCode: string
  sourceModifiedAt: string
  coordinateSource?: string
  adminCode: string
  geoNamesProvinceCode: string
}

interface ChinaCityPayload {
  metadata: {
    dataVersion: string
    coordinateSource: string
    license: string
    attribution: string
    count: number
  }
  cities: ChinaCityRecord[]
}

let cache: ChinaCityPayload | undefined

export async function loadChinaCities() {
  if (cache) return cache
  const module = await import('./chinaCities.json')
  cache = module.default as ChinaCityPayload
  return cache
}

export function toConfirmedBirthLocation(city: ChinaCityRecord, metadata: ChinaCityPayload['metadata']): ConfirmedBirthLocation {
  return {
    canonicalName: city.canonicalName,
    province: city.province,
    city: city.city,
    latitude: city.latitude,
    longitude: city.longitude,
    ianaTimeZone: 'Asia/Shanghai',
    coordinateSource: city.coordinateSource ?? metadata.coordinateSource,
    coordinateDataVersion: metadata.dataVersion,
    userConfirmed: true,
  }
}

import type { CalendarType, ConfirmedBirthLocation, Gender, Profile } from '../models/types'

export type ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>

export interface SimpleProfileFields {
  daylightSavingStatus?: Profile['daylightSavingStatus']
  useTrueSolarTime?: Profile['useTrueSolarTime']
  dayBoundaryRule?: Profile['dayBoundaryRule']
  name: string
  gender: Gender | undefined
  calendarType: CalendarType
  rawBirthDate: string
  lunarLeapMonth: boolean
  rawBirthTime: string
  unknownBirthTime: boolean
  birthPlaceText: string
  birthLocation?: ConfirmedBirthLocation
}

export const NEW_PROFILE_DEFAULTS: ProfileInput = {
  name: '',
  gender: 'female',
  relation: 'self',
  notes: '',
  calendarType: 'solar',
  rawBirthDate: '',
  lunarLeapMonth: false,
  rawBirthTime: '',
  normalizedBirthDate: undefined,
  normalizedBirthTime: undefined,
  normalizationStatus: 'unprocessed',
  normalizationMessage: '',
  birthPlaceText: '',
  birthLocation: undefined,
  countryCode: '',
  city: '',
  latitude: undefined,
  longitude: undefined,
  timezone: '',
  daylightSavingStatus: 'unknown',
  timeAccuracy: 'unknown',
  useTrueSolarTime: 'system_default',
  dayBoundaryRule: 'system_default',
  houseSystem: 'system_default',
  unknownTimePolicy: 'time_independent_only',
  isDefault: false,
}

function profileInputFromExisting(profile: Profile): ProfileInput {
  const input: Partial<Profile> = { ...profile }
  delete input.id
  delete input.createdAt
  delete input.updatedAt
  return input as ProfileInput
}

export function getSimpleProfileFields(profile?: Profile): SimpleProfileFields {
  const source = profile ?? NEW_PROFILE_DEFAULTS
  return {
    daylightSavingStatus: source.daylightSavingStatus,
    useTrueSolarTime: source.useTrueSolarTime,
    dayBoundaryRule: source.dayBoundaryRule,
    name: source.name,
    gender: profile?.gender,
    calendarType: source.calendarType,
    rawBirthDate: source.rawBirthDate,
    lunarLeapMonth: source.lunarLeapMonth,
    rawBirthTime: source.rawBirthTime ?? '',
    unknownBirthTime: profile ? !source.rawBirthTime || source.timeAccuracy === 'unknown' : false,
    birthPlaceText: source.birthPlaceText,
    birthLocation: source.birthLocation,
  }
}

export function buildProfileInput(fields: SimpleProfileFields, existing?: Profile): ProfileInput {
  if (!fields.gender) throw new Error('请选择性别')
  const base = existing ? profileInputFromExisting(existing) : { ...NEW_PROFILE_DEFAULTS }
  const enteredTime = fields.rawBirthTime.trim()
  const visibleTime = fields.unknownBirthTime || !enteredTime ? '' : enteredTime
  const existingTimeUnknown = !existing?.rawBirthTime || existing.timeAccuracy === 'unknown'
  const existingVisibleTime = existingTimeUnknown ? '' : existing?.rawBirthTime ?? ''
  const timeChanged = visibleTime !== existingVisibleTime
  const enteredPlace = fields.birthPlaceText.trim()
  const confirmedLocation = fields.birthLocation?.userConfirmed === true
    && fields.birthLocation.canonicalName === enteredPlace
    ? fields.birthLocation
    : undefined

  return {
    ...base,
    daylightSavingStatus: fields.daylightSavingStatus ?? base.daylightSavingStatus,
    useTrueSolarTime: fields.useTrueSolarTime ?? base.useTrueSolarTime,
    dayBoundaryRule: fields.dayBoundaryRule ?? base.dayBoundaryRule,
    name: fields.name.trim(),
    gender: fields.gender,
    calendarType: fields.calendarType,
    rawBirthDate: fields.rawBirthDate,
    lunarLeapMonth: fields.calendarType === 'lunar' ? fields.lunarLeapMonth : false,
    rawBirthTime: existing && !timeChanged ? existing.rawBirthTime : visibleTime,
    timeAccuracy: !visibleTime
      ? 'unknown'
      : existing && !timeChanged
        ? existing.timeAccuracy
        : 'exact_minute',
    birthPlaceText: enteredPlace,
    birthLocation: confirmedLocation,
    ...(confirmedLocation ? {
      countryCode: 'CN',
      city: confirmedLocation.city,
      latitude: confirmedLocation.latitude,
      longitude: confirmedLocation.longitude,
      timezone: confirmedLocation.ianaTimeZone,

    } : {}),
  }
}

import type { Profile } from '../models/types'

export const seedProfiles: Profile[] = [
  {
    id: 'profile-self', name: '小橙', gender: 'female', relation: 'self', notes: '演示人物', calendarType: 'solar',
    rawBirthDate: '1997/08/30', lunarLeapMonth: false, rawBirthTime: '09:30', normalizationStatus: 'unprocessed',
    birthPlaceText: '浙江省杭州市', countryCode: '中国', city: '杭州', timezone: 'Asia/Shanghai', daylightSavingStatus: 'unknown',
    timeAccuracy: 'approximate_period', useTrueSolarTime: 'system_default', houseSystem: 'system_default', dayBoundaryRule: 'system_default',
    unknownTimePolicy: 'time_independent_only', isDefault: true, createdAt: '2026-07-01T08:00:00.000Z', updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'profile-friend', name: '朋友 A', gender: 'male', relation: 'friend', notes: '', calendarType: 'solar',
    rawBirthDate: '1996/03/12', lunarLeapMonth: false, rawBirthTime: '14:18', normalizationStatus: 'unprocessed',
    birthPlaceText: '上海市', countryCode: '中国', city: '上海', timezone: 'Asia/Shanghai', daylightSavingStatus: 'unknown',
    timeAccuracy: 'exact_minute', useTrueSolarTime: 'system_default', houseSystem: 'system_default', dayBoundaryRule: 'system_default',
    unknownTimePolicy: 'time_independent_only', isDefault: false, createdAt: '2026-07-02T08:00:00.000Z', updatedAt: '2026-07-02T08:00:00.000Z',
  },
]

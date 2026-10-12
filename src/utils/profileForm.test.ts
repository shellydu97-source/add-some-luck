import { describe, expect, it } from 'vitest'
import type { Profile } from '../models/types'
import { buildProfileInput, getSimpleProfileFields, NEW_PROFILE_DEFAULTS } from './profileForm'

const oldProfile: Profile = {
  ...NEW_PROFILE_DEFAULTS,
  id: 'profile-old',
  name: '旧人物',
  gender: 'female',
  relation: 'friend',
  notes: '旧备注',
  rawBirthDate: '1992/04/18',
  rawBirthTime: '08:25',
  birthPlaceText: '杭州市',
  countryCode: '中国',
  city: '杭州',
  timezone: 'Asia/Shanghai',
  daylightSavingStatus: 'not_applied',
  timeAccuracy: 'approximate_period',
  useTrueSolarTime: 'on',
  normalizationStatus: 'normalized',
  normalizedBirthDate: '1992/04/18',
  normalizedBirthTime: '08:25',
  normalizationMessage: '旧标准化结果',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const confirmedShanghai = {
  canonicalName: '上海市', province: '上海市', city: '上海市', latitude: 31.22222, longitude: 121.45806,
  ianaTimeZone: 'Asia/Shanghai' as const, coordinateSource: 'GeoNames CN country dump',
  coordinateDataVersion: 'geonames-cn-2026-07-14-7b90b81d1b61', userConfirmed: true as const,
}

describe('简化人物表单数据合并', () => {
  it('新人物写入安全默认值', () => {
    const newFields = getSimpleProfileFields()
    expect(newFields.unknownBirthTime).toBe(false)
    const input = buildProfileInput({
      ...newFields,
      name: '新人物',
      rawBirthDate: '2000/01/02',
      birthPlaceText: '上海市',
    })
    expect(input).toMatchObject({
      name: '新人物', relation: 'self', notes: '', timezone: '', daylightSavingStatus: 'unknown',
      timeAccuracy: 'unknown', normalizationStatus: 'unprocessed', useTrueSolarTime: 'system_default',
    })
  })

  it('确认城市后保存坐标、来源、版本和固定时区', () => {
    const input = buildProfileInput({
      ...getSimpleProfileFields(), name: '上海人物', rawBirthDate: '2000/01/02',
      birthPlaceText: confirmedShanghai.canonicalName, birthLocation: confirmedShanghai,
    })
    expect(input).toMatchObject({
      birthLocation: confirmedShanghai, countryCode: 'CN', city: '上海市', latitude: 31.22222,
      longitude: 121.45806, timezone: 'Asia/Shanghai', daylightSavingStatus: 'unknown',
    })
  })

  it('编辑可见字段不会覆盖旧高级数据', () => {
    const fields = { ...getSimpleProfileFields(oldProfile), name: '更新后的名字', birthPlaceText: '上海市' }
    const input = buildProfileInput(fields, oldProfile)
    expect(input).toMatchObject({
      name: '更新后的名字', birthPlaceText: '上海市', relation: 'friend', notes: '旧备注',
      countryCode: '中国', city: '杭州', timezone: 'Asia/Shanghai', daylightSavingStatus: 'not_applied',
      useTrueSolarTime: 'on', normalizationStatus: 'normalized', normalizedBirthDate: '1992/04/18',
      normalizedBirthTime: '08:25', normalizationMessage: '旧标准化结果', timeAccuracy: 'approximate_period',
    })
  })

  it('不知道出生时间会降低时间可信度', () => {
    const fields = { ...getSimpleProfileFields(oldProfile), unknownBirthTime: true }
    const input = buildProfileInput(fields, oldProfile)
    expect(input.rawBirthTime).toBe('')
    expect(input.timeAccuracy).toBe('unknown')
  })

  it('编辑没有出生时间的旧人物时仍显示为不知道时间', () => {
    const fields = getSimpleProfileFields({ ...oldProfile, rawBirthTime: '', timeAccuracy: 'unknown' })
    expect(fields.unknownBirthTime).toBe(true)
  })

  it('只有地点文本时不会生成确认坐标', () => {
    const input = buildProfileInput({ ...getSimpleProfileFields(oldProfile), birthPlaceText: '杭州市', birthLocation: undefined }, oldProfile)
    expect(input.birthLocation).toBeUndefined()
    expect(input.birthPlaceText).toBe('杭州市')
  })
})

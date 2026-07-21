import { describe, expect, it } from 'vitest'
import payload from './chinaCities.json'

describe('中国大陆省市离线数据', () => {
  it('覆盖 31 个省级行政区和完整的 369 个城市条目', () => {
    expect(payload.metadata.count).toBe(369)
    expect(new Set(payload.cities.map((city) => city.province))).toHaveLength(31)
    expect(new Set(payload.cities.map((city) => city.adminCode))).toHaveLength(369)
    expect(payload.cities.filter((city) => city.province === '浙江省').map((city) => city.city)).toEqual([
      '杭州市', '湖州市', '嘉兴市', '金华市', '丽水市', '宁波市', '衢州市', '绍兴市', '台州市', '温州市', '舟山市',
    ])
  })

  it('每个条目都有合法代表坐标和可审计来源', () => {
    for (const city of payload.cities) {
      expect(city.latitude).toBeGreaterThanOrEqual(-90)
      expect(city.latitude).toBeLessThanOrEqual(90)
      expect(city.longitude).toBeGreaterThanOrEqual(-180)
      expect(city.longitude).toBeLessThanOrEqual(180)
      expect(city.coordinateSource).toBeTruthy()
      expect(city.canonicalName).toContain(city.city)
    }
  })
})

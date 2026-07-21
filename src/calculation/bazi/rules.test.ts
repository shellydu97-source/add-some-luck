import { describe, expect, it } from 'vitest'
import {
  EARTHLY_BRANCHES, HEAVENLY_STEMS, HIDDEN_STEMS, JIA_ZI, NA_YIN, TEN_GODS, TWELVE_STAGES,
  getNaYin, getTenGod, getTwelveStage, getXun, getXunKong,
} from './rules'

const TEN_GOD_NAMES = new Set(['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'])
const STAGE_NAMES = new Set(['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'])

describe('静态基础规则表穷举', () => {
  it('穷举 12 地支藏干', () => {
    expect(HIDDEN_STEMS).toEqual({
      子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'],
      午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
    })
  })

  it('穷举 10×10 日主与目标天干十神', () => {
    for (const dayStem of HEAVENLY_STEMS) {
      const values = HEAVENLY_STEMS.map((target) => getTenGod(dayStem, target))
      expect(values).toHaveLength(10)
      expect(values.every((value) => TEN_GOD_NAMES.has(value))).toBe(true)
      expect(new Set(values)).toEqual(TEN_GOD_NAMES)
      expect(TEN_GODS[dayStem][dayStem]).toBe('比肩')
    }
    expect(HEAVENLY_STEMS.flatMap((dayStem) => HEAVENLY_STEMS.map((target) => getTenGod(dayStem, target)))).toHaveLength(100)
    expect(TEN_GODS.甲).toEqual({ 甲: '比肩', 乙: '劫财', 丙: '食神', 丁: '伤官', 戊: '偏财', 己: '正财', 庚: '七杀', 辛: '正官', 壬: '偏印', 癸: '正印' })
    expect(TEN_GODS.癸).toEqual({ 甲: '伤官', 乙: '食神', 丙: '正财', 丁: '偏财', 戊: '正官', 己: '七杀', 庚: '正印', 辛: '偏印', 壬: '劫财', 癸: '比肩' })
  })

  it('穷举 60 甲子纳音', () => {
    expect(JIA_ZI).toHaveLength(60)
    expect(Object.keys(NA_YIN)).toHaveLength(60)
    for (const ganZhi of JIA_ZI) expect(getNaYin(ganZhi)).toMatch(/[金木水火土]$/)
    expect([getNaYin('甲子'), getNaYin('甲辰'), getNaYin('壬戌')]).toEqual(['海中金', '覆灯火', '大海水'])
  })

  it('穷举 10×12 天干地支十二长生', () => {
    for (const stem of HEAVENLY_STEMS) {
      const values = EARTHLY_BRANCHES.map((branch) => getTwelveStage(stem, branch))
      expect(values).toHaveLength(12)
      expect(new Set(values)).toEqual(STAGE_NAMES)
      expect(TWELVE_STAGES[stem]).toBeTruthy()
    }
    expect(HEAVENLY_STEMS.flatMap((stem) => EARTHLY_BRANCHES.map((branch) => getTwelveStage(stem, branch)))).toHaveLength(120)
    expect(TWELVE_STAGES.甲.亥).toBe('长生')
    expect(TWELVE_STAGES.乙.午).toBe('长生')
    expect(TWELVE_STAGES.庚.巳).toBe('长生')
    expect(TWELVE_STAGES.癸.卯).toBe('长生')
  })

  it('穷举 60 甲子的旬与旬空', () => {
    for (const ganZhi of JIA_ZI) {
      expect(getXun(ganZhi)).toMatch(/^甲.旬$/)
      expect(getXunKong(ganZhi)).toMatch(/^..$/)
    }
    expect([getXun('甲子'), getXunKong('甲子'), getXun('癸亥'), getXunKong('癸亥')]).toEqual(['甲子旬', '戌亥', '甲寅旬', '子丑'])
  })
})


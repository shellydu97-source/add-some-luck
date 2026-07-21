import { describe, expect, it } from 'vitest'
import { normalizeQuestion } from './text'

describe('重复问题基础判断', () => {
  it('只忽略空格、标点与大小写', () => {
    expect(normalizeQuestion('A方案，和 B方案！')).toBe(normalizeQuestion('a方案和b方案'))
  })

  it('不同文字不会被当成语义相同', () => {
    expect(normalizeQuestion('能否出发')).not.toBe(normalizeQuestion('是否适合旅行'))
  })
})

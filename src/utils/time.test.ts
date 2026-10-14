import { describe, expect, it } from 'vitest'
import { normalizeTimeInput } from './time'

describe('normalizeTimeInput', () => {
  it.each([['9:5', '09:05'], ['09:30', '09:30'], ['0930', '09:30'], ['23：59', '23:59'], [' 7:00 ', '07:00']])('%s -> %s', (input, expected) => {
    expect(normalizeTimeInput(input)).toBe(expected)
  })
  it.each(['24:00', '12:60', '930', 'abc', ''])('rejects %s', (input) => expect(normalizeTimeInput(input)).toBeUndefined())
})

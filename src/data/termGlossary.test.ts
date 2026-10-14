import { describe, expect, it } from 'vitest'
import { termGlossary } from './termGlossary'

// Raw source of every interface file, so the test sees the literal terms passed to TermHelp.
const sources = import.meta.glob(['../**/*.tsx', '!../**/*.test.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('term glossary', () => {
  const entries = Object.entries(termGlossary)
  it('has enough entries, each explained in three parts', () => {
    expect(entries.length).toBeGreaterThanOrEqual(140)
    for (const [term, entry] of entries) {
      expect(entry.definition, term).toBeTruthy()
      expect(entry.plain, term).toBeTruthy()
      expect(entry.howToRead, term).toBeTruthy()
    }
  })
  it('does not use page-boundary wording', () => {
    for (const [term, entry] of entries) expect(JSON.stringify(entry), term).not.toMatch(/本页|这里只/)
  })
  it('explains every literal term the interface links to', () => {
    const used = new Set<string>()
    for (const source of Object.values(sources)) {
      for (const match of source.matchAll(/<TermHelp term="([^"]+)"/g)) used.add(match[1])
    }
    expect(used.size).toBeGreaterThan(10)
    for (const term of used) expect(termGlossary[term], term).toBeTruthy()
  })
})

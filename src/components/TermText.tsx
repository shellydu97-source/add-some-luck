import type { ReactNode } from 'react'
import { termGlossary } from '../data/termGlossary'
import TermHelp from './TermHelp'

// A label that becomes a help link whenever the glossary explains it.
export default function TermText({ term, label }: { term: string; label?: ReactNode }) {
  return termGlossary[term] ? <TermHelp term={term} label={label} /> : <>{label ?? term}</>
}

import { writeFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { securityHeaders } from '../server/security-headers.mjs'
const env = loadEnv('production',process.cwd(),'VITE_')
const headers = securityHeaders(process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL)
await writeFile('dist/_headers',`/*\n${Object.entries(headers).map(([k,v])=>`  ${k}: ${v}`).join('\n')}\n`)

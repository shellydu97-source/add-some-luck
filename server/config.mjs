import fs from 'node:fs'
import path from 'node:path'

function unquote(value) {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function loadLocalEnv(root = process.cwd()) {
  for (const filename of ['.env.local', '.env']) {
    const target = path.join(root, filename)
    if (!fs.existsSync(target)) continue
    for (const line of fs.readFileSync(target, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const divider = trimmed.indexOf('=')
      if (divider < 1) continue
      const key = trimmed.slice(0, divider).trim()
      if (!(key in process.env)) process.env[key] = unquote(trimmed.slice(divider + 1))
    }
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function readConfig(root = process.cwd()) {
  loadLocalEnv(root)
  return {
    apiKey: process.env.DEEPSEEK_API_KEY?.trim() ?? '',
    model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-flash',
    apiUrl: process.env.DEEPSEEK_API_URL?.trim() || 'https://api.deepseek.com/chat/completions',
    dailyLimit: positiveInteger(process.env.AI_DAILY_REQUEST_LIMIT, 300),
    perIpHourlyLimit: positiveInteger(process.env.AI_PER_IP_HOURLY_LIMIT, 60),
    port: positiveInteger(process.env.PORT, 4173),
    host: process.env.HOST?.trim() || '0.0.0.0',
  }
}

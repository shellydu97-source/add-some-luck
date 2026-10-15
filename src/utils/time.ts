const pad = (value: number) => String(value).padStart(2, '0')

// Accepts "9:5", "0930", "09:30" and similar; returns HH:mm or undefined when it is not a valid time.
export function normalizeTimeInput(text: string) {
  const trimmed = text.trim().replace('：', ':')
  const matched = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed) ?? /^(\d{2})(\d{2})$/.exec(trimmed)
  if (!matched) return undefined
  const hour = Number(matched[1]), minute = Number(matched[2])
  return hour <= 23 && minute <= 59 ? `${pad(hour)}:${pad(minute)}` : undefined
}


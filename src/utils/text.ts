export function normalizeQuestion(value: string) {
  return value.replace(/[\s\p{P}\p{S}]/gu, '').toLocaleLowerCase('zh-CN')
}

export function formatDate(value: string, includeTime = false) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

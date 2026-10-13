export function securityHeaders(supabaseUrl = '') {
  let origins = ''
  if (supabaseUrl) {
    const url = new URL(supabaseUrl)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid Supabase URL')
    origins = ` ${url.origin} ${url.origin.replace(/^http/,'ws')}`
  }
  return {
    'Content-Security-Policy': `default-src 'self'; script-src 'self'; connect-src 'self'${origins}; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
}

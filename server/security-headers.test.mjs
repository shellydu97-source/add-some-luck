import { it,expect } from 'vitest'
import { securityHeaders } from './security-headers.mjs'
it('CSP只允许本站与实际Supabase域名，无通配域，含安全响应头',()=>{
 const headers=securityHeaders('https://project.supabase.co/path')
 expect(headers['Content-Security-Policy']).toContain("connect-src 'self' https://project.supabase.co wss://project.supabase.co;")
 expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
 expect(headers['X-Content-Type-Options']).toBe('nosniff')
 expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
 expect(()=>securityHeaders('javascript:alert(1)')).toThrow()
})

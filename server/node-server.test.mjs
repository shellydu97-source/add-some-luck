import { spawn } from 'node:child_process'
import http from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let child
let port
function request(path, host) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path, headers: host ? { Host: host } : {} }, (res) => {
      res.resume()
      res.on('end', () => resolve(res.statusCode))
    })
    req.on('error', reject)
  })
}
beforeAll(async () => {
  child = spawn(process.execPath, ['server/index.mjs', '--api-only', '--port=0'], { stdio: ['ignore', 'pipe', 'pipe'] })
  port = await new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/127\.0\.0\.1:(\d+)/)
      if (match) resolve(Number(match[1]))
    })
    child.on('error', reject)
    child.on('exit', (code) => reject(new Error(`server exited: ${code}`)))
  })
})
afterAll(() => child?.kill())
describe('Node malformed requests', () => {
  it.each([['/%E0%A4%A', undefined], ['/', '[invalid']])('survives %s with Host %s', async (path, host) => {
    expect(await request(path, host)).toBe(400)
    expect(await request('/api/ai/health')).toBe(200)
  })
})

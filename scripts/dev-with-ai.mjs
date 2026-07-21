import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer()
      server.unref()
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE' && port < startPort + 20) tryPort(port + 1)
        else reject(error)
      })
      server.listen(port, '127.0.0.1', () => server.close(() => resolve(port)))
    }
    tryPort(startPort)
  })
}

const webPort = await findAvailablePort(Number(process.env.VITE_PORT || 4173))
const apiPort = await findAvailablePort(Math.max(Number(process.env.AI_PORT || 4174), webPort + 1))
const env = { ...process.env, VITE_PORT: String(webPort), AI_PORT: String(apiPort) }

const children = [
  spawn(process.execPath, ['server/index.mjs', '--api-only', `--port=${apiPort}`], {
    cwd: root,
    env,
    stdio: 'inherit',
  }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host=127.0.0.1', `--port=${webPort}`], {
    cwd: root,
    env,
    stdio: 'inherit',
  }),
]

let stopping = false
function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  setTimeout(() => process.exit(exitCode), 200).unref()
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!stopping && code !== 0) {
      console.error(`[dev] 子进程异常退出：${signal ?? code}`)
      stop(code ?? 1)
    }
  })
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

console.log(`[dev] 前端：http://127.0.0.1:${webPort}/`)
console.log(`[dev] AI 代理：http://127.0.0.1:${apiPort}/api/ai/health`)


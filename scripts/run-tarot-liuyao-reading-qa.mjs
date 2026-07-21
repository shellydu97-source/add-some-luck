import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173'
const port = Number(process.env.QA_CDP_PORT ?? 9341)
const outputDir = resolve(process.env.QA_SCREENSHOT_DIR ?? 'artifacts/tarot-liuyao-reading/screenshots')
const profileDir = resolve(process.env.QA_CHROME_PROFILE ?? resolve(tmpdir(), 'luck-app-tarot-liuyao-reading-qa'))
await mkdir(outputDir, { recursive: true })
await mkdir(profileDir, { recursive: true })

const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profileDir}`,
  '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore', windowsHide: true })

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
async function waitForEndpoint() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch { /* Chrome is still starting. */ }
    await delay(100)
  }
  throw new Error('Chrome DevTools endpoint did not start.')
}

await waitForEndpoint()
const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${baseUrl}/welcome`)}`, { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener('open', resolveOpen, { once: true })
  socket.addEventListener('error', rejectOpen, { once: true })
})

let commandId = 0
const pending = new Map()
const browserErrors = []
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id) {
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
    return
  }
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') browserErrors.push(message.params.entry.text)
  if (message.method === 'Page.javascriptDialogOpening') void send('Page.handleJavaScriptDialog', { accept: true })
})

function send(method, params = {}) {
  commandId += 1
  const id = commandId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolveCommand, rejectCommand) => pending.set(id, { resolve: resolveCommand, reject: rejectCommand }))
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.text}: ${result.exceptionDetails.exception?.description ?? expression}`)
  return result.result.value
}

async function waitFor(expression, label, timeout = 9000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}.`)
}

async function navigate(path) {
  await send('Page.navigate', { url: `${baseUrl}${path}` })
  await waitFor(`location.href.startsWith(${JSON.stringify(`${baseUrl}${path}`)})`, `${path} navigation`)
  await waitFor(`document.readyState === 'complete'`, path)
  await delay(300)
}

async function clickText(text, selector = 'button, a') {
  const clicked = await evaluate(`(() => {
    const normalized = ${JSON.stringify(text.replace(/\s+/g, ''))}
    const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find((element) => element.textContent?.replace(/\\s+/g, '').includes(normalized))
    if (!target) return false
    target.click()
    return true
  })()`)
  if (!clicked) throw new Error(`Could not find clickable text: ${text}`)
  await delay(300)
}

async function setTextarea(value) {
  const changed = await evaluate(`(() => {
    const target = document.querySelector('textarea')
    if (!target) return false
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(target, ${JSON.stringify(value)})
    target.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  if (!changed) throw new Error('Textarea was not found.')
}

async function screenshot(filename) {
  const image = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true })
  await writeFile(resolve(outputDir, filename), Buffer.from(image.data, 'base64'))
}

async function interceptClipboard() {
  await evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { globalThis.__copiedText = text } } })`)
}

function motionExpression() {
  return `(() => {
    const track = document.querySelector('.tarot-lane-track')
    const cursor = Number(track?.dataset.cursor ?? 0)
    const match = track?.style.transform.match(/translate3d\\((-?[\\d.]+)px/)
    const offset = Math.abs(Number(match?.[1] ?? 0))
    return { cursor, offset, distance: cursor * 92 + offset, transform: track?.style.transform ?? '' }
  })()`
}

async function startTarot(spreadLabel, question) {
  await navigate('/divination/tarot/question')
  await setTextarea(question)
  await clickText('下一步：选择牌阵')
  await clickText(spreadLabel)
}

async function startLiuyao(question) {
  await navigate('/divination/liuyao/question')
  await setTextarea(question)
  await clickText('下一步：选择起爻方式')
  await clickText('手动录入')
  await waitFor(`document.querySelector('.manual-coins')`, 'manual coin input')
}

async function castManual(values) {
  const toggleIndexes = {
    6: [0, 1, 2],
    7: [1, 2],
    8: [2],
    9: [],
  }
  for (let line = 0; line < values.length; line += 1) {
    const indexes = toggleIndexes[values[line]]
    await evaluate(`(() => {
      const coins = [...document.querySelectorAll('.manual-coins .coin')];
      const indexes = ${JSON.stringify(indexes)};
      indexes.forEach((index) => coins[index].click())
      return coins.length
    })()`)
    await clickText('确认第')
  }
  await waitFor(`location.pathname === '/divination/liuyao/confirm'`, 'liuyao confirmation')
  await clickText('确认并锁定原始六爻')
  await waitFor(`location.pathname === '/divination/liuyao/result'`, 'liuyao result')
  await waitFor(`document.querySelector('.ai-reading-panel') && document.querySelector('.result-hero')`, 'liuyao result content')
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })

  const state = { schemaVersion: '1.2', lastPrimaryRoute: 'charts', reduceMotion: false, activeProfileId: '', profiles: [], records: [], drafts: [] }
  await navigate('/welcome')
  await evaluate(`localStorage.setItem('add-luck-v1-demo', ${JSON.stringify(JSON.stringify({ state, version: 4 }))})`)

  await startTarot('单牌', '我现在最需要留意什么？')
  await clickText('开始仪式抽牌')
  await waitFor(`document.querySelector('[data-phase="rolling"]')`, 'ritual rolling phase')
  const motionBefore = await evaluate(motionExpression())
  await delay(500)
  const motionAfter = await evaluate(motionExpression())
  await screenshot('01-tarot-ritual-fast-flow.png')
  await clickText('暂停牌流')
  await waitFor(`document.querySelector('[data-phase="paused"]')`, 'ritual paused phase')
  const pausedBefore = await evaluate(motionExpression())
  await delay(500)
  const pausedAfter = await evaluate(motionExpression())
  if (motionAfter.distance - motionBefore.distance < 100) throw new Error('Tarot ritual flow did not reach the accelerated distance threshold.')
  if (JSON.stringify(pausedBefore) !== JSON.stringify(pausedAfter)) throw new Error('Tarot ritual flow moved after pause.')

  await startTarot('三牌', '我该如何安排接下来的行动？')
  await clickText('替我抽牌')
  await clickText('确认抽牌并统一翻开')
  await waitFor(`location.pathname === '/divination/tarot/result'`, 'three-card result')
  await evaluate(`document.querySelector('.result-disclosure')?.setAttribute('open', '')`)
  await waitFor(`document.body.innerText.includes('整体发展脉络') && document.body.innerText.includes('主要矛盾')`, 'three-card reading')
  await screenshot('02-tarot-three-card-reading.png')
  await interceptClipboard()
  await evaluate(`[...document.querySelectorAll('.result-disclosure')][1]?.setAttribute('open', '')`)
  await clickText('复制完整牌面信息')
  await waitFor(`document.body.innerText.includes('已复制，可以粘贴到你常用的大模型中。')`, 'tarot copy notice')
  const tarotThreeCopy = await evaluate(`globalThis.__copiedText`)
  const threeCardLabels = await evaluate(`[...document.querySelectorAll('.position-readings li > b')].map((item) => item.textContent)`)
  if (!threeCardLabels.every((label) => label.split(/[·（）]/).map((part) => part.trim()).filter(Boolean).every((part) => tarotThreeCopy.includes(part)))) throw new Error('Three-card copy differs from the visible cards.')
  await writeFile(resolve(outputDir, '../tarot-three-copy.txt'), tarotThreeCopy, 'utf8')

  await startTarot('双路径', '我想比较 A 和 B 两条路径。')
  await clickText('替我抽牌')
  await clickText('确认抽牌并统一翻开')
  await waitFor(`location.pathname === '/divination/tarot/result'`, 'dual-path result')
  await evaluate(`document.querySelector('.result-disclosure')?.setAttribute('open', '')`)
  await waitFor(`document.body.innerText.includes('A / B 核心差异') && document.body.innerText.includes('A 路径：优势与风险') && document.body.innerText.includes('B 路径：优势与风险')`, 'dual-path reading')
  await screenshot('03-tarot-five-card-reading.png')
  await interceptClipboard()
  await clickText('复制完整牌面信息')
  const tarotFiveCopy = await evaluate(`globalThis.__copiedText`)
  await writeFile(resolve(outputDir, '../tarot-five-copy.txt'), tarotFiveCopy, 'utf8')

  await startLiuyao('当前局面是否需要先保持稳定？')
  await castManual([7, 8, 7, 8, 7, 8])
  const noMovingState = await evaluate(`({
    originalHeadings: [...document.querySelectorAll('.result-hero h2')].map((item) => item.textContent),
    hasArrow: Boolean(document.querySelector('.result-arrow')),
    hasNoMovingMessage: document.body.innerText.includes('无动爻，变卦同本卦')
  })`)
  if (noMovingState.originalHeadings.length !== 1 || noMovingState.hasArrow || !noMovingState.hasNoMovingMessage) throw new Error('No-moving-line result duplicated the hexagram.')
  await screenshot('04-liuyao-no-moving-reading.png')

  await startLiuyao('推进这件事时主要要观察什么？')
  await castManual([6, 7, 8, 9, 7, 6])
  await evaluate(`document.querySelector('.result-disclosure')?.setAttribute('open', '')`)
  await waitFor(`document.body.innerText.includes('第 1 爻') && document.body.innerText.includes('第 4 爻') && document.body.innerText.includes('第 6 爻')`, 'multiple moving-line reading')
  await screenshot('05-liuyao-moving-reading.png')
  await evaluate(`(() => { const disclosure = [...document.querySelectorAll('.result-disclosure')][1]; disclosure?.setAttribute('open', ''); disclosure?.querySelector('.professional-details')?.setAttribute('open', '') })()`)
  await screenshot('06-liuyao-professional-and-reading.png')
  await interceptClipboard()
  await clickText('复制完整排盘信息')
  await waitFor(`document.body.innerText.includes('已复制，可以粘贴到你常用的大模型中。')`, 'liuyao copy notice')
  const liuyaoCopy = await evaluate(`globalThis.__copiedText`)
  const requiredLiuyaoCopyTerms = ['阳面3', '阴面2', '本卦：', '变卦：', '动爻：', '八宫', '纳甲', '月建', '日辰', '旬空', '不得修改本卦、变卦、动爻或排盘字段']
  if (!requiredLiuyaoCopyTerms.every((term) => liuyaoCopy.includes(term))) throw new Error('Liuyao copy is missing required fields.')
  await writeFile(resolve(outputDir, '../liuyao-copy.txt'), liuyaoCopy, 'utf8')

  const desktopOverflow = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await delay(350)
  const mobileOverflow = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
  await screenshot('07-mobile-390-liuyao-reading.png')

  const report = {
    testedAt: new Date().toISOString(),
    baseUrl,
    ritualSpeedConstant: 264,
    ritualMotionDistanceIn500ms: motionAfter.distance - motionBefore.distance,
    ritualMotionBefore: motionBefore,
    ritualMotionAfter: motionAfter,
    ritualPauseLocked: JSON.stringify(pausedBefore) === JSON.stringify(pausedAfter),
    threeCardSectionsPresent: true,
    fiveCardSectionsPresent: true,
    noMovingState,
    liuyaoMultipleMovingLines: [1, 4, 6],
    tarotThreeCopyCharacters: tarotThreeCopy.length,
    tarotFiveCopyCharacters: tarotFiveCopy.length,
    liuyaoCopyCharacters: liuyaoCopy.length,
    desktopOverflow,
    mobileOverflow,
    browserErrors,
  }
  await writeFile(resolve(outputDir, '../browser-qa-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
} finally {
  socket.close()
  chrome.kill()
}

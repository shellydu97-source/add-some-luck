import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173'
const port = Number(process.env.QA_CDP_PORT ?? 9337)
const outputDir = resolve(process.env.QA_SCREENSHOT_DIR ?? 'artifacts/formal-release/screenshots')
const profileDir = resolve(process.env.QA_CHROME_PROFILE ?? resolve(tmpdir(), 'luck-app-formal-release-browser-qa'))
await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
await mkdir(profileDir, { recursive: true })

const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, '--remote-allow-origins=*', `--user-data-dir=${profileDir}`,
  '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore', windowsHide: true })

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
async function waitForEndpoint() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
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
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text)
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

async function waitFor(expression, label, timeout = 8000) {
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
  await delay(350)
}

async function clickText(text, selector = 'button, a') {
  const clicked = await evaluate(`(() => {
    const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find((element) => element.textContent?.replace(/\\s+/g, '').includes(${JSON.stringify(text.replace(/\s+/g, ''))}))
    if (!target) return false
    target.click()
    return true
  })()`)
  if (!clicked) throw new Error(`Could not find clickable text: ${text}`)
  await delay(350)
}

async function screenshot(filename) {
  await waitFor(`!document.querySelector('.startup-splash')`, 'startup splash dismissal', 3000)
  const image = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true })
  await writeFile(resolve(outputDir, filename), Buffer.from(image.data, 'base64'))
}

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })

const cityPayload = JSON.parse(await readFile(resolve('src/data/chinaCities.json'), 'utf8'))
const shanghai = cityPayload.cities.find((city) => city.province === '上海市')
if (!shanghai) throw new Error('Shanghai city data is missing.')
const now = '2026-07-15T02:00:00.000Z'
const profile = {
  id: 'profile-browser-qa', name: '小橙', gender: 'female', relation: 'self', notes: '', calendarType: 'solar',
  rawBirthDate: '1997/08/30', lunarLeapMonth: false, rawBirthTime: '09:30', normalizationStatus: 'unprocessed',
  birthPlaceText: shanghai.canonicalName, birthLocation: {
    canonicalName: shanghai.canonicalName, province: shanghai.province, city: shanghai.city,
    latitude: shanghai.latitude, longitude: shanghai.longitude, ianaTimeZone: 'Asia/Shanghai',
    coordinateSource: shanghai.coordinateSource, coordinateDataVersion: cityPayload.metadata.dataVersion, userConfirmed: true,
  },
  countryCode: '中国', city: '上海市', latitude: shanghai.latitude, longitude: shanghai.longitude, timezone: 'Asia/Shanghai',
  daylightSavingStatus: 'unknown', timeAccuracy: 'exact_minute', useTrueSolarTime: 'system_default',
  dayBoundaryRule: 'system_default', houseSystem: 'system_default', unknownTimePolicy: 'time_independent_only',
  isDefault: true, createdAt: now, updatedAt: now,
}
const state = { schemaVersion: '1.2', lastPrimaryRoute: 'charts', reduceMotion: false, activeProfileId: profile.id, profiles: [profile], records: [], drafts: [] }
await navigate('/welcome')
await evaluate(`localStorage.setItem('add-luck-guest-access-v1', 'allowed')`)
await evaluate(`localStorage.setItem('add-luck-v1-demo', ${JSON.stringify(JSON.stringify({ state, version: 4 }))})`)

await navigate(`/charts/${profile.id}/bazi`)
await waitFor(`document.querySelector('.hero-title') && document.querySelector('.ai-reading-panel')`, 'bazi overview')
await screenshot('00-bazi-overview.png')

await navigate(`/charts/${profile.id}/astrology`)
await waitFor(`location.pathname === ${JSON.stringify(`/charts/${profile.id}/bazi`)} && !document.querySelector('.astrology-wheel')`, 'hidden astrology redirect')

await navigate('/today')
await waitFor(`document.body.innerText.includes('今日运势') && document.body.innerText.includes('小橙')`, 'today hub')
await screenshot('00-today-hub.png')

await navigate('/profiles/new')
await clickText('选择省份和城市', 'button')
await waitFor(`[...document.querySelectorAll('select')].some((item) => [...item.options].some((option) => option.textContent === '浙江省'))`, 'province selector')
await evaluate(`(() => {
  const select = [...document.querySelectorAll('select')].find((item) => [...item.options].some((option) => option.textContent === '浙江省'))
  select.value = '浙江省'
  select.dispatchEvent(new Event('change', { bubbles: true }))
})()`)
await waitFor(`[...document.querySelectorAll('[role="option"]')].some((item) => item.textContent.includes('舟山市'))`, 'complete Zhejiang city list')
const zhejiangCityCount = await evaluate(`document.querySelectorAll('[role="option"]').length`)
await screenshot('01-province-city-selector.png')

await navigate('/divination/tarot/question')
await clickText('下一步：选择牌阵')
await clickText('单牌')
await clickText('开始仪式抽牌')
await waitFor(`document.querySelector('[data-phase="rolling"]')`, 'ritual card flow')
const transformBefore = await evaluate(`document.querySelector('.tarot-lane-track')?.style.transform ?? ''`)
await delay(650)
const transformAfter = await evaluate(`document.querySelector('.tarot-lane-track')?.style.transform ?? ''`)
await screenshot('02-tarot-ritual-rolling.png')
await clickText('暂停牌流')
await clickText('选定中央牌')
await clickText('确认抽牌并统一翻开')
await waitFor(`location.pathname === '/divination/tarot/result'`, 'ritual tarot result')
await screenshot('03-tarot-formal-result.png')
await clickText('保存到记录')
await waitFor(`location.pathname.startsWith('/records/')`, 'tarot record detail')
await screenshot('04-tarot-record-detail.png')

await navigate('/divination/tarot/question')
await clickText('下一步：选择牌阵')
await clickText('三牌')
await clickText('替我抽牌')
await waitFor(`location.pathname === '/divination/tarot/draw'`, 'system tarot draw')
await screenshot('05-tarot-system-draw.png')
await clickText('确认抽牌并统一翻开')
await waitFor(`location.pathname === '/divination/tarot/result'`, 'system tarot result')

await navigate('/divination/liuyao/question')
await clickText('下一步：选择起爻方式')
await clickText('投掷第')
await screenshot('06-liuyao-digital-cast.png')

await navigate('/divination/liuyao/question')
await clickText('下一步：选择起爻方式')
await clickText('手动录入')
await waitFor(`document.querySelector('.manual-coins')`, 'manual coin input')
await screenshot('07-liuyao-manual-entry.png')
for (let line = 0; line < 6; line += 1) {
  if (line === 0 || line === 3) {
    const toggled = await evaluate(`(() => { const coins = [...document.querySelectorAll('.manual-coins .coin')]; coins.forEach((coin) => coin.click()); return coins.length })()`)
    if (toggled !== 3) throw new Error('Manual coin buttons are incomplete.')
  } else if (line === 2 || line === 5) {
    await evaluate(`document.querySelector('.manual-coins .coin')?.click()`)
  }
  await clickText('确认第')
}
await waitFor(`location.pathname === '/divination/liuyao/confirm'`, 'liuyao confirmation')
await clickText('确认并锁定原始六爻')
await waitFor(`location.pathname === '/divination/liuyao/result'`, 'liuyao result')
await screenshot('08-liuyao-basic-result.png')
await evaluate(`(() => { const disclosure = [...document.querySelectorAll('.result-disclosure')][1]; disclosure?.setAttribute('open', ''); disclosure?.querySelector('.professional-details')?.setAttribute('open', '') })()`)
await screenshot('09-liuyao-professional-chart.png')
await clickText('保存到记录')
await waitFor(`location.pathname.startsWith('/records/')`, 'liuyao record detail')
await evaluate(`(() => { const disclosure = document.querySelector('.result-disclosure'); disclosure?.setAttribute('open', ''); disclosure?.querySelector('.professional-details')?.setAttribute('open', '') })()`)
await screenshot('10-liuyao-record-detail.png')

await navigate('/me')
await waitFor(`document.body.innerText.includes('我的') && document.body.innerText.includes('最近记录')`, 'my hub')
await screenshot('10-my-hub.png')

const desktopOverflow = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await delay(250)
const mobileOverflow = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)
await screenshot('11-mobile-390-record-detail.png')

await navigate('/settings')
const settingsText = await evaluate(`document.body.innerText`)
await screenshot('12-settings-clean.png')
const forbiddenTerms = ['V1 基础版', '演示模式', '未接 AI', '未接解读', '真实基础天文计算', 'engineVersion', 'adapterVersion', 'ruleVersion', 'coordinateDataVersion', '计算详情', '技术规则说明']
const visibleForbiddenTerms = forbiddenTerms.filter((term) => settingsText.includes(term))

const report = {
  testedAt: new Date().toISOString(), baseUrl, zhejiangCityCount,
  ritualAnimationMoved: Boolean(transformBefore && transformAfter && transformBefore !== transformAfter),
  ritualTransforms: { before: transformBefore, after: transformAfter },
  desktopOverflow, mobileOverflow, visibleForbiddenTerms, browserErrors,
  screenshots: (await import('node:fs/promises')).readdir(outputDir).then((files) => files.sort()),
}
report.screenshots = await report.screenshots
await writeFile(resolve(outputDir, '../browser-qa-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))

socket.close()
chrome.kill()

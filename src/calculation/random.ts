export function hashSeed(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seededValues(seed: string, count: number) {
  let state = hashSeed(seed) || 1
  return Array.from({ length: count }, () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  })
}

export interface RandomUint32Source {
  nextUint32: () => number
}

export const webCryptoRandomSource: RandomUint32Source = {
  nextUint32() {
    const cryptoApi = globalThis.crypto
    if (!cryptoApi?.getRandomValues) throw new Error('当前浏览器不支持安全随机数。')
    return cryptoApi.getRandomValues(new Uint32Array(1))[0]!
  },
}

export function createSeededRandomSource(seed: string): RandomUint32Source {
  let state = hashSeed(seed) || 0x6d2b79f5
  return {
    nextUint32() {
      state += 0x6d2b79f5
      let value = state
      value = Math.imul(value ^ (value >>> 15), value | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return (value ^ (value >>> 14)) >>> 0
    },
  }
}

export function randomInteger(maxExclusive: number, source: RandomUint32Source = webCryptoRandomSource) {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new RangeError('随机整数范围无效。')
  }
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive
  let value = source.nextUint32()
  while (value >= limit) value = source.nextUint32()
  return value % maxExclusive
}

export function fisherYatesShuffle<T>(items: readonly T[], source: RandomUint32Source = webCryptoRandomSource) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = randomInteger(index + 1, source)
    ;[shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!]
  }
  return shuffled
}

export function createRandomToken(byteLength = 16) {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) throw new Error('当前浏览器不支持安全随机数。')
  return Array.from(cryptoApi.getRandomValues(new Uint8Array(byteLength)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

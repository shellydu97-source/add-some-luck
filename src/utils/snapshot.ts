import { meihuaHexagrams } from '../calculation/meihua/data'
import { hexagramByNumber } from '../calculation/liuyao/data'

import { compressSnapshot, decompressSnapshot } from './snapshotCodec'

export function readSnapshot(input: Record<string, unknown>): Record<string, unknown> {
  let result = input
  if (input.snapshotFormat === 'lz77-json-1' && typeof input.data === 'string') result = JSON.parse(decompressSnapshot(input.data)) as Record<string, unknown>
  // Old snapshots retain their original text; only number references resolve from the table.
  const output = { ...result }
  for (const key of ['original','changed','mutual','opposite','reversed']) {
    if (typeof output[key] === 'number') output[key] = result.bodyTrigram ? meihuaHexagrams.find(h => h.number === output[key]) : hexagramByNumber.get(output[key] as number)
  }
  return output
}
export function compactSnapshot(input: Record<string, unknown>) {
  const result = { ...input }
  for (const key of ['original','changed','mutual','opposite','reversed']) {
    const hex = result[key] as {number?:number} | undefined
    if (hex?.number) result[key] = hex.number
  }
  return { snapshotFormat: 'lz77-json-1', data: compressSnapshot(JSON.stringify(result)) }
}

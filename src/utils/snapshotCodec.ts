// Lossless UTF-8 LZ77. Groups of 8 tokens have a bit mask; matches encode a
// 16-bit backward distance and one-byte length (3–258). No runtime dependency.
export function compressSnapshot(text: string) {
  const source = new TextEncoder().encode(text), out: number[] = []
  const positions = new Map<number,number[]>()
  const hash = (i: number) => source[i]*65536+source[i+1]*256+source[i+2]
  let i = 0
  while (i < source.length) {
    const header = out.length; out.push(0)
    for (let bit=0;bit<8 && i<source.length;bit++) {
      const candidates = i+2 < source.length ? positions.get(hash(i)) ?? [] : []
      let length = 0, previous = 0
      for (const candidate of candidates) {
        if (i-candidate > 65535) continue
        let matched = 0
        while (matched<258 && i+matched<source.length && source[candidate+matched]===source[i+matched]) matched++
        if(matched>length) { length=matched; previous=candidate }
      }
      const count = length >= 3 ? length : 1
      if (length >= 3) { const distance=i-previous; out[header]|=1<<bit; out.push(distance>>8,distance&255,length-3) }
      else out.push(source[i])
      for (let j=0;j<count;j++) if(i+j+2<source.length) positions.set(hash(i+j),[i+j,...(positions.get(hash(i+j)) ?? []).slice(0,7)])
      i+=count
    }
  }
  return btoa(Array.from(out,c=>String.fromCharCode(c)).join(''))
}
export function decompressSnapshot(input: string) {
  if (input.length > 2_000_000) throw new Error('快照超过大小限制')
  const data=atob(input), out:number[]=[]
  let i=0
  while(i<data.length) {
    const mask=data.charCodeAt(i++)
    for(let bit=0;bit<8 && i<data.length;bit++) {
      if(mask & 1<<bit) {
        if(i+3>data.length) throw new Error('快照编码损坏')
        const distance=data.charCodeAt(i++)*256+data.charCodeAt(i++), length=data.charCodeAt(i++)+3
        if(!distance || distance>out.length) throw new Error('快照编码损坏')
        for(let j=0;j<length;j++) out.push(out[out.length-distance])
      } else out.push(data.charCodeAt(i++))
      if(out.length>4_000_000) throw new Error('快照超过大小限制')
    }
  }
  return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(out))
}

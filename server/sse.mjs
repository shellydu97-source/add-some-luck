export function sseEvent(event,data) {return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`}
// Incremental UTF-8 + line parsing: CRLF, split delimiters, comments, multi-line data.
export async function* parseSse(body,signal) {
  if(!body) throw new Error('Missing stream body')
  const reader=body.getReader(),decoder=new TextDecoder()
  let buffer='',event='message',data=[],eventSize=0
  const abort=()=>{reader.cancel().catch(()=>{})}
  signal?.addEventListener('abort',abort,{once:true})
  const line=(value)=>{
    if(!value) {const item=data.length ? {event,data:data.join('\n')} : null;event='message';data=[];eventSize=0;return item}
    if(value.startsWith(':')) return null
    const colon=value.indexOf(':'),field=colon<0?value:value.slice(0,colon)
    const text=colon<0?'':value.slice(colon+1).replace(/^ /,'')
    if(field==='event')event=text
    if(field==='data'){eventSize+=text.length;if(eventSize>200000)throw new Error('SSE event too large');data.push(text)}
    return null
  }
  try {
    while(true) {
      if(signal?.aborted) throw signal.reason ?? new DOMException('Aborted','AbortError')
      const chunk=await reader.read()
      buffer+=chunk.done?decoder.decode():decoder.decode(chunk.value,{stream:true})
      while(buffer.includes('\n')) {const end=buffer.indexOf('\n');const item=line(buffer.slice(0,end).replace(/\r$/,''));buffer=buffer.slice(end+1);if(item) yield item}
      if(buffer.length>200000)throw new Error('SSE event too large')
      if(chunk.done) {if(signal?.aborted)throw signal.reason ?? new DOMException('Aborted','AbortError');break}
    }
    // An unterminated frame is not a completion signal.
  } finally {signal?.removeEventListener('abort',abort);await reader.cancel().catch(()=>{});reader.releaseLock()}
}

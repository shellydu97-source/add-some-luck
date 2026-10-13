import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
export async function sendWebResponse(result,response) {
  response.writeHead(result.status,Object.fromEntries(result.headers))
  response.flushHeaders?.()
  if(result.body) {
    try {await pipeline(Readable.fromWeb(result.body),response)}
    catch(error){if(!response.destroyed)throw error}
  } else response.end()
}

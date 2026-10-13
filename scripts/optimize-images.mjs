import sharp from 'sharp'
import { readdir, stat } from 'node:fs/promises'
const root = new URL('../public/',import.meta.url)
let total = 0, max = 0, count = 0
for (const name of await readdir(new URL('tarot/rws/',root))) {
  if (!name.endsWith('.jpg')) continue
  const input = new URL(`tarot/rws/${name}`,root), output = new URL(`tarot/rws/${name.replace('.jpg','.webp')}`,root)
  let size = 0
  for (let quality=80;quality>=40;quality-=10) {
    await sharp(input.pathname).resize({width:600,withoutEnlargement:true}).webp({quality}).toFile(output.pathname)
    size=(await stat(output)).size
    if(size<80_000) break
  }
  if(size>=80_000) throw new Error(`图片超出预算：${name}`)
  total+=size;max=Math.max(max,size);count++
}
await sharp(new URL('brand-mark.png',root).pathname).resize({width:600,withoutEnlargement:true}).webp({quality:80}).toFile(new URL('brand-mark.webp',root).pathname)
for(const size of [192,512]) await sharp(new URL('app-icon.png',root).pathname).resize(size,size).png({compressionLevel:9,palette:true}).toFile(new URL(`app-icon-${size}.png`,root).pathname)
await sharp(new URL('app-icon.png',root).pathname).resize(400,400).extend({top:56,bottom:56,left:56,right:56,background:'#f7f8fb'}).png({compressionLevel:9,palette:true}).toFile(new URL('app-icon-maskable-512.png',root).pathname)
console.log(JSON.stringify({cards:count,totalBytes:total,maxBytes:max}))

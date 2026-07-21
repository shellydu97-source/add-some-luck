import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourcePath = resolve(root, 'artifacts/liuyao-golden/sources/najia-1.2.4-guaci.txt')
const outputPath = resolve(root, 'src/data/zhouyiTexts.json')
const source = readFileSync(sourcePath, 'utf8')

const linePrefix = /^(初[六九]|[六九][二三四五]|上[六九])：/
const sections = source.split(/^=====$/m).map((section) => section.trim()).filter((section) => section.startsWith('《易经》第'))

const parsed = sections.map((section, index) => {
  const [intro = '', lineBlock = ''] = section.split(/^\*{5,}$/m)
  const introLines = intro.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const judgment = introLines.slice(1).find((line) => !line.startsWith('彖曰：') && !line.startsWith('象曰：')) ?? ''
  const lineTexts = lineBlock.split(/\r?\n/).map((line) => line.trim().replace(/^[。．]+/, '')).filter((line) => linePrefix.test(line)).slice(0, 6)
  if (index === 28) lineTexts[5] = '上六：系用徽纆，置于丛棘，三岁不得，凶。'
  if (!judgment || lineTexts.length !== 6) {
    throw new Error(`第 ${index + 1} 卦文本解析失败：卦辞=${Boolean(judgment)}，爻辞=${lineTexts.length}`)
  }
  return { judgment, lineTexts }
})

parsed.splice(51, 0, {
  judgment: '艮：艮其背，不获其身；行其庭，不见其人，无咎。',
  lineTexts: ['初六：艮其趾，无咎，利永贞。', '六二：艮其腓，不拯其随，其心不快。', '九三：艮其限，列其夤，厉薰心。', '六四：艮其身，无咎。', '六五：艮其辅，言有序，悔亡。', '上九：敦艮，吉。'],
})

const lineRepairs = {
  '1-2': '九二：见龙在田，利见大人。',
  '2-6': '上六：龙战于野，其血玄黄。',
  '8-5': '九五：显比，王用三驱，失前禽。邑人不戒，吉。',
  '18-3': '九三：干父之蛊，小有悔，无大咎。',
  '24-6': '上六：迷复，凶，有灾眚。用行师，终有大败，以其国君凶；至于十年不克征。',
  '25-2': '六二：不耕获，不菑畬，则利有攸往。',
  '26-4': '六四：童牛之牿，元吉。',
  '27-2': '六二：颠颐，拂经，与丘颐，征凶。',
  '28-2': '九二：枯杨生稊，老夫得其女妻，无不利。',
  '38-6': '上九：睽孤，见豕负涂，载鬼一车，先张之弧，后说之弧，匪寇婚媾，往遇雨则吉。',
  '43-1': '初九：壮于前趾，往不胜为咎。',
  '44-1': '初六：系于金柅，贞吉，有攸往，见凶，羸豕孚踟躅。',
  '47-6': '上六：困于葛藟，于臲卼，曰动悔。有悔，征吉。',
  '48-6': '上六：井收勿幕，有孚元吉。',
  '49-2': '六二：巳日乃革之，征吉，无咎。',
  '57-2': '九二：巽在床下，用史巫纷若，吉无咎。',
  '63-2': '六二：妇丧其茀，勿逐，七日得。',
  '63-4': '六四：繻有衣袽，终日戒。',
}
for (const [key, value] of Object.entries(lineRepairs)) {
  const [hexagram, line] = key.split('-').map(Number)
  parsed[hexagram - 1].lineTexts[line - 1] = value
}

const texts = parsed.map((text, index) => ({ number: index + 1, ...text }))
if (texts.length !== 64) throw new Error(`预期 64 卦，实际解析 ${texts.length} 卦。`)
writeFileSync(outputPath, `${JSON.stringify(texts, null, 2)}\n`, 'utf8')
console.log(`已生成 ${outputPath}：64 条卦辞、384 条爻辞。`)

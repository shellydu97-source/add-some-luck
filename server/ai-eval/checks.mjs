const prohibited=['一定','必然','绝对','稳赚','保证成功']
const reportHeadings=['不确定之处','规则推断','排盘事实']
// Unexplained jargon in the opening paragraph makes the answer read like a report.
const jargon=['用神','原神','忌神','世爻','应爻','月建','日辰','旬空','月破','暗动','回头生','回头克','十神','日主','体卦','用卦','纳甲','六亲','六神','伏神']
const negation=/(不|不能|无法|未|没有|并非|避免|拒绝).{0,10}$/
export function evaluateAnswer(answer,context) {
 const first=answer.trim().split(/[。！？!?\n]/)[0]
 const directFirst=!!first && !/^(排盘事实|规则推断|现实建议|不确定之处|以下是|首先介绍|让我分析)/.test(first)
 const absoluteTerms=[]
 for(const word of prohibited)for(const match of answer.matchAll(new RegExp(word,'g'))) {
  const prefix=answer.slice(Math.max(0,match.index-14),match.index)
  if(!negation.test(prefix))absoluteTerms.push(word)
 }
 const allowedHexagrams=[context.original?.name,context.mutual?.name,context.changed?.name].filter(Boolean)
 const extraHexagrams=(answer.match(/(?:乾为天|坤为地|水天需|火泽睽|水火既济|火雷噬嗑|天风姤|山地剥|泽山咸)/g) ?? []).filter(name=>!allowedHexagrams.includes(name))
 const allowedCards=context.cards?.map(c=>c.nameZh) ?? []
 const extraCards=(answer.match(/(?:宝剑三|宝剑九|宝剑十|圣杯八|星星|世界|太阳|愚人)/g) ?? []).filter(name=>!allowedCards.includes(name))
 const reportStyle=reportHeadings.filter(word=>answer.includes(word))
 const opening=answer.trim().split(/\n\s*\n/)[0] ?? ''
 const unexplainedJargon=jargon.filter(term=>opening.includes(term) && !new RegExp(`${term}[（(]`).test(opening))
 return {directFirst,reportStyle,unexplainedJargon,absoluteTerms:[...new Set(absoluteTerms)],extraHexagrams:[...new Set(extraHexagrams)],extraCards:[...new Set(extraCards)],needsManualReview:!directFirst || reportStyle.length>0 || unexplainedJargon.length>3 || absoluteTerms.length>0 || extraHexagrams.length>0 || extraCards.length>0}
}

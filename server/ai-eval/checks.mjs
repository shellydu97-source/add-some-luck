const prohibited=['一定','必然','绝对','稳赚','保证成功']
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
 return {directFirst,absoluteTerms:[...new Set(absoluteTerms)],extraHexagrams:[...new Set(extraHexagrams)],extraCards:[...new Set(extraCards)],needsManualReview:!directFirst || absoluteTerms.length>0 || extraHexagrams.length>0 || extraCards.length>0}
}

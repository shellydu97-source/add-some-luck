import { USE_GOD_OPTIONS, type LiuyaoJudgement, type UseGod } from '../calculation/liuyao/judgement'
import TermHelp from './TermHelp'
import { Card, SectionHeading } from './UI'

const FLAG_TERMS = ['月破', '旬空', '暗动', '日破', '入墓', '回头生', '回头克', '化进神', '化退神', '化空', '化墓', '化绝', '六冲卦', '六合卦', '反吟', '伏吟']

// Only the terms that actually show up in this judgement get a help link.
function judgementTerms(judgement: LiuyaoJudgement) {
  const text = [...judgement.reasons, ...judgement.movingEffects, ...judgement.auxiliaryFlags.map((flag) => `${flag}卦`), ...(judgement.useGodState?.flags ?? [])].join(' ')
  return ['用神', '原神', '忌神', '旺相休囚死', ...(judgement.useGod.source === 'hidden' ? ['伏神', '飞神'] : []), ...FLAG_TERMS.filter((term) => text.includes(term))]
}

export default function LiuyaoJudgementCard({ judgement, onOverride }: { judgement: LiuyaoJudgement; onOverride: (value: UseGod) => void }) {
  return <Card className="interpretation-card summary-reading">
    <SectionHeading title={judgement.tendency} />
    <ul className="plain-list">{judgement.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
    <label className="field">
      <span>用神（可改选）</span>
      <select value={judgement.useGod.relation} onChange={e => onOverride(e.target.value as UseGod)}>{USE_GOD_OPTIONS.map(g => <option key={g}>{g}</option>)}</select>
    </label>
    <p>{judgement.advice}</p>
    <p className="term-chip-row"><span>相关术语：</span>{judgementTerms(judgement).map((term) => <TermHelp key={term} term={term} />)}</p>
    <details>
      <summary>查看用神与动变依据</summary>
      <p>来源：{judgement.useGod.source === 'hidden' ? '伏神' : '卦中现爻'}；{judgement.auxiliaryFlags.join('、') || '无特殊辅助标记'}</p>
      <p>原神：{judgement.originGod?.element}，{judgement.originGod?.lines.map(l => `第${l.index}爻 ${l.state.season} ${l.state.dayRelation} ${l.state.flags.join('、')}`).join('；') || '卦中不现'}</p>
      <p>忌神：{judgement.avoidGod?.element}，{judgement.avoidGod?.lines.map(l => `第${l.index}爻 ${l.state.season} ${l.state.dayRelation} ${l.state.flags.join('、')}`).join('；') || '卦中不现'}</p>
      <ul>{judgement.movingEffects.map(e => <li key={e}>{e}</li>)}</ul>
      <p className="fine-print">依据《增删卜易》《卜筮正宗》的通行规则推断，供参考。</p>
    </details>
  </Card>
}

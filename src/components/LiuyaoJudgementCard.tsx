import { USE_GOD_OPTIONS, type LiuyaoJudgement, type UseGod } from '../calculation/liuyao/judgement'
import { Card,SectionHeading } from './UI'
export default function LiuyaoJudgementCard({judgement,onOverride}:{judgement:LiuyaoJudgement;onOverride:(value:UseGod)=>void}) {
 return <Card className="interpretation-card summary-reading">
      <SectionHeading title={judgement.tendency} />
      <ul className="plain-list">{judgement.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      <label className="field">
      <span>用神（可改选）</span>
      <select value={judgement.useGod.relation} onChange={e => onOverride(e.target.value as UseGod)}>{USE_GOD_OPTIONS.map(g => <option key={g}>{g}</option>)}</select>
      </label>
      <p>{judgement.advice}</p>
      <p className="helper">{judgement.uncertainty}</p>
      <details>
      <summary>查看用神与动变依据</summary>
      <p>来源：{judgement.useGod.source === 'hidden' ? '伏神' : '卦中现爻'}；{judgement.auxiliaryFlags.join('、') || '无特殊辅助标记'}</p>
      <p>原神：{judgement.originGod?.element}，{judgement.originGod?.lines.map(l => `第${l.index}爻 ${l.state.season} ${l.state.dayRelation} ${l.state.flags.join('、')}`).join('；') || '卦中不现'}</p>
      <p>忌神：{judgement.avoidGod?.element}，{judgement.avoidGod?.lines.map(l => `第${l.index}爻 ${l.state.season} ${l.state.dayRelation} ${l.state.flags.join('、')}`).join('；') || '卦中不现'}</p>
      <ul>{judgement.movingEffects.map(e => <li key={e}>{e}</li>)}</ul>
      <p>按《增删卜易》《卜筮正宗》通行口径；权重是参考模型，不能代替具体事情的现实条件。</p>
      </details>
    </Card>
}

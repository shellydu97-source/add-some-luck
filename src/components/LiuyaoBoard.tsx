import { hexagramPalaceLabel } from '../calculation/liuyao'
import type { LiuyaoJudgement } from '../calculation/liuyao/judgement'
import type { LiuyaoCalculationResult } from '../calculation/liuyao/types'
import { formatDate } from '../utils/text'
import TermHelp from './TermHelp'
import { Card, SectionHeading } from './UI'

function lineSymbol(yinYang: 'yin' | 'yang') {
  return yinYang === 'yang' ? '━━━━━━' : '━━  ━━'
}

function godRoles(judgement?: LiuyaoJudgement) {
  const roles = new Map<number, string>()
  for (const line of judgement?.avoidGod?.lines ?? []) roles.set(line.index, '忌神')
  for (const line of judgement?.originGod?.lines ?? []) roles.set(line.index, '原神')
  for (const index of judgement?.useGod.lines ?? []) roles.set(index, judgement?.useGod.source === 'hidden' ? '用神（伏）' : '用神')
  return roles
}

// The cast summary and six-line board stay visible on results and records alike.
export default function LiuyaoBoard({ result, judgement, castAt, subjectLabel }: {
  result: LiuyaoCalculationResult
  judgement?: LiuyaoJudgement
  castAt: string
  subjectLabel?: string
}) {
  const shiLine = result.lines.find((line) => line.shiYing === '世')
  const yingLine = result.lines.find((line) => line.shiYing === '应')
  const roles = godRoles(judgement)
  return <Card className="liuyao-key-card">
    <SectionHeading title="排盘要点" />
    <div className="liuyao-key-grid">
      <div><span>起卦时间</span><b>{formatDate(castAt, true)}</b></div>
      {subjectLabel && <div><span>占问人物</span><b>{subjectLabel}</b></div>}
      <div><span><TermHelp term="月建" /></span><b>{result.calendar.monthBranch}</b></div>
      <div><span><TermHelp term="日辰" /></span><b>{result.calendar.dayGanZhi}</b></div>
      <div><span><TermHelp term="旬空" /></span><b>{result.calendar.xunKong}</b></div>
      <div><span><TermHelp term="卦宫" /></span><b>{hexagramPalaceLabel(result.original)} · {result.original.palaceElement}</b></div>
      <div><span><TermHelp term="世爻" /></span><b>{shiLine ? `第 ${shiLine.index} 爻 · ${shiLine.relation}` : '—'}</b></div>
      <div><span><TermHelp term="应爻" /></span><b>{yingLine ? `第 ${yingLine.index} 爻 · ${yingLine.relation}` : '—'}</b></div>
    </div>
    <div className="liuyao-compact-board" aria-label="六爻排盘">
      {[...result.lines].reverse().map((line) => {
        const role = roles.get(line.index)
        const roleClass = role?.startsWith('用神') ? 'is-use-god' : role === '原神' ? 'is-origin-god' : role === '忌神' ? 'is-avoid-god' : ''
        return <div className={`liuyao-compact-line ${line.moving ? 'is-moving' : ''} ${roleClass}`} key={line.index}>
          <b>第 {line.index} 爻{role && <em className="god-tag">{role}</em>}</b>
          <span>{line.spirit}</span>
          <span>{line.relation} · {line.naJia}{line.element}{line.hiddenSpirit ? ` · 伏${line.hiddenSpirit.relation}${line.hiddenSpirit.naJia}` : ''}</span>
          <i>{lineSymbol(line.yinYang)}</i>
          <strong>{line.shiYing ?? ''}{line.moving ? `${line.shiYing ? ' · ' : ''}动` : ''}</strong>
        </div>
      })}
    </div>
    <p className="helper liuyao-key-note">由下往上为初爻到第六爻。点击带下划线的词可以查看解释。</p>
  </Card>
}

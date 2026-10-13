import { readSnapshot } from '../utils/snapshot'
import LiuyaoCoin from './LiuyaoCoin'
import type { DivinationRecord } from '../models/types'

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function HexagramTexts({ hexagram }: { hexagram: Record<string, unknown> }) {
  if (!hexagram.judgment && !Array.isArray(hexagram.lineTexts)) return null
  return <details className="professional-details"><summary>{String(hexagram.name ?? '卦象')} · 卦爻辞</summary><p>{String(hexagram.judgment ?? '')}</p>{Array.isArray(hexagram.lineTexts) && <ol>{hexagram.lineTexts.map((text,index)=><li key={index}>{String(text)}</li>)}</ol>}</details>
}

function GenericRawResult({ data }: { data: Record<string, unknown> }) {
  const hiddenKeys = new Set(['engineVersion', 'adapterVersion', 'ruleVersion', 'coordinateDataVersion', 'calculationVersion'])
  return <ul className="raw-result">{Object.entries(data).filter(([key]) => !hiddenKeys.has(key)).map(([key, value]) => <li key={key}>
      <span>{key}</span>
      <b>{typeof value === 'string' ? value : JSON.stringify(value)}</b>
      </li>)}</ul>
}

function TarotRawResult({ data }: { data: Record<string, unknown> }) {
  const cards = Array.isArray(data.cards) ? data.cards.map(object) : []
  return <div className="record-tarot-cards">{cards.map((card, index) => <div className="record-tarot-card" key={String(card.id ?? index)}>
      <span>{String(card.position ?? `位置 ${index + 1}`)}</span>
      <b>{String(card.nameZh ?? card.id ?? '未知牌')}</b>
      <small>{card.orientation === 'reversed' ? '逆位' : '正位'}</small>{Array.isArray(card.keywords) && <div className="chip-row">{card.keywords.map((keyword) => <span className="chip" key={String(keyword)}>{String(keyword)}</span>)}</div>}<p>{String(card.basicMeaning ?? '')}</p>
      </div>)}</div>
}

function environmentLabels(value: unknown) {
  const environment = object(value)
  return [
    environment.isVoid ? '旬空' : '',
    environment.isMonthBuild ? '临月建' : '',
    environment.isMonthBreak ? '月破' : '',
    environment.isMonthCombine ? '月合' : '',
    environment.isDaySame ? '临日辰' : '',
    environment.isDayClash ? '日冲' : '',
    environment.isDayCombine ? '日合' : '',
  ].filter(Boolean).join(' · ') || '—'
}

function palaceLabel(value: Record<string, unknown>) {
  return [value.palaceName ? `${String(value.palaceName)}宫` : '', value.palaceStage, ...(Array.isArray(value.specialTypes) ? value.specialTypes : [])]
    .filter(Boolean).map(String).join(' · ')
}

function LiuyaoRawResult({ data }: { data: Record<string, unknown> }) {
  const lines = Array.isArray(data.lines) ? data.lines.map(object) : []
  const original = object(data.original)
  const changed = object(data.changed)
  const movingLines = Array.isArray(data.movingLines)
    ? data.movingLines
    : lines.some((line) => Boolean(line.moving)) || Boolean(original.name && changed.name && original.name !== changed.name)
      ? [true]
      : []
  const calendar = object(data.calendar)
  const guaShen = object(data.guaShen)
  const shiShen = object(data.shiShen)
  const shenSha = Array.isArray(data.shenSha) ? data.shenSha.map(object) : []
  const originalName = original.name ? `第 ${String(original.number)} 卦 · ${String(original.name)}` : String(data.originalHexagram ?? '已保存卦象')
  const changedName = changed.name ? `第 ${String(changed.number)} 卦 · ${String(changed.name)}` : String(data.changedHexagram ?? '已保存卦象')
  return <>
      <div className="record-hexagram">
      <div>
      <span>本卦</span>
      <b>{originalName}</b>
      </div>{movingLines.length > 0 && <>
      <span>→</span>
      <div>
      <span>变卦</span>
      <b>{changedName}</b>
      </div>
      </>}</div>{movingLines.length === 0 && <p className="no-moving-note">无动爻，变卦同本卦</p>}<div className="result-lines">{[...lines].reverse().map((line, reverseIndex) => { const coins = Array.isArray(line.coins) ? line.coins : []; const index = Number(line.index ?? lines.length - reverseIndex); return <div className="result-line" key={index}>
      <b>第 {index} 爻</b>
      <div className="mini-coins">{coins.map((side, coinIndex) => <LiuyaoCoin side={side === 'yang' || side === 'heads' ? 'yang' : 'yin'} compact ariaLabel={`第 ${coinIndex + 1} 枚铜钱`} key={coinIndex} />)}</div>
      <span>{String(line.label ?? '')}</span>
      </div> })}</div>{lines.some((line) => line.naJia) && <details className="professional-details record-professional">
      <summary>查看详细排盘</summary>
      <ul className="compact-list record-meta">{Boolean(palaceLabel(original)) && <li>
      <span>本卦宫位</span>
      <b>{palaceLabel(original)}</b>
      </li>}{Boolean(palaceLabel(changed)) && <li>
      <span>变卦宫位</span>
      <b>{palaceLabel(changed)}</b>
      </li>}{Boolean(calendar.monthBranch) && <li>
      <span>月建 / 日辰 / 旬空</span>
      <b>{String(calendar.monthBranch)} / {String(calendar.dayGanZhi)} / {String(calendar.xunKong)}</b>
      </li>}{Boolean(guaShen.branch) && <li>
      <span>卦身</span>
      <b>{String(guaShen.branch)}</b>
      </li>}{Boolean(shiShen.branch) && <li>
      <span>世身</span>
      <b>{String(shiShen.branch)} · 第 {String(shiShen.lineIndex)} 爻</b>
      </li>}{shenSha.length > 0 && <li>
      <span>常用神煞</span>
      <b>{shenSha.map((item) => `${String(item.name)}${String(item.branch)}`).join(' · ')}</b>
      </li>}</ul>
      <div className="table-scroll">
      <table className="professional-table">
      <thead>
      <tr>
      <th>爻位</th>
      <th>六神</th>
      <th>伏神</th>
      <th>本卦六亲</th>
      <th>本卦纳甲</th>
      <th>本卦世应</th>
      <th>日月标记</th>
      <th>变卦六亲</th>
      <th>变卦纳甲</th>
      <th>变卦世应</th>
      <th>变卦日月标记</th>
      </tr>
      </thead>
      <tbody>{[...lines].reverse().map((line) => { const hidden = object(line.hiddenSpirit); return <tr key={String(line.index)}>
      <td>{String(line.index)}</td>
      <td>{String(line.spirit ?? '')}</td>
      <td>{hidden.naJia ? `${String(hidden.relation)} ${String(hidden.naJia)}${String(hidden.element ?? '')}` : '—'}</td>
      <td>{String(line.relation ?? '')}</td>
      <td>{String(line.naJia ?? '')} · {String(line.element ?? '')}</td>
      <td>{String(line.shiYing ?? '—')}</td>
      <td>{environmentLabels(line.environment)}</td>
      <td>{String(line.changedRelation ?? '')}</td>
      <td>{String(line.changedNaJia ?? '')} · {String(line.changedElement ?? '')}</td>
      <td>{String(line.changedShiYing ?? '—')}</td>
      <td>{environmentLabels(line.changedEnvironment)}</td>
      </tr> })}</tbody>
      </table>
      </div>
      </details>}<HexagramTexts hexagram={original} />{movingLines.length > 0 && <HexagramTexts hexagram={changed} />}</>
}

function MeihuaRawResult({ data }: { data: Record<string, unknown> }) {
  const original = object(data.original)
  const mutual = object(data.mutual)
  const changed = object(data.changed)
  const body = object(data.bodyTrigram)
  const use = object(data.useTrigram)
  const relation = object(data.bodyUseRelation)
  return <>
    <div className="meihua-sequence">
      <div>
      <span>本卦</span>
      <b>{String(original.name ?? '已保存卦象')}</b>
      </div>
      <i>→</i>
      <div>
      <span>互卦</span>
      <b>{String(mutual.name ?? '已保存卦象')}</b>
      </div>
      <i>→</i>
      <div>
      <span>变卦</span>
      <b>{String(changed.name ?? '已保存卦象')}</b>
      </div>
    </div>
    <ul className="compact-list record-meta">
      <li>
      <span>动爻</span>
      <b>第 {String(data.movingLine ?? '')} 爻</b>
      </li>
      <li>
      <span>体卦</span>
      <b>{String(body.name ?? '')} · {String(body.element ?? '')}</b>
      </li>
      <li>
      <span>用卦</span>
      <b>{String(use.name ?? '')} · {String(use.element ?? '')}</b>
      </li>
      <li>
      <span>体用关系</span>
      <b>{String(relation.label ?? '')}</b>
      </li>
    </ul>
    <HexagramTexts hexagram={original} />
    <HexagramTexts hexagram={changed} />
  </>
}

export default function SnapshotResult({ record }: { record: DivinationRecord }) {
  if (record.type === 'tarot') return <TarotRawResult data={readSnapshot(record.rawResult)} />
  if (record.type === 'liuyao') return <LiuyaoRawResult data={readSnapshot(record.rawResult)} />
  if (record.type === 'meihua') return <MeihuaRawResult data={readSnapshot(record.rawResult)} />
  return <GenericRawResult data={readSnapshot(record.rawResult)} />
}


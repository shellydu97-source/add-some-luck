import { useNavigate } from 'react-router-dom'
import {
  calculateLiuyao,
  hexagramPalaceLabel,
  liuyaoEnvironmentLabels,
  LIUYAO_COIN_CONVENTION_VERSION,
} from '../calculation/liuyao'
import { buildLiuyaoCopyText, createLiuyaoDetailedInterpretation } from '../calculation/liuyao/interpretation'
import AiReadingPanel from '../components/AiReadingPanel'
import HexagramHelp from '../components/HexagramHelp'
import LiuyaoCoin from '../components/LiuyaoCoin'
import TermHelp from '../components/TermHelp'
import TopBar from '../components/TopBar'
import { Button, Card, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import type { Interpretation } from '../models/types'
import { getDraft, useAppStore } from '../storage/store'
import { copyText } from '../utils/clipboard'
import { createRecord, GUEST_PROFILE_ID } from '../utils/record'

function lineSymbol(yinYang: 'yin' | 'yang') {
  return yinYang === 'yang' ? '━━━━━━' : '━━  ━━'
}

export default function LiuyaoResultPage() {
  const navigate = useNavigate()
  const store = useAppStore()
  const draft = getDraft(store, 'liuyao')
  if (!draft || draft.state.casts.length !== 6 || !draft.state.locked || !draft.state.lockedAt) return <><TopBar title="六爻结果" back /><EmptyState title="原始六爻尚未锁定" action={<LinkButton to="/divination/liuyao/confirm">前往确认</LinkButton>}>确认六次原始结果后即可查看卦象。</EmptyState></>
  const activeDraft = draft
  const lockedAt = draft.state.lockedAt
  const profile = activeDraft.profileId === GUEST_PROFILE_ID ? undefined : store.profiles.find((item) => item.id === activeDraft.profileId)
  const subjectLabel = profile?.name ?? activeDraft.temporarySubject?.name?.trim() ?? '临时测算'
  const querentGender = activeDraft.state.querentGender
  const result = calculateLiuyao(activeDraft.state.casts, lockedAt)
  const localInterpretation = createLiuyaoDetailedInterpretation(result)
  const rawResult = {
    method: activeDraft.state.method,
    querentGender,
    timeRange: activeDraft.state.timeRange,
    lockedAt: activeDraft.state.lockedAt,
    coinTosses: activeDraft.state.casts,
    coinConventionVersion: activeDraft.state.coinConventionVersion ?? LIUYAO_COIN_CONVENTION_VERSION,
    original: result.original,
    changed: result.changed,
    movingLines: result.movingLines,
    lines: result.lines,
    calendar: result.calendar,
    lowerTrigram: result.lowerTrigram,
    upperTrigram: result.upperTrigram,
    changedLowerTrigram: result.changedLowerTrigram,
    changedUpperTrigram: result.changedUpperTrigram,
    guaShen: result.guaShen,
    shiShen: result.shiShen,
    shenSha: result.shenSha,
    engineVersion: result.engineVersion,
    adapterVersion: result.adapterVersion,
    ruleVersion: result.ruleVersion,
    localInterpretation,
  }

  function recordInterpretation(): Interpretation {
    return {
      headline: '六爻详细解读',
      conclusion: localInterpretation.overview.overallState,
      evidence: [...new Set([
        ...localInterpretation.overview.evidence,
        ...localInterpretation.movingLines.flatMap((line) => line.evidence),
        ...localInterpretation.relationReadings.flatMap((reading) => reading.evidence),
      ])],
      support: [localInterpretation.summary.drivers],
      conflicts: [localInterpretation.summary.resistance],
      uncertainty: localInterpretation.uncertainty,
      advice: [localInterpretation.summary.advice],
    }
  }

  function ensureRecord() {
    const existing = activeDraft.state.recordId && store.records.find((record) => record.id === activeDraft.state.recordId)
    if (existing) return existing.id
    const created = createRecord({ profile, temporarySubject: activeDraft.temporarySubject, type: 'liuyao', question: activeDraft.question, category: activeDraft.category, rawResult, interpretation: recordInterpretation() })
    store.createRecordSnapshot(created)
    store.upsertDraft({ ...activeDraft, state: { ...activeDraft.state, recordId: created.id } })
    return created.id
  }

  function saveRecord() {
    navigate(`/records/${ensureRecord()}`)
  }

  async function handleCopy() {
    try {
      await copyText(buildLiuyaoCopyText({ question: activeDraft.question, querentGender, castAt: lockedAt, result, interpretation: localInterpretation }))
      store.setNotice('已复制，可以粘贴到你常用的大模型中。')
    } catch {
      store.setNotice('复制失败，请稍后重试。')
    }
  }

  return <>
    <TopBar title="六爻结果" eyebrow="原始六爻已锁定" back action={<span className="chip">{subjectLabel}</span>} />
    {activeDraft.question.trim() && <Card className="question-summary"><span>本次问题</span><p>{activeDraft.question}</p></Card>}
    <Card className="hero-card result-hero">
      <div className="card-kicker"><span>{result.movingLines.length ? '本卦 → 变卦' : '本卦'}</span>{querentGender && <span className="chip">占问者 · {querentGender === 'male' ? '男' : '女'}</span>}</div>
      <h2><HexagramHelp hexagram={{ ...result.original, upper: result.upperTrigram, lower: result.lowerTrigram }} movingLines={result.movingLines} context="本次起卦最初得到的卦象；红色标记为本次动爻。" /></h2>
      {result.movingLines.length ? <>
        <span className="result-arrow">↓</span>
        <h2><HexagramHelp hexagram={{ ...result.changed, upper: result.changedUpperTrigram, lower: result.changedLowerTrigram }} context="本卦动爻变化后形成的卦象，用来观察变化方向。" /></h2>
        <div className="chip-row">{result.movingLines.map((line) => <span className="chip" key={line}>第 {line} 爻动</span>)}</div>
      </> : <p className="no-moving-note">无动爻，变卦同本卦</p>}
    </Card>

    <Card className="interpretation-card summary-reading">
      <SectionHeading title="基础提示" />
      <p className="reading-intro">{localInterpretation.overview.overallState}</p>
      <dl className="reading-summary-list"><div><dt>值得留意</dt><dd>{localInterpretation.summary.changes}</dd></div><div><dt>现实建议</dt><dd>{localInterpretation.summary.advice}</dd></div></dl>
    </Card>

    <AiReadingPanel key={activeDraft.id} module="liuyao" question={activeDraft.question} context={{
      castAt: lockedAt, method: activeDraft.state.method, querentGender, coinTosses: activeDraft.state.casts,
      original: result.original, changed: result.changed, movingLines: result.movingLines,
      lines: result.lines, calendar: result.calendar, lowerTrigram: result.lowerTrigram, upperTrigram: result.upperTrigram,
      changedLowerTrigram: result.changedLowerTrigram, changedUpperTrigram: result.changedUpperTrigram,
      guaShen: result.guaShen, shiShen: result.shiShen, shenSha: result.shenSha,
    }} recordId={activeDraft.state.recordId} ensureRecord={ensureRecord} title="结合卦象回答你的问题" />

    <details className="result-disclosure"><summary>查看卦象、动爻与变化依据</summary><Card className="interpretation-card">
      <div className="reading-sections">
        <section className="reading-section"><h3>本卦核心主题</h3><p>{localInterpretation.overview.coreTheme}</p></section>
        <section className="reading-section"><h3>卦辞的现代中文解释</h3><blockquote className="hexagram-text">{result.original.judgment}</blockquote><p>{localInterpretation.overview.modernJudgment}</p></section>
        <section className="reading-section"><h3>当前整体状态</h3><p>{localInterpretation.overview.overallState}</p><details className="reading-evidence"><summary>查看判断依据</summary><ul>{localInterpretation.overview.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details></section>
      </div>
      <h3 className="reading-subheading">动爻解读</h3>
      {localInterpretation.movingLines.length ? <div className="reading-sections">{localInterpretation.movingLines.map((line) => <section className="reading-section moving-line-reading" key={line.lineIndex}>
        <h3>第 {line.lineIndex} 爻</h3>
        <blockquote className="hexagram-text">{line.originalText}</blockquote>
        <p><b>通俗解释：</b>{line.plainExplanation}</p>
        <p><b>对整体方向的影响：</b>{line.impact}</p>
        <details className="reading-evidence"><summary>查看判断依据</summary><ul>{line.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details>
      </section>)}</div> : <p className="no-moving-note">无动爻，本次不单列动爻解释。</p>}
      <div className="reading-clue"><b>主要变化线索</b><p>{localInterpretation.movingClue}</p></div>
    </Card></details>

    <details className="result-disclosure"><summary>查看关系解读与专业排盘</summary>{localInterpretation.changeDirection && <Card className="interpretation-card">
      <SectionHeading title="变卦方向" />
      <div className="reading-sections">
        <section className="reading-section"><h3>发展方向</h3><p>{localInterpretation.changeDirection.direction}</p></section>
        <section className="reading-section"><h3>本卦与变卦的关系</h3><p>{localInterpretation.changeDirection.relationship}</p><details className="reading-evidence"><summary>查看判断依据</summary><ul>{localInterpretation.changeDirection.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details></section>
      </div>
    </Card>}

    <Card className="interpretation-card">
      <SectionHeading title="排盘关系解读" />
      <div className="rule-basis"><h3>规则依据</h3><ol>{localInterpretation.relationRules.map((rule) => <li key={rule}>{rule}</li>)}</ol></div>
      <div className="reading-sections">{localInterpretation.relationReadings.map((reading) => <section className="reading-section" key={reading.title}>
        <h3>{reading.title}</h3><p>{reading.content}</p>
        <details className="reading-evidence"><summary>查看对应排盘字段</summary><ul>{reading.evidence.map((item, index) => <li key={`${reading.title}-${index}`}>{item}</li>)}</ul></details>
      </section>)}</div>
    </Card>

    <Card>
      <SectionHeading title="三枚铜钱与原始六爻" />
      <div className="result-lines">{[...result.lines].reverse().map((line) => <div className="result-line" key={line.index}>
        <b>第 {line.index} 爻</b>
        <div className="mini-coins">{line.coins.map((side, index) => <LiuyaoCoin side={side} compact ariaLabel={`第 ${index + 1} 枚铜钱`} key={index} />)}</div>
        <span className="yao-text-symbol">{lineSymbol(line.yinYang)} · {line.label}</span>
      </div>)}</div>
    </Card>

    <details className="professional-details">
      <summary>查看详细排盘</summary>
      <Card>
        <SectionHeading title="排盘信息" />
        <ul className="compact-list">
          <li><span>本卦宫位</span><b>{hexagramPalaceLabel(result.original)} · {result.original.palaceElement}</b></li>
          <li><span>变卦宫位</span><b>{hexagramPalaceLabel(result.changed)} · {result.changed.palaceElement}</b></li>
          <li><span>本卦上卦 / 下卦</span><b>{result.upperTrigram.name} / {result.lowerTrigram.name}</b></li>
          <li><span>变卦上卦 / 下卦</span><b>{result.changedUpperTrigram.name} / {result.changedLowerTrigram.name}</b></li>
          <li><span>月建 <TermHelp term="月建" /></span><b>{result.calendar.monthBranch}</b></li>
          <li><span>日辰 <TermHelp term="日辰" /></span><b>{result.calendar.dayGanZhi}</b></li>
          <li><span>旬空 <TermHelp term="旬空" /></span><b>{result.calendar.xunKong}</b></li>
          <li><span>卦身 <TermHelp term="卦身" /></span><b>{result.guaShen.branch}{result.guaShen.presentAtLines.length ? ` · 现于第 ${result.guaShen.presentAtLines.join('、')} 爻` : ' · 不现于本卦六爻'}</b></li>
          <li><span>世身 <TermHelp term="世身" /></span><b>{result.shiShen.branch} · 第 {result.shiShen.lineIndex} 爻</b></li>
          <li><span>常用神煞</span><b>{result.shenSha.map((item) => `${item.name}${item.branch}${item.presentAtLines.length ? `（第${item.presentAtLines.join('、')}爻）` : ''}`).join(' · ')}</b></li>
        </ul>
        <div className="professional-term-row"><span><TermHelp term="世爻" />世爻</span><span><TermHelp term="应爻" />应爻</span><span><TermHelp term="六亲" />六亲</span><span><TermHelp term="六神" />六神</span><span><TermHelp term="伏神" />伏神</span><span><TermHelp term="纳甲" />纳甲</span></div>
        <div className="table-scroll">
          <table className="professional-table">
            <thead><tr><th>爻位</th><th>六神</th><th>伏神</th><th>本卦六亲</th><th>本卦纳甲</th><th>本卦世应</th><th>本卦</th><th>日月标记</th><th>变卦六亲</th><th>变卦纳甲</th><th>变卦世应</th><th>变卦</th><th>变卦日月标记</th></tr></thead>
            <tbody>{[...result.lines].reverse().map((line) => <tr key={line.index}>
              <td>{line.index}</td>
              <td>{line.spirit}</td>
              <td>{line.hiddenSpirit ? `${line.hiddenSpirit.relation} ${line.hiddenSpirit.naJia}${line.hiddenSpirit.element}` : '—'}</td>
              <td>{line.relation}</td>
              <td>{line.naJia} · {line.element}</td>
              <td>{line.shiYing ?? '—'}</td>
              <td>{lineSymbol(line.yinYang)}{line.moving ? ' ○' : ''}</td>
              <td>{liuyaoEnvironmentLabels(line.environment).join(' · ') || '—'}</td>
              <td>{line.changedRelation}</td>
              <td>{line.changedNaJia} · {line.changedElement}</td>
              <td>{line.changedShiYing ?? '—'}</td>
              <td>{lineSymbol(line.changedYinYang)}</td>
              <td>{liuyaoEnvironmentLabels(line.changedEnvironment).join(' · ') || '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </Card>
    </details></details>

    <Button className="copy-reading-button secondary" onClick={handleCopy}>复制完整排盘信息</Button>
    <div className="button-row"><LinkButton to="/divination" secondary>返回起卦</LinkButton><Button onClick={saveRecord}>{activeDraft.state.recordId ? '查看已保存记录' : '保存到记录'}</Button></div>
  </>
}

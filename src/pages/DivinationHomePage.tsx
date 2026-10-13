import { Link } from 'react-router-dom'
import PersonSwitcher from '../components/PersonSwitcher'
import { Card, SectionHeading } from '../components/UI'
import { useAppStore } from '../storage/store'
import { formatDate } from '../utils/text'
import { recordTypeLabels } from '../models/labels'
import DraftRecoveryPanel from '../components/DraftRecoveryPanel'

export default function DivinationHomePage() {
  const store = useAppStore()
  const recent = store.records.find((item) => item.type === 'liuyao' || item.type === 'meihua' || item.type === 'tarot')

  function deleteRecent() {
    if (!recent || !window.confirm('删除这条最近记录？删除后无法恢复。')) return
    store.deleteRecord(recent.id)
  }

  return <div className="divination-home-page">
      <header className="home-brand-bar">
        <Link className="brand-lockup" to="/divination" aria-label="加点好运占卜首页">
          <picture><source srcSet="/brand-mark.webp" type="image/webp" /><img src="/brand-mark.png" alt="" /></picture>
          <b>加点好运</b>
        </Link>
        <PersonSwitcher compact />
      </header>
      <section className="home-hero">
        <div><h1>占卜</h1><p>选择一种方式开始</p></div>
        <img className="home-orbit" src="/soft-orbit.png" alt="" aria-hidden="true" />
      </section>
      <div className="card-grid method-grid">
        <Link className="method-button method-liuyao" to="/divination/liuyao/question"><span className="method-mark">六</span><span><b>六爻</b><small>适合围绕一件具体的事占问</small></span><i>›</i></Link>
        <Link className="method-button method-meihua" to="/divination/meihua/question"><span className="method-mark">梅</span><span><b>梅花易数</b><small>用时间、数字、文字或所见所闻推演</small></span><i>›</i></Link>
        <Link className="method-button method-tarot" to="/divination/tarot/question"><span className="method-mark">塔</span><span><b>塔罗</b><small>通过牌阵观察不同角度和选择</small></span><i>›</i></Link>
      </div>
      <DraftRecoveryPanel />
      {recent && <><SectionHeading title="最近一次" /><Card className="record-card recent-record-card"><Link className="recent-record-link" to={`/records/${recent.id}`}><div><h3>{recent.question || '未填写问题'}</h3><p className="helper">{recordTypeLabels[recent.type]} · {formatDate(recent.createdAt)}</p></div><span className="link-arrow">→</span></Link><button type="button" className="record-delete-button" onClick={deleteRecent}>删除</button></Card></>}
  </div>
}

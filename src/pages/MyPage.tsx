import { Link } from 'react-router-dom'
import { useCloudAccount } from '../cloud/accountContext'
import PersonSwitcher from '../components/PersonSwitcher'
import TopBar from '../components/TopBar'
import { Card, EmptyState, LinkButton, SectionHeading } from '../components/UI'
import { recordTypeLabels } from '../models/labels'
import { useAppStore } from '../storage/store'
import { formatDate } from '../utils/text'

export default function MyPage() {
  const store = useAppStore()
  const account = useCloudAccount()
  const recent = store.records.slice(0, 3)

  return <div className="my-page">
    <TopBar title="我的" eyebrow="档案、记录与设置" action={<PersonSwitcher compact />} />

    <Card className="my-account-card">
      <div>
        <span className="summary-label">账号与数据</span>
        <h2>{account.session?.user.email ?? '当前未登录'}</h2>
        <p className="helper">{account.session ? (account.syncMessage || '档案和记录会自动保存。') : '不登录也可以使用；登录后可在其他设备继续。'}</p>
      </div>
      <LinkButton to="/account" secondary>{account.session ? '管理账号' : '登录或注册'}</LinkButton>
    </Card>

    <div className="my-entry-grid">
      <Link className="my-entry-card" to="/profiles"><span className="my-entry-icon">◎</span><span><b>人物档案</b><small>{store.profiles.length ? `${store.profiles.length} 个人物` : '建立第一个人物档案'}</small></span><i>›</i></Link>
      <Link className="my-entry-card" to="/records"><span className="my-entry-icon">▤</span><span><b>全部记录</b><small>{store.records.length ? `${store.records.length} 条记录` : '还没有保存的记录'}</small></span><i>›</i></Link>
      <Link className="my-entry-card" to="/settings"><span className="my-entry-icon">⚙</span><span><b>设置</b><small>同步、备份与显示偏好</small></span><i>›</i></Link>
    </div>

    <SectionHeading title="最近记录" side={store.records.length ? <Link className="text-link" to="/records">查看全部</Link> : undefined} />
    {!recent.length ? <EmptyState title="还没有记录" action={<LinkButton to="/divination">去占卜</LinkButton>}>保存一次占卜结果后，可以在这里复盘和验证。</EmptyState> : <Card className="my-recent-list">
      {recent.map((record) => <Link key={record.id} to={`/records/${record.id}`}>
        <span className="record-type-mark">{recordTypeLabels[record.type].slice(0, 1)}</span>
        <span><b>{record.question || '未填写问题'}</b><small>{record.profileNameSnapshot} · {recordTypeLabels[record.type]} · {formatDate(record.createdAt, true)}</small></span>
        <i>›</i>
      </Link>)}
    </Card>}
  </div>
}

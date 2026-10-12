import { useState } from 'react'
import { useCloudAccount } from '../cloud/accountContext'
import { Button, Card } from './UI'

export default function SyncConflictPanel() {
  const account = useCloudAccount()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!account.hasConflict || !account.conflictSummary) return null
  async function choose(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : '处理失败，本机数据仍保留。') } finally { setBusy(false) }
  }
  return <Card className="sync-conflict"><div role="alert">
    <h2>选择如何保留两边数据</h2>
    <p className="helper">自动同步已暂停。合并保留不同条目和解读，同一字段采用最近修改的版本。</p>
    {(['local', 'cloud'] as const).map((side) => { const summary = account.conflictSummary![side]; return <p key={side}>{side === 'local' ? '本机' : '云端'}：{summary.profiles} 个人物、{summary.records} 条记录；最近修改：{summary.updatedAt ? new Date(summary.updatedAt).toLocaleString('zh-CN') : '暂无'}</p> })}
    <Button disabled={busy} onClick={() => void choose(account.mergeBoth)}>合并两边（推荐）</Button>
    <Button className="secondary" disabled={busy} onClick={() => void choose(account.keepLocalData)}>保留本机</Button>
    <Button className="secondary" disabled={busy} onClick={() => void choose(account.keepCloudData)}>保留云端</Button>
    {error && <p className="field-error">{error}</p>}
  </div></Card>
}

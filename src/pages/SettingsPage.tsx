import { mergeAppData } from '../cloud/syncCore'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { Button, Card, LinkButton, SectionHeading } from '../components/UI'
import { useCloudAccount } from '../cloud/accountContext'
import type { AppDataState } from '../models/types'
import { pickAppData } from '../storage/appData'
import { downloadText, parseImport, serializeExport } from '../storage/dataTransfer'
import { useAppStore } from '../storage/store'

export default function SettingsPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const store = useAppStore()
  const account = useCloudAccount()
  const [clearChoice, setClearChoice] = useState(false)
  const [replaceImport, setReplaceImport] = useState(false)
  const [error, setError] = useState('')
  const data: AppDataState = pickAppData(store)

  function exportData() {
    downloadText(serializeExport(data), `add-luck-v1-${new Date().toISOString().slice(0, 10)}.json`)
    store.setNotice('本地数据已导出。')
  }

  async function importData(file?: File) {
    if (!file) return
    try {
      const next = parseImport(await file.text())
      if (account.session && !replaceImport) {
        if (!window.confirm('将备份与当前数据合并，并同步到这个账号，继续吗？')) return
        store.replaceAllData(mergeAppData(pickAppData(useAppStore.getState()), next))
      } else {
        if (!window.confirm('导入会替换当前人物和记录，确定继续吗？')) return
        if (account.session && !window.confirm('完全替换也会同步到云端并影响其他设备，请再次确认。')) return
        const current = pickAppData(useAppStore.getState())
        const now = new Date().toISOString()
        // Replacements carry tombstones, so old cloud items cannot reappear.
        const tombstones = structuredClone(next.tombstones)
        for (const kind of ['profiles', 'records', 'drafts'] as const) for (const item of current[kind]) if (!next[kind].some((n) => n.id === item.id)) tombstones[kind][item.id] = now
        store.replaceAllData({ ...next, tombstones })
      }
      setError('')
      navigate('/charts')
    } catch (cause) {
      setError(`导入失败，当前数据未被覆盖：${cause instanceof Error ? cause.message : '文件格式无效'}`)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function clearData() {
    if (account.session) { setClearChoice(true); return }
    if (!window.confirm('清空后人物和记录都将删除。继续吗？')) return
    if (!window.confirm('请再次确认：确定清空当前浏览器中的全部数据吗？')) return
    store.clearAllData()
    navigate('/welcome', { replace: true })
  }

  async function clearAccount(deleteCloud: boolean) {
    if (!window.confirm(deleteCloud ? '确认删除本机和云端数据？这会影响其他设备。' : '确认只清空本机并退出登录？')) return
    if (deleteCloud && !window.confirm('请再次确认：删除云端保存的人物和记录。')) return
    try { await account.clearLocalData(deleteCloud); navigate('/welcome', { replace: true }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '清空失败，数据仍保留。') }
  }

  return <>
    <TopBar title="设置" back />
    {store.storageRecovery && <Card className="recovery-card"><SectionHeading title="数据保护状态" side={<span className="chip">需要处理</span>} /><p className="helper">{store.storageRecovery.message}</p>{store.storageRecovery.raw && <Button className="secondary" onClick={() => downloadText(store.storageRecovery?.raw ?? '', 'add-luck-corrupt-raw.txt', 'text/plain')}>导出原始损坏数据</Button>}</Card>}
    {account.configured && <Card>
      <SectionHeading title="账号与同步" side={account.session ? <span className="chip">已登录</span> : undefined} />
      {account.session
        ? <><p className="account-email">{account.session.user.email}</p><p className="helper">{account.syncMessage || '人物档案和记录会自动保存到云端。'}</p><LinkButton to="/account" secondary>管理账号</LinkButton></>
        : <><p className="helper">登录后可在其他手机继续使用原来的人物档案和记录；不登录也能正常使用。</p><LinkButton to="/account" secondary>登录或注册</LinkButton></>}
    </Card>}
    <Card>
      <SectionHeading title="数据管理" />
      <div className="settings-actions">
        <Button className="secondary" onClick={exportData}>导出全部数据</Button>
        <Button className="secondary" onClick={() => inputRef.current?.click()}>导入备份文件</Button>
        {account.session && <label className="toggle-setting"><span>用备份完全替换（会同步到云端）</span><input type="checkbox" checked={replaceImport} onChange={(event) => setReplaceImport(event.target.checked)} /></label>}
        <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} />
      </div>
      {error && <p className="field-error settings-error">{error}</p>}
    </Card>
    <Card><SectionHeading title="显示偏好" /><label className="toggle-setting"><span><b>降低动态效果</b><small>仪式抽牌改为手动切换候选牌，其他动画尽量关闭。</small></span><input type="checkbox" checked={store.reduceMotion} onChange={(event) => store.setReduceMotion(event.target.checked)} /></label></Card>
    {clearChoice && <Card><h2>选择清空范围</h2><p className="helper">只清空本机会退出登录，云端数据保留。</p><Button className="secondary" onClick={() => void clearAccount(false)}>只清空本机并退出登录</Button><Button className="danger" onClick={() => void clearAccount(true)}>同时删除云端数据</Button><Button className="secondary" onClick={() => setClearChoice(false)}>取消</Button></Card>}
    <Card><SectionHeading title="隐私与使用" /><div className="button-row"><LinkButton to="/privacy" secondary>隐私说明</LinkButton><LinkButton to="/terms" secondary>使用须知</LinkButton></div></Card>
    <Button className="danger" onClick={clearData}>清空全部本地数据</Button>
  </>
}

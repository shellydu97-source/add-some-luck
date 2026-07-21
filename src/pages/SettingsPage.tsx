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
      if (!window.confirm('导入会替换当前人物、记录和草稿，确定继续吗？')) return
      store.replaceAllData(next)
      setError('')
      navigate('/charts')
    } catch (cause) {
      setError(`导入失败，当前数据未被覆盖：${cause instanceof Error ? cause.message : '文件格式无效'}`)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function clearData() {
    if (!window.confirm('清空后人物、记录和草稿都将删除。继续吗？')) return
    if (!window.confirm('请再次确认：确定清空当前浏览器中的全部数据吗？')) return
    store.clearAllData()
    navigate('/welcome', { replace: true })
  }

  return <>
    <TopBar title="设置" back />
    {store.storageRecovery && <Card className="recovery-card"><SectionHeading title="数据保护状态" side={<span className="chip">需要处理</span>} /><p className="helper">{store.storageRecovery.message}</p>{store.storageRecovery.raw && <Button className="secondary" onClick={() => downloadText(store.storageRecovery?.raw ?? '', 'add-luck-corrupt-raw.txt', 'text/plain')}>导出原始损坏数据</Button>}</Card>}
    {account.configured && <Card>
      <SectionHeading title="账号与同步" side={account.session ? <span className="chip">已登录</span> : undefined} />
      {account.session
        ? <><p className="account-email">{account.session.user.email}</p><p className="helper">{account.syncMessage || '登录后，人物档案和记录会保存在云端。'}</p><LinkButton to="/account" secondary>管理账号与同步</LinkButton></>
        : <><p className="helper">登录后可在其他手机继续使用原来的人物档案和记录；不登录也能正常使用。</p><LinkButton to="/account" secondary>登录或注册</LinkButton></>}
    </Card>}
    <Card>
      <SectionHeading title="数据管理" />
      <div className="settings-actions">
        <Button className="secondary" onClick={exportData}>导出全部数据</Button>
        <Button className="secondary" onClick={() => inputRef.current?.click()}>导入备份文件</Button>
        <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} />
      </div>
      {error && <p className="field-error settings-error">{error}</p>}
    </Card>
    <Card><SectionHeading title="显示偏好" /><label className="toggle-setting"><span><b>降低动态效果</b><small>仪式抽牌改为手动切换候选牌，其他动画尽量关闭。</small></span><input type="checkbox" checked={store.reduceMotion} onChange={(event) => store.setReduceMotion(event.target.checked)} /></label></Card>
    <Button className="danger" onClick={clearData}>清空全部本地数据</Button>
  </>
}

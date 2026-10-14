import SyncConflictPanel from '../components/SyncConflictPanel'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCloudAccount } from '../cloud/accountContext'
import { allowGuestAccess, clearGuestAccess } from '../cloud/guestAccess'
import TopBar from '../components/TopBar'
import { Button, Card, SectionHeading } from '../components/UI'

type AccountMode = 'sign-in' | 'sign-up' | 'reset'
type AccountStep = 'form' | 'signup-code' | 'reset-code' | 'new-password'

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  return <label className="field"><span>{label}</span><span className="password-input-wrap"><input type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} minLength={8} placeholder={placeholder} required /><button type="button" className="password-visibility" onClick={() => setVisible((current) => !current)} aria-label={visible ? `隐藏${label}` : `显示${label}`} aria-pressed={visible}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.75" />{visible && <path d="m4 4 16 16" />}</svg></button></span></label>
}

function friendlyAuthError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause)
  if (/invalid login credentials/i.test(message)) return '邮箱或密码不正确。'
  if (/email not confirmed/i.test(message)) return '请先输入邮件中的验证码完成注册。'
  if (/already registered|already been registered|user already exists/i.test(message)) return '这个邮箱已经注册，可以直接登录。'
  if (/expired|invalid.*token|token.*invalid|otp/i.test(message)) return '验证码无效或已经过期，请重新获取。'
  if (/password/i.test(message) && /short|least|characters/i.test(message)) return '密码至少需要 8 位。'
  if (/email/i.test(message) && /invalid/i.test(message)) return '请输入有效的邮箱地址。'
  if (/email address not authorized/i.test(message)) return '验证码邮件服务暂时不可用，请稍后再试。'
  if (/rate limit|too many|security purposes/i.test(message)) return '操作有点频繁，请稍后再试。'
  if (/fetch|network|timeout/i.test(message)) return '暂时无法连接账号服务，请检查网络后重试。'
  return '操作没有完成，请稍后再试。'
}

function syncStatusLabel(status: ReturnType<typeof useCloudAccount>['syncStatus']) {
  if (status === 'synced') return '已保存云端'
  if (status === 'syncing' || status === 'checking') return '自动同步中'
  if (status === 'waiting') return '即将保存'
  if (status === 'conflict') return '自动整理中'
  if (status === 'error') return '等待网络'
  return '未登录'
}

function safeNextPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.startsWith('/account') ? value : '/'
}

function AccountFrame({ onboarding, title, children }: { onboarding: boolean; title: string; children: ReactNode }) {
  return <div className={`account-page-shell${onboarding ? ' onboarding' : ''}`}>
    <main className="page-container account-page-container">
      {onboarding
        ? <header className="account-intro"><div className="welcome-mark" aria-hidden="true">运</div><h1>加点好运</h1><p>登录后，人物档案和记录可以在不同设备上继续使用。</p></header>
        : <TopBar title={title} back />}
      {children}
      <p className="helper"><Link to="/privacy">隐私说明</Link> · <Link to="/terms">使用须知</Link></p>
    </main>
  </div>
}

export default function AccountPage() {
  const account = useCloudAccount()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const onboarding = searchParams.get('onboarding') === '1'
  const nextPath = safeNextPath(searchParams.get('next'))
  const [mode, setMode] = useState<AccountMode>('sign-in')
  const [step, setStep] = useState<AccountStep>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [resendWait, setResendWait] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const activeStep = account.passwordRecovery ? 'new-password' : step

  useEffect(() => {
    if (resendWait <= 0) return
    const timer = window.setTimeout(() => setResendWait((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendWait])

  function switchMode(nextMode: AccountMode) {
    setMode(nextMode)
    setStep('form')
    setPassword('')
    setConfirmPassword('')
    setCode('')
    setError('')
    setMessage('')
  }

  function finishLogin() {
    clearGuestAccess()
    navigate(nextPath, { replace: true })
  }

  function continueLocally() {
    allowGuestAccess()
    navigate(nextPath, { replace: true })
  }

  async function runAccountAction(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await action() }
    catch (cause) { setError(friendlyAuthError(cause)) }
    finally { setBusy(false) }
  }

  async function submitAccount(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (mode !== 'reset' && password.length < 8) {
      setError('密码至少需要 8 位。')
      return
    }
    if (mode === 'sign-up' && password !== confirmPassword) {
      setError('两次输入的密码不一致。')
      return
    }
    setBusy(true)
    try {
      if (mode === 'sign-in') {
        await account.signIn(email.trim(), password)
        finishLogin()
      } else if (mode === 'sign-up') {
        const result = await account.signUp(email.trim(), password)
        if (result === 'signed-in') finishLogin()
        else {
          setStep('signup-code')
          setResendWait(60)
          setMessage('验证码已经发送到你的邮箱。')
        }
      } else {
        await account.sendPasswordReset(email.trim())
        setStep('reset-code')
        setResendWait(60)
        setMessage('验证码已经发送到你的邮箱。')
      }
    } catch (cause) {
      setError(friendlyAuthError(cause))
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (activeStep === 'signup-code') {
        await account.verifySignUpCode(email.trim(), code.trim())
        finishLogin()
      } else {
        await account.verifyPasswordResetCode(email.trim(), code.trim())
        setStep('new-password')
        setCode('')
        setMessage('验证成功，请设置新密码。')
      }
    } catch (cause) {
      setError(friendlyAuthError(cause))
    } finally {
      setBusy(false)
    }
  }

  async function resendCode() {
    if (resendWait > 0) return
    await runAccountAction(async () => {
      if (activeStep === 'signup-code') await account.resendSignUpCode(email.trim())
      else await account.sendPasswordReset(email.trim())
      setResendWait(60)
      setMessage('新的验证码已经发送。')
    })
  }

  async function setNewPassword(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 8 || password !== confirmPassword) {
      setError(password.length < 8 ? '密码至少需要 8 位。' : '两次输入的密码不一致。')
      return
    }
    setBusy(true)
    try {
      await account.updatePassword(password)
      finishLogin()
    } catch (cause) {
      setError(friendlyAuthError(cause))
    } finally {
      setBusy(false)
    }
  }

  if (!account.configured) return <AccountFrame onboarding={onboarding} title="账号">
    <Card><SectionHeading title="暂时无法使用账号" /><p>你仍然可以正常使用全部本地功能，数据会保留在当前浏览器中。</p>{onboarding && <Button onClick={continueLocally}>继续使用</Button>}</Card>
  </AccountFrame>

  if (account.authLoading) return <AccountFrame onboarding={onboarding} title="账号"><Card><p className="helper">正在读取登录状态…</p></Card></AccountFrame>

  if (account.session && activeStep !== 'new-password') return <AccountFrame onboarding={false} title="账号与同步">
    <Card>
      <SectionHeading title="已登录" side={<span className="chip">{syncStatusLabel(account.syncStatus)}</span>} />
      <p className="account-email">{account.session.user.email}</p>
      <p className="helper">{account.syncMessage || '人物档案和记录会自动保存到云端，换设备登录后会自动恢复。'}</p>
      {account.lastSyncedAt && <p className="account-meta">最近同步：{new Date(account.lastSyncedAt).toLocaleString('zh-CN')}</p>}
      {account.syncStatus === 'error' && <Button className="secondary" disabled={busy} onClick={() => void runAccountAction(account.syncNow)}>重新同步</Button>}
      {error && <p className="field-error account-feedback">{error}</p>}
    </Card>
    <SyncConflictPanel />
    <Card><SectionHeading title="数据说明" /><p className="helper">本机与云端按版本同步，冲突时由你选择。当前设备会保留一份安全缓存，断网时仍可使用；恢复网络或重新打开页面后会自动同步，不需要手动操作。</p></Card>
    <Button className="danger" disabled={busy} onClick={() => { if (!window.confirm('注销将永久删除账号、云端人物、记录和用量数据。请先导出备份，继续吗？')) return; if (!window.confirm('再次确认：永久注销当前账号？此操作无法恢复。')) return; void runAccountAction(async () => { await account.deleteAccount(); allowGuestAccess(); navigate('/welcome', { replace: true }) }) }}>注销账号</Button>
    <Button className="secondary" disabled={busy} onClick={() => void runAccountAction(async () => { await account.signOut(); clearGuestAccess(); navigate('/account?onboarding=1', { replace: true }) })}>退出登录</Button>
  </AccountFrame>

  if (activeStep === 'signup-code' || activeStep === 'reset-code') return <AccountFrame onboarding={onboarding} title="输入验证码">
    <Card>
      <SectionHeading title={activeStep === 'signup-code' ? '验证邮箱' : '验证身份'} />
      <p className="helper">验证码已发送至 <b>{email}</b>，请在下方输入。没有收到时可以检查垃圾邮件。</p>
      <form className="account-form" onSubmit={verifyCode}>
        <label className="field"><span>邮箱验证码</span><input className="account-code-input" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} minLength={6} maxLength={8} placeholder="请输入 6 位验证码" required /></label>
        {error && <p className="field-error account-feedback">{error}</p>}
        {message && <p className="account-success">{message}</p>}
        <Button type="submit" disabled={busy || code.length < 6}>{busy ? '正在验证…' : '确认验证码'}</Button>
      </form>
      <div className="account-secondary-actions">
        <button type="button" disabled={busy || resendWait > 0} onClick={() => void resendCode()}>{resendWait > 0 ? `${resendWait} 秒后可重新发送` : '重新发送验证码'}</button>
        <button type="button" onClick={() => switchMode(activeStep === 'signup-code' ? 'sign-up' : 'reset')}>返回修改邮箱</button>
      </div>
    </Card>
  </AccountFrame>

  if (activeStep === 'new-password') return <AccountFrame onboarding={onboarding} title="设置新密码">
    <Card>
      <SectionHeading title="设置新密码" />
      <form className="account-form" onSubmit={setNewPassword}>
        <PasswordField label="新密码" value={password} onChange={setPassword} autoComplete="new-password" placeholder="至少 8 位" />
        <PasswordField label="再次输入新密码" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
        {error && <p className="field-error account-feedback">{error}</p>}
        {message && <p className="account-success">{message}</p>}
        <Button type="submit" disabled={busy}>{busy ? '正在保存…' : '保存新密码并登录'}</Button>
      </form>
    </Card>
  </AccountFrame>

  const title = mode === 'sign-up' ? '注册账号' : mode === 'reset' ? '找回密码' : '登录'
  return <AccountFrame onboarding={onboarding} title={title}>
    <Card>
      {mode !== 'reset' && <div className="account-tabs" role="group" aria-label="账号操作">
        <button className={mode === 'sign-in' ? 'active' : ''} type="button" onClick={() => switchMode('sign-in')}>登录</button>
        <button className={mode === 'sign-up' ? 'active' : ''} type="button" onClick={() => switchMode('sign-up')}>注册</button>
      </div>}
      {mode === 'reset' && <SectionHeading title="找回密码" />}
      <form className="account-form" onSubmit={submitAccount}>
        <label className="field"><span>邮箱</span><input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></label>
        {mode !== 'reset' && <PasswordField label="密码" value={password} onChange={setPassword} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} placeholder="至少 8 位" />}
        {mode === 'sign-up' && <PasswordField label="再次输入密码" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />}
        {mode === 'sign-up' && <p className="helper">请使用常用邮箱，之后可用于找回密码。目前注册后可直接登录。</p>}
        {error && <p className="field-error account-feedback">{error}</p>}
        {message && <p className="account-success">{message}</p>}
        <Button type="submit" disabled={busy}>{busy ? '请稍候…' : mode === 'sign-up' ? '注册' : mode === 'reset' ? '获取验证码' : '登录'}</Button>
      </form>
      <div className="account-secondary-actions">
        {mode === 'sign-in' && <button type="button" onClick={() => switchMode('reset')}>忘记密码</button>}
        {mode === 'reset' && <button type="button" onClick={() => switchMode('sign-in')}>返回登录</button>}
      </div>
    </Card>
    {onboarding && <div className="account-guest-entry"><button type="button" onClick={continueLocally}>暂不登录，先体验</button><p>本地使用不会上传数据，登录后才能在其他设备继续。</p></div>}
  </AccountFrame>
}

import { Link } from 'react-router-dom'
import { useAppStore } from '../storage/store'

export default function WelcomePage() {
  const recovery = useAppStore((state) => state.storageRecovery)
  const dismissRecovery = useAppStore((state) => state.dismissStorageRecovery)
  return <div className="welcome-page">
    {recovery && <div className="storage-warning" role="alert"><p>{recovery.message}</p><Link to="/settings">处理数据</Link><button onClick={dismissRecovery}>稍后处理</button></div>}
    <main className="welcome-content">
      <div className="welcome-mark" aria-hidden="true">运</div>
      <h1>加点好运</h1>
      <p>建立人物档案查看命盘，或直接进行塔罗与六爻起卦。</p>
      <div className="welcome-actions">
        <Link className="button" to="/profiles/new?onboarding=1">建立我的命盘</Link>
        <Link className="button secondary" to="/divination">暂不建档，先去起卦</Link>
      </div>
    </main>
  </div>
}

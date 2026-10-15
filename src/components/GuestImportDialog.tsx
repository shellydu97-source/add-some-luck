import { Button, Card } from './UI'

// Asked once when a device that was used without an account signs in for the first time.
export default function GuestImportDialog({ profiles, records, onAnswer }: { profiles: number; records: number; onAnswer: (importData: boolean) => void }) {
  return <div className="flow-confirm-backdrop"><Card><div role="dialog" aria-modal="true" aria-label="把这台设备上的数据带进账号？">
    <h2>把这台设备上的数据带进账号？</h2>
    <p>这台设备上有 {profiles} 个人物、{records} 条记录。</p>
    <p className="helper">不带进账号的话，退出登录后仍可在这台设备上看到它们。</p>
    <div className="button-row">
      <Button className="secondary" onClick={() => onAnswer(false)}>不用了</Button>
      <Button onClick={() => onAnswer(true)}>带进账号</Button>
    </div>
  </div></Card></div>
}

import { Link,useLocation } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { Card } from '../components/UI'
export default function LegalPage() {
 const privacy=useLocation().pathname==='/privacy'
 return <main className="page-container"><TopBar title={privacy?'隐私说明':'使用须知'} back /><Card><p className="helper">说明草稿 · 更新于 2026-10-13 · 正式发布前需由项目方及专业人士审阅</p>
 {privacy ? <>
 <h2>运营者与联系</h2><p>运营者：shelly。有关隐私、数据导出、删除或账号注销的问题，请联系 <a href="mailto:shellydu97@gmail.com">shellydu97@gmail.com</a>。</p><h2>我们处理哪些数据</h2><p>人物档案包含昵称、性别、出生日期、时间及出生地；占卜包含问题、牌面或卦象、记录、验证结果与备注。注册账号时由 Supabase 处理邮箱、密码及认证信息。请避免在问题和备注中填写无关的敏感信息。</p>
 <h2>存放在哪里</h2><p>访客数据保存在当前浏览器的本机存储，清除浏览器数据可能使其丢失。登录后，经你选择导入的数据及账号内的档案、记录、草稿存放于 Supabase，并保留本机缓存；浏览器偏好不会上传。当前 Supabase 项目区域为 eu-west-1（欧洲爱尔兰）。账号业务数据保留至你主动删除或注销；访客数据保留至你清除该浏览器数据。第三方日志和基础设施备份的实际保留期限仍需按服务商配置核实。</p>
 <h2>智能解读发送给谁</h2><p>首次发送前需同意。主动生成或追问时，问题、必要排盘或抽牌事实及对话经本应用服务端（当前网站使用 Cloudflare Pages Functions）发送到 DeepSeek。不会直接发送你的邮箱或密码。没有启用智能解读时不会将这些内容发送给 DeepSeek。服务端会记录用于限额的账号标识、请求次数及必要网络信息。数据会由所选云服务商处理，可能涉及跨境传输。第三方日志、备份及 AI 服务的保留和处理规则以对应服务政策和实际配置为准，不承诺零留存。详情可查看 <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase 隐私政策</a>、<a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">Cloudflare 隐私政策</a>和 <a href="https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html" target="_blank" rel="noreferrer">DeepSeek 隐私政策</a>。正式发布前须由专业人士核实适用条款与跨境要求。</p>
 <h2>导出、删除和注销</h2><p>在“我的 → 设置”导出全部数据，导出文件包含个人信息，请妥善保管。人物及记录可逐项删除；删除人物会移除其未完成草稿，历史记录的人物快照继续保留，可单独删除记录。设置可清空本机，或登录后同时删除云端业务数据。仅清空本机会退出登录，云端数据保留。</p><p>在账号页二次确认注销后，账号、云端业务数据和用量记录被删除，当前设备的该账号缓存与恢复备份清除，回到访客状态。其他设备的离线缓存和已导出的备份需自行清除，服务商备份保留期限须由运营方确认。</p>
 </> : <>
 <h2>结果仅供参考</h2><p>命盘、六爻、梅花易数、塔罗及智能解读用于个人思考与记录，不构成医疗、法律、投资、心理诊断等专业建议。不保证事件结果、精确应期或收益。</p>
 <h2>认真做现实判断</h2><p>出生时间、地点和历法会影响排盘；未知或有歧义的信息可能降低结果确定性。AI 可能出错，请核对事实，不因解读忽视现实证据。涉及健康、财务或法律决定，请咨询相应专业人士。</p>
 <h2>数据与账号</h2><p>请仅填写有权使用的人物信息，妥善保存导出备份。登录后可同步，网络中断或冲突可能暂缓同步。注销不可恢复，请先导出需要保留的数据。使用智能解读前可查看隐私说明并决定是否发送。</p>
 </>}
 <p><Link to={privacy?'/terms':'/privacy'}>{privacy?'使用须知':'隐私说明'}</Link> · <Link to="/settings">数据与设置</Link> · <Link to="/account">账号</Link></p></Card></main>
}

import TopBar from '../components/TopBar'
import { EmptyState, LinkButton } from '../components/UI'

export default function NotFoundPage() {
  return <><TopBar title="页面不存在" back /><EmptyState title="这条路还没铺好" action={<LinkButton to="/charts">回到命盘</LinkButton>}>检查一下地址，或从底部导航重新进入。</EmptyState></>
}

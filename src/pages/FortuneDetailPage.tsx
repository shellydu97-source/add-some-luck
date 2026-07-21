import { Navigate, useParams } from 'react-router-dom'

export default function FortuneDetailPage() {
  const { period } = useParams()
  const safePeriod = period === 'week' || period === 'month' ? period : 'day'
  return <Navigate to={`/fortune?period=${safePeriod}`} replace />
}

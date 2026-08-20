import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import StartupSplash from '../components/StartupSplash'
import AccountGate from '../cloud/AccountGate'
import { featureFlags } from '../config/features'
import { useAppStore } from '../storage/store'
import { resolveStartupPath } from './startup'

const SettingsPage = lazy(() => import('../pages/SettingsPage'))
const AccountPage = lazy(() => import('../pages/AccountPage'))
const ProfilesPage = lazy(() => import('../pages/ProfilesPage'))
const ProfileFormPage = lazy(() => import('../pages/ProfileFormPage'))
const BaziPage = lazy(() => import('../pages/BaziPage'))
const AstrologyPage = lazy(() => import('../pages/AstrologyPage'))
const DivinationHomePage = lazy(() => import('../pages/DivinationHomePage'))
const LiuyaoQuestionPage = lazy(() => import('../pages/LiuyaoQuestionPage'))
const LiuyaoCastPage = lazy(() => import('../pages/LiuyaoCastPage'))
const LiuyaoConfirmPage = lazy(() => import('../pages/LiuyaoConfirmPage'))
const LiuyaoResultPage = lazy(() => import('../pages/LiuyaoResultPage'))
const MeihuaQuestionPage = lazy(() => import('../pages/MeihuaQuestionPage'))
const MeihuaCastPage = lazy(() => import('../pages/MeihuaCastPage'))
const MeihuaResultPage = lazy(() => import('../pages/MeihuaResultPage'))
const TarotQuestionPage = lazy(() => import('../pages/TarotQuestionPage'))
const TarotSpreadPage = lazy(() => import('../pages/TarotSpreadPage'))
const TarotMethodPage = lazy(() => import('../pages/TarotMethodPage'))
const TarotDrawPage = lazy(() => import('../pages/TarotDrawPage'))
const TarotResultPage = lazy(() => import('../pages/TarotResultPage'))
const RecordsPage = lazy(() => import('../pages/RecordsPage'))
const RecordDetailPage = lazy(() => import('../pages/RecordDetailPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const WelcomePage = lazy(() => import('../pages/WelcomePage'))
const ChartLandingPage = lazy(() => import('../pages/ChartLandingPage'))
const TodayPage = lazy(() => import('../pages/TodayPage'))
const MyPage = lazy(() => import('../pages/MyPage'))

function StartupRoute() {
  const profiles = useAppStore((state) => state.profiles)
  const lastPrimaryRoute = useAppStore((state) => state.lastPrimaryRoute)
  const hasHydrated = useAppStore((state) => state.hasHydrated)
  if (!hasHydrated) return <div className="route-loading">正在读取数据…</div>
  return <Navigate to={resolveStartupPath(profiles.length, lastPrimaryRoute)} replace />
}

function AstrologyRoute() {
  const { profileId } = useParams()
  if (!featureFlags.astrology) return <Navigate to={profileId ? `/charts/${profileId}/bazi` : '/charts'} replace />
  return <AstrologyPage />
}

export default function App() {
  return <><StartupSplash /><Suspense fallback={<div className="route-loading">正在打开页面…</div>}><Routes>
    <Route path="account" element={<AccountPage />} />
    <Route element={<AccountGate />}>
      <Route index element={<StartupRoute />} />
      <Route path="welcome" element={<WelcomePage />} />
      <Route element={<AppShell />}>
        <Route path="today" element={<TodayPage />} />
        <Route path="fortune/*" element={<Navigate to="/today" replace />} />
        <Route path="me" element={<MyPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="charts" element={<ChartLandingPage />} />
        <Route path="profiles" element={<ProfilesPage />} />
        <Route path="profiles/new" element={<ProfileFormPage />} />
        <Route path="profiles/:profileId/edit" element={<ProfileFormPage />} />
        <Route path="charts/:profileId/bazi" element={<BaziPage />} />
        <Route path="charts/:profileId/astrology" element={<AstrologyRoute />} />
        <Route path="divination" element={<DivinationHomePage />} />
        <Route path="divination/liuyao/question" element={<LiuyaoQuestionPage />} />
        <Route path="divination/liuyao/cast" element={<LiuyaoCastPage />} />
        <Route path="divination/liuyao/confirm" element={<LiuyaoConfirmPage />} />
        <Route path="divination/liuyao/result" element={<LiuyaoResultPage />} />
        <Route path="divination/meihua/question" element={<MeihuaQuestionPage />} />
        <Route path="divination/meihua/cast" element={<MeihuaCastPage />} />
        <Route path="divination/meihua/result" element={<MeihuaResultPage />} />
        <Route path="divination/tarot/question" element={<TarotQuestionPage />} />
        <Route path="divination/tarot/spread" element={<TarotSpreadPage />} />
        <Route path="divination/tarot/method" element={<TarotMethodPage />} />
        <Route path="divination/tarot/draw" element={<TarotDrawPage />} />
        <Route path="divination/tarot/result" element={<TarotResultPage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="records/:recordId" element={<RecordDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes></Suspense></>
}

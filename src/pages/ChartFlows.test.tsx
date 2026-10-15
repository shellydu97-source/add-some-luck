import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ChartLandingPage from './ChartLandingPage'
import BaziPage from './BaziPage'
import { useAppStore } from '../storage/store'
import { createEmptyAppData } from '../storage/appData'
import { NEW_PROFILE_DEFAULTS } from '../utils/profileForm'
import type { Profile } from '../models/types'

vi.mock('../components/AiReadingPanel', () => ({ default: () => null }))
const person = (id: string, name: string, isDefault: boolean, rawBirthDate: string): Profile => ({ ...NEW_PROFILE_DEFAULTS, id, name, isDefault, gender: 'female', rawBirthDate, rawBirthTime: '09:30', timeAccuracy: 'exact_minute', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' })
beforeEach(() => {
  useAppStore.getState().replaceAllData(createEmptyAppData())
  useAppStore.setState({ profiles: [person('a', '小橙', false, '1997/08/30'), person('b', '阿青', true, '1990/03/10')], activeProfileId: 'b', hasHydrated: true })
})
afterEach(cleanup)
function app() {
  return render(<MemoryRouter initialEntries={['/charts']}><Routes><Route path="/charts" element={<ChartLandingPage />} /><Route path="/charts/:profileId/bazi" element={<BaziPage />} /></Routes></MemoryRouter>)
}

it('命理入口先列出人物，默认人物排第一，并显示四柱摘要', () => {
  app()
  const cards = screen.getAllByRole('button', { name: /的命盘$/ })
  expect(cards[0].textContent).toContain('阿青')
  expect(cards[0].textContent).toContain('默认')
  expect(cards[1].textContent).toContain('丁丑 · 戊申 · 甲辰 · 己巳')
})

it('进入命盘后，概览只放速览和简表，详细表格只在排盘', () => {
  app()
  fireEvent.click(screen.getByRole('button', { name: '查看小橙的命盘' }))
  expect(useAppStore.getState().activeProfileId).toBe('a')
  expect(screen.getByText('命盘速览')).toBeTruthy()
  expect(screen.queryByText('藏干十神')).toBeNull()
  expect(screen.queryByText('出生信息')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '排盘' }))
  expect(screen.getByText('藏干十神')).toBeTruthy()
  expect(screen.getByText('出生信息')).toBeTruthy()
  expect(screen.queryByText('命盘速览')).toBeNull()
})

it('命盘里切换人物，设为默认后重新加载会先显示默认人物', () => {
  app()
  fireEvent.click(screen.getByRole('button', { name: '查看小橙的命盘' }))
  fireEvent.click(screen.getByText('切换人物'))
  fireEvent.click(screen.getByRole('button', { name: '阿青（默认）' }))
  expect(useAppStore.getState().activeProfileId).toBe('b')
  useAppStore.getState().setDefaultProfile('a')
  expect(useAppStore.getState().notice).toContain('下次打开应用会先显示小橙')
  useAppStore.setState({ activeProfileId: 'b' })
  useAppStore.getState().finishHydration()
  expect(useAppStore.getState().activeProfileId).toBe('a')
})

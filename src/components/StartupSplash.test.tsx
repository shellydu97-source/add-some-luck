import { render,screen,cleanup,act } from '@testing-library/react'
import { beforeEach,afterEach,it,expect,vi } from 'vitest'
import StartupSplash from './StartupSplash'
import { useAppStore } from '../storage/store'
import { createEmptyAppData } from '../storage/appData'
beforeEach(()=>{sessionStorage.clear();useAppStore.getState().replaceAllData(createEmptyAppData());vi.useFakeTimers()})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
it('500ms内关闭，每个会话只显示一次',()=>{
 const view=render(<StartupSplash/>);expect(screen.getByRole('status')).toBeTruthy()
 act(()=>vi.advanceTimersByTime(500));expect(screen.queryByRole('status')).toBeNull();expect(document.body).not.toHaveClass('splash-active')
 view.unmount();render(<StartupSplash/>);expect(screen.queryByRole('status')).toBeNull()
})
it('降低动态效果时没有闪屏',()=>{useAppStore.getState().setReduceMotion(true);render(<StartupSplash/>);expect(screen.queryByRole('status')).toBeNull()})
it('sessionStorage不可用时也不会阻断启动',()=>{
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked')})
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked')})
 render(<StartupSplash/>);act(()=>vi.advanceTimersByTime(500));expect(screen.queryByRole('status')).toBeNull()
})

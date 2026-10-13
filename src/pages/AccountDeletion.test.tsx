import { render,screen,fireEvent,cleanup,waitFor } from '@testing-library/react'
import { MemoryRouter,Routes,Route } from 'react-router-dom'
import { afterEach,it,expect,vi } from 'vitest'
import AccountPage from './AccountPage'
import { CloudAccountContext,type CloudAccountValue } from '../cloud/accountContext'
vi.mock('../components/SyncConflictPanel',()=>({default:()=>null}))
afterEach(()=>{cleanup();vi.restoreAllMocks()})
function mount(deleteAccount=vi.fn().mockResolvedValue(undefined)) {
 const value={configured:true,session:{user:{email:'test@example.com'}},authLoading:false,syncStatus:'synced',deleteAccount,signOut:vi.fn()} as unknown as CloudAccountValue
 render(<CloudAccountContext.Provider value={value}><MemoryRouter><Routes><Route path="/" element={<AccountPage/>}/><Route path="/welcome" element={<h1>访客状态</h1>}/></Routes></MemoryRouter></CloudAccountContext.Provider>)
 return deleteAccount
}
it('取消任一注销确认都不会调用服务',()=>{
 const remove=mount(),confirm=vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(false)
 fireEvent.click(screen.getByText('注销账号'));expect(remove).not.toHaveBeenCalled()
 fireEvent.click(screen.getByText('注销账号'));expect(confirm).toHaveBeenCalledTimes(3);expect(remove).not.toHaveBeenCalled()
})
it('二次确认成功才调用注销，回到访客页面',async()=>{
 const remove=mount();vi.spyOn(window,'confirm').mockReturnValue(true)
 fireEvent.click(screen.getByText('注销账号'));await waitFor(()=>expect(screen.getByText('访客状态')).toBeTruthy());expect(remove).toHaveBeenCalledTimes(1)
})
it('服务失败仍在账号页并显示错误',async()=>{
 mount(vi.fn().mockRejectedValue(new Error('offline')));vi.spyOn(window,'confirm').mockReturnValue(true)
 fireEvent.click(screen.getByText('注销账号'));await waitFor(()=>expect(screen.getByText('操作没有完成，请稍后再试。')).toBeTruthy());expect(screen.getByText('test@example.com')).toBeTruthy()
})

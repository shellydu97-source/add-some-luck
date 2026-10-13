import { beforeEach,it,expect } from 'vitest'
import { createEmptyAppData } from './appData'
import { useAppStore,STORAGE_KEY } from './store'
import { isStorageProtected } from './persistence'
import { seedProfiles } from '../mocks/profiles'
beforeEach(()=>useAppStore.getState().replaceAllData(createEmptyAppData()))
it('每次启动加载完回到默认人物，本次切换不受影响',()=>{
 useAppStore.setState({profiles:structuredClone(seedProfiles),activeProfileId:seedProfiles[1].id})
 useAppStore.getState().finishHydration();expect(useAppStore.getState().activeProfileId).toBe(seedProfiles.find(p=>p.isDefault)?.id)
 useAppStore.getState().setActiveProfile(seedProfiles[1].id);expect(useAppStore.getState().activeProfileId).toBe(seedProfiles[1].id)
})
it('删除人物同步删除其草稿并留下删除标记，历史记录不变',()=>{
 const now=new Date().toISOString();useAppStore.setState({profiles:structuredClone(seedProfiles)})
 useAppStore.getState().upsertDraft({id:'d',type:'liuyao',profileId:seedProfiles[0].id,question:'问题',createdAt:now,updatedAt:now,state:{timeRange:'',casts:[],locked:false}})
 useAppStore.getState().deleteProfile(seedProfiles[0].id)
 expect(useAppStore.getState().drafts).toHaveLength(0);expect(useAppStore.getState().tombstones.drafts.d).toBeTruthy()
})
it('相同版本的无效本地数据也校验、备份并保护，可进入恢复界面',async()=>{
 const raw=JSON.stringify({version:5,state:{...createEmptyAppData(),profiles:[{id:'bad'}]}})
 localStorage.setItem(STORAGE_KEY,raw)
 await useAppStore.persist.rehydrate()
 expect(isStorageProtected(STORAGE_KEY)).toBe(true)
 expect(useAppStore.getState().hasHydrated).toBe(true)
 expect(useAppStore.getState().storageRecovery?.raw).toBe(raw)
 expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
 useAppStore.getState().setLastPrimaryRoute('records');expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
})
it('同类未完成草稿不能从store被静默覆盖',()=>{
 const now=new Date().toISOString();const draft={id:'a',type:'meihua' as const,profileId:'guest',question:'问题',createdAt:now,updatedAt:now,state:{locked:false}}
 useAppStore.getState().upsertDraft(draft)
 expect(()=>useAppStore.getState().upsertDraft({...draft,id:'b'})).toThrow('请先继续或放弃上次流程')
 expect(useAppStore.getState().drafts[0].id).toBe('a')
})
it('同版本损坏的压缩快照同样受保护，原文不覆盖',async()=>{
 const {seedRecords}=await import('../mocks/records')
 const raw=JSON.stringify({version:5,state:{...createEmptyAppData(),records:[{...seedRecords[0],rawResult:{snapshotFormat:'lz77-json-1',data:'%%%'}}]}})
 localStorage.setItem(STORAGE_KEY,raw);await useAppStore.persist.rehydrate()
 expect(isStorageProtected(STORAGE_KEY)).toBe(true);expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
})

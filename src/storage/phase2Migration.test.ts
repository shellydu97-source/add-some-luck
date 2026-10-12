import { describe,it,expect } from 'vitest'
import { migrateToV13 } from './migrations'
import { NEW_PROFILE_DEFAULTS } from '../utils/profileForm'
import { createRecord,createBasicInterpretation } from '../utils/record'
import { useAppStore } from './store'
import { mergeAppData, createSyncBaseline, findSyncConflicts } from '../cloud/syncCore'
const profile={...NEW_PROFILE_DEFAULTS,name:'测试',rawBirthDate:'2000/01/07',id:'p',createdAt:'2026-10-12T04:00:00Z',updatedAt:'2026-10-12T04:00:00Z'}
describe('第二阶段可选字段兼容和快照保护',()=>{
 it('旧档案默认不变，新子时规则和用神选择往返保留',()=>{
   const record=createRecord({type:'liuyao',rawResult:{judgement:{tendency:'有阻力'},coinTosses:[]},interpretation:createBasicInterpretation('原始','不变')})
   const old=migrateToV13({profiles:[profile],records:[record]})
   expect(old.profiles[0].dayBoundaryRule).toBe('system_default')
   const newer=migrateToV13({...old,profiles:[{...profile,dayBoundaryRule:'zi-23'}],records:[{...record,liuyaoUseGodOverride:'父母'}]})
   expect(newer.profiles[0].dayBoundaryRule).toBe('zi-23')
   expect(newer.records[0].liuyaoUseGodOverride).toBe('父母')
   expect(newer.records[0].rawResult).toEqual(record.rawResult)
 })
 it('改选用神是可变同步字段，不改原始判断，双端改选进入冲突',()=>{
   const record=createRecord({type:'liuyao',rawResult:{judgement:{tendency:'有阻力'}},interpretation:createBasicInterpretation('原始','不变')})
   const state=migrateToV13({profiles:[profile],records:[record]});useAppStore.setState(state)
   useAppStore.getState().setLiuyaoUseGodOverride(record.id,'父母')
   const local=useAppStore.getState();expect(local.records[0].rawResult).toEqual(record.rawResult)
   const remote={...state,records:[{...record,liuyaoUseGodOverride:'官鬼' as const}]}
   expect(findSyncConflicts(local,remote,createSyncBaseline(state))).toHaveLength(1)
   expect(mergeAppData(local,state,createSyncBaseline(state)).records[0].liuyaoUseGodOverride).toBe('父母')
 })
})

import { describe,it,expect } from 'vitest'
import { useAppStore } from './store'
import { createEmptyAppData } from './appData'
import { NEW_PROFILE_DEFAULTS } from '../utils/profileForm'
import { createRecord,createBasicInterpretation } from '../utils/record'
import { migrateToV13 } from './migrations'
import { createSyncBaseline,findSyncConflicts,mergeAppData } from '../cloud/syncCore'
import type { AiInterpretationSnapshot } from '../models/types'
const profile=(id:string)=>({...NEW_PROFILE_DEFAULTS,id,name:id,createdAt:'2026-10-12T04:00:00Z',updatedAt:'2026-10-12T04:00:00Z'})
const reading:AiInterpretationSnapshot={id:'ai',module:'bazi',question:'问题',createdAt:'2026-10-12T04:00:00Z',provider:'deepseek',model:'test',promptVersion:'v3',directAnswer:'回答'}
describe('chart AI draft and mutable question compatibility',()=>{
 it('chart AI is a draft until explicit snapshot save; other profiles survive',()=>{
  useAppStore.setState({...createEmptyAppData(),profiles:[profile('p'),profile('q')]})
  expect(useAppStore.getState().saveAiSession({module:'bazi',profileId:'p',draftId:'ai-bazi-p',question:'问题',interpretation:reading})).toBe(true)
  useAppStore.getState().saveAiSession({module:'bazi',profileId:'q',draftId:'ai-bazi-q',question:'问题',interpretation:{...reading,id:'ai2'}})
  expect(useAppStore.getState().records).toHaveLength(0);expect(useAppStore.getState().drafts).toHaveLength(2)
  const loaded=migrateToV13(useAppStore.getState());expect(loaded.drafts[0].ai?.interpretations).toHaveLength(1)
  const r=createRecord({profile:profile('p'),type:'bazi',rawResult:{original:'fixed'},interpretation:createBasicInterpretation('本地','')})
  useAppStore.getState().createRecordSnapshot(r,'ai-bazi-p')
  const saved=useAppStore.getState().records[0];expect(saved.aiInterpretations).toHaveLength(1);expect(saved.question).toBeUndefined();expect(saved.questionAddedLater).toBe('问题')
 })
 it('two-sided mutable question edits conflict without replacing original snapshot',()=>{
  const record=createRecord({type:'tarot',rawResult:{fixed:'cards'},interpretation:createBasicInterpretation('本地','')});const base={...createEmptyAppData(),records:[record]}
  const local={...base,records:[{...record,questionAddedLater:'本机',metaUpdatedAt:'2026-10-12T05:00:00Z'}]},remote={...base,records:[{...record,questionAddedLater:'云端',metaUpdatedAt:'2026-10-12T06:00:00Z'}]}
  expect(findSyncConflicts(local,remote,createSyncBaseline(base))).toHaveLength(1);expect(mergeAppData(local,base,createSyncBaseline(base)).records[0].questionAddedLater).toBe('本机');expect(migrateToV13(local).records[0].questionAddedLater).toBe('本机')
 })
})

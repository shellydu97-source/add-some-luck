import { useEffect,useRef,useState } from 'react'
import { Link } from 'react-router-dom'
import { useCloudAccount } from '../cloud/accountContext'
import { AiRequestError,getAiServiceStatus,requestAiReading } from '../ai/client'
import { acceptAiConsent,hasAiConsent } from '../ai/consent'
import { readingToText } from '../ai/reading'
import type { AiConversationMessage,AiInterpretationSnapshot,AiModule,AiReading } from '../models/types'
import { useAppStore } from '../storage/store'
import { makeId } from '../utils/id'
import { Button,Card } from './UI'
import AiReadingContent from './AiReadingContent'
interface Props {
 module:AiModule;question?:string;context:Record<string,unknown>;recordId?:string;draftId?:string;profileId?:string
 ensureRecord?:(question?:string)=>string;allowQuestionInput?:boolean;title?:string;category?:string;timeRange?:string;useGod?:string
}
export default function AiReadingPanel({module,question='',context,recordId,draftId,profileId,ensureRecord,allowQuestionInput=false,title='结合问题解读',category,timeRange,useGod}:Props) {
 const account=useCloudAccount()
 const storedDraft=useAppStore(s=>s.drafts.find(d=>d.id===draftId))
 const storedRecord=useAppStore(s=>s.records.find(r=>r.id===(recordId ?? storedDraft?.state.recordId)))
 const saveAi=useAppStore(s=>s.saveAiSession)
 const setNotice=useAppStore(s=>s.setNotice)
 const [available,setAvailable]=useState<boolean|null>(null)
 const [requiresLogin,setRequiresLogin]=useState(false)
 const [expiredToken,setExpiredToken]=useState<string>()
 const [consent,setConsent]=useState(hasAiConsent)
 const [consentVisible,setConsentVisible]=useState(false)
 const [pendingQuestion,setPendingQuestion]=useState<string|null>(null)
 const [askedQuestion,setAskedQuestion]=useState(()=>storedRecord?.questionAddedLater ?? (question || storedDraft?.ai?.question || ''))
 const [followUp,setFollowUp]=useState('')
 const [loading,setLoading]=useState(false)
 const [partial,setPartial]=useState('')
 const [partialQuestion,setPartialQuestion]=useState('')
 const [error,setError]=useState('')
 const [sessionReading,setSessionReading]=useState<AiReading>()
 const controller=useRef<AbortController|null>(null)
 const mounted=useRef(true)
 const pendingSave=useRef(false)
 const loginRequired=(requiresLogin && !account.session) || expiredToken === (account.session?.access_token ?? 'anonymous')
 const reading=storedRecord?.aiInterpretations?.at(-1) ?? storedDraft?.ai?.interpretations.at(-1) ?? sessionReading
 const messages=storedRecord?.aiMessages ?? storedDraft?.ai?.messages ?? []
 useEffect(()=>{
  mounted.current=true
  const health=new AbortController()
  getAiServiceStatus(health.signal).then(s=>{setAvailable(s.available);setRequiresLogin(s.requiresLogin)}).catch(()=>{if(mounted.current)setAvailable(false)})
  return ()=>{mounted.current=false;health.abort();controller.current?.abort()}
 },[])
 async function run(content:string|null,accepted=consent) {
  if(loading || loginRequired || !available || controller.current) return
  if(!accepted){setPendingQuestion(content);setConsentVisible(true);return}
  const abort=new AbortController();controller.current=abort
  const initial=content===null
  setLoading(true);setError('');setPartial('');setPartialQuestion(content ?? '')
  try {
   const response=await requestAiReading({module,action:initial?'interpret':'followup',question:askedQuestion.trim(),followUpQuestion:content ?? undefined,context,category,timeRange,useGod,messages:initial?undefined:[...(reading?[{role:'assistant' as const,content:readingToText(reading)}]:[]),...messages.map(m=>({role:m.role,content:m.reading?readingToText(m.reading):m.content}))]},abort.signal,delta=>{if(mounted.current && !abort.signal.aborted)setPartial(value=>value+delta)},accepted)
   if(abort.signal.aborted || !mounted.current)return
   const snapshot:AiInterpretationSnapshot={id:makeId('ai-reading'),module,question:askedQuestion.trim(),createdAt:new Date().toISOString(),provider:response.meta.provider,model:response.meta.model,promptVersion:response.meta.promptVersion,usage:response.usage,...response.reading}
   const newMessages:AiConversationMessage[]=initial?[]:[{id:makeId('ai-message'),role:'user',content:content!,createdAt:new Date().toISOString()},{id:makeId('ai-message'),role:'assistant',content:readingToText(response.reading),reading:response.reading,createdAt:new Date().toISOString()}]
   const saved=saveAi({module,profileId,recordId,draftId,question:askedQuestion.trim(),interpretation:initial?snapshot:undefined,messages:newMessages})
   if(!saved){setError('原结果已被移除，本次回答未保存。');return}
   if(initial)setSessionReading(response.reading)
   else setFollowUp('')
   setPartial('');setPartialQuestion('');setNotice((recordId || useAppStore.getState().drafts.find(d=>d.id===draftId)?.state.recordId)?'解读已保存到这条记录。':'解读已保存在草稿中，点击保存到记录可一并保留。')
  } catch(caught) {
   if(!mounted.current)return
   if(abort.signal.aborted)setError('已停止生成，部分回答未保存。')
   else {if(caught instanceof AiRequestError && caught.status===401){setRequiresLogin(true);setExpiredToken(account.session?.access_token ?? 'anonymous')}setError(caught instanceof Error ? caught.message:'智能解读暂时不可用')}
  } finally {controller.current=null;if(mounted.current)setLoading(false)}
 }
 function saveRecord() {
  if(!ensureRecord || loading || pendingSave.current)return
  pendingSave.current=true
  try {ensureRecord(askedQuestion.trim());setNotice('结果与已生成的解读已保存到记录。')} finally {pendingSave.current=false}
 }
 function changeQuestion(value:string){setAskedQuestion(value);if(storedRecord && !storedRecord.question?.trim())useAppStore.getState().addRecordQuestion(storedRecord.id,value)}
 return <Card className="ai-reading-panel">
  <div className="ai-panel-heading"><div><span>智能解读</span><h2>{title}</h2></div>{available && <span className="ai-status-dot">可用</span>}</div>
  {!reading && <p className="helper">根据本次确定的排盘或牌面回答，原始结果保持不变。</p>}
  {(allowQuestionInput || !question.trim()) && <label className="field ai-question-field"><span>你最想了解什么</span><textarea maxLength={2000} rows={3} disabled={loading} value={askedQuestion} onChange={e=>changeQuestion(e.target.value)} placeholder="例如：我现在需要注意什么？" /></label>}
  {loginRequired ? <p className="ai-unavailable">登录后可以使用智能解读。<Link to="/account">去登录</Link></p> : available===false ? <p className="ai-unavailable">智能解读暂未开启，基础结果仍可查看和保存。</p> : !reading && !loading && <Button onClick={()=>run(null)} disabled={available!==true}>{askedQuestion.trim()?'结合问题生成解读':'生成基础解读'}</Button>}
  {consentVisible && <div className="ai-consent" role="dialog" aria-label="智能解读隐私说明"><p>会把本次排盘数据和你的问题发送给第三方大模型服务 DeepSeek 处理。只有你同意后才会发送，同意状态保存在本机。</p><div className="button-row"><Button className="secondary" onClick={()=>setConsentVisible(false)}>暂不使用</Button><Button onClick={()=>{acceptAiConsent();setConsent(true);setConsentVisible(false);run(pendingQuestion,true)}}>同意并继续</Button></div></div>}
  {reading && <AiReadingContent reading={reading}/>}
  {messages.length>0 && <div className="chat-list ai-chat-list">{messages.map(m=><div className={`chat-bubble ${m.role}`} key={m.id}><b>{m.role==='user'?'你':'智能解读'}</b>{m.reading?<AiReadingContent reading={m.reading}/>:<p>{m.content}</p>}</div>)}</div>}
  {(loading || partial) && <div className="ai-stream" role="status" aria-live="polite">{partialQuestion && <p><b>本次追问：</b>{partialQuestion}</p>}<p className="ai-direct-answer">{partial || '正在整理回答…'}</p>{loading && <Button className="secondary" onClick={()=>controller.current?.abort()}>停止生成</Button>}{!loading && partial && <p className="helper">以上为未完成回答，未保存。</p>}</div>}
  {reading && !loading && <>
   {!!reading.suggestedQuestions?.length && <div className="ai-suggestions">{reading.suggestedQuestions.map((q,i)=><button key={i} onClick={()=>run(q)} disabled={loginRequired}>{q}</button>)}</div>}
   <div className="follow-up-input"><textarea rows={2} maxLength={2000} value={followUp} onChange={e=>setFollowUp(e.target.value)} placeholder="继续问，我会结合刚才的结果回答"/><Button onClick={()=>run(followUp.trim())} disabled={loginRequired || !followUp.trim()}>发送</Button></div>
   {reading.incomplete && <Button className="secondary" onClick={()=>run(null)} disabled={loginRequired}>重新生成完整回答</Button>}
   {!storedRecord && ensureRecord && <Button className="secondary" onClick={saveRecord}>保存结果与解读到记录</Button>}
  </>}
  {error && <p className="field-error ai-error">{error}</p>}
  {!reading && !loading && partial && <Button className="secondary" disabled={loginRequired || !available} onClick={()=>run(null)}>重新生成</Button>}
 </Card>
}

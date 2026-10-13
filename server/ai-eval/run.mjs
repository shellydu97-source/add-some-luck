import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {aiConfig} from '../ai-handler.mjs'
import {validateAiRequest,PROMPT_VERSION} from '../ai-core.mjs'
import {requestDeepSeek} from '../deepseek-client.mjs'
import {evaluateAnswer} from './checks.mjs'
const root=path.dirname(fileURLToPath(import.meta.url))
const cases=JSON.parse(await fs.readFile(path.join(root,'cases.json'),'utf8'))
const fixtures=JSON.parse(await fs.readFile(path.join(root,'fixtures.json'),'utf8'))
const config=aiConfig(process.env)
const dryRun=process.argv.includes('--dry-run')
if(!dryRun && !config.apiKey)throw new Error('请在进程环境提供 DEEPSEEK_API_KEY；不自动读取个人 .env，也不会在输出中写入密钥。')
const filter=process.argv.find(a=>a.startsWith('--case='))?.slice(7)
const outputPath=process.argv.find(a=>a.startsWith('--output='))?.slice(9) || path.join(process.cwd(),'artifacts','ai-eval',`results-${Date.now()}.json`)
const results=[]
for(const entry of cases.filter(c=>!filter || c.id===filter)) {
 const input=validateAiRequest({...entry,action:'interpret',context:fixtures[entry.module]})
 if(dryRun){results.push({id:entry.id,module:entry.module,contextBytes:new TextEncoder().encode(JSON.stringify(input.context)).length,validated:true});continue}
 try {const result=await requestDeepSeek(input,config);const text=[result.reading.directAnswer,...(result.reading.basis ?? []),...(result.reading.uncertainty ?? []),...(result.reading.advice ?? [])].join('\n');const checks=evaluateAnswer(result.reading.directAnswer,input.context);results.push({id:entry.id,module:entry.module,question:entry.question,...result,checks});console.log(`\n[${entry.id}]\n${text}\nChecks: ${JSON.stringify(checks)}`)}
 catch {results.push({id:entry.id,error:'生成失败，请检查配置或服务状态'});console.error(`[${entry.id}] 生成失败`)}
}
if(!results.length)throw new Error('没有匹配案例')
const report={date:new Date().toISOString(),model:config.model,promptVersion:PROMPT_VERSION,dryRun,results}
await fs.mkdir(path.dirname(outputPath),{recursive:true});await fs.writeFile(outputPath,JSON.stringify(report,null,2))
console.log(`${dryRun?'只校验，未调用 API':'评测完成'}：${results.length} 案例。报告：${outputPath}`)
if(results.some(r=>r.error))process.exitCode=1

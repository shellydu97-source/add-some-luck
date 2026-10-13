# 第三阶段 AI 交付口径

完成日期：2026-10-13。promptVersion 为 ai-reading-v3-facts-local-judgement-20261012，contextVersion 为 3。

## 官方参数核对

- DeepSeek Chat Completions：https://api-docs.deepseek.com/api/create-chat-completion/
- 推理模式：https://api-docs.deepseek.com/guides/thinking_mode/
- 模型与兼容名称：https://api-docs.deepseek.com/quick_start/pricing/
- Cloudflare Streams：https://developers.cloudflare.com/workers/runtime-apis/streams/

文档支持 thinking enabled/disabled、reasoning_effort low/high、JSON response_format、SSE。deepseek-v4-flash 兼容名仍被接受并由新版 Flash 提供服务，保留已有默认配置。网页逐步输出纯文本，非流式接口才启用 JSON；该选择依方案“优先保证流式”要求。

JSON 结构为 directAnswer、basis[]、uncertainty[]、advice[]、suggestedQuestions[]，Zod 校验，异常格式退回文本。新纯文本只保存 directAnswer，旧 summary/sections 单独兼容展示。真实模型的字数、语义质量与延迟没有通过模拟测试确认。

## 消息与上下文

系统提示中上海当前日期由服务端 Date + Intl 生成；不接受客户端日期替代。问题分类、观察范围、用神作为解释数据。四模块分别约束 RWS、增删卜易/卜筮正宗、梅花体用卦气及八字事实/推断界限。

每次请求在第一条 user 消息中附带一次固定上下文，然后接 bounded 对话与本次追问；不在每条历史消息重复数据。对话上限沿用 12 条、每条 2000 字。模块上下文硬上限：八字 12KB，其余 8KB；schema 剔除未知字段，完整旧格式仍兼容校验。

八字保留四柱、藏干十神、两种分布、关系神煞、当前及前后大运和三年流年、校正说明。六爻保留纳甲六亲六神世应、日月标记、伏神、动爻文字和判断，不传完整卦对象。梅花保留卦名、动爻、体用与判断。塔罗保留牌阵/位置/牌名/方向/当前牌义；旧记录只更新发送给 AI 的牌义，不改保存时的快照。

## 流式与中断

共享 SSE 解析器支持拆分 UTF-8、CRLF、多行 data 与心跳；正文只取 delta.content，不转发 reasoning_content。Node 逐块管道发送 Web Response，Cloudflare/Vercel 直接返回共用 handler 的 Web Stream。取消/离开页面会关闭流与上游。鉴权、校验和额度检查在开流前完成，失败保留正常 HTTP 状态；流中异常为 error frame。没有 done 的 EOF 不算完成。provider length 的结果标 incomplete，展示未完成说明并允许重试。

主动停止的部分内容不保存；用户主动重试仍消耗正常配额。初答 low/1500，追问 low/2500；只有详细追问使用 high，最终内容限制 20000 字作为防滥用边界，120 秒超时。真实服务可能把 reasoning tokens 计入输出预算；需要真实评测确认是否应调整预算，本次不宣称生成质量已验收。

## 保存与兼容

AI 面板不在生成时调用 ensureRecord；ensureRecord 仅用于显式保存。已有记录直接追加完成结果。占卜草稿带 ai 内容；八字解读作为绑定人物和档案版本的草稿，刷新可恢复。保存时读取最新草稿并原子带入完成解读与追问，在途生成完成后也能写入刚保存的占卜记录。被删除的记录不因回答完成而复活。

questionAddedLater 只在原问题为空时更新，参与同步 baseline 与字段冲突检测，不改原问题或 rawResult。数据保持 schemaVersion 1.3，新增字段可选，迁移测试验证往返。原始 AI 和旧 structured 字段保留。星盘入口保持隐藏，未放宽服务端支持模块。

## 验收范围

12 个固定合成案例 dry-run 通过；规则检测只是人工评测的提示，不能证明正确，不进 CI，不自动读取 .env。真实运行需用户自行提供密钥并消耗额度。Browser QA 使用工作目录中的临时模拟服务，回答明确标为本地模拟，不在生产代码提供假回答路径。

没有真实 DeepSeek、Cloudflare 部署或真实 Supabase 双设备验收。第三阶段不新增 SQL、运行时依赖或服务端变量。第一阶段 SQL/鉴权配置仍是上线前提。第四阶段隐私完整页面、注销账号、图片优化和安全头等仍待确认开展。

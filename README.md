# 加点好运

移动优先的个人命盘、起卦与复盘应用。人物、草稿和记录默认保存在各自浏览器中；配置 Supabase 后可选择注册账号并跨设备同步。数据结构保持 `schemaVersion 1.3`。

## 已有能力

- 多人物档案、公历 / 农历出生信息、中国大陆省市坐标选择。
- 八字基础排盘：四柱、藏干、十神、五行、纳音、十二长生、旬空、大运与流年基础时间轴。
- 本命星盘：十颗星体、逆行、ASC、MC、Placidus 宫位、落宫和主要相位；未知出生时间按当日范围保守展示。
- 塔罗：78 张牌、单牌 / 三牌 / 五张双路径、系统抽牌 / 仪式抽牌、Web Crypto 随机和不可重复恢复。
- 六爻：数字投掷 / 手动录入、三钱成爻、六十四卦、动变、八宫、纳甲、世应、六亲、六神和历法字段。
- 不可变结果快照、后续验证、实际结果和备注。
- 可选 DeepSeek 智能解读与继续追问；智能解读只解释现有结果，不参与计算、洗牌或起卦。
- 可选邮箱账号与 Supabase 云端同步；未登录时仍保持完整的本地使用能力。

## 本地运行

需要 Node.js 20+ 和 pnpm。

```bash
pnpm install
pnpm dev
```

`pnpm dev` 会同时启动前端和本地 AI 代理；默认预览地址是 `http://127.0.0.1:4173/`，端口占用时会自动顺延。

生产预览：

```bash
pnpm build
pnpm preview
```

质量检查：

```bash
pnpm build
pnpm lint
pnpm test
```

## 配置 DeepSeek

复制 `.env.example` 为 `.env.local`，只在本机文件或部署平台的环境变量中填写：

```dotenv
DEEPSEEK_API_KEY=你的密钥
DEEPSEEK_MODEL=deepseek-flash
```

不要把真实密钥写进 `src`、提交到 Git，或放进浏览器环境变量。浏览器只请求项目自己的 `/api/ai/chat`，密钥由 `server/index.mjs` 在服务端读取。

线上服务端必须配置 `SUPABASE_URL` 和 `SUPABASE_PUBLISHABLE_KEY`，智能解读仅登录后可用；默认每账号每天 30 次（`AI_USER_DAILY_LIMIT`）、全站每天 1000 次（`AI_DAILY_REQUEST_LIMIT`），数据库原子计数。单 IP 每小时 60 次（`AI_PER_IP_HOURLY_LIMIT`）为进程内附加保护。仅本地开发且未配置 Supabase 时，可设置 `AI_ALLOW_ANONYMOUS=true` 使用匿名内存限流。Node 默认忽略 X-Forwarded-For，只有可信反向代理场景才设 `TRUST_PROXY=true`。朋友打开同一网址时，每个人的档案和记录仍保存在自己的浏览器中。

## 配置 Supabase 账号与同步

1. 在 Supabase 创建项目。
2. 打开项目的 SQL Editor，先执行 `supabase/migrations/2026071701_user_app_data.sql`，再依次执行 `supabase/migrations/2026101201_ai_usage.sql`、`supabase/migrations/2026101202_sync_version.sql`。**先执行 SQL，再部署服务端和前端**。
3. 在 Auth 的 Email Provider 中启用邮箱注册和 Confirm email，并配置自定义 SMTP。注册和找回密码都使用中文 6 位验证码。
4. 在 Auth 的 URL Configuration 中，把正式网址设为 Site URL，并把 `/account` 加入 Redirect URLs。
5. 将 Project URL 和 Publishable key 写入 `.env.local`：

```dotenv
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

前端只使用 Publishable key，并依靠数据库 RLS 限制每个账号只能访问自己的数据。`service_role` key 不得写入前端、`.env.local` 的 `VITE_` 变量或 Cloudflare Pages 客户端构建变量。

登录后的同步策略是本地优先：本机改动会自动上传；新设备会恢复云端数据；检测到两端都发生变化时必须由用户选择合并或保留哪一边，不会静默覆盖。

## 智能解读边界

- 原始牌面、正逆位、铜钱、卦象和命盘快照创建后不可由智能解读修改。
- 回答必须区分计算事实、规则推断、不确定性和现实建议。
- 不生成绝对成败、恐吓式结论、医疗 / 法律 / 投资保证或虚假的精确应期。
- 八字不把格局、旺衰、喜忌等争议判断伪装成基础计算事实。
- 出生时间未知时，八字不补造时柱；星盘不补造上升、天顶和宫位。

## 技术结构

- React 19、React Router、TypeScript、Vite
- Zustand + localStorage + Zod 数据校验与迁移
- Supabase Auth + Postgres RLS 可选账号与跨设备同步
- Node 原生 HTTP 服务端代理，不把 API 密钥打包到前端
- Vitest + ESLint
- `src/calculation/bazi/`：冻结的八字计算 adapter、规则表与黄金测试
- `src/calculation/astrology/`：冻结的星盘计算模块
- `astrology-spike/`：星盘黄金样本、对照原始输出和误差报告
- `src/calculation/liuyao/`：六爻排盘 adapter、六十四卦和黄金测试
- `src/data/tarotCards.ts`、`src/data/tarotMeanings.ts`：完整塔罗牌库与基础牌义
- `server/`：DeepSeek 代理、提示边界、限流和结构化结果校验

## 主要路由

| 页面 | 路由 |
| --- | --- |
| 欢迎 / 启动 | `/welcome`、`/` |
| 命盘入口 | `/charts` |
| 八字 | `/charts/:profileId/bazi` |
| 星盘 | `/charts/:profileId/astrology` |
| 人物管理 | `/profiles`、`/profiles/new`、`/profiles/:profileId/edit` |
| 起卦 | `/divination` 及塔罗 / 六爻子路由 |
| 记录 | `/records`、`/records/:recordId` |
| 设置 | `/settings` |
| 账号与同步 | `/account` |

主导航为“今日 / 命理 / 占卜 / 我的”。`/today` 为今日入口，`/fortune/*` 兼容重定向到 `/today`。

提高 AI 限额时，也需由项目管理员在 SQL Editor 更新 `public.ai_quota_limits` 的上限；RPC 会取环境变量与数据库上限的较小值，防止用户直接调用 RPC 提高额度。数据库不可用时 AI 接口拒绝生成，不退回匿名模式。

同步只上传人物、记录、草稿和删除标记；导航、降低动态效果和当前人物留在本机。上传通过 `save_user_app_data` 做版本校验；冲突时可合并、保留本机或保留云端。删除标记保留 180 天，超过 180 天未同步的设备应先导出备份并重新拉取云端数据。清空默认只作用本机并退出登录；登录时导入默认合并，完全替换需要二次确认。会话过期保留本机未同步数据，主动退出时另存账号恢复备份。

## 第二阶段：可选时间校正与规则判断

人物档案可明确确认中国历史夏令时（IANA Asia/Shanghai 数据），开启真太阳时或选择 23:00 换日。默认冻结 adapter 不变；旧档案未确认夏令时时显示编辑提示。未知时间不做校正，真太阳时需已确认城市。1988 年 IANA 夏令时开始日期为 4 月 17 日。

八字专业信息区分出现次数和加权分布，并说明虚岁和立春精确时刻交接；年支、日支神煞来源分别标记。六爻问题与分类必填，学业／考试取父母；感情按确认的性别建议用神，可在结果与新记录详情改选。判断只读冻结排盘，原始判断快照不随改选改变；改选字段参与版本同步与冲突检测。梅花增加体、互、变与月令卦气判断。今日页面展示个人流日结构并链接完整分析。

新增规则版本、参考权重、五个手推案例与验收口径见 `docs/PHASE_2_RULES.md`。本阶段不新增依赖、服务端环境变量或 SQL；仍需按第一阶段顺序配置数据库后才能上线。当前只在本地分支完成，未推送、未部署。

## 第三阶段：智能解读质量与交互

四模块分别约束解释口径，引用固定排盘与本地 judgement，第一句直接回答问题，用日常口语，术语在括号里简短解释；不单列“不确定之处”“规则推断”之类的段落，只在措辞上保留不绝对化、不恐吓、不给精确日期、不做医疗/法律/投资保证的底线。上海当前日期由服务端注入。普通首答与追问关闭推理（`thinking: disabled`），首答 1200、追问 2000 tokens；用户明确要求“详细分析”时才开启推理（low，8000 tokens），因为推理内容会占用输出额度。默认模型为 `deepseek-flash`，可用 `DEEPSEEK_MODEL` 覆盖。扣额度时由 `reserve_ai_quota` 返回一个只有服务端知道的预留编号；生成失败且用户没看到任何正文时，服务端凭这个编号调用 `refund_ai_quota` 退还当次额度，用户直接调用 RPC 无法给自己加额度（需执行 `supabase/migrations/2026101401_refund_ai_quota.sql`，未执行时自动退回到 `consume_ai_quota`，只是不退额度）。

网页优先使用 SSE 纯文本，支持停止生成；仅显示 answer content，不显示 reasoning_content。鉴权、校验和原子额度检查仍在生成前完成。非流式接口启用 JSON 模式并用 Zod 校验 basis 等字段，失败回退文本；旧记录的 summary/sections 继续兼容展示。

首次发送前需要用户同意 DeepSeek 隐私说明。同意只保存在本机；未保存结果的 AI 回答留在草稿，只有手动保存时创建记录并带入完整解读。停止、断流或离开页面不会把部分回答当作完成结果保存。原问题为空时，后来补充的问题写 questionAddedLater，不修改原问题或排盘快照。记录摘要使用 directAnswer 第一句。

上下文使用 src/ai/context.ts：八字不超过 12KB，其他模块不超过 8KB，只保留解释所需字段；追问消息中固定数据仅出现一次。旧牌义快照继续原样显示，发送给 AI 的塔罗牌义采用当前 RWS 数据。

12 个手动评测案例见 server/ai-eval/README.md。离线命令不会调用 API：

```sh
node server/ai-eval/run.mjs --dry-run --output=artifacts/ai-eval/dry-run.json
```

真实运行需要进程环境中的 DEEPSEEK_API_KEY，并会消耗模型额度，不进入 CI。当前只通过模拟流式/组件测试和离线案例校验，尚未完成真实 DeepSeek 回答质量评测或线上 Cloudflare 验收。第三阶段没有新增 SQL 或依赖；部署时需要同时更新前端与共用 server 模块。

## 第四阶段：体验与工程

主导航为“今日 / 命理 / 占卜 / 我的”。新建性别必选、草稿继续确认、启动默认人物；记录显示保存时结论并兼容序号压缩快照。78 张塔罗使用 WebP + JPG fallback，增加隐私说明、使用须知和二次确认注销入口。

详见 docs/PHASE_4_EXPERIENCE.md，包括新快照读取格式、Supabase Edge Function 部署、响应头及上线前事项。环境统一为 Node 24.19.0（.nvmrc）、pnpm 11.25.0（packageManager）；图片转换运行 `node scripts/optimize-images.mjs`。账号注销只做了模拟验收，未部署到真实 Supabase。

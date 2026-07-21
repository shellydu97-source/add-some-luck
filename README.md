# 加点好运

移动优先的个人命盘、起卦与复盘应用。人物、草稿和记录默认保存在各自浏览器中；配置 Supabase 后可选择注册账号并跨设备同步。数据结构保持 `schemaVersion 1.2`。

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
DEEPSEEK_MODEL=deepseek-v4-flash
```

不要把真实密钥写进 `src`、提交到 Git，或放进浏览器环境变量。浏览器只请求项目自己的 `/api/ai/chat`，密钥由 `server/index.mjs` 在服务端读取。

项目默认保留轻量的全局每日请求上限和单 IP 小时上限；不需要账号、邀请码或朋友名单。朋友打开同一网址时，每个人的档案和记录仍保存在自己的浏览器中。

## 配置 Supabase 账号与同步

1. 在 Supabase 创建项目。
2. 打开项目的 SQL Editor，执行 `supabase/migrations/2026071701_user_app_data.sql`。
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

主导航为“命盘、起卦、记录”。`/fortune/*` 和 `/today` 重定向到 `/charts`。

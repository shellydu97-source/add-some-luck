# 第四阶段：体验、隐私与工程质量

2026-10-13；本地分支 `fix/phase-4-experience`，承接第三阶段 `a6ecb78`。未推送、未部署、未调用真实账号删除或数据库修改。

## 档案与草稿

本机启动加载完成后选择默认人物，云端首次恢复完成后也选择默认人物。本次使用中仍可切换，后台同步不重置选择。新建人物表单不选择性别，保存必须选择；旧人物原值保留。为了兼容底层 fixtures，`NEW_PROFILE_DEFAULTS` 的完整 ProfileInput 仍有性别占位，但新表单不读取该占位且 `buildProfileInput` 拒绝缺失性别。

六爻、梅花和塔罗的新流程若有未保存草稿，会先显示继续或放弃选择。继续保留随机牌序、正逆位和投掷结果。store 同样拒绝不同 id 静默覆盖未完成草稿。删除人物会删其草稿并加入同步删除标记，历史记录快照不回写。

## 新记录格式与兼容

八字、星盘、六爻和梅花版本取自计算结果的 ruleVersion 与 calculationVersion（没有单独 calculationVersion 时使用 adapterVersion）。塔罗版本元数据定义在 calculation/tarotVersions.ts，不改变随机生成逻辑。没有版本的旧输入标为 unversioned，不伪造当前版本。

新六爻、梅花记录仅保存卦序号；读取时从相应模块的表恢复卦名、上下卦及卦爻辞。旧对象原文原样读取，未批量改写旧数据。

为了保留其他排盘字段并满足体积预算，rawResult 使用 `snapshotFormat: lz77-json-1` 与 base64 data，编码是无依赖、可逆的 UTF-8 LZ77。完整的本地 Interpretation 存在压缩内容的 savedInterpretation 内，顶层 interpretation 留 headline 供列表与旧工具索引；展示应优先读取 savedInterpretation。完整原始排盘与 judgement 均可还原，不在新 rawResult 重复保存长篇派生解释模板。导出 JSON 中保留压缩格式，当前版本导入会校验并恢复；外部脚本应使用 src/utils/snapshot.ts 的 readSnapshot，不能假设新 rawResult.original 为整个对象。

记录详情在 AI 之前显示“当时的结论”，包含 headline、conclusion、evidence、support、conflicts、advice 与 uncertainty，并显示保存的 judgement；改选用神使用可变字段。专业详情显示可还原的卦爻辞。

<5KB 验收按 UTF-8 JSON 字节数计算，覆盖带人物的静卦、多动爻、全老阴、全老阳及真实 UI 投掷流程。预算针对初始记录，追加 AI 对话、用户长备注或非常大的旧人物字段会增大体积，未设置会截断数据的硬上限。

## 界面与资源

闪屏使用 sessionStorage try/catch，每会话一次、500ms 内隐藏；应用或系统降低动态效果时跳过。页面底部留 98px + safe area，覆盖 74px 导航和间隔。八字四柱后有四句事实速览，含日主五行、月令、当前大运天干十神、时间校正说明；无旺衰、格局、喜忌断言。AI 占位文案针对工作问题。

主导航统一为“今日 / 命理 / 占卜 / 我的”。RecordDetail、Records、LiuyaoResult 和 Bazi 中密集 JSX 已拆分／展开；新增独立的记录快照、列表项、六爻判断、命盘速览组件。

scripts/optimize-images.mjs 使用 sharp 开发依赖；不新增运行时依赖。78 张 WebP 总计 2,633,474 字节，最大 51,898 字节；按最大宽 600px 转换，原图宽度更小时不放大。picture 保留 JPG fallback，品牌亦有 WebP fallback。manifest 提供 192、512 及有安全边距的 512 maskable 图标，原 PNG 保留。

## 注销部署

依据 Supabase 官方文档，使用服务端 Auth Admin deleteUser 对应的 REST 管理接口，不新增直接删 auth.users 的公开 SECURITY DEFINER RPC。

官方依据：
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser （只在服务端调用，service_role 不可暴露给浏览器）
- https://supabase.com/docs/guides/auth/managing-user-data （删除用户推荐 auth.admin.deleteUser；关联业务表使用 ON DELETE CASCADE，Storage 所有权可能阻止删除）

Edge Function：supabase/functions/delete-account/index.ts；可测试的 handler.ts 共用鉴权与删除逻辑。只接受 POST、认证 Bearer token 及 DELETE_MY_ACCOUNT 确认字段。用户 id 必须从 Auth /user 验证取得，忽略请求里伪造的 id；APP_ORIGIN 精确检查来源。service_role 只在 Supabase 环境变量中使用。

已有 user_app_data、ai_usage 的 user_id 外键都是 auth.users ON DELETE CASCADE，管理删除时业务数据原子级联删除。必须先部署前几阶段 SQL，确认这两个约束仍存在；不会在删除账号前分别删除业务行，从而避免 Auth 删除失败却先丢失业务数据。

项目方部署步骤（本轮未执行）：
1. Supabase 项目中确认 SUPABASE_URL、SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY 可供 Edge Function 使用。
2. 设置 APP_ORIGIN 为正式站点的完整 origin（如 https://your-app.pages.dev，无末尾斜杠、无路径）。
3. 部署：`supabase functions deploy delete-account --project-ref <project-ref>`。保留网关默认 JWT 验证；handler 再调用 get-user 验证当前账号。
4. 用独立测试账号在测试项目验证：未授权拒绝、二次取消不删、成功删除后两张业务表无该 user_id、Auth 用户不存在、回到访客、其他账号不受影响。
5. 此项目未使用 Supabase Storage 用户上传；以后添加上传时要先处理该用户拥有的 Storage 对象。

前端二次确认后暂停同步，等待在途同步结束，再调用函数。失败保留本机与登录状态；成功执行本地 signOut、恢复访客数据，清除该账号同步元数据和恢复备份。其他设备离线缓存及用户导出备份无法远程保证清除，隐私草稿已说明。

隐私和使用须知是明确标注的草稿。正式运营前由专业人士审阅，并补齐主体、联系方式、存储地区、数据及备份保留期限、第三方处理／跨境信息。

## 响应头与持久化

Cloudflare Pages 静态响应使用 public/_headers；build 的 scripts/write-headers.mjs 从 VITE_SUPABASE_URL 精确生成 dist/_headers 的 HTTPS/WSS 白名单，未配置时仅 self，禁止 wildcard。API Functions 使用 functions/api/_middleware.js；Node 使用构建同一份头。含 CSP、nosniff、strict-origin-when-cross-origin、Permissions-Policy。Cloudflare 文档明确 _headers 不自动作用于 Functions，因此 API 单独加头。

官方依据：https://developers.cloudflare.com/pages/configuration/headers/

构建与部署时必须提供实际 VITE_SUPABASE_URL，并同时部署前端、Functions 与 server。更换 Supabase 域名后重新构建；不要手动只修改 Node 环境变量然后继续用旧 dist。当前本机无云端配置，已实测页面、WebP 与本地 API 无 CSP 阻断；真实登录域名及 Cloudflare 线上头尚需部署验收。

相同持久化版本也先 Zod 校验，压缩快照能否还原也纳入验证；失败备份并保护原数据。保护状态的写入直接跳过，使用户能进入恢复／导出页面，不让恢复 UI 因持久化异常崩溃。主动重置／导入才解除保护。

packageManager 与 CI 均 pnpm 11.25.0；.nvmrc Node 24.19.0。sharp 构建脚本设置 false，使用官方预编译包，一次性转换脚本已实际运行。

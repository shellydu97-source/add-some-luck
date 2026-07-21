# 账号配置

前端账号流程使用：

- 注册：邮箱 + 密码，输入一次邮件中的 6 位验证码。
- 登录：邮箱 + 密码，不重复验证。
- 忘记密码：输入邮件中的 6 位验证码后设置新密码。
- 未登录用户可以继续本地使用。

Supabase 项目需要保持：

- Email Provider：Enabled
- Allow new users to sign up：Enabled
- Confirm email：Enabled
- Site URL：`https://add-some-luck.pages.dev/`
- Redirect URL：`https://add-some-luck.pages.dev/**`

需要配置自定义 SMTP，并启用以下中文模板：

| 模板 | 主题 | 正文文件 |
| --- | --- | --- |
| Confirm sign up | `【加点好运】你的注册验证码` | `email-templates/confirm-sign-up.html` |
| Reset password | `【加点好运】你的密码重设验证码` | `email-templates/reset-password.html` |

模板使用 `{{ .Token }}`，让用户直接在网站输入验证码，不跳转邮件链接。

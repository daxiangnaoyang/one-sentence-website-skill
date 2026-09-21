# 验收记录

日期：2026-09-21

## 已完成

- `python3 validate_system.py --check skills`：0 error；分类索引和正式 Skill 计数一致。输出中已有两个与本 Skill 无关的历史 symlink warning。
- `npm test`：4 个 Node 测试通过，覆盖四模板构建、演示/生产门、发布白名单、非空目录保护和只读部署计划。
- 四模板本地 smoke test：`profile`、`portfolio`、`service`、`creator` 均初始化、构建和本地演示检查通过。
- headless Chrome（390px 和 1440px）：8 个页面组合全部 HTTP 200，无横向溢出、坏图片、缺失锚点、页面异常和本地资源失败。
- 目视抽查：作品集移动端首屏、头像轨道、项目卡片和联系区层级可读；其余模板已通过同一浏览器结果检查。

## 未完成或未验证

- 未使用真实账户购买域名、租用 VPS、登录 Vercel/Cloudflare 或执行公网生产部署，因此没有真实部署 URL、DNS、TLS、账单或回滚证据。
- 平台命令和限制来自 2026-09-21 读取的官方文档；执行时仍要刷新文档和账户页面。
- 图片、客户案例、商业数据和联系方式仍是模板演示内容，生产前必须由用户替换并确认。

## 官方资料

- Vercel CLI：https://vercel.com/docs/cli/deploy
- Vercel Hobby：https://vercel.com/docs/plans/hobby
- Vercel domains：https://vercel.com/docs/domains/working-with-domains/add-a-domain
- Workers Static Assets：https://developers.cloudflare.com/workers/static-assets/get-started/
- Workers Custom Domains：https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Pages Direct Upload：https://developers.cloudflare.com/pages/get-started/direct-upload/
- Cloudflare Registrar：https://developers.cloudflare.com/registrar/get-started/register-domain/
- Cloudflare Registrar API：https://developers.cloudflare.com/registrar/registrar-api/
- Caddy static files：https://caddyserver.com/docs/quick-starts/static-files
- Hetzner Cloud overview：https://docs.hetzner.com/cloud/servers/overview/

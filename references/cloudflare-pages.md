# Cloudflare Pages 部署适配器

适合纯静态网站。Pages Direct Upload 官方文档明确说明：Direct Upload 项目以后不能原地切换为 Git 集成，需要新建 Git 项目：https://developers.cloudflare.com/pages/get-started/direct-upload/（核对日期：2026-09-21）。

## 初始选择

- Git 集成：创建 Pages 项目时连接仓库，填写构建命令、输出目录和生产分支，后续由推送触发构建。
- Direct Upload：由本地或自有 CI 构建，再用 Wrangler 上传 `dist`；若未来需要 Git 自动部署，应一开始选 Git 集成。

## Direct Upload

```bash
node scripts/site.mjs build --project .
node scripts/site.mjs check --project .
npx wrangler login
npx wrangler pages project create
npx wrangler pages deploy dist --project-name <pages-project>
```

`pages project create` 会要求项目名和生产分支。已有项目先查询，不重复创建。返回 `pages.dev` URL 后做页面、资源和 404 回读。

## Git、域名与回滚

Git 集成项目填写正确的框架预设、构建命令和输出目录（默认产物是 `dist`）。不要在同一项目把 Direct Upload 当作 Git 自动发布。若选错，先保留旧项目作为回滚，再新建 Git 项目、迁移域名，确认完成后再清理旧项目。

在 Pages Custom Domains 中添加准确域名，按当前 Cloudflare 账户提示完成 DNS/TLS。保留最近可用部署 URL/ID；更新后从部署列表选择旧部署回滚或恢复已验证提交。项目成功不代表 DNS、证书、缓存、分支和 webhook 已验证。

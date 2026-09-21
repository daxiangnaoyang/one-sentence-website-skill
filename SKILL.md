---
name: one-sentence-website
description: 将个人或个体业务的一句话需求整理为可编辑的静态网站，分轮收集内容，选择 profile、portfolio、service 或 creator 模板，完成本地构建、检查，并按已授权范围通过官方 CLI/API 或控制台部署到 Vercel/Cloudflare；密码、验证码和支付资料由用户在官方界面接管。
---

# 一句话建站

把“我想要一个能介绍我的网站”变成一个可检查的项目。先识别用途、受众、内容来源、商业属性、域名和平台，再按缺口每轮询问 1–3 项；已有答案直接复用，不反复收集。模板只生成静态页面，后端、会员、支付、CMS 和表单属于另行设计的扩展。

## 工作边界

- 使用 `scripts/site.mjs` 管理本地项目：`list`、`init`、`build`、`check`、`plan`。要求 Node 22，无第三方依赖。
- `build` 生成 `dist/`、SEO 元数据、`robots.txt`、`sitemap.xml` 和 `404.html`；`site.json`、状态文件、令牌和秘钥不得进入 `dist/`。
- `check` 默认按生产模式执行，会拒绝 `site.demo: true`、未替换示例值、危险 URL、未构建产物和残留模板占位符；本地演示使用 `--allow-demo`。
- `plan` 只输出部署命令和检查点，不自动改变外部状态；真实上线时，若已有覆盖目标、内容和范围的明确授权，由 Agent 调用所选平台的官方 CLI/API 或官方控制台，并保存返回的部署 ID、URL 和时间。密码、验证码、银行卡等秘密输入由用户在官方界面接管。
- 已有项目续接前重新检查远端账户、域名 DNS、当前分支、构建产物和上一次部署，不只相信 `.site-state.json`。

## 路由

1. 先读 [references/interview.md](references/interview.md)，按轮次获得目标、内容、账户与授权。
2. 内容已足够时读 [references/content.md](references/content.md)，把事实、缺口、示例和不可承诺项写进统一 `site.json`。
3. 购买/注册或登录需要用户接管时读 [references/domain-and-accounts.md](references/domain-and-accounts.md)。
4. 静态托管按用户选择只读对应参考：[Vercel](references/vercel.md)、[Cloudflare Workers](references/cloudflare-workers.md)、[Cloudflare Pages](references/cloudflare-pages.md)；需要常驻进程时读 [VPS](references/vps.md)。
5. 发布前读 [references/acceptance-and-resume.md](references/acceptance-and-resume.md)，逐项记录验收证据、状态和可续接检查点；常见误区查 [GOTCHAS.md](GOTCHAS.md)。

## 最短本地流程

```bash
node scripts/site.mjs list
node scripts/site.mjs init --template profile --output ./my-site
node scripts/site.mjs build --project ./my-site
node scripts/site.mjs check --project ./my-site --allow-demo
node scripts/site.mjs plan --provider vercel --project ./my-site
```

把 `./my-site/site.json` 中的示例内容替换为已确认事实，并将 `site.demo` 改为 `false`，再运行不带 `--allow-demo` 的 `check`。平台登录、域名购买、DNS 修改、支付和发布都必须沿用当前用户的授权范围。

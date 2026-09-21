# Cloudflare Workers Static Assets 部署适配器

适合静态资源与少量边缘逻辑统一部署的项目。官方文档给出 `wrangler dev` 本地预览和 `wrangler deploy` 部署路径，可使用 `workers.dev` 或 Custom Domain：https://developers.cloudflare.com/workers/static-assets/get-started/；Custom Domains：https://developers.cloudflare.com/workers/configuration/routing/custom-domains/（核对日期：2026-09-21）。

## 配置与本地预览

`init` 生成 `wrangler.jsonc`，把 `assets.directory` 指向 `./dist`。在项目根目录运行：

```bash
node scripts/site.mjs build --project .
node scripts/site.mjs check --project .
npx wrangler login
npx wrangler dev
```

先打开 Wrangler 输出地址确认路由、字体、图片和链接。不要把 API token 放进 Skill、Git 或站点产物；CI 使用 Cloudflare 推荐的加密 secrets。

## 部署与域名

确认账户、Worker 名称和项目范围后执行：

```bash
npx wrangler deploy
```

记录 Worker 名称、版本/部署时间和返回 URL。在 Workers 的 Custom Domains 页面添加准确域名，按当前账户提示完成 DNS/TLS；临时 `workers.dev` URL 不等于正式域名验收。

## 更新与回滚

每次更新先保存当前版本标识和公开 URL，再 build、check、deploy。用控制台或当前 Wrangler 文档的版本能力选择已知可用版本回滚。若绑定 KV、D1、R2、队列或密钥，代码回滚不自动回滚数据，数据迁移要单独记录。

本 Skill 的模板只生成静态页面；表单、登录、支付和数据库需另行设计绑定、权限、限额、隐私和备份。

# 一句话建站

一个面向 Codex 的本地 Skill 包：用户给出一句话，Agent 分轮补齐必要信息，生成个人/个体业务的静态网站，并按已授权范围调用官方 CLI/API 或控制台完成 Vercel、Cloudflare 或 VPS 上线与回读验收。它也提供 VPS 的操作参考，但不会把“本地构建成功”说成“已经上线”。

## 安装

把本目录放入 Codex 可发现的 Skills 目录，保留 `SKILL.md`、`agents/openai.yaml`、`references/`、`templates/` 和 `scripts/`。不需要 `npm install`；运行时只需要 Node.js 22 或更高版本。

在已纳入 Skill 路径的环境中可以直接调用；若用户已经明确授权目标平台和发布范围，Agent 会在本地检查通过后继续真实部署：

```text
使用 $one-sentence-website，为我做一个个人网站：我是一名在上海工作的独立摄影师，希望展示商业拍摄作品并接收合作咨询。
```

若未安装为全局 Skill，也可以在本目录执行命令验证工具：

```bash
node scripts/site.mjs list
node scripts/site.mjs init --template portfolio --output ./my-site
node scripts/site.mjs build --project ./my-site
node scripts/site.mjs check --project ./my-site --allow-demo
node scripts/site.mjs plan --provider cloudflare-pages --project ./my-site
npm test
```

`init` 只接受不存在的目录或真正空目录，避免覆盖已有项目。四个模板都带有 `site.json`、`index.html` 和 `styles.css`：

| 模板 | 页面结构 | 适合谁 |
| --- | --- | --- |
| `profile` | 左侧身份卡 + 右侧时间线与行动入口 | 个人简介、顾问、独立工作者 |
| `portfolio` | 深色分栏首屏 + 作品网格与项目详情 | 设计师、摄影师、开发者 |
| `service` | 编辑式报价分区 + 服务步骤与咨询入口 | 教练、咨询师、个体服务者 |
| `creator` | 杂志式内容导航 + 精选内容与栏目 | 写作者、播客、内容创作者 |

模板内的内容是演示数据，带 `site.demo: true`。本地演示可以 `check --allow-demo`；准备上线时必须补齐真实内容、检查联系方式和链接，并改成 `site.demo: false` 后运行生产检查。页面只使用 `mailto:`、`tel:` 或真实站点链接作为行动入口，不伪造提交成功、客户证言或统计数字。

## 运行原理

```text
一句话 → 分轮访谈 → site.json → 模板 → dist/ → check → 官方 CLI/控制台发布
```

`build` 会对文本做 HTML 转义，对所有 URL 做协议校验，并生成页面 SEO、`404.html`、`robots.txt` 与 `sitemap.xml`。`site.json` 和 `.site-state.json` 不会复制到 `dist/`；构建也会拒绝疑似令牌、密码或私钥字段。`plan` 只打印下一步，不触发外部写入。

## 对话调用示例

用户：“给我做一个能接咨询的个人网站，我做职业教练，预算尽量低。”

Agent 首轮只追问用途与现有资料：目标客户是谁、有没有头像/案例/联系方式、是否已有域名。第二轮确认模板和平台：`service` 是否合适、Vercel 或 Cloudflare、网站是否商业使用。第三轮才核对域名精确拼写、注册商、续费和自动续费；用户在官方页面完成登录与付款，Agent 记录非敏感的订单/域名状态。内容齐备后先本地构建和生产检查，再根据授权执行官方部署。

用户中途回来：“上次部署到 Cloudflare Pages，域名还没通。”

Agent 先读项目中的状态记录和上一次部署 ID，再实时检查项目、DNS、TLS 和当前分支；如果记录缺少关键证据，就标为 `WAITING_USER`，只询问阻塞的 1–3 项。确认 DNS 已生效后再做 HTTP、`robots.txt`、站点地图和移动布局验收。

## 证据边界

平台命令和限制会变化，发布前应重新读取对应官方文档。本文档只给出基于官方资料整理的操作路径和检查点；没有实际登录、购买、发布或公网回读证据时，状态只能写“未执行”或“未验证”。Vercel Hobby 的商业使用限制、Pages Direct Upload 与 Git 集成的关系、Cloudflare Registrar 后缀和 API 可用性都应以当前账户与官方页面为准。

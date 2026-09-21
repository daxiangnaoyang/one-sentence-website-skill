# Vercel 部署适配器

适合静态站点、已有 Git 工作流和需要预览部署的项目。Vercel Hobby 只适用于个人、非商业用途；商业用途先确认当前计划和条款。官方 CLI：https://vercel.com/docs/cli/deploy，计划说明：https://vercel.com/docs/plans/hobby（核对日期：2026-09-21）。

## 本地准备

```bash
node scripts/site.mjs build --project .
node scripts/site.mjs check --project .
```

`init` 会生成 `vercel.json`，其 `outputDirectory` 指向 `dist`。从项目根目录运行 CLI，让配置生效；`site.json`、`.site-state.json`、文档和源文件不应进入发布目录。

## 登录与部署

已授权且本机未登录时执行 `npx vercel login`，按官方 OAuth 流程完成登录，不在聊天中粘贴 token。先建预览：

```bash
npx vercel deploy
```

回读预览 URL，确认页面、404、资源和移动宽度；在生产内容、域名和发布范围都明确后执行：

```bash
npx vercel deploy --prod
```

也可以在控制台导入 Git 仓库，但需核对根目录、构建命令、输出目录和生产分支，不要把 Direct Upload 与 Git 自动部署混成两条链。

## 域名、更新与回滚

在 Vercel Domains 页面或当前官方 CLI/API 中添加准确域名，按页面返回的 DNS 记录完成验证；根域名、子域名和 TXT 验证可能不同。记录域名、项目、DNS 修改时间和 HTTPS 回读。

更新前保存当前部署 URL/ID，重新 build 和 check。Git 集成通过预览确认后合并生产；CLI 生产部署后可在部署列表选择已验证旧部署回滚，或重新部署固定提交。回滚后重新检查首页、404、DNS 和关键外链。删除项目、域名或生产部署是破坏性动作，单独确认。

CLI 返回 ready 只证明平台接受部署，不证明自定义域名解析、计划合规或用户验收。平台 URL、DNS 状态和公网 HTTP 回读分开记录。

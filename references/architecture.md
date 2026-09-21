# 一句话建站架构

设计日期：2026-09-21。目标：用户用一句话发起个人或个体业务网站，Agent 按缺口分轮收集资料，生成可编辑网站，完成已授权的部署并给出验证证据。首次使用允许用户注册、登录、验证码和支付接管；复用已有项目时从检查点继续。

## 三步技术取舍

1. 已有路径：Vercel 官方静态部署与 Astro 模板、Cloudflare 官方 Workers Static Assets 示例均提供可检查的项目与部署路径。它们是上游实现依据，不等于本 Skill 已在生产验证。
2. 已知坑：Vercel Hobby 限个人非商业；Pages Direct Upload 无法原地转 Git 集成；Registrar API 处于 beta、部分后缀不可用；Cloudflare Registrar 域名必须使用 Cloudflare nameservers；上线命令成功不等于公开可访问。
3. 本次选择：四套零运行时依赖的 HTML/CSS 模板 + Node 构建脚本，统一产物 `dist/`，支持 Vercel、Workers Static Assets、Pages 三个适配器。优先静态托管；有长驻进程、专用软件或用户明确要求时再走 VPS，按具体提供商实时取价。后端、会员、支付和 CMS 属独立扩展，不能用无效按钮假装实现。

思想预读映射：科斯的现实协调成本比较 → 同时比较开户、费用、维护、迁移与退出成本。此映射为本项目推断，不作为名人背书；原始思想源：https://www.nobelprize.org/prizes/economic-sciences/1991/coase/lecture/ 。

## 模块与契约

| 模块 | 输入 | 输出 |
|---|---|---|
| 对话路由 | 一句话、已有上下文 | 目标、受众、商业用途、预算、模板、平台 |
| 账户与采购 | 现有域名/账户、实时报价 | 非敏感账户标识、授权范围、采购结果或等待点 |
| 内容与模板 | 用户事实、作品、联系方式 | `site.json`、四选一模板、缺口列表 |
| 本地构建 | 模板、内容 | 可预览 `dist/`、平台配置、检查结果 |
| 部署适配 | 已确认账户/项目、发布范围 | 平台返回的部署 ID 与真实 URL |
| 域名与验收 | 实际 DNS 指示、部署 URL | DNS/TLS/HTTP/页面功能证据 |
| 更新与恢复 | 项目检查点、改动内容 | 最小更新、旧版本标识、回滚说明 |

状态：DISCOVERY → PLANNED → CONTENT_READY → LOCAL_VERIFIED → DEPLOYED → DOMAIN_PENDING/VERIFIED；任何阶段可 WAITING_USER/BLOCKED/FAILED。状态必须附证据，续接先重新检查远端与当前文件，不能仅信本地状态。`.site-state.json` 只存本地、非敏感进度；账户令牌、联系人地址、证件与付款资料不落仓库。授权记录限定动作、目标和范围，代码改动后重新核对是否仍受覆盖。

## 用户交互

每轮只问当前阻塞的 1–3 项。首轮优先用途、已有资料与域名/平台偏好；资料已有时直接复用。登录走官方 OAuth/CLI/browser，密码、验证码、银行卡由用户在原界面输入。费用确认必须给出精确域名或 SKU、币种、首次费用、续费与自动续费条件；结果不明确先查询订单，避免重复付款。预算不等于购买授权。

模板：profile（个人主页）、portfolio（作品集）、service（个体服务）、creator（内容创作者）。均为可运行的演示素材，明显标示示例，发布前替换或删除示例和未证实承诺。模板可用邮件链接，不伪造提交成功、客户证言或业务数据。

## 实现范围与验收

脚本提供模板列举、项目初始化、内容校验、构建和只读部署计划；真实上线通过官方 CLI 执行，由 Agent 使用已记录授权控制。原生一键部署按钮可作为已有账户的快捷路径，但不宣传为免登录或自动购买。

最低验收：4 模板分别构建、恶意文本转义与 URL 协议校验、拒绝覆盖非空目录、缺失内容错误、静态链接与移动布局检查、部署配置只指向 dist、秘密和机器路径不进入发布包、Skill 元数据与引用检查。云端真实部署未执行时如实写未验证；不得把本地测试升级为生产验证。

官方依据（2026-09-21 核对，执行时刷新）：
- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/plans/hobby
- https://vercel.com/templates/astro/astro-boilerplate
- https://developers.cloudflare.com/workers/static-assets/get-started/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/registrar/get-started/register-domain/
- https://developers.cloudflare.com/registrar/registrar-api/

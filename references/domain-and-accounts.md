# 域名、账户与费用检查点

域名购买、注册账户、支付和 DNS 变更会产生外部后果。Skill 负责准备、比价和回读；实际操作只使用当前授权覆盖的账户和目标。登录态不等于购买或发布授权。

## 域名决策

开始前记录候选域名、后缀、用途、注册商、年限、首次价格、续费价格、税费/隐私费用、自动续费状态、转出限制和 DNS 托管位置。候选查询只是发现，不是最终库存；注册前重新检查实时可用性和价格。

Cloudflare Registrar 官方页面说明：购买的域名使用 Cloudflare nameservers，不能改到其他 DNS 提供商；账户邮箱需要验证；部分国际化域名不支持。Registrar API 处于 beta，后缀、续费、转移和联系人更新存在限制。见：https://developers.cloudflare.com/registrar/get-started/register-domain/ 与 https://developers.cloudflare.com/registrar/registrar-api/（核对日期：2026-09-21）。

Vercel 域名添加会按项目页面返回 DNS 记录，域名属于其他团队时可能需要 TXT 验证：<https://vercel.com/docs/domains/working-with-domains/add-a-domain>。不要硬编码当前 A/CNAME 值。

## 登录接管协议

1. Agent 打开官方登录入口或给出官方 CLI 命令。
2. 用户在官方页面输入密码、一次性验证码、付款信息和身份资料。
3. Agent 读取成功后的非敏感账号/组织、项目 ID、权限和过期时间（如可见）。
4. 本地状态只写标识、阶段、时间和证据 URL；token、cookie、密码、验证码、密钥、证件不写入 `site.json`、Git 或 `dist/`。

建议记录字段：`provider`、`account_label`、`organization_id`、`project_id`、`domain`、`scope`、`granted_at`、`expires_at`、`evidence_url`、`status`。`scope` 写清哪个项目、哪个域名和是否可改 DNS；范围改变时重新确认。

## 购买摘要

```text
域名：name.example
年限：1 年
可用性：刚刚查询，提交时将再次确认
首次费用：待订单页确认（币种：___）
续费：待注册商页面确认
自动续费：开/关（以订单页为准）
注册商：___
待用户动作：确认域名、年限、价格并完成支付/授权
```

“便宜”“应该可用”不是价格或库存证据。订单超时、支付页面关闭或 API 返回不完整时先查订单和域名状态，不重复点击购买。

## 用途与费用

Vercel Hobby 官方说明仅限个人、非商业用途；商业个人站不能默认按 Hobby 处理。Cloudflare、Vercel、注册商和 VPS 的价格、税费及额度会变化，执行前刷新官方页面。Skill 不保存支付卡，不替用户接受服务条款，也不承诺免费或永久价格。

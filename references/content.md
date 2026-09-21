# 内容契约与模板写入

网站内容要让访客理解“你是谁、解决什么问题、下一步怎么联系”。写入模板前先区分事实、推断和待补字段。`site.json` 是内容源；HTML 是构建产物，不直接改 `dist/`。

## 最小契约

```json
{
  "template": "profile|portfolio|service|creator",
  "site": { "title": "公开标题", "description": "可核实描述", "url": "https://example.invalid", "language": "zh-CN", "themeColor": "#f5f1e8", "demo": true },
  "person": { "name": "公开名称", "eyebrow": "身份标签", "role": "职责", "bio": "经确认的简介", "location": "城市或远程", "email": "公开邮箱", "avatar": "" },
  "links": { "primary": { "label": "发邮件", "url": "mailto:hello@example.invalid" }, "secondary": { "label": "了解更多", "url": "#about" } }
}
```

`site.demo` 必须是 boolean。四套模板内容只用于本地演示；上线前改为 `false`，替换 `example.com`、示例姓名、示例数据和“发布前替换”等标记。缺少真实材料时保留 `未获取` 在对话状态，不把它写成公开页面。

## 内容核对

- 名称、角色、简介由用户确认，不能从邮箱或域名猜实名。
- 只展示用户拥有发布权或明确授权的图片、文字、项目名和外链。
- 数字、客户名、收入、转化率、证言和“第一/唯一”需要来源；没有来源就删掉或标为待补。
- 邮件和电话只在用户明确要公开时写入。
- 静态模板可以链接邮件、电话、预约页或真实项目，不伪造表单提交成功、排队成功或客户反馈。

## 模板取舍

`profile` 强调身份卡与工作方式；`portfolio` 用项目网格组织作品；`service` 把服务边界、合作步骤和咨询入口放在前面；`creator` 以内容导航和栏目为主。会员、支付、数据库、后台编辑器和隐私同意记录不能由静态模板假装提供，先交付静态站，再拆动态扩展。

## 生产前内容门

```bash
node scripts/site.mjs build --project ./my-site
node scripts/site.mjs check --project ./my-site
```

不带 `--allow-demo` 时要求 `site.demo=false`，并检查演示占位符、危险链接、状态/凭据痕迹、缺失资源、viewport 和响应式 CSS。检查通过只证明脚本约束满足，仍需要用户看一遍页面并确认公开内容。

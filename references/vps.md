# VPS 分支：租赁、SSH、Caddy 与 TLS

VPS 只适用于需要长驻进程、专用运行时、数据库或用户明确要求独立服务器的情况。它会增加补丁、备份、监控、账单和恢复责任；服务器关机通常不会停止资源存在带来的费用，具体以服务商规则为准。参考：https://docs.hetzner.com/cloud/servers/overview/ 与 https://docs.hetzner.com/cloud/billing/faq/（核对日期：2026-09-21）。

## 采购前

记录地区、CPU/RAM/磁盘、IPv4/IPv6、带宽、备份、快照、计费单位、税费、删除/保留 IP 规则、数据所在地和最低承诺。采购摘要包含提供商、区域、规格、镜像、预计费用、备份、自动续费/余额和删除后的计费规则。用户注册、电话验证、银行卡和支付在官方页面接管；没有预算和地区时只给候选，不创建实例。

## 最小安全安装

服务器创建后只记录非敏感 IP、实例 ID、区域和时间。优先使用非 root 用户、SSH 公钥和提供商防火墙；私钥只在用户自己的密码管理器或 SSH agent。示例命令需按发行版调整：

```bash
ssh <user>@<server-ip>
sudo apt update && sudo apt upgrade
sudo apt install caddy
```

开放范围尽量只有 SSH（可限制来源 IP）、HTTP 80 和 HTTPS 443。关闭密码 SSH 登录、配置安全更新和备份前确认不会锁死用户。

## Caddy 静态站点

Caddy quick-start：https://caddyserver.com/docs/quick-starts/static-files 。将经过 `build` 和 `check` 的 `dist/` 复制到明确目录，例如 `/srv/example-site`，配置：

```caddyfile
example.com, www.example.com {
    root * /srv/example-site
    encode zstd gzip
    try_files {path} /404.html
    file_server
}
```

先 `caddy validate --config /etc/caddy/Caddyfile`，再 `sudo systemctl reload caddy`。域名 A/AAAA 指向服务器后，Caddy 才能申请证书；DNS 未就绪时不要反复申请。

## 更新与回滚

把每次 `dist` 放入带提交 ID 的目录，先验证再原子切换当前软链接，保留上一份目录和快照。更新后从公网回读 HTTPS、首页、404、静态资源和响应头。回滚只切回上一个已验收目录并 reload Caddy；删除快照、旧目录或服务器单独确认。

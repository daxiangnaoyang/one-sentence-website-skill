#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_ROOT = path.join(SKILL_ROOT, "templates");
const TEMPLATE_INFO = {
  profile: "个人主页：身份卡、工作方式与行动入口",
  portfolio: "作品集：项目网格、能力标签与案例摘要",
  service: "个体服务：服务方案、合作步骤与咨询入口",
  creator: "创作者主页：精选内容、栏目索引与订阅入口"
};
const ALLOWED_PROVIDERS = new Set(["vercel", "cloudflare-workers", "cloudflare-pages"]);
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const SECRET_KEY = /(password|passwd|token|secret|private.?key|api.?key|access.?token|client.?secret|authorization)/i;
const SENSITIVE_OUTPUT = /(-----BEGIN (?:RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----|(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*[^\s<]{6,})/i;
const DEMO_MARKER = /(example\.com|example\.org|your[-_ ]?name|your[-_ ]?domain|发布前替换|示例内容|演示数据)/i;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) {
      result._.push(value);
      continue;
    }
    const equal = value.indexOf("=");
    if (equal > 2) {
      result[value.slice(2, equal)] = value.slice(equal + 1);
      continue;
    }
    const key = value.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      i += 1;
    } else {
      result[key] = true;
    }
  }
  return result;
}

function projectPath(args) {
  if (!args.project || typeof args.project !== "string") {
    fail("缺少 --project PATH");
  }
  return path.resolve(process.cwd(), args.project);
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    fail(`无法读取 JSON：${file}\n${error.message}`);
  }
}

async function allFiles(root, relative = "") {
  const current = path.join(root, relative);
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      files.push(...await allFiles(root, entryRelative));
    } else if (entry.isFile()) {
      files.push(entryRelative);
    }
  }
  return files;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function xmlEscape(value) {
  return htmlEscape(value).replaceAll("&#39;", "&apos;");
}

function isUrlKey(key) {
  return /(^|\.)(url|uri|href|avatar|image|logo)$/i.test(key) || /^(url|uri|href|avatar|image|logo)$/i.test(key);
}

function validateUrl(value, label, errors, { siteUrl = false } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    if (/\.(avatar|image|logo)$/.test(label)) return;
    errors.push(`${label} 必须是非空 URL`);
    return;
  }
  const clean = value.trim();
  if (/[\u0000-\u001F\u007F\\]/.test(clean)) {
    errors.push(`${label} 含控制字符或反斜杠：${clean.replace(/[\u0000-\u001F\u007F\\]/g, "?")}`);
    return;
  }
  if (clean.startsWith("//")) {
    errors.push(`${label} 不允许协议相对 URL：${clean}`);
    return;
  }
  if (siteUrl && !/^https?:\/\//i.test(clean)) {
    errors.push(`${label} 必须使用 http 或 https：${clean}`);
    return;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(clean)) {
    let parsed;
    try {
      parsed = new URL(clean);
    } catch {
      errors.push(`${label} 不是有效 URL：${clean}`);
      return;
    }
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
      errors.push(`${label} 使用了不允许的协议 ${parsed.protocol}`);
    }
    if ((parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.hostname) {
      errors.push(`${label} 缺少主机名：${clean}`);
    }
    return;
  }
  if (!(clean.startsWith("/") || clean.startsWith("./") || clean.startsWith("../") || clean.startsWith("#"))) {
    errors.push(`${label} 必须使用安全协议或相对路径：${clean}`);
  }
}

function inspectValue(value, keyPath, errors, { checkDemo = false } = {}) {
  const key = keyPath.at(-1) ?? "";
  if (SECRET_KEY.test(key)) {
    errors.push(`${keyPath.join(".")} 疑似秘密字段，不能放入 site.json`);
  }
  if (typeof value === "string") {
    if (isUrlKey(key)) validateUrl(value, keyPath.join("."), errors, { siteUrl: keyPath.join(".") === "site.url" });
    if (checkDemo && DEMO_MARKER.test(value)) {
      errors.push(`${keyPath.join(".")} 仍包含演示占位值：${value}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectValue(item, [...keyPath, String(index)], errors, { checkDemo }));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => inspectValue(childValue, [...keyPath, childKey], errors, { checkDemo }));
  }
}

function validateSiteData(data, { allowDemo = false } = {}) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return ["site.json 顶层必须是对象"];
  }
  if (!TEMPLATE_INFO[data.template]) errors.push(`template 必须是 ${Object.keys(TEMPLATE_INFO).join("、")} 之一`);
  if (!data.site || typeof data.site !== "object") errors.push("缺少 site 对象");
  if (!data.person || typeof data.person !== "object") errors.push("缺少 person 对象");
  const required = [
    ["site.title", data.site?.title],
    ["site.description", data.site?.description],
    ["site.url", data.site?.url],
    ["person.name", data.person?.name],
    ["person.role", data.person?.role],
    ["person.bio", data.person?.bio]
  ];
  for (const [label, value] of required) {
    if (typeof value !== "string" || value.trim() === "") errors.push(`${label} 必须填写`);
  }
  if (typeof data.site?.demo !== "boolean") errors.push("site.demo 必须是 boolean；发布前明确设置为 false");
  if (data.site?.demo !== false && !allowDemo) errors.push("site.demo 仍为 true；替换示例内容后改为 false");
  const collections = [
    ["person.socials", data.person?.socials, ["label", "url"]],
    ["stats", data.stats, ["value", "label"]],
    ["projects", data.projects, ["title", "summary"]],
    ["services", data.services, ["title", "summary"]],
    ["steps", data.steps, ["title", "detail"]],
    ["posts", data.posts, ["date", "title", "summary"]]
  ];
  for (const [label, collection, fields] of collections) {
    if (collection === undefined) continue;
    if (!Array.isArray(collection)) {
      errors.push(`${label} 必须是数组`);
      continue;
    }
    collection.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(`${label}[${index}] 必须是对象`);
        return;
      }
      for (const field of fields) if (typeof item[field] !== "string") errors.push(`${label}[${index}].${field} 必须是字符串`);
    });
  }
  inspectValue(data, [], errors, { checkDemo: !allowDemo });
  return errors;
}

function text(value) {
  return htmlEscape(value ?? "");
}

function safeClass(value) {
  return String(value ?? "")
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, "-"))
    .filter(Boolean)
    .join(" ");
}

function renderLink(link, className = "button") {
  if (!link || typeof link !== "object" || !link.url) return "";
  const label = link.label || link.url;
  return `<a class="${safeClass(className)}" href="${htmlEscape(link.url)}">${text(label)}</a>`;
}

function renderAvatar(person) {
  if (person?.avatar) {
    return `<img class="avatar-image" src="${htmlEscape(person.avatar)}" alt="${text(person.name)}" loading="lazy">`;
  }
  const initials = String(person?.name || "?").trim().slice(0, 2);
  return `<span class="avatar-fallback" aria-hidden="true">${text(initials)}</span>`;
}

function renderSocials(socials = []) {
  return socials.map((item) => `<a class="social-link" href="${htmlEscape(item.url)}" rel="me">${text(item.label)}</a>`).join("");
}

function renderStats(stats = []) {
  return stats.map((item) => `<div class="stat"><strong>${text(item.value)}</strong><span>${text(item.label)}</span></div>`).join("");
}

function renderProjects(projects = []) {
  return projects.map((item, index) => `<article class="project-card project-${index + 1}">
  <div class="project-kicker">${text(item.category || `项目 ${String(index + 1).padStart(2, "0")}`)}</div>
  <h3>${text(item.title)}</h3>
  <p>${text(item.summary)}</p>
  <div class="tag-row">${(item.tags || []).map((tag) => `<span>${text(tag)}</span>`).join("")}</div>
  ${item.url ? `<a class="text-link" href="${htmlEscape(item.url)}">${text(item.cta || "查看项目")} ↗</a>` : ""}
</article>`).join("");
}

function renderServices(services = []) {
  return services.map((item, index) => `<article class="service-card">
  <span class="service-number">0${index + 1}</span>
  <h3>${text(item.title)}</h3>
  <p>${text(item.summary)}</p>
  <span class="service-detail">${text(item.detail || "按目标确认范围")}</span>
</article>`).join("");
}

function renderSteps(steps = []) {
  return steps.map((item, index) => `<li><span>${index + 1}</span><div><strong>${text(item.title)}</strong><p>${text(item.detail)}</p></div></li>`).join("");
}

function renderPosts(posts = []) {
  return posts.map((item, index) => `<article class="post-row">
  <span class="post-index">${String(index + 1).padStart(2, "0")}</span>
  <div><span class="post-meta">${text(item.date)} · ${text(item.category || "文章")}</span><h3>${text(item.title)}</h3><p>${text(item.summary)}</p></div>
  ${item.url ? `<a class="post-arrow" href="${htmlEscape(item.url)}" aria-label="打开 ${text(item.title)}">↗</a>` : ""}
</article>`).join("");
}

function renderAvailability(availability = {}) {
  if (!availability || (!availability.label && !availability.value)) return "";
  return `<span class="availability"><i></i>${text(availability.label || "状态")}：${text(availability.value || "请邮件确认")}</span>`;
}

function renderToken(token, data) {
  const site = data.site || {};
  const person = data.person || {};
  const links = data.links || {};
  const renderers = {
    "site.title": () => text(site.title),
    "site.description": () => text(site.description),
    "site.url": () => htmlEscape(site.url),
    "site.language": () => text(site.language || "zh-CN"),
    "site.themeColor": () => htmlEscape(site.themeColor || "#f5f1e8"),
    "person.name": () => text(person.name),
    "person.eyebrow": () => text(person.eyebrow || person.role),
    "person.role": () => text(person.role),
    "person.bio": () => text(person.bio),
    "person.location": () => text(person.location || "远程"),
    "person.email": () => text(person.email || ""),
    "person.avatarTag": () => renderAvatar(person),
    "person.socials": () => renderSocials(person.socials || []),
    "links.primary": () => renderLink(links.primary, "button button-primary"),
    "links.secondary": () => renderLink(links.secondary, "button button-secondary"),
    "links.primaryPlain": () => renderLink(links.primary, "text-link"),
    "links.secondaryPlain": () => renderLink(links.secondary, "text-link"),
    "stats": () => renderStats(data.stats || []),
    "projects": () => renderProjects(data.projects || []),
    "services": () => renderServices(data.services || []),
    "steps": () => renderSteps(data.steps || []),
    "posts": () => renderPosts(data.posts || []),
    "availability": () => renderAvailability(data.availability || {}),
    "notice": () => text(data.notice || "演示内容 · 发布前替换")
  };
  if (!renderers[token]) fail(`模板使用了未知占位符 {{${token}}}`);
  return renderers[token]();
}

function renderHtml(source, data) {
  return source.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_, token) => renderToken(token, data));
}

function copyableFile(relative) {
  const normalized = relative.split(path.sep).join("/");
  const basename = path.basename(normalized);
  if (normalized === "site.json" || normalized === ".site-state.json" || normalized === "dist" || normalized.startsWith("dist/")) return false;
  if (basename === ".DS_Store" || basename === "Thumbs.db" || basename === ".env" || basename.startsWith(".env.")) return false;
  if (normalized.split("/").includes(".git") || normalized.split("/").includes("node_modules") || normalized.split("/").includes(".vercel") || normalized.split("/").includes(".wrangler")) return false;
  const extension = path.extname(basename).toLowerCase();
  const allowed = new Set([".html", ".css", ".js", ".mjs", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".avif", ".woff", ".woff2", ".webmanifest"]);
  if (normalized.includes("/")) return normalized.startsWith("assets/") && allowed.has(extension);
  return allowed.has(extension);
}

async function symlinks(root, relative = "") {
  const current = path.join(root, relative);
  const entries = await readdir(current, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const entryRelative = path.join(relative, entry.name);
    if (entry.name === "dist") continue;
    if (entry.isSymbolicLink()) {
      found.push(entryRelative);
    } else if (entry.isDirectory()) {
      found.push(...await symlinks(root, entryRelative));
    }
  }
  return found;
}

async function writeProviderConfigs(output, template) {
  const configName = `one-sentence-${template}`;
  await writeFile(path.join(output, "vercel.json"), `${JSON.stringify({ outputDirectory: "dist", cleanUrls: true, trailingSlash: false }, null, 2)}\n`, "utf8");
  await writeFile(path.join(output, "wrangler.jsonc"), `{
  "name": "${configName}",
  "compatibility_date": "${new Date().toISOString().slice(0, 10)}",
  "assets": { "directory": "./dist", "not_found_handling": "404-page" }
}\n`, "utf8");
}

async function listTemplates() {
  Object.entries(TEMPLATE_INFO).forEach(([name, description]) => console.log(`${name}\t${description}`));
}

async function initProject(args) {
  const template = args.template;
  if (!TEMPLATE_INFO[template]) fail(`未知模板 ${template}；可选：${Object.keys(TEMPLATE_INFO).join("、")}`);
  if (!args.output || typeof args.output !== "string") fail("缺少 --output PATH");
  const output = path.resolve(process.cwd(), args.output);
  if (await exists(output)) {
    const entries = await readdir(output);
    if (entries.length > 0) fail(`拒绝覆盖非空目录：${args.output}`);
  } else {
    await mkdir(output, { recursive: true });
  }
  await cp(path.join(TEMPLATE_ROOT, template), output, { recursive: true, errorOnExist: false });
  await writeProviderConfigs(output, template);
  console.log(`已初始化 ${template} → ${args.output}`);
}

async function buildProject(project) {
  const data = await readJson(path.join(project, "site.json"));
  const errors = validateSiteData(data, { allowDemo: true });
  if (errors.length > 0) fail(`site.json 校验失败：\n- ${errors.join("\n- ")}`);
  const linked = await symlinks(project);
  if (linked.length > 0) fail(`项目包含符号链接，拒绝构建：${linked.join("、")}`);
  const sourceFiles = await allFiles(project);
  const dist = path.join(project, "dist");
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  let indexWritten = false;
  for (const relative of sourceFiles) {
    if (!copyableFile(relative)) continue;
    const source = path.join(project, relative);
    const target = path.join(dist, relative);
    await mkdir(path.dirname(target), { recursive: true });
    if (relative.endsWith(".html")) {
      const rendered = renderHtml(await readFile(source, "utf8"), data);
      if (rendered.includes("{{")) fail(`生成文件仍有占位符：${relative}`);
      await writeFile(target, rendered, "utf8");
      if (relative === "index.html") indexWritten = true;
    } else {
      await cp(source, target);
    }
  }
  if (!indexWritten) fail("项目根目录必须有 index.html");
  const baseUrl = String(data.site.url).replace(/\/$/, "");
  const title = htmlEscape(data.site.title);
  const description = htmlEscape(data.site.description);
  await writeFile(path.join(dist, "404.html"), `<!doctype html>\n<html lang="${htmlEscape(data.site.language || "zh-CN")}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>找不到页面 · ${title}</title><link rel="stylesheet" href="/styles.css"></head><body><main class="not-found"><p>404</p><h1>这页暂时走丢了。</h1><p>回到 ${title} 的首页继续浏览。</p><a class="button button-primary" href="/">回到首页</a></main></body></html>\n`, "utf8");
  await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`, "utf8");
  await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xmlEscape(baseUrl)}/</loc></url></urlset>\n`, "utf8");
  await writeFile(path.join(dist, ".nojekyll"), "", "utf8");
  console.log(`已构建 ${project} → dist/`);
  return data;
}

function localHref(target) {
  const clean = target.split(/[?#]/, 1)[0];
  if (!clean || clean === "/" || clean.startsWith("#") || clean.startsWith("mailto:") || clean.startsWith("tel:")) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(clean)) return null;
  return clean.startsWith("/") ? clean.slice(1) : clean;
}

async function checkProject(project, { allowDemo = false } = {}) {
  const issues = [];
  let data;
  try {
    data = await readJson(path.join(project, "site.json"));
    issues.push(...validateSiteData(data, { allowDemo }));
  } catch (error) {
    issues.push(error.message);
  }
  const dist = path.join(project, "dist");
  if (!(await exists(dist))) issues.push("缺少 dist/；先运行 build");
  const required = ["index.html", "404.html", "robots.txt", "sitemap.xml"];
  for (const file of required) if (!(await exists(path.join(dist, file)))) issues.push(`dist/ 缺少 ${file}`);
  if (await exists(dist)) {
    const outputFiles = await allFiles(dist);
    let hasResponsiveCss = false;
    for (const relative of outputFiles) {
      const full = path.join(dist, relative);
      const content = await readFile(full, "utf8");
      if (SENSITIVE_OUTPUT.test(content) || content.includes(".site-state.json") || content.includes("site.json")) issues.push(`发布包疑似包含状态或秘密：${relative}`);
      if (!allowDemo && DEMO_MARKER.test(content)) issues.push(`发布包仍包含演示占位值：${relative}`);
      if (content.includes("{{")) issues.push(`发布包仍包含模板占位符：${relative}`);
      if (relative.endsWith(".css") && /@media\s*\(/i.test(content)) hasResponsiveCss = true;
      if (relative.endsWith(".html")) {
        if (!/<meta[^>]+name=["']viewport["']/i.test(content)) issues.push(`${relative} 缺少 viewport`);
        for (const match of content.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
          const local = localHref(match[1]);
          if (!local) continue;
          if (!(await exists(path.join(dist, local)))) issues.push(`${relative} 指向不存在的本地资源：${match[1]}`);
        }
      }
    }
    if (!hasResponsiveCss) issues.push("没有检测到 @media 响应式布局");
  }
  if (issues.length > 0) {
    console.error(`检查失败（${issues.length} 项）：`);
    issues.forEach((issue) => console.error(`- ${issue}`));
    return false;
  }
  console.log(`检查通过：${allowDemo ? "本地演示" : "生产内容"}`);
  return true;
}

function planText(provider, args, data) {
  const project = args.project;
  const host = new URL(data.site.url).hostname;
  const lines = [
    `部署计划（只读，不执行）：${provider}`,
    `项目：${project}`,
    `发布目录：dist/（只上传已构建的 dist，不上传 site.json、.site-state.json、凭据或源文件）`,
    `站点主机名：${host}`,
    "",
    "0. 发布前：node scripts/site.mjs build --project <project>",
    "1. 发布前：node scripts/site.mjs check --project <project>",
  ];
  if (provider === "vercel") {
    lines.push(
      "2. 官方 CLI：cd <project> && npx vercel deploy --prod（从项目根目录运行，让 vercel.json 的 outputDirectory=dist 生效）",
      "3. 若绑定域名：在 Vercel 官方 Domains 页面添加精确域名，按页面给出的 DNS 记录完成验证",
      "4. 回读：记录 deployment URL/ID，检查 HTTPS、首页、404、robots.txt、sitemap.xml 和移动布局"
    );
  } else if (provider === "cloudflare-workers") {
    lines.push(
      "2. 官方 CLI：准备 wrangler.jsonc，将 assets.directory 指向 ./dist，再运行 npx wrangler deploy",
      "   最小配置：{ \"name\": \"<worker-name>\", \"compatibility_date\": \"<today>\", \"assets\": { \"directory\": \"./dist\" } }",
      "3. 在 Cloudflare 官方域名设置中绑定自定义域名，按提示完成 DNS/TLS",
      "4. 回读：记录 Worker 名称/部署时间和公开 URL，检查 HTTPS、首页、404、robots.txt、sitemap.xml 和移动布局"
    );
  } else {
    lines.push(
      "2. 官方 CLI：npx wrangler pages deploy dist --project-name <pages-project>",
      "3. Pages 的 Direct Upload 与 Git 集成是两条路径；不要把一次 Direct Upload 当作已建立 Git 自动部署",
      "4. 在 Cloudflare Pages 官方域名设置中绑定自定义域名，按提示完成 DNS/TLS",
      "5. 回读：记录 Pages 项目名/部署 ID 和公开 URL，检查 HTTPS、首页、404、robots.txt、sitemap.xml 和移动布局"
    );
  }
  lines.push("", "等待点：任何购买、支付、登录接管、DNS 修改、生产发布或回滚动作，都要由当前授权覆盖；缺少证据时状态写未执行/未验证。");
  return lines.join("\n");
}

async function deploymentPlan(args) {
  const provider = args.provider;
  if (!ALLOWED_PROVIDERS.has(provider)) fail(`未知 --provider ${provider}；可选：${[...ALLOWED_PROVIDERS].join("、")}`);
  const project = projectPath(args);
  const data = await readJson(path.join(project, "site.json"));
  const errors = validateSiteData(data, { allowDemo: true });
  if (errors.length > 0) fail(`不能生成计划，site.json 校验失败：\n- ${errors.join("\n- ")}`);
  console.log(planText(provider, args, data));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (command === "list") return listTemplates();
  if (command === "init") return initProject(args);
  if (command === "build") {
    await buildProject(projectPath(args));
    return;
  }
  if (command === "check") {
    const ok = await checkProject(projectPath(args), { allowDemo: Boolean(args["allow-demo"]) });
    if (!ok) process.exitCode = 1;
    return;
  }
  if (command === "plan") return deploymentPlan(args);
  console.log("用法：site.mjs list | init --template NAME --output PATH | build --project PATH | check --project PATH [--allow-demo] | plan --provider vercel|cloudflare-workers|cloudflare-pages --project PATH");
}

main().catch((error) => {
  console.error(`错误：${error.message}`);
  process.exitCode = 1;
});

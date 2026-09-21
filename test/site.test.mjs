import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = path.join(root, "scripts", "site.mjs");
const run = (...args) => execFileSync("node", [cli, ...args], { cwd: root, encoding: "utf8" });

test("all four templates initialize, build, and pass demo checks", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "one-sentence-website-"));
  for (const template of ["profile", "portfolio", "service", "creator"]) {
    const project = path.join(parent, template);
    run("init", "--template", template, "--output", project);
    run("build", "--project", project);
    const output = run("check", "--project", project, "--allow-demo");
    assert.match(output, /检查通过/);
    const index = await readFile(path.join(project, "dist", "index.html"), "utf8");
    assert.doesNotMatch(index, /\{\{/);
    assert.match(index, /viewport/);
  }
});

test("production check rejects demo content and build keeps private files out", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "one-sentence-website-"));
  const project = path.join(parent, "site");
  run("init", "--template", "profile", "--output", project);
  await writeFile(path.join(project, "private-notes.txt"), "PRIVATE_CANARY");
  run("build", "--project", project);
  await assert.rejects(() => readFile(path.join(project, "dist", "private-notes.txt")));
  assert.throws(() => run("check", "--project", project), /site.demo|演示/);
});

test("production check still catches placeholders when demo is set false", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "one-sentence-website-"));
  const project = path.join(parent, "site");
  run("init", "--template", "profile", "--output", project);
  const data = JSON.parse(await readFile(path.join(project, "site.json"), "utf8"));
  data.site.demo = false;
  await writeFile(path.join(project, "site.json"), JSON.stringify(data));
  run("build", "--project", project);
  assert.throws(() => run("check", "--project", project), /演示占位值/);
});

test("init refuses to overwrite a non-empty directory", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "one-sentence-website-"));
  const project = path.join(parent, "existing");
  await mkdir(project);
  await writeFile(path.join(project, "sentinel"), "keep");
  assert.throws(() => run("init", "--template", "profile", "--output", project));
});

test("plan contains provider-specific commands and never executes them", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "one-sentence-website-"));
  const project = path.join(parent, "site");
  run("init", "--template", "creator", "--output", project);
  const plan = run("plan", "--provider", "cloudflare-pages", "--project", project);
  assert.match(plan, /wrangler pages deploy dist/);
  assert.match(plan, /只读/);
});

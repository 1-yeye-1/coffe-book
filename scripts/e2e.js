const { spawn, spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const services = [];
const runId = process.env.E2E_RUN_ID || String(Date.now());

const env = {
  ...process.env,
  E2E_RUN_ID: runId,
  PORT: "4173",
  FRONT_PORT: "5173",
  NODE_ENV: "development",
  VITE_API_BASE: "http://127.0.0.1:4173",
  JWT_SECRET: process.env.JWT_SECRET || "coffee-book-e2e-secret-at-least-32-characters"
};
if (env.Path && env.PATH) delete env.Path;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function attachLogs(child, name) {
  child.stdout?.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
}

async function startService(name, command, args, cwd, url) {
  if (await reachable(url)) {
    console.log(`[e2e] reuse ${name} at ${url}`);
    return null;
  }

  const child = spawn(command, args, {
    cwd,
    env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"]
  });
  attachLogs(child, name);
  services.push(child);

  const startedAt = Date.now();
  while (Date.now() - startedAt < 90_000) {
    if (child.exitCode !== null) {
      throw new Error(`${name} exited before ${url} became ready`);
    }
    if (await reachable(url)) {
      console.log(`[e2e] ${name} ready at ${url}`);
      return child;
    }
    await delay(500);
  }
  throw new Error(`${name} did not become ready at ${url}`);
}

function killTree(child) {
  if (!child || child.killed) return;
  child.kill(process.platform === "win32" ? undefined : "SIGTERM");
}

function stopServices() {
  for (const child of services.reverse()) killTree(child);
}

async function apiJson(pathname, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15_000);
  try {
    const response = await fetch(`http://127.0.0.1:4173${pathname}`, {
      method: options.method || "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      throw new Error(`${options.method || "GET"} ${pathname} failed: ${response.status} ${body?.message || ""}`);
    }
    return body.data;
  } finally {
    clearTimeout(timeout);
  }
}

async function cleanupData() {
  try {
    const admin = await apiJson("/api/admin/login", {
      method: "POST",
      body: { account: "admin", password: "admin123" }
    });
    const summary = await apiJson("/api/admin/summary", { token: admin.token });
    const textIncludesRun = (item) => JSON.stringify(item).includes(runId);
    const cleanupTargets = [
      ...(summary.orders || []).filter(textIncludesRun).map((item) => [`/api/admin/orders/${item.id}`, "order"]),
      ...(summary.products || []).filter(textIncludesRun).map((item) => [`/api/admin/products/${item.id}`, "product"]),
      ...(summary.posts || []).filter(textIncludesRun).map((item) => [`/api/admin/posts/${item.id}`, "post"])
    ];

    for (const [pathname, label] of cleanupTargets) {
      try {
        await apiJson(pathname, { method: "DELETE", token: admin.token });
      } catch (error) {
        console.warn(`[e2e] cleanup skipped ${label}: ${error.message}`);
      }
    }
  } catch (error) {
    console.warn(`[e2e] cleanup skipped: ${error.message}`);
  }
}

async function main() {
  try {
    await startService("backend", process.execPath, ["index.js"], path.join(root, "backend"), "http://127.0.0.1:4173/api");
    await startService("front", process.execPath, ["scripts/dev.js"], path.join(root, "front"), "http://127.0.0.1:5173");

    const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
    const result = spawnSync(process.execPath, [playwrightCli, "test", "--config", "playwright.config.mjs"], {
      cwd: root,
      env,
      stdio: "inherit"
    });
    await cleanupData();
    process.exitCode = result.status || 0;
  } finally {
    stopServices();
  }
}

process.on("SIGINT", () => {
  stopServices();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopServices();
  process.exit(143);
});

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
  stopServices();
});

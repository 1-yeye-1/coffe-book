const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const checks = [];

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", "build"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(fullPath, predicate));
    if (entry.isFile() && predicate(fullPath)) result.push(fullPath);
  }
  return result;
}

function assertJson(file) {
  JSON.parse(fs.readFileSync(file, "utf8"));
  checks.push(`json ${path.relative(root, file)}`);
}

function checkNodeSyntax(file) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${path.relative(root, file)}\n${result.stderr || result.stdout}`);
  }
  checks.push(`syntax ${path.relative(root, file)}`);
}

function assertNoConflictMarkers(file) {
  const content = fs.readFileSync(file, "utf8");
  if (/^(<<<<<<<|=======|>>>>>>>) /m.test(content)) {
    throw new Error(`Git conflict marker found in ${path.relative(root, file)}`);
  }
}

const packageFiles = [
  "package.json",
  "front/package.json",
  "backend/package.json"
].map((file) => path.join(root, file));

for (const file of packageFiles) assertJson(file);

const backendFiles = walk(path.join(root, "backend"), (file) => file.endsWith(".js"));
const scriptFiles = walk(path.join(root, "scripts"), (file) => file.endsWith(".js"));
const frontNodeFiles = [
  path.join(root, "front/server.js"),
  ...walk(path.join(root, "front/scripts"), (file) => file.endsWith(".js"))
].filter((file) => fs.existsSync(file));

for (const file of [...backendFiles, ...scriptFiles, ...frontNodeFiles]) {
  checkNodeSyntax(file);
}

for (const dir of ["backend", "front/src", "scripts"]) {
  for (const file of walk(path.join(root, dir), (item) => /\.(js|mjs|vue|css|html)$/.test(item))) {
    assertNoConflictMarkers(file);
  }
}

console.log(`lint ok (${checks.length} checks)`);

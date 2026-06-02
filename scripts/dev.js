const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const env = { ...process.env };

if (env.Path && env.PATH) delete env.Path;

const processes = [
  {
    name: "backend",
    command: process.execPath,
    args: ["index.js"],
    cwd: path.join(root, "backend")
  },
  {
    name: "front",
    command: process.execPath,
    args: ["scripts/dev.js"],
    cwd: path.join(root, "front")
  }
];

const children = [];

for (const item of processes) {
  let child;
  try {
    child = spawn(item.command, item.args, {
      cwd: item.cwd,
      env,
      stdio: "inherit",
      shell: false
    });
  } catch (error) {
    console.error(`[${item.name}] failed to start: ${error.message}`);
    stopAll(1);
  }

  child.on("error", (error) => {
    console.error(`[${item.name}] failed to start: ${error.message}`);
    stopAll(1);
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${item.name}] exited with code ${code}`);
      stopAll(code);
    }
  });

  children.push(child);
}

function stopAll(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

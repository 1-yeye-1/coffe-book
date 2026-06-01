const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
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
    command: npmCommand,
    args: ["run", "dev"],
    cwd: path.join(root, "front")
  }
];

const children = processes.map((item) => {
  const child = spawn(item.command, item.args, {
    cwd: item.cwd,
    env,
    stdio: "inherit",
    shell: false
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${item.name}] exited with code ${code}`);
      stopAll(code);
    }
  });

  return child;
});

function stopAll(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

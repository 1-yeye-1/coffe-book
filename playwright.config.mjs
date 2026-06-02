import { defineConfig } from "@playwright/test";
import fs from "node:fs";

const localBrowsers = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "D:/software/chrome-win64/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe"
].filter(Boolean);

const executablePath = localBrowsers.find((item) => fs.existsSync(item));

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {}
  }
});

const os = require("os");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.FRONT_PORT || 5173);

function isPrivateIp(ip) {
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  const match = ip.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function preferredWifiIp() {
  const interfaces = os.networkInterfaces();
  const entries = Object.entries(interfaces).flatMap(([name, items = []]) => (
    items
      .filter((item) => item.family === "IPv4" && !item.internal)
      .map((item) => ({ name, address: item.address }))
  ));

  const wifi = entries.find((item) => /wlan|wi-?fi|wireless/i.test(item.name) && isPrivateIp(item.address));
  if (wifi) return wifi.address;

  const ignored = /vmware|virtual|radmin|mihomo|loopback|tailscale|docker/i;
  const privateIp = entries.find((item) => !ignored.test(item.name) && isPrivateIp(item.address));
  return privateIp?.address || "";
}

function printUrls(version) {
  console.log(`\n  VITE v${version}  ready\n`);
  console.log(`  Local: http://localhost:${port}/`);
  console.log("");
}

async function main() {
  const { createServer } = await import("vite");
  const vitePackage = require("vite/package.json");
  const server = await createServer({
    configFile: path.join(rootDir, "vite.config.mjs"),
    logLevel: "warn",
    clearScreen: false,
    server: {
      host: "localhost",
      port
    }
  });

  await server.listen();
  printUrls(vitePackage.version);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

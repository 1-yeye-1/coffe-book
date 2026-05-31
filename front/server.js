const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.FRONT_PORT || 5173);
const ROOT = __dirname;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN"
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const safePath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (path.relative(ROOT, filePath).startsWith("..")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const target = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    ? filePath
    : path.join(ROOT, "index.html");

  sendFile(res, target);
});

server.listen(PORT, () => {
  console.log(`Coffee Book front running at http://localhost:${PORT}`);
  console.log("API server expected at http://localhost:4173");
});

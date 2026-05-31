function send(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "http://localhost:5173",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  });
  res.end(JSON.stringify(payload));
}

function ok(res, data = null, message = "ok") {
  send(res, 200, { success: true, message, data });
}

function fail(res, status, message) {
  send(res, status, { success: false, message, data: null });
}

module.exports = { ok, fail };

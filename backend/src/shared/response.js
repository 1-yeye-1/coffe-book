function isAllowedDevOrigin(origin) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    || /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/i.test(origin)
    || /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/i.test(origin)
    || /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/i.test(origin);
}

function corsOrigin(res) {
  if (process.env.CORS_ORIGIN) return process.env.CORS_ORIGIN;
  const origin = String(res.req?.headers?.origin || "");
  return isAllowedDevOrigin(origin) ? origin : "http://localhost:5173";
}

function send(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": corsOrigin(res),
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Vary": "Origin",
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

module.exports = { corsOrigin, ok, fail };

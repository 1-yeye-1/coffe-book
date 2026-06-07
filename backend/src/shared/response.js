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

const defaultMessages = {
  400: "请求参数不正确",
  401: "请先登录",
  403: "没有操作权限",
  404: "资源不存在",
  409: "当前状态不允许此操作",
  429: "操作过于频繁，请稍后再试",
  500: "服务器暂时无法处理请求"
};

function ok(res, data = null, message = "ok") {
  send(res, 200, { code: 200, msg: message, data, success: true, message });
}

function fail(res, status, message) {
  const msg = message || defaultMessages[status] || "请求失败";
  send(res, status, { code: status, msg, data: null, success: false, message: msg });
}

module.exports = { corsOrigin, ok, fail };

const http = require("http");
const { loadEnv } = require("./src/shared/env");

loadEnv();

const { handleFrontApi } = require("./src/client-routes");
const { handleAdminApi } = require("./src/admin-routes");
const { ok, fail } = require("./src/shared/response");
const { initDatabase } = require("./src/shared/mysql");
const { initVerificationStore } = require("./src/shared/verification-store");

const PORT = Number(process.env.PORT || 4173);

function apiIndex() {
  return {
    service: "咖啡书屋后端 API",
    frontend: "http://localhost:5173",
    apiBase: `http://localhost:${PORT}/api`,
    endpoints: {
      home: "GET /api/home",
      products: "GET /api/products",
      books: "GET /api/books",
      qr: "GET /api/qr?data=...",
      seats: "GET /api/seats/status",
      captcha: "GET /api/auth/captcha",
      sendSmsCode: "POST /api/auth/sms-code",
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      smsLogin: "POST /api/auth/sms-login",
      updateProfile: "PATCH /api/member/profile",
      updateMemberList: "PATCH /api/member/list",
      checkIn: "POST /api/member/check-in",
      redeemReward: "POST /api/member/redeem",
      useGift: "POST /api/member/gifts/:id/use",
      createOrder: "POST /api/orders",
      adminLogin: "POST /api/admin/login",
      adminSummary: "GET /api/admin/summary"
    }
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "OPTIONS") return ok(res);
    if (req.method === "GET" && (url.pathname === "/api" || url.pathname === "/api/")) return ok(res, apiIndex());
    if (url.pathname.startsWith("/api/admin")) return await handleAdminApi(req, res, url);
    if (url.pathname.startsWith("/api")) return await handleFrontApi(req, res, url);

    return ok(res, apiIndex());
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || "服务器错误");
  }
});

Promise.all([initDatabase(), initVerificationStore()])
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Coffee Book API running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MySQL initialization failed:", error.message);
    process.exit(1);
  });

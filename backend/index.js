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
      createPayment: "POST /api/payments/create",
      submitPayment: "POST /api/payments/submit",
      paymentStatus: "GET /api/payments/order/:orderId",
      cancelPayment: "POST /api/payments/cancel",
      adminLogin: "POST /api/admin/login",
      adminPayments: "GET /api/admin/payments",
      adminSummary: "GET /api/admin/summary"
    }
  };
}

const useMemoryDb = process.env.COFFEE_BOOK_MEMORY_DB === "1";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "OPTIONS") return ok(res);
    if (req.method === "GET" && (url.pathname === "/api" || url.pathname === "/api/")) return ok(res, apiIndex());
    if (url.pathname.startsWith("/api/admin")) return await handleAdminApi(req, res, url);
    if (url.pathname.startsWith("/api")) return await handleFrontApi(req, res, url);

    return ok(res, apiIndex());
  } catch (error) {
    console.error("API error:", error.stack || error.message);
    const status = error.statusCode || 500;
    const message = status >= 500 ? "服务器暂时无法处理请求，请稍后再试" : error.message;
    return fail(res, status, message);
  }
});

Promise.all([useMemoryDb ? Promise.resolve() : initDatabase(), initVerificationStore()])
  .then(() => {
    if (useMemoryDb) console.log("Coffee Book API using in-memory demo data (COFFEE_BOOK_MEMORY_DB=1)");
    server.listen(PORT, () => {
      console.log(`Coffee Book API running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MySQL initialization failed:", error.message);
    process.exit(1);
  });

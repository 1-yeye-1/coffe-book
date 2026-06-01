const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const backendDir = path.join(root, "backend");
const PORT = Number(process.env.TEST_BACKEND_PORT || 4273);
const API = `http://127.0.0.1:${PORT}`;
const PASSWORD = "Coffee#123";
const TEST_PREFIX = `auto-${Date.now()}`;

const env = {
  ...process.env,
  PORT: String(PORT),
  NODE_ENV: "development",
  JWT_SECRET: process.env.JWT_SECRET || "coffee-book-test-secret-at-least-32-characters"
};
if (env.Path && env.PATH) delete env.Path;

const smsCodes = new Map();
const logs = [];

function parseSmsLog(text) {
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/\[dev sms\]\s*(1[3-9]\d{9}):\s*(\d{6})/);
    if (match) smsCodes.set(match[1], match[2]);
  }
}

const server = spawn(process.execPath, ["index.js"], {
  cwd: backendDir,
  env,
  stdio: ["ignore", "pipe", "pipe"]
});

server.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  logs.push(text);
  parseSmsLog(text);
});
server.stderr.on("data", (chunk) => logs.push(chunk.toString()));

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(pathname, options = {}) {
  const response = await fetch(`${API}${pathname}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(`${options.method || "GET"} ${pathname} failed: ${response.status} ${body?.message || response.statusText}`);
  }
  return body.data;
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (server.exitCode !== null) {
      throw new Error(`backend exited early with code ${server.exitCode}\n${logs.join("")}`);
    }
    try {
      await request("/api");
      return;
    } catch {
      await delay(500);
    }
  }
  throw new Error(`backend did not become ready\n${logs.join("")}`);
}

async function waitForSms(phone) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    if (smsCodes.has(phone)) return smsCodes.get(phone);
    await delay(100);
  }
  throw new Error(`SMS code was not logged for ${phone}`);
}

function makePhone(prefix = "139") {
  const suffix = String(Date.now() % 100000000).padStart(8, "0");
  return `${prefix}${suffix}`;
}

async function step(name, fn) {
  process.stdout.write(`- ${name} ... `);
  const value = await fn();
  process.stdout.write("ok\n");
  return value;
}

async function sendSms(phone) {
  const slider = await request("/api/auth/slider");
  await request("/api/auth/sms-code", {
    method: "POST",
    body: {
      phone,
      sliderToken: slider.token,
      sliderValue: slider.target
    }
  });
  return waitForSms(phone);
}

async function cleanup(adminToken, created) {
  const tasks = [
    created.orderId && [`/api/admin/orders/${created.orderId}`, "DELETE"],
    created.reservationId && [`/api/admin/reservations/${created.reservationId}`, "DELETE"],
    created.activityId && [`/api/admin/activities/${created.activityId}`, "DELETE"],
    created.postId && [`/api/admin/posts/${created.postId}`, "DELETE"],
    created.productId && [`/api/admin/products/${created.productId}`, "DELETE"],
    created.adminUserId && [`/api/admin/users/${created.adminUserId}`, "DELETE"],
    created.registeredUserId && [`/api/admin/users/${created.registeredUserId}`, "DELETE"]
  ].filter(Boolean);

  for (const [pathname, method] of tasks) {
    try {
      await request(pathname, { method, token: adminToken });
    } catch (error) {
      console.warn(`cleanup skipped ${pathname}: ${error.message}`);
    }
  }
}

async function main() {
  const created = {};
  let adminToken = "";

  await waitForServer();

  const adminSession = await step("admin login", () => request("/api/admin/login", {
    method: "POST",
    body: { account: "admin", password: "admin123" }
  }));
  adminToken = adminSession.token;

  await step("admin data dashboard", async () => {
    const summary = await request("/api/admin/summary", { token: adminToken });
    if (!summary.dashboard || !Array.isArray(summary.products)) throw new Error("summary is incomplete");
    return summary;
  });

  const testProduct = await step("admin product management", async () => {
    const product = await request("/api/admin/products", {
      method: "POST",
      token: adminToken,
      body: {
        name: `${TEST_PREFIX} coffee mug`,
        description: "Created by automated smoke test",
        price: 19.9,
        stock: 12,
        category: "creative"
      }
    });
    created.productId = product.id;
    return request(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      token: adminToken,
      body: { stock: 11 }
    });
  });

  const managedUser = await step("admin user management", async () => {
    const phone = makePhone("138");
    const user = await request("/api/admin/users", {
      method: "POST",
      token: adminToken,
      body: { name: `${TEST_PREFIX} managed user`, phone, points: 20, password: PASSWORD }
    });
    created.adminUserId = user.id;
    return request(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      token: adminToken,
      body: { points: 30 }
    });
  });
  if (!managedUser.id) throw new Error("managed user missing id");

  const phone = makePhone("139");
  const registerCode = await step("send register sms", () => sendSms(phone));

  const session = await step("user register", async () => {
    const data = await request("/api/auth/register", {
      method: "POST",
      body: { name: `${TEST_PREFIX} user`, phone, password: PASSWORD, smsCode: registerCode }
    });
    created.registeredUserId = data.user.id;
    return data;
  });

  const loginSession = await step("user password login", () => request("/api/auth/login", {
    method: "POST",
    body: { phone, password: PASSWORD }
  }));

  const demoPhone = "13800000000";
  const smsLoginCode = await step("send sms-login code", () => sendSms(demoPhone));
  await step("user sms login", () => request("/api/auth/sms-login", {
    method: "POST",
    body: { phone: demoPhone, smsCode: smsLoginCode }
  }));

  const token = loginSession.token || session.token;

  await step("profile update", () => request("/api/member/profile", {
    method: "PATCH",
    token,
    body: {
      name: `${TEST_PREFIX} updated`,
      phone,
      email: `${TEST_PREFIX}@example.com`,
      birthday: "2000-01-01",
      bio: "Smoke test profile",
      coffeePreference: "latte",
      bookPreference: "fiction",
      address: "Test address",
      avatar: ""
    }
  }));

  await step("product browsing", async () => {
    const products = await request("/api/products");
    if (!products.some((item) => item.id === testProduct.id)) throw new Error("test product is not listed");
    return products;
  });

  await step("add to cart", () => request("/api/cart", {
    method: "POST",
    token,
    body: { productId: testProduct.id, quantity: 2 }
  }));

  const order = await step("create order", () => request("/api/orders", {
    method: "POST",
    token,
    body: { items: [{ productId: testProduct.id, quantity: 2 }] }
  }));
  created.orderId = order.id;

  await step("payment submit", () => request(`/api/orders/${order.id}/pay`, {
    method: "POST",
    token,
    body: { paymentMethod: "smoke-test" }
  }));

  await step("admin order management", () => request(`/api/admin/orders/${order.id}/payment-review`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "approved" }
  }));

  const reservationDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const reservationTime = "16:00";
  const seats = await request(`/api/seats/status?date=${reservationDate}&time=${reservationTime}`);
  const freeSeat = seats.find((seat) => seat.status === "free");
  if (!freeSeat) throw new Error("no free seat found for reservation test");

  const reservation = await step("seat reservation", () => request("/api/reservations", {
    method: "POST",
    token,
    body: {
      phone,
      date: reservationDate,
      time: reservationTime,
      people: 1,
      seatIds: [freeSeat.id],
      purpose: "Smoke test",
      note: "Created by automated test"
    }
  }));
  created.reservationId = reservation.id;

  await step("my reservations", async () => {
    const member = await request("/api/member", { token });
    if (!member.reservations.some((item) => item.id === reservation.id)) throw new Error("reservation not found in member center");
    return member;
  });

  await step("admin reservation management", () => request(`/api/admin/reservations/${reservation.id}`, {
    method: "PATCH",
    token: adminToken,
    body: { status: "smoke-tested" }
  }));

  const post = await step("community post", () => request("/api/posts", {
    method: "POST",
    token,
    body: { title: `${TEST_PREFIX} post`, content: "Smoke test content" }
  }));
  created.postId = post.id;

  await step("community comment", () => request(`/api/posts/${post.id}/comments`, {
    method: "POST",
    token,
    body: { content: "Smoke test comment" }
  }));

  await step("community post like", () => request(`/api/posts/${post.id}/like`, {
    method: "POST",
    token
  }));

  const commentId = await step("admin community review", async () => {
    const summary = await request("/api/admin/summary", { token: adminToken });
    const adminPost = summary.posts.find((item) => item.id === post.id);
    const comment = adminPost?.comments?.find((item) => item.content === "Smoke test comment");
    if (!comment) throw new Error("pending comment not found in admin summary");
    await request(`/api/admin/posts/${post.id}/comments/${comment.id}`, {
      method: "PATCH",
      token: adminToken,
      body: { status: "approved" }
    });
    return comment.id;
  });

  await step("community comment like", () => request(`/api/posts/${post.id}/comments/${commentId}/like`, {
    method: "POST",
    token
  }));

  const activity = await step("admin activity management", () => request("/api/admin/activities", {
    method: "POST",
    token: adminToken,
    body: {
      title: `${TEST_PREFIX} activity`,
      capacity: 10,
      date: reservationDate,
      time: "19:00",
      registrationStart: "2020-01-01 00:00:00",
      earlyStart: "2020-01-01 00:00:00",
      location: "Smoke test hall",
      description: "Created by automated smoke test"
    }
  }));
  created.activityId = activity.id;

  await step("activity apply", () => request(`/api/activities/${activity.id}/apply`, {
    method: "POST",
    token,
    body: { people: 1, kind: "regular" }
  }));

  await cleanup(adminToken, created);
  console.log("backend api smoke test ok");
}

main()
  .catch(async (error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill();
  });

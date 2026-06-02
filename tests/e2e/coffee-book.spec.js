const { test, expect } = require("@playwright/test");

const DEMO_PHONE = "13800000000";
const DEMO_PASSWORD = "coffee123";
const ADMIN_ACCOUNT = "admin";
const ADMIN_PASSWORD = "admin123";
const RUN_ID = process.env.E2E_RUN_ID || String(Date.now());
const API_BASE = "http://127.0.0.1:4173";

const state = {
  productName: `E2E Coffee Kit ${RUN_ID}`,
  postTitle: `E2E Reading Note ${RUN_ID}`,
  reservationNote: `E2E Reservation ${RUN_ID}`
};

function tomorrow() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

async function resetClient(page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function loginUser(page) {
  await resetClient(page);
  await page.goto("/login");
  await page.getByTestId("login-phone").fill(DEMO_PHONE);
  await page.getByTestId("login-password").fill(DEMO_PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("shop-page")).toBeVisible();
}

async function loginAdmin(page) {
  await resetClient(page);
  await page.goto("/admin.html");
  await page.getByTestId("admin-account").fill(ADMIN_ACCOUNT);
  await page.getByTestId("admin-password").fill(ADMIN_PASSWORD);
  await page.getByTestId("admin-login-submit").click();
  await expect(page.getByTestId("admin-shell")).toBeVisible();
}

async function apiJson(api, pathname, options = {}) {
  const response = await api.fetch(`${API_BASE}${pathname}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    data: options.body,
    timeout: options.timeout || 15_000
  });
  const body = await response.json().catch(() => null);
  if (!response.ok() || !body?.success) {
    throw new Error(`${options.method || "GET"} ${pathname} failed: ${response.status()} ${body?.message || ""}`);
  }
  return body.data;
}

async function cleanupRunData(api) {
  const admin = await apiJson(api, "/api/admin/login", {
    method: "POST",
    body: { account: ADMIN_ACCOUNT, password: ADMIN_PASSWORD }
  });
  const summary = await apiJson(api, "/api/admin/summary", { token: admin.token });
  const includesRun = (item) => {
    const text = JSON.stringify(item);
    return text.includes(RUN_ID)
      || text.includes("E2E Coffee Kit")
      || text.includes("Created by Playwright E2E")
      || text.includes("E2E Reading Note")
      || text.includes("E2E Reservation");
  };
  const cleanupTargets = [
    ...(summary.orders || []).filter(includesRun).map((item) => [`/api/admin/orders/${item.id}`, "order"]),
    ...(summary.reservations || []).filter(includesRun).map((item) => [`/api/admin/reservations/${item.id}`, "reservation"]),
    ...(summary.products || []).filter(includesRun).map((item) => [`/api/admin/products/${item.id}`, "product"]),
    ...(summary.posts || []).filter(includesRun).map((item) => [`/api/admin/posts/${item.id}`, "post"])
  ];

  const deleted = [];
  for (const [pathname, label] of cleanupTargets) {
    await apiJson(api, pathname, { method: "DELETE", token: admin.token });
    deleted.push(label);
  }

  const nextSummary = await apiJson(api, "/api/admin/summary", { token: admin.token });
  const remaining = ["orders", "reservations", "products", "posts"]
    .flatMap((key) => (nextSummary[key] || []).filter(includesRun).map((item) => `${key}:${item.id}`));
  return { deleted, remaining };
}

test.describe.serial("coffee-book browser flows", () => {
  test("home page is reachable", async ({ page }) => {
    await resetClient(page);
    await expect(page.getByTestId("home-hero")).toBeVisible();
  });

  test("protected member page redirects unauthenticated users", async ({ page }) => {
    await resetClient(page);
    await page.goto("/member");
    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)member/);
  });

  test("login form shows validation for invalid input", async ({ page }) => {
    await resetClient(page);
    await page.goto("/login");
    await page.getByTestId("login-phone").fill("123");
    await page.getByTestId("login-password").fill("");
    await page.getByTestId("login-submit").click();
    await expect(page.locator(".field-error").first()).toBeVisible();
  });

  test("admin login and product management work", async ({ page }) => {
    await loginAdmin(page);
    await page.getByTestId("admin-nav-products").click();
    await page.getByTestId("admin-add-product").click();

    const modal = page.getByTestId("admin-modal-form");
    await expect(modal).toBeVisible();
    await modal.getByTestId("admin-field-name").fill(state.productName);
    await modal.getByTestId("admin-field-description").fill("Created by Playwright E2E");
    await modal.getByTestId("admin-field-price").fill("18.8");
    await modal.getByTestId("admin-field-stock").fill("8");
    await modal.getByTestId("admin-field-category").selectOption("creative");
    await page.getByTestId("admin-save-modal").click();

    await page.getByTestId("admin-search-input").fill(state.productName);
    await expect(page.getByText(state.productName)).toBeVisible();
  });

  test("admin delete operation requires confirmation", async ({ page }) => {
    await loginAdmin(page);
    await page.getByTestId("admin-nav-products").click();
    await page.getByTestId("admin-search-input").fill(state.productName);
    const row = page.locator("tbody tr", { hasText: state.productName }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /删除/ }).click();
    await expect(page.getByTestId("admin-confirm-modal")).toBeVisible();
    await page.getByTestId("admin-confirm-cancel").click();
    await expect(page.getByTestId("admin-confirm-modal")).toHaveCount(0);
    await expect(page.getByText(state.productName)).toBeVisible();
  });

  test("user login, product browsing, cart and order flow work", async ({ page }) => {
    await loginUser(page);
    await page.goto("/shop");
    await expect(page.getByTestId("product-card").first()).toBeVisible();

    await page.locator(".catalog-toolbar input[type='search']").fill(state.productName);
    const product = page.getByTestId("product-card").filter({ hasText: state.productName }).first();
    await expect(product).toBeVisible();
    await product.getByTestId("product-quantity").fill("1");
    await product.getByTestId("add-to-cart").click();

    await page.goto("/cart");
    await expect(page.getByTestId("cart-item").first()).toBeVisible();
    await page.getByTestId("cart-quantity").first().fill("1");
    await page.getByTestId("checkout-button").click();

    await expect(page.getByTestId("checkout-form")).toBeVisible();
    await page.getByTestId("checkout-contact").fill("E2E User");
    await page.getByTestId("checkout-phone").fill(DEMO_PHONE);
    await page.getByTestId("submit-order").click();
    await expect(page).toHaveURL(/\/payment\//);
  });

  test("reservation flow works", async ({ page }) => {
    await loginUser(page);
    await page.goto("/reservations");
    await expect(page.getByTestId("reservation-page")).toBeVisible();
    await page.getByTestId("reservation-date").fill(tomorrow());
    await page.getByTestId("reservation-phone").fill(DEMO_PHONE);
    await page.getByTestId("reservation-note").fill(state.reservationNote);
    await expect(page.locator('[data-testid="seat-button"]:not([disabled])').first()).toBeVisible();
    await page.locator('[data-testid="seat-button"]:not([disabled])').first().click();
    await page.getByTestId("submit-reservation").click();
    await expect(page).toHaveURL(/\/my-reservations/);
  });

  test("community publishing works", async ({ page }) => {
    await loginUser(page);
    await page.goto("/community/publish");
    await expect(page.getByTestId("post-form")).toBeVisible();
    await page.getByTestId("post-title").fill(state.postTitle);
    await page.getByTestId("post-content").fill("Playwright checks the community publishing path.");
    await page.getByTestId("submit-post").click();
    await expect(page).toHaveURL(/\/community/);
    await expect(page.getByText(state.postTitle)).toBeVisible();
  });

  test("admin order management supports search and paging controls", async ({ page }) => {
    await loginAdmin(page);
    await page.getByTestId("admin-nav-orders").click();
    await expect(page.getByTestId("admin-orders-table")).toBeVisible();
    await page.getByTestId("admin-search-input").fill(state.productName);
    await expect(page.getByTestId("admin-orders-table").locator("tbody tr").first()).toBeVisible();
    await page.getByTestId("admin-page-size").selectOption("5");
    await expect(page.locator(".admin-pagination")).toBeVisible();
  });

  test("cleanup temporary e2e data", async ({ request }) => {
    const result = await cleanupRunData(request);
    expect(result.deleted.length).toBeGreaterThanOrEqual(4);
    expect(result.remaining).toEqual([]);
  });
});

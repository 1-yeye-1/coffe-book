const { test, expect } = require("@playwright/test");

const DEMO_PHONE = "13800000000";
const DEMO_PASSWORD = "coffee123";
const ADMIN_ACCOUNT = "admin";
const ADMIN_PASSWORD = "admin123";
const RUN_ID = process.env.E2E_RUN_ID || String(Date.now());

const state = {
  productName: `E2E Coffee Kit ${RUN_ID}`,
  postTitle: `E2E Reading Note ${RUN_ID}`
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

test.describe.serial("coffee-book browser flows", () => {
  test("home page is reachable", async ({ page }) => {
    await resetClient(page);
    await expect(page.getByTestId("home-hero")).toBeVisible();
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
});

import { saveCart } from "../shared/state.js";

export function renderProductList(ctx) {
  const products = ctx.state.data.products.filter((product) => product.category !== "coffee");
  return `
    <section class="section">
      <div class="section-head">
        <div><h2>文创商城</h2><p class="lead">这里专注展示文创商品，购物车和支付流程从独立入口进入。</p></div>
      </div>
      <div class="grid product-grid">
        ${products.map((product) => `
          <article class="card media-card product-card">
            <img src="${product.image}" alt="${product.name}" />
            <div class="body">
              <div class="post-meta"><h3>${product.name}</h3><span>库存 ${product.stock}</span></div>
              <p class="muted">${product.description}</p>
              <p class="price">${ctx.money(product.price)}</p>
              <label class="quantity-field">
                <span>数量</span>
                <input type="number" min="1" max="${product.stock}" value="1" data-quantity="${product.id}" />
              </label>
              <div class="actions">
                <button class="btn ghost" data-cart="${product.id}">加入购物车</button>
                <button class="btn" data-buy-now="${product.id}">立即购买</button>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function bindProductList(ctx) {
  const productQuantity = (productId) => Math.max(1, Number(document.querySelector(`[data-quantity="${productId}"]`)?.value || 1));
  document.querySelectorAll("[data-cart]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!ctx.state.user) {
        ctx.toast("请先登录后再加入购物车");
        return ctx.setPage("userLogin");
      }
      const productId = Number(button.dataset.cart);
      const product = ctx.state.data.products.find((item) => item.id === productId);
      const quantity = productQuantity(productId);
      try {
        await ctx.request("/api/cart", { method: "POST", body: JSON.stringify({ productId, quantity }) });
        const existed = ctx.state.cart.find((item) => item.productId === productId);
        if (existed) existed.quantity += quantity;
        else ctx.state.cart.push({ productId, quantity, name: product.name, price: product.price });
        saveCart();
        ctx.toast(`已加入购物车，共 ${quantity} 件`);
        ctx.render();
      } catch (error) {
        ctx.toast(error.message);
      }
    });
  });

  document.querySelectorAll("[data-buy-now]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!ctx.state.user) {
        ctx.toast("请先登录后再购买商品");
        return ctx.setPage("userLogin");
      }
      const productId = Number(button.dataset.buyNow);
      const product = ctx.state.data.products.find((item) => item.id === productId);
      const quantity = productQuantity(productId);
      ctx.state.cart = [{ productId, quantity, name: product.name, price: product.price }];
      saveCart();
      ctx.setPage("orderConfirm");
    });
  });
}

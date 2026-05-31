import { saveCart } from "../shared/state.js";

export function renderCulture(ctx) {
  const drinks = ctx.state.data.products.filter((product) => product.category === "coffee");
  return `
    <section class="section">
      <div class="section-head"><div><h2>咖啡文化</h2><p class="lead">从品牌故事、精品产区到门店饮品下单的一站式体验。</p></div></div>
      <div class="grid">
        ${[
          ["2019", "城市第一家阅读咖啡复合店开业"],
          ["2021", "引入云南、埃塞、哥伦比亚精品豆产区计划"],
          ["2024", "上线咖啡百科和手冲课程"],
          ["2026", "形成咖啡、书籍、活动、文创一体化会员体系"]
        ].map(([year, text]) => `<article class="card"><span class="status">${year}</span><h3>${text}</h3><p class="muted">品牌故事时间轴节点</p></article>`).join("")}
      </div>
    </section>
    <section class="section">
      <div class="section-head"><div><h2>招牌饮品</h2><p class="lead">选择数量加入购物车，沿用确认订单、支付和积分成长流程。</p></div></div>
      <div class="grid product-grid">
        ${drinks.map((drink) => `
          <article class="card media-card product-card">
            <img src="${drink.image}" alt="${drink.name}" />
            <div class="body">
              <div class="post-meta"><h3>${drink.name}</h3><span>可售 ${drink.stock}</span></div>
              <p class="muted">${drink.description}</p>
              <p class="price">${ctx.money(drink.price)}</p>
              <label class="quantity-field"><span>数量</span><input type="number" min="1" max="${drink.stock}" value="1" data-drink-quantity="${drink.id}" /></label>
              <div class="actions">
                <button class="btn ghost" data-drink-cart="${drink.id}">加入购物车</button>
                <button class="btn" data-drink-buy-now="${drink.id}">立即购买</button>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function bindCulture(ctx) {
  const drinkQuantity = (productId) => Math.max(1, Number(document.querySelector(`[data-drink-quantity="${productId}"]`)?.value || 1));
  document.querySelectorAll("[data-drink-cart]").forEach((button) => button.addEventListener("click", async () => {
    if (!ctx.state.user) {
      ctx.toast("请先登录后再加入购物车");
      return ctx.setPage("userLogin");
    }
    const productId = Number(button.dataset.drinkCart);
    const drink = ctx.state.data.products.find((item) => item.id === productId);
    const quantity = drinkQuantity(productId);
    try {
      await ctx.request("/api/cart", { method: "POST", body: JSON.stringify({ productId, quantity }) });
      const existed = ctx.state.cart.find((item) => item.productId === productId);
      if (existed) existed.quantity += quantity;
      else ctx.state.cart.push({ productId, quantity, name: drink.name, price: drink.price });
      saveCart();
      ctx.toast(`已将 ${quantity} 杯饮品加入购物车`);
      ctx.render();
    } catch (error) {
      ctx.toast(error.message);
    }
  }));

  document.querySelectorAll("[data-drink-buy-now]").forEach((button) => button.addEventListener("click", () => {
    if (!ctx.state.user) {
      ctx.toast("请先登录后再购买饮品");
      return ctx.setPage("userLogin");
    }
    const productId = Number(button.dataset.drinkBuyNow);
    const drink = ctx.state.data.products.find((item) => item.id === productId);
    ctx.state.cart = [{ productId, quantity: drinkQuantity(productId), name: drink.name, price: drink.price }];
    saveCart();
    ctx.setPage("orderConfirm");
  }));
}

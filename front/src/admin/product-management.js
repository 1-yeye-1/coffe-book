import { openAdminModal } from "./modal.js";

export function renderProductManage(ctx) {
  return `
    <section class="section">
      <div class="section-head"><div><h2>商品管理</h2><p class="lead">维护文创商品和咖啡饮品。</p></div><button class="btn" id="add-product">新增商品</button></div>
      <div class="card table-card">
        <table>
          <thead><tr><th>商品</th><th>分类</th><th>价格</th><th>库存</th><th>操作</th></tr></thead>
          <tbody>${ctx.state.data.products.map((item) => `<tr><td>${item.name}</td><td>${item.category === "coffee" ? "咖啡饮品" : "文创商品"}</td><td>${ctx.money(item.price)}</td><td>${item.stock}</td><td><button class="btn ghost" data-edit-product="${item.id}">编辑</button> <button class="btn danger" data-delete-product="${item.id}">删除</button></td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

const productFields = (product = {}) => [
  { name: "name", label: "商品名称", value: product.name },
  { name: "description", label: "商品描述", value: product.description, type: "textarea" },
  { name: "price", label: "价格", value: product.price || 0, type: "number" },
  { name: "stock", label: "库存", value: product.stock || 0, type: "number" },
  { name: "category", label: "分类", value: product.category || "creative", type: "select", options: [["creative", "文创商品"], ["coffee", "咖啡饮品"]] }
];

export function bindProductManage(ctx) {
  document.querySelector("#add-product")?.addEventListener("click", () => openAdminModal({
    title: "新增商品",
    fields: productFields(),
    submitText: "新增",
    onSubmit: async (data) => {
      await ctx.request("/api/admin/products", { method: "POST", body: JSON.stringify(data) });
      ctx.toast("商品已新增");
      await ctx.render();
    }
  }));

  document.querySelectorAll("[data-edit-product]").forEach((button) => button.addEventListener("click", () => {
    const product = ctx.state.data.products.find((item) => item.id === Number(button.dataset.editProduct));
    openAdminModal({
      title: "快捷编辑商品",
      fields: productFields(product),
      onSubmit: async (data) => {
        await ctx.request(`/api/admin/products/${product.id}`, { method: "PATCH", body: JSON.stringify(data) });
        ctx.toast("商品已更新");
        await ctx.render();
      }
    });
  }));

  document.querySelectorAll("[data-delete-product]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("确定删除该商品吗？")) return;
    await ctx.request(`/api/admin/products/${button.dataset.deleteProduct}`, { method: "DELETE" });
    ctx.toast("商品已删除");
    ctx.render();
  }));
}

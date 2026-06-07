import { defineStore } from "pinia";
import { request } from "@/api";

const CART_KEY = "coffee_cart";

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function normalizeQuantity(value, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error("数量必须是整数");
  if (number < 1) throw new Error("数量不能小于 1");
  if (number > max) throw new Error(`数量不能超过 ${max}`);
  return number;
}

export const useCartStore = defineStore("cart", {
  state: () => ({
    items: readCart(),
    selectedIds: readCart().map((item) => String(item.productId))
  }),

  getters: {
    selectedItems(state) {
      const ids = new Set(state.selectedIds.map(String));
      return state.items.filter((item) => ids.has(String(item.productId)));
    },

    selectedCount() {
      return this.selectedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    },

    subtotal() {
      return this.selectedItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
    },

    discountAmount() {
      if (this.subtotal >= 168) return 20;
      if (this.subtotal >= 99) return 10;
      return 0;
    },

    payAmount() {
      return Math.max(0, this.subtotal - this.discountAmount);
    }
  },

  actions: {
    saveCart() {
      localStorage.setItem(CART_KEY, JSON.stringify(this.items));
    },

    setItems(items = []) {
      this.items = items.map((item) => ({
        productId: item.productId,
        name: item.name,
        image: item.image || "",
        price: Number(item.price || 0),
        stock: Number(item.stock || 0),
        quantity: Number(item.quantity || 1)
      }));
      this.selectedIds = this.items.map((item) => String(item.productId));
      this.saveCart();
    },

    async loadRemoteCart() {
      const items = await request("/api/cart");
      this.setItems(items);
      return this.items;
    },

    async addProduct(product, quantity = 1, syncBackend = false) {
      const maxQuantity = Number(product.stock || 0);
      const safeQuantity = normalizeQuantity(quantity, maxQuantity);
      const existed = this.items.find((item) => item.productId === product.id);
      const nextQuantity = normalizeQuantity(Number(existed?.quantity || 0) + safeQuantity, maxQuantity);
      if (existed) {
        existed.quantity = nextQuantity;
        existed.stock = maxQuantity;
      }
      else {
        this.items.push({
          productId: product.id,
          name: product.name,
          image: product.image || "",
          price: Number(product.price || 0),
          stock: maxQuantity,
          quantity: safeQuantity
        });
      }
      if (!this.selectedIds.includes(String(product.id))) this.selectedIds.push(String(product.id));
      this.saveCart();
      if (syncBackend) {
        const items = await request("/api/cart", {
          method: "POST",
          body: { productId: product.id, quantity: safeQuantity }
        });
        this.setItems(items);
      }
    },

    updateQuantity(productId, quantity) {
      const item = this.items.find((entry) => entry.productId === productId);
      if (!item) return;
      item.quantity = normalizeQuantity(quantity, Number(item.stock || 1));
      this.saveCart();
    },

    async syncQuantity(productId, quantity) {
      this.updateQuantity(productId, quantity);
      const items = await request(`/api/cart/${productId}`, {
        method: "PATCH",
        body: { quantity }
      });
      this.setItems(items);
    },

    removeProduct(productId) {
      this.items = this.items.filter((item) => item.productId !== productId);
      this.selectedIds = this.selectedIds.filter((id) => id !== String(productId));
      this.saveCart();
    },

    async syncRemoveProduct(productId) {
      this.removeProduct(productId);
      const items = await request(`/api/cart/${productId}`, { method: "DELETE" });
      this.setItems(items);
    },

    toggleSelected(productId, checked) {
      const id = String(productId);
      if (checked && !this.selectedIds.includes(id)) this.selectedIds.push(id);
      if (!checked) this.selectedIds = this.selectedIds.filter((item) => item !== id);
    },

    toggleAll(checked) {
      this.selectedIds = checked ? this.items.map((item) => String(item.productId)) : [];
    },

    clearPaidItems(items) {
      const paidIds = new Set(items.map((item) => String(item.productId)));
      this.items = this.items.filter((item) => !paidIds.has(String(item.productId)));
      this.selectedIds = this.selectedIds.filter((id) => !paidIds.has(id));
      this.saveCart();
    },

    clearCart() {
      this.items = [];
      this.selectedIds = [];
      this.saveCart();
    }
  }
});

import { defineStore } from "pinia";
import { request } from "@/api";

export const useProductStore = defineStore("product", {
  state: () => ({
    products: [],
    currentProduct: null,
    loading: false
  }),

  getters: {
    mallProducts: (state) => state.products.filter((item) => item.category !== "coffee"),
    coffeeProducts: (state) => state.products.filter((item) => item.category === "coffee")
  },

  actions: {
    async fetchProducts() {
      this.loading = true;
      try {
        this.products = await request("/api/products");
      } finally {
        this.loading = false;
      }
      return this.products;
    },

    async fetchProduct(id) {
      const cached = this.products.find((item) => String(item.id) === String(id));
      if (cached) {
        this.currentProduct = cached;
        return cached;
      }
      this.currentProduct = await request(`/api/products/${id}`);
      return this.currentProduct;
    }
  }
});

import { defineStore } from "pinia";
import { request } from "@/api";

export const useProductStore = defineStore("product", {
  state: () => ({
    products: [],
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
    }
  }
});

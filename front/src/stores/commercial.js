import { defineStore } from "pinia";
import { request } from "@/api";

export const useCommercialStore = defineStore("commercial", {
  state: () => ({
    memberLevel: null,
    coupons: [],
    memberCoupons: [],
    loadedAt: ""
  }),

  getters: {
    unusedCoupons: (state) => state.memberCoupons.filter((coupon) => coupon.status === "unused"),
    activeCoupons: (state) => state.coupons.filter((coupon) => coupon.status === "active")
  },

  actions: {
    async fetchMemberLevel() {
      this.memberLevel = await request("/api/member/level");
      this.loadedAt = new Date().toISOString();
      return this.memberLevel;
    },

    async fetchCoupons() {
      this.coupons = await request("/api/coupons");
      return this.coupons;
    },

    async fetchMemberCoupons() {
      this.memberCoupons = await request("/api/member/coupons");
      return this.memberCoupons;
    },

    async receiveCoupon(couponId) {
      const coupon = await request("/api/coupons/receive", {
        method: "POST",
        body: { couponId }
      });
      await this.fetchMemberCoupons();
      await this.fetchCoupons();
      return coupon;
    }
  }
});

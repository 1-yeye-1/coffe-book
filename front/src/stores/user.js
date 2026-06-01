import { defineStore } from "pinia";
import { request } from "@/api";

const USER_KEY = "coffee_user";
const TOKEN_KEY = "coffee_token";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
    token: localStorage.getItem(TOKEN_KEY) || "",
    member: null
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token && state.user)
  },

  actions: {
    saveSession(data) {
      this.user = data.user;
      this.token = data.token;
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(TOKEN_KEY, data.token);
    },

    async login(payload) {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      this.saveSession(data);
      await this.fetchMember();
      return data;
    },

    async smsLogin(payload) {
      const data = await request("/api/auth/sms-login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      this.saveSession(data);
      await this.fetchMember();
      return data;
    },

    async fetchMember() {
      if (!this.token) return null;
      this.member = await request("/api/member");
      this.user = {
        id: this.member.id,
        name: this.member.name,
        phone: this.member.phone,
        avatar: this.member.avatar,
        level: this.member.level
      };
      localStorage.setItem(USER_KEY, JSON.stringify(this.user));
      return this.member;
    },

    logout() {
      this.user = null;
      this.token = "";
      this.member = null;
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }
});

import { defineStore } from "pinia";
import { request } from "@/api";

export const useEngagementStore = defineStore("engagement", {
  state: () => ({
    tasks: [],
    checkIn: null,
    badges: [],
    invite: null,
    history: [],
    recommendations: null,
    notifications: [],
    unreadCount: 0
  }),

  getters: {
    dailyTasks: (state) => state.tasks.filter((item) => item.type === "daily"),
    growthTasks: (state) => state.tasks.filter((item) => item.type === "growth"),
    completedTasks: (state) => state.tasks.filter((item) => item.status === "completed"),
    earnedBadges: (state) => state.badges.filter((item) => item.earned)
  },

  actions: {
    async fetchTasks() {
      const data = await request("/api/member/tasks");
      this.tasks = data.tasks || [];
      this.checkIn = data.checkIn || null;
      return data;
    },

    async checkInToday() {
      const data = await request("/api/member/tasks/check-in", { method: "POST", body: {} });
      this.tasks = data.tasks || [];
      this.checkIn = data.checkIn || null;
      return data;
    },

    async fetchBadges() {
      this.badges = await request("/api/member/badges");
      return this.badges;
    },

    async fetchInvite() {
      this.invite = await request("/api/member/invite");
      return this.invite;
    },

    async bindInvite(inviteCode) {
      return request("/api/invite/bind", { method: "POST", body: { inviteCode } });
    },

    async fetchHistory() {
      this.history = await request("/api/member/history");
      return this.history;
    },

    async fetchRecommendations(scene = "home") {
      this.recommendations = await request(`/api/recommendations?scene=${encodeURIComponent(scene)}`);
      return this.recommendations;
    },

    async fetchNotifications(filters = {}) {
      const params = new URLSearchParams({
        category: filters.category || "all",
        status: filters.status || "all",
        q: filters.query || ""
      });
      this.notifications = await request(`/api/notifications?${params.toString()}`);
      return this.notifications;
    },

    async fetchUnreadCount() {
      const data = await request("/api/notifications/unread-count");
      this.unreadCount = Number(data?.count || 0);
      return this.unreadCount;
    },

    async markNotificationsRead(ids) {
      const result = await request("/api/notifications/read", { method: "POST", body: { ids } });
      this.unreadCount = Number(result?.unreadCount || 0);
      return result;
    },

    async markAllNotificationsRead(category = "all") {
      const result = await request("/api/notifications/read-all", { method: "POST", body: { category } });
      this.unreadCount = Number(result?.unreadCount || 0);
      return result;
    }
  }
});

import { defineStore } from "pinia";
import { request } from "@/api";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const useSiteStore = defineStore("site", {
  state: () => ({
    home: null,
    books: [],
    activities: [],
    posts: [],
    seats: [],
    reservationDate: today(),
    reservationTime: "10:00",
    selectedSeats: [],
    loading: false
  }),

  actions: {
    async fetchHome() {
      this.home = await request("/api/home");
      return this.home;
    },

    async fetchBooks() {
      this.books = await request("/api/books");
      return this.books;
    },

    async fetchActivities() {
      this.activities = await request("/api/activities");
      return this.activities;
    },

    async fetchPosts() {
      this.posts = await request("/api/posts");
      return this.posts;
    },

    async fetchSeats(date = this.reservationDate, time = this.reservationTime) {
      this.reservationDate = date;
      this.reservationTime = time;
      this.seats = await request(`/api/seats/status?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`);
      return this.seats;
    },

    toggleSeat(seatId, maxCount) {
      if (this.selectedSeats.includes(seatId)) {
        this.selectedSeats = this.selectedSeats.filter((id) => id !== seatId);
        return true;
      }
      if (this.selectedSeats.length >= maxCount) return false;
      this.selectedSeats.push(seatId);
      return true;
    },

    async createReservation(payload) {
      await request("/api/reservations", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      this.selectedSeats = [];
      await this.fetchSeats();
    },

    async applyActivity(activityId, payload) {
      await request(`/api/activities/${activityId}/apply`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await this.fetchActivities();
    },

    async createPost(payload) {
      await request("/api/posts", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await this.fetchPosts();
    },

    async likePost(postId) {
      await request(`/api/posts/${postId}/like`, { method: "POST" });
      await this.fetchPosts();
    },

    async commentPost(postId, content) {
      await request(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content })
      });
      await this.fetchPosts();
    }
  }
});

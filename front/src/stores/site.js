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
    reservations: [],
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

    async fetchActivity(id) {
      const cached = this.activities.find((item) => String(item.id) === String(id));
      if (cached) return cached;
      const activity = await request(`/api/activities/${id}`);
      this.activities = [...this.activities.filter((item) => String(item.id) !== String(id)), activity];
      return activity;
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

    async fetchReservations() {
      this.reservations = await request("/api/reservations");
      return this.reservations;
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

    async cancelReservation(id) {
      const reservation = await request(`/api/reservations/${id}`, { method: "DELETE" });
      this.reservations = this.reservations.map((item) => item.id === reservation.id ? reservation : item);
      await this.fetchSeats();
      return reservation;
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

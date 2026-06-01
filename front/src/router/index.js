import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", name: "home", component: () => import("@/views/Home.vue") },
  { path: "/brand", name: "brand", component: () => import("@/views/Brand.vue") },
  { path: "/login", name: "login", component: () => import("@/views/Login.vue") },
  { path: "/register", name: "register", component: () => import("@/views/Register.vue") },
  { path: "/culture", name: "culture", component: () => import("@/views/CoffeeCulture.vue") },
  { path: "/books", name: "books", component: () => import("@/views/BookLibrary.vue") },
  { path: "/books/:bookId", name: "bookDetail", component: () => import("@/views/BookDetail.vue") },
  { path: "/shop", name: "shop", component: () => import("@/views/ProductList.vue") },
  { path: "/cart", name: "cart", component: () => import("@/views/ShoppingCart.vue"), meta: { requiresAuth: true } },
  { path: "/reservations", name: "reservations", component: () => import("@/views/Reservation.vue") },
  { path: "/my-reservations", name: "myReservations", component: () => import("@/views/MyReservations.vue"), meta: { requiresAuth: true } },
  { path: "/community", name: "community", component: () => import("@/views/Community.vue") },
  { path: "/community/publish", name: "publishPost", component: () => import("@/views/PublishPost.vue"), meta: { requiresAuth: true } },
  { path: "/community/:postId", name: "postDetail", component: () => import("@/views/PostDetail.vue") },
  { path: "/activities", name: "activities", component: () => import("@/views/Activities.vue") },
  { path: "/activities/:activityId", name: "activityDetail", component: () => import("@/views/ActivityDetail.vue") },
  { path: "/member", name: "member", component: () => import("@/views/MemberCenter.vue"), meta: { requiresAuth: true } },
  { path: "/profile", name: "profile", component: () => import("@/views/Profile.vue"), meta: { requiresAuth: true } },
  { path: "/security", name: "security", component: () => import("@/views/SecuritySettings.vue"), meta: { requiresAuth: true } },
  { path: "/points", name: "points", component: () => import("@/views/PointsCenter.vue"), meta: { requiresAuth: true } },
  { path: "/favorites", name: "favorites", component: () => import("@/views/MemberList.vue"), meta: { requiresAuth: true, listType: "favorites" } },
  { path: "/notes", name: "notes", component: () => import("@/views/MemberList.vue"), meta: { requiresAuth: true, listType: "notes" } },
  { path: "/notifications", name: "notifications", component: () => import("@/views/MemberList.vue"), meta: { requiresAuth: true, listType: "notifications" } },
  { path: "/gifts", name: "gifts", component: () => import("@/views/MyGifts.vue"), meta: { requiresAuth: true } },
  { path: "/checkout", name: "checkout", component: () => import("@/views/Checkout.vue"), meta: { requiresAuth: true } },
  { path: "/payment/:orderId", name: "payment", component: () => import("@/views/Payment.vue"), meta: { requiresAuth: true } },
  { path: "/payment-success/:orderId", name: "paymentSuccess", component: () => import("@/views/PaymentSuccess.vue"), meta: { requiresAuth: true } },
  { path: "/orders", name: "orders", component: () => import("@/views/MyOrders.vue"), meta: { requiresAuth: true } },
  { path: "/orders/:orderId", name: "orderDetail", component: () => import("@/views/OrderDetail.vue"), meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach((to) => {
  const token = localStorage.getItem("coffee_token");
  if (to.meta.requiresAuth && !token) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;

const { publicUser } = require("../shared/auth");
const { db, today } = require("../shared/data");
const {
  DEFAULT_MEMBER_LEVELS,
  commercialMembershipData,
  ensureCommercialData,
  syncUserLevel
} = require("./commercial");

const pointRewards = [
  { id: "coffee-coupon", title: "精品咖啡兑换券", cost: 300, desc: "可兑换任意标准杯饮品 1 杯", type: "饮品券" },
  { id: "shop-10", title: "文创商城 10 元优惠券", cost: 500, desc: "满 59 元可用", type: "优惠券" },
  { id: "event-priority", title: "活动优先报名券", cost: 800, desc: "热门活动开放前优先锁定名额", type: "活动券" }
];

function normalizeMember(user) {
  ensureCommercialData();
  const level = syncUserLevel(user);
  user.points = Number(user.points || 0);
  user.favorites = Array.isArray(user.favorites) ? user.favorites : [];
  user.notes = Array.isArray(user.notes) ? user.notes : [];
  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  user.gifts = Array.isArray(user.gifts) ? user.gifts : [];
  return level;
}

function membershipData(user) {
  const membership = commercialMembershipData(user);
  return {
    ...membership,
    rewards: pointRewards,
    checkedInToday: user.lastCheckIn === today()
  };
}

function earlySignupQuota(user) {
  const membership = commercialMembershipData(user);
  return Math.max(1, Number(membership.activityPriority || 0));
}

function memberData(user) {
  normalizeMember(user);
  const comments = db.posts.flatMap((post) => post.comments || []).filter((comment) => comment.userId === user.id);
  return {
    ...publicUser(user),
    reservations: db.reservations.filter((item) => item.userId === user.id),
    orders: db.orders.filter((item) => item.userId === user.id),
    favorites: user.favorites,
    notes: user.notes,
    notifications: user.notifications,
    gifts: user.gifts,
    stats: {
      favoriteBooks: user.favorites.length,
      publishedComments: comments.length,
      orderCount: db.orders.filter((item) => item.userId === user.id).length
    },
    membership: membershipData(user)
  };
}

module.exports = {
  earlySignupQuota,
  memberData,
  memberLevels: DEFAULT_MEMBER_LEVELS,
  normalizeMember,
  pointRewards
};

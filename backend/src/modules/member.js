const { publicUser } = require("../shared/auth");
const { db, today } = require("../shared/data");

const memberLevelDefinitions = [
  {
    name: "普通会员",
    min: 0,
    next: 500,
    benefits: [
      { key: "check-in", label: "每日签到 +10 积分" },
      { key: "shop-discount", label: "文创商品 95 折券兑换" },
      { key: "event-reminder", label: "活动报名提醒" }
    ]
  },
  {
    name: "黄金会员",
    min: 500,
    next: 1500,
    benefits: [
      { key: "check-in", label: "每日签到提升至 +15 积分" },
      { key: "shop-discount", label: "文创商品折扣提升至 9 折" },
      { key: "event-priority", label: "活动优先报名" },
      { key: "birthday-coffee", label: "生日咖啡券" }
    ]
  },
  {
    name: "钻石会员",
    min: 1500,
    next: null,
    benefits: [
      { key: "check-in", label: "每日签到提升至 +20 积分" },
      { key: "shop-discount", label: "文创商品折扣提升至 85 折" },
      { key: "event-quota", label: "活动专属名额" },
      { key: "monthly-coffee", label: "每月精品咖啡体验" }
    ]
  }
];

const memberLevels = memberLevelDefinitions.map((level, index) => {
  const inheritedBenefits = new Map();
  for (const item of memberLevelDefinitions.slice(0, index + 1)) {
    for (const benefit of item.benefits) inheritedBenefits.set(benefit.key, benefit.label);
  }
  return {
    name: level.name,
    min: level.min,
    next: level.next,
    inheritedFrom: memberLevelDefinitions.slice(0, index).map((item) => item.name),
    benefits: [...inheritedBenefits.values()]
  };
});

const pointRewards = [
  { id: "coffee-coupon", title: "精品咖啡兑换券", cost: 300, desc: "可兑换任意标准杯饮品 1 杯", type: "饮品券" },
  { id: "shop-10", title: "文创商城 10 元优惠券", cost: 500, desc: "满 59 元可用", type: "优惠券" },
  { id: "event-priority", title: "活动优先报名券", cost: 800, desc: "热门活动开放前优先锁定名额", type: "活动券" }
];

function normalizeMember(user) {
  user.levelProgress = Number(user.levelProgress || 0);
  const level = [...memberLevels].reverse().find((item) => user.levelProgress >= item.min) || memberLevels[0];
  user.level = level.name;
  user.points = Number(user.points || 0);
  user.favorites = Array.isArray(user.favorites) ? user.favorites : [];
  user.notes = Array.isArray(user.notes) ? user.notes : [];
  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  user.gifts = Array.isArray(user.gifts) ? user.gifts : [];
  return level;
}

function membershipData(user) {
  const level = normalizeMember(user);
  const index = memberLevels.findIndex((item) => item.name === level.name);
  const next = memberLevels[index + 1] || null;
  const span = next ? next.min - level.min : 1;
  const current = Math.max(0, user.levelProgress - level.min);
  return {
    level: level.name,
    levelProgress: user.levelProgress,
    current,
    target: next ? span : current,
    nextLevel: next?.name || "已达最高等级",
    need: next ? Math.max(0, next.min - user.levelProgress) : 0,
    benefits: level.benefits,
    allLevels: memberLevels,
    rewards: pointRewards,
    checkedInToday: user.lastCheckIn === today()
  };
}

function earlySignupQuota(user) {
  const level = normalizeMember(user);
  if (level.name === "钻石会员") return 3;
  if (level.name === "黄金会员") return 2;
  return 1;
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
  memberLevels,
  normalizeMember,
  pointRewards
};

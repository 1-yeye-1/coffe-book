const { db } = require("../shared/data");

function getUserCart(userId) {
  return db.carts.get(userId) || [];
}

function setUserCart(userId, cart) {
  db.carts.set(userId, cart);
  return cart;
}

module.exports = { getUserCart, setUserCart };

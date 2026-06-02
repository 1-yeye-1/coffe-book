const { db } = require("../shared/data");

function findOrderById(id) {
  return db.orders.find((item) => item.id === Number(id));
}

function userOwnsOrder(order, user) {
  return Boolean(order && user && order.userId === user.id);
}

module.exports = { findOrderById, userOwnsOrder };

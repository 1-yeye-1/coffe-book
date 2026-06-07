const { db } = require("../shared/data");
const { persistProduct } = require("../shared/mysql");

function findOrderById(id) {
  return db.orders.find((item) => item.id === Number(id));
}

function listOrdersForUser(user) {
  if (!user) return [];
  return db.orders.filter((item) => item.userId === user.id);
}

function userOwnsOrder(order, user) {
  return Boolean(order && user && order.userId === user.id);
}

async function restoreOrderStock(order) {
  if (!order || order.stockRestoredAt) return false;
  for (const item of order.items || []) {
    const product = db.products.find((entry) => entry.id === Number(item.productId));
    if (product) {
      product.stock = Number(product.stock || 0) + Number(item.quantity || 0);
      await persistProduct(product);
    }
  }
  order.stockRestoredAt = new Date().toISOString();
  return true;
}

module.exports = { findOrderById, listOrdersForUser, restoreOrderStock, userOwnsOrder };

const { db } = require("../shared/data");

function getUserCart(userId) {
  return db.carts.get(userId) || [];
}

function setUserCart(userId, cart) {
  db.carts.set(userId, cart);
  return cart;
}

function cartSnapshot(userId) {
  return getUserCart(userId).map((item) => {
    const product = db.products.find((entry) => entry.id === Number(item.productId));
    return {
      productId: Number(item.productId),
      quantity: Number(item.quantity || 1),
      name: product?.name || item.name || "",
      price: Number(product?.price ?? item.price ?? 0),
      stock: Number(product?.stock ?? item.stock ?? 0),
      image: product?.image || item.image || "",
      category: product?.category || item.category || ""
    };
  });
}

module.exports = { cartSnapshot, getUserCart, setUserCart };

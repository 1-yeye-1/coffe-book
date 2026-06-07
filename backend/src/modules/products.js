const { db } = require("../shared/data");

function listProducts(filters = {}) {
  const category = String(filters.category || "").trim();
  const keyword = String(filters.keyword || filters.q || "").trim().toLowerCase();
  return db.products.filter((item) => {
    const matchedCategory = !category || category === "all" || item.category === category;
    const text = [item.name, item.description, item.category].join(" ").toLowerCase();
    return matchedCategory && (!keyword || text.includes(keyword));
  });
}

function findProductById(id) {
  return db.products.find((item) => item.id === Number(id));
}

function listBooks() {
  return db.books;
}

function findBookById(id) {
  return db.books.find((item) => item.id === Number(id));
}

module.exports = { findBookById, findProductById, listBooks, listProducts };

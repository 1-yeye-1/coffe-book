const { db } = require("../shared/data");

function listProducts() {
  return db.products;
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

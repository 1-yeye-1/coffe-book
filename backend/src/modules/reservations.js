const { db } = require("../shared/data");

function findReservationById(id) {
  return db.reservations.find((item) => item.id === Number(id));
}

function userOwnsReservation(reservation, user) {
  return Boolean(reservation && user && reservation.userId === user.id);
}

module.exports = { findReservationById, userOwnsReservation };

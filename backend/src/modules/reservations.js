const { db } = require("../shared/data");

function findReservationById(id) {
  return db.reservations.find((item) => item.id === Number(id));
}

function userOwnsReservation(reservation, user) {
  return Boolean(reservation && user && reservation.userId === user.id);
}

function splitSeatIds(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(source.map((item) => String(item).trim()).filter(Boolean))];
}

function isActiveReservation(reservation) {
  return reservation && reservation.status !== "已取消" && reservation.status !== "cancelled";
}

function findSeatConflicts({ seatIds, date, time, ignoreId = 0 }) {
  const selected = new Set(splitSeatIds(seatIds));
  if (!selected.size) return [];
  return db.reservations.filter((reservation) => {
    if (Number(reservation.id) === Number(ignoreId)) return false;
    if (!isActiveReservation(reservation)) return false;
    if (reservation.date !== date || reservation.time !== time) return false;
    return splitSeatIds(reservation.seatId).some((id) => selected.has(id));
  });
}

module.exports = { findReservationById, findSeatConflicts, splitSeatIds, userOwnsReservation };

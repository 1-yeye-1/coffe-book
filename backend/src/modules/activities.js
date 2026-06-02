const { db } = require("../shared/data");

function findActivityById(id) {
  return db.activities.find((item) => item.id === Number(id));
}

function hasAppliedActivity(activityId, user, phone) {
  return db.activityApplications.some((item) => item.activityId === activityId && ((user && item.userId === user.id) || item.phone === phone));
}

module.exports = { findActivityById, hasAppliedActivity };

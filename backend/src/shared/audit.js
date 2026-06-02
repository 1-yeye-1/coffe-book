const { recordRealtime } = require("./data");
const { persistAuditLog } = require("./mysql");

async function auditActivity(action, options = {}) {
  const entry = recordRealtime(action, options);
  await persistAuditLog(entry);
  return entry;
}

module.exports = { auditActivity };

const columns = 'audit_log_id, actor_admin_user_id, action, entity_type, entity_id, outcome, request_id, created_at';
const summaryColumns = `${columns}, before_summary, after_summary`;

async function createAuditLog(pool, {
  actorAdminUserId = null,
  action,
  entityType,
  entityId,
  outcome,
  requestId = null,
  beforeSummary = null,
  afterSummary = null,
}) {
  const [result] = await pool.execute(
    'INSERT INTO audit_logs (actor_admin_user_id, action, entity_type, entity_id, outcome, request_id, before_summary, after_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      actorAdminUserId,
      action,
      entityType,
      entityId,
      outcome,
      requestId,
      beforeSummary === null ? null : JSON.stringify(beforeSummary),
      afterSummary === null ? null : JSON.stringify(afterSummary),
    ],
  );
  const [rows] = await pool.execute(
    `SELECT ${summaryColumns} FROM audit_logs WHERE audit_log_id = ?`,
    [result.insertId],
  );
  return rows[0] || null;
}

async function listAuditLogs(pool, {
  actorAdminUserId = null,
  entityType = null,
  entityId = null,
  limit = 50,
  offset = 0,
} = {}) {
  const [rows] = await pool.execute(
    `SELECT ${columns} FROM audit_logs
     WHERE (? IS NULL OR actor_admin_user_id = ?)
       AND (? IS NULL OR entity_type = ?)
       AND (? IS NULL OR entity_id = ?)
     ORDER BY audit_log_id DESC LIMIT ? OFFSET ?`,
    [
      actorAdminUserId, actorAdminUserId,
      entityType, entityType,
      entityId, entityId,
      limit, offset,
    ],
  );
  return rows;
}

module.exports = { createAuditLog, listAuditLogs };

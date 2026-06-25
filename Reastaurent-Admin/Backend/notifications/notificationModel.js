const db = require("../config/db");

const normalizeNotification = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    payload: row.payload || {},
  };
};

const createNotification = async ({
  notificationType,
  entity,
  action,
  entityId = null,
  title,
  message,
  redirectPath = "",
  source = "",
  payload = {},
}) => {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    // Lock key: a hash of entity type, action, and entity ID to prevent concurrent duplicate inserts
    const lockKeyString = `notification_lock_${entity}_${action}_${entityId || 0}`;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockKeyString]);

    const duplicateCheckQuery = `
      SELECT
        id,
        notification_type,
        entity,
        action,
        entity_id,
        title,
        message,
        redirect_path,
        source,
        payload,
        is_read,
        read_at,
        created_at,
        updated_at
      FROM notifications
      WHERE notification_type = $1
        AND entity = $2
        AND action = $3
        AND COALESCE(entity_id, 0) = COALESCE($4, 0)
        AND title = $5
        AND message = $6
        AND redirect_path = $7
        AND source = $8
        AND payload = $9::jsonb
        AND is_deleted = 0
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '2 minutes'
      ORDER BY id DESC
      LIMIT 1;
    `;

    const duplicateResult = await client.query(duplicateCheckQuery, [
      notificationType,
      entity,
      action,
      entityId,
      title,
      message,
      redirectPath,
      source,
      JSON.stringify(payload || {}),
    ]);

    if (duplicateResult.rows[0]) {
      await client.query("COMMIT");
      return {
        ...normalizeNotification(duplicateResult.rows[0]),
        wasExisting: true,
      };
    }

    const query = `
      INSERT INTO notifications (
        notification_type,
        entity,
        action,
        entity_id,
        title,
        message,
        redirect_path,
        source,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      RETURNING
        id,
        notification_type,
        entity,
        action,
        entity_id,
        title,
        message,
        redirect_path,
        source,
        payload,
        is_read,
        read_at,
        created_at,
        updated_at;
    `;

    const result = await client.query(query, [
      notificationType,
      entity,
      action,
      entityId,
      title,
      message,
      redirectPath,
      source,
      JSON.stringify(payload || {}),
    ]);

    await client.query("COMMIT");

    return {
      ...normalizeNotification(result.rows[0] || null),
      wasExisting: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getNotificationList = async ({
  page,
  limit,
  isRead = null,
  entity = "",
  notificationType = "",
  search = "",
}) => {
  const filters = ["is_deleted = 0"];
  const values = [];

  if (isRead !== null) {
    values.push(Number(isRead) === 1 ? 1 : 0);
    filters.push(`is_read = $${values.length}`);
  }

  if (entity) {
    values.push(entity);
    filters.push(`entity = $${values.length}`);
  }

  if (notificationType) {
    values.push(notificationType);
    filters.push(`notification_type = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(
      title ILIKE $${values.length}
      OR message ILIKE $${values.length}
    )`);
  }

  values.push(limit);
  const limitPosition = values.length;
  values.push((page - 1) * limit);
  const offsetPosition = values.length;

  const query = `
    SELECT
      id,
      notification_type,
      entity,
      action,
      entity_id,
      title,
      message,
      redirect_path,
      source,
      payload,
      is_read,
      read_at,
      created_at,
      updated_at,
      COUNT(*) OVER()::INT AS total_records
    FROM notifications
    WHERE ${filters.join(" AND ")}
    ORDER BY id DESC
    LIMIT $${limitPosition} OFFSET $${offsetPosition};
  `;

  const result = await db.query(query, values);
  return result.rows.map((row) => ({
    ...normalizeNotification(row),
    total_records: row.total_records,
  }));
};

const getNotificationById = async (id) => {
  const query = `
    SELECT
      id,
      notification_type,
      entity,
      action,
      entity_id,
      title,
      message,
      redirect_path,
      source,
      payload,
      is_read,
      read_at,
      created_at,
      updated_at
    FROM notifications
    WHERE id = $1
      AND is_deleted = 0
    LIMIT 1;
  `;

  const result = await db.query(query, [id]);
  return normalizeNotification(result.rows[0] || null);
};

const markNotificationAsRead = async (id) => {
  const query = `
    UPDATE notifications
    SET
      is_read = 1,
      read_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND is_deleted = 0
    RETURNING
      id,
      notification_type,
      entity,
      action,
      entity_id,
      title,
      message,
      redirect_path,
      source,
      payload,
      is_read,
      read_at,
      created_at,
      updated_at;
  `;

  const result = await db.query(query, [id]);
  return normalizeNotification(result.rows[0] || null);
};

const markAllNotificationsAsRead = async () => {
  const query = `
    UPDATE notifications
    SET
      is_read = 1,
      read_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE is_deleted = 0
      AND is_read = 0;
  `;

  await db.query(query);
};

const deleteNotification = async (id) => {
  const query = `
    UPDATE notifications
    SET
      is_deleted = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND is_deleted = 0
    RETURNING id;
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
};

const getUnreadSummary = async (limit = 10) => {
  const countQuery = `
    SELECT COUNT(*)::INT AS unread_count
    FROM notifications
    WHERE is_deleted = 0
      AND is_read = 0;
  `;

  const listQuery = `
    SELECT
      id,
      notification_type,
      entity,
      action,
      entity_id,
      title,
      message,
      redirect_path,
      source,
      payload,
      is_read,
      read_at,
      created_at,
      updated_at
    FROM notifications
    WHERE is_deleted = 0
      AND is_read = 0
    ORDER BY id DESC
    LIMIT $1;
  `;

  const [countResult, listResult] = await Promise.all([
    db.query(countQuery),
    db.query(listQuery, [limit]),
  ]);

  return {
    unreadCount: Number(countResult.rows[0]?.unread_count || 0),
    notifications: listResult.rows.map(normalizeNotification),
  };
};

module.exports = {
  normalizeNotification,
  createNotification,
  getNotificationList,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadSummary,
};

const db = require("../config/db");

const sanitizeCustomer = (row) => {
  if (!row) {
    return null;
  }

  const {
    password_hash,
    current_session_id,
    refresh_token_hash,
    ...customer
  } = row;

  return customer;
};

const customerAuthModel = {
  sanitizeCustomer,

  getCustomerByEmail: async (email) => {
    const query = `
      SELECT *
      FROM customers
      WHERE email = LOWER($1)
        AND is_deleted = 0
      LIMIT 1;
    `;

    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  },

  getCustomerForSessionValidation: async (id) => {
    const query = `
      SELECT *
      FROM customers
      WHERE id = $1
        AND is_deleted = 0
      LIMIT 1;
    `;

    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },

  createCustomer: async ({ name, email, phone, passwordHash }) => {
    const query = `
      WITH duplicate_email AS (
        SELECT 1
        FROM customers
        WHERE LOWER(email) = LOWER($2)
          AND is_deleted = 0
        LIMIT 1
      ),
      duplicate_phone AS (
        SELECT 1
        FROM customers
        WHERE phone = $3
          AND is_deleted = 0
          AND COALESCE(phone, '') <> ''
        LIMIT 1
      )
      INSERT INTO customers (name, email, phone, password_hash, is_active)
      SELECT $1, LOWER($2), $3, $4, 1
      WHERE NOT EXISTS (SELECT 1 FROM duplicate_email)
        AND NOT EXISTS (SELECT 1 FROM duplicate_phone)
      RETURNING *;
    `;

    const result = await db.query(query, [name, email, phone, passwordHash]);
    return result.rows[0] || null;
  },

  updateLoginSession: async (id, sessionId, refreshTokenHash, refreshTokenExpiresAt) => {
    const query = `
      UPDATE customers
      SET
        current_session_id = $2,
        session_expires_at = $4,
        refresh_token_hash = $3,
        refresh_token_expires_at = $4,
        last_login_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND is_deleted = 0
      RETURNING *;
    `;

    const result = await db.query(query, [id, sessionId, refreshTokenHash, refreshTokenExpiresAt]);
    return result.rows[0] || null;
  },

  clearSession: async (id, sessionId = null) => {
    const values = [id];
    let query = `
      UPDATE customers
      SET
        current_session_id = NULL,
        session_expires_at = NULL,
        refresh_token_hash = NULL,
        refresh_token_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND is_deleted = 0
    `;

    if (sessionId) {
      values.push(sessionId);
      query += " AND current_session_id = $2";
    }

    query += " RETURNING *;";

    const result = await db.query(query, values);
    return result.rows[0] || null;
  },

  updatePassword: async (id, passwordHash) => {
    const query = `
      UPDATE customers
      SET
        password_hash = $2,
        current_session_id = NULL,
        session_expires_at = NULL,
        refresh_token_hash = NULL,
        refresh_token_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND is_deleted = 0
      RETURNING *;
    `;

    const result = await db.query(query, [id, passwordHash]);
    return result.rows[0] || null;
  },
};

module.exports = customerAuthModel;

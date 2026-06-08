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

const customerProfileModel = {
  sanitizeCustomer,

  getCustomerById: async (id) => {
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

  updateProfile: async ({ id, name, email, phone }) => {
    const query = `
      WITH target AS (
        SELECT id
        FROM customers
        WHERE id = $1::INT
          AND is_deleted = 0
      ),
      duplicate_email AS (
        SELECT 1
        FROM customers
        WHERE LOWER(email) = LOWER($3::TEXT)
          AND is_deleted = 0
          AND id != $1::INT
        LIMIT 1
      ),
      duplicate_phone AS (
        SELECT 1
        FROM customers
        WHERE phone = $4::TEXT
          AND is_deleted = 0
          AND id != $1::INT
          AND COALESCE(phone, '') <> ''
        LIMIT 1
      ),
      updated AS (
        UPDATE customers
        SET
          name = $2::VARCHAR(255),
          email = LOWER($3::VARCHAR(255)),
          phone = $4::VARCHAR(20),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1::INT
          AND is_deleted = 0
          AND NOT EXISTS (SELECT 1 FROM duplicate_email)
          AND NOT EXISTS (SELECT 1 FROM duplicate_phone)
        RETURNING *
      )
      SELECT
        EXISTS (SELECT 1 FROM target) AS target_exists,
        EXISTS (SELECT 1 FROM duplicate_email) AS duplicate_email_exists,
        EXISTS (SELECT 1 FROM duplicate_phone) AS duplicate_phone_exists,
        updated.*
      FROM (SELECT 1) AS base
      LEFT JOIN updated ON TRUE;
    `;

    const result = await db.query(query, [id, name, email, phone]);
    return result.rows[0] || null;
  },
};

module.exports = customerProfileModel;

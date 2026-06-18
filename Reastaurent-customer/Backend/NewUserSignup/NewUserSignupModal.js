const db = require("../config/db");

const NewUserSignupModal = {
  checkEmailExists: async (email) => {
    const query = `
      SELECT 1
      FROM customers
      WHERE email = LOWER($1)
        AND is_deleted = 0
      LIMIT 1;
    `;
    const result = await db.query(query, [email]);
    return result.rows.length > 0;
  },

  getPromoSettings: async () => {
    const query = `
      SELECT is_enabled, promo_title, promo_message, coupon_code
      FROM signup_promo_settings
      WHERE id = 1
      LIMIT 1;
    `;
    const result = await db.query(query);
    return result.rows[0] || null;
  },

  hasOrders: async (email) => {
    const query = `
      SELECT 1
      FROM orders
      WHERE customer_email = LOWER($1)
      LIMIT 1;
    `;
    const result = await db.query(query, [email]);
    return result.rows.length > 0;
  }
};

module.exports = NewUserSignupModal;

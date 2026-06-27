const db = require("../config/db");

// Self-healing DB check for scheduled order columns
(async () => {
  try {
    await db.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'ASAP';
    `);
    await db.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS scheduled_datetime TIMESTAMPTZ NULL;
    `);
    await db.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS scheduled_slot VARCHAR(50) NULL;
    `);
  } catch (e) {
    console.error("⚠️ Schema update for scheduled orders columns failed in orderModel.js:", e.message);
  }
})();

const ORDER_STATUS_VALUES = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUS_VALUES = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

const normalizeOrder = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    delivery_address: row.delivery_address || {},
    items: row.items || [],
    payment_transaction: row.payment_transaction || null,
  };
};

const generateOrderNumber = () => {
  const stamp = Date.now().toString().slice(-8);
  const randomPart = Math.floor(Math.random() * 9000 + 1000);
  return `ORD-${stamp}-${randomPart}`;
};

const getCustomerById = async (customerId) => {
  const query = `
    SELECT
      id,
      name,
      email,
      phone,
      is_active,
      is_deleted
    FROM customers
    WHERE id = $1
      AND is_deleted = 0
    LIMIT 1;
  `;

  const result = await db.query(query, [customerId]);
  return result.rows[0] || null;
};

const getOrderList = async ({
  page,
  limit,
  status,
  customerId,
  search,
}) => {
  const filters = ["o.is_deleted = 0", "COALESCE(o.order_type, 'ASAP') != 'SCHEDULED'"];
  const values = [];

  if (status) {
    values.push(status);
    filters.push(`o.order_status = $${values.length}`);
  }

  if (customerId) {
    values.push(customerId);
    filters.push(`o.customer_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(
      o.order_number ILIKE $${values.length}
      OR o.customer_name ILIKE $${values.length}
      OR o.customer_email ILIKE $${values.length}
      OR o.customer_phone ILIKE $${values.length}
      OR EXISTS (
        SELECT 1
        FROM order_items oi_search
        WHERE oi_search.order_id = o.id
          AND oi_search.item_name ILIKE $${values.length}
      )
    )`);
  }

  values.push(limit);
  const limitPosition = values.length;
  values.push((page - 1) * limit);
  const offsetPosition = values.length;

  const query = `
    WITH filtered_orders AS (
      SELECT
        o.id,
        o.order_number,
        o.customer_id,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.currency_code,
        o.item_count,
        o.subtotal_amount,
        o.discount_amount,
        o.addon_amount,
        o.tax_amount,
        o.delivery_fee,
        o.total_amount,
        o.order_notes,
        o.order_type,
        o.scheduled_datetime,
        o.scheduled_slot,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE ${filters.join(" AND ")}
      ORDER BY o.id DESC
      LIMIT $${limitPosition} OFFSET $${offsetPosition}
    )
    SELECT
      fo.id,
      fo.order_number,
      fo.customer_id,
      fo.customer_name,
      fo.customer_email,
      fo.customer_phone,
      fo.order_status,
      fo.payment_status,
      fo.payment_method,
      fo.currency_code,
      fo.item_count,
      fo.subtotal_amount,
      fo.discount_amount,
      fo.addon_amount,
      fo.tax_amount,
      fo.delivery_fee,
      fo.total_amount,
      fo.order_notes,
      fo.order_type,
      fo.scheduled_datetime,
      fo.scheduled_slot,
      fo.created_at,
      fo.updated_at,
      (
        SELECT row_to_json(payment_detail)
        FROM (
          SELECT
            p.id,
            p.gateway,
            p.rrn,
            p.transaction_id,
            p.provider_payment_id,
            p.provider_charge_id,
            p.provider_balance_transaction_id,
            p.amount,
            p.amount_in_paise,
            p.currency_code,
            p.payment_method,
            p.status,
            p.is_payment_success,
            p.failure_code,
            p.failure_message,
            p.paid_at,
            p.created_at,
            p.updated_at
          FROM payments p
          WHERE p.order_id = fo.id
          ORDER BY
            p.is_payment_success DESC,
            p.paid_at DESC NULLS LAST,
            p.id DESC
          LIMIT 1
        ) payment_detail
      ) AS payment_transaction,
      COALESCE(
        string_agg(
          CONCAT(oi.item_name, ' x', oi.quantity::text),
          ', '
          ORDER BY oi.id
        ) FILTER (WHERE oi.id IS NOT NULL),
        ''
      ) AS ordered_items,
      (
        SELECT COUNT(*)::INT
        FROM orders o
        WHERE ${filters.join(" AND ")}
      ) AS total_records
    FROM filtered_orders fo
    LEFT JOIN order_items oi ON oi.order_id = fo.id
    GROUP BY
      fo.id,
      fo.order_number,
      fo.customer_id,
      fo.customer_name,
      fo.customer_email,
      fo.customer_phone,
      fo.order_status,
      fo.payment_status,
      fo.payment_method,
      fo.currency_code,
      fo.item_count,
      fo.subtotal_amount,
      fo.discount_amount,
      fo.addon_amount,
      fo.tax_amount,
      fo.delivery_fee,
      fo.total_amount,
      fo.order_notes,
      fo.order_type,
      fo.scheduled_datetime,
      fo.scheduled_slot,
      fo.created_at,
      fo.updated_at
    ORDER BY fo.id DESC;
  `;

  const result = await db.query(query, values);
  return result.rows;
};

const getOrderById = async (id) => {
  const query = `
    SELECT
      o.id,
      o.order_number,
      o.customer_id,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.order_status,
      o.payment_status,
      o.payment_method,
      o.currency_code,
      o.item_count,
      o.subtotal_amount,
      o.discount_amount,
      o.addon_amount,
      o.tax_amount,
      o.delivery_fee,
      o.total_amount,
      o.order_notes,
      o.delivery_address,
      o.order_type,
      o.scheduled_datetime,
      o.scheduled_slot,
      o.created_at,
      o.updated_at,
      (
        SELECT row_to_json(payment_detail)
        FROM (
          SELECT
            p.id,
            p.gateway,
            p.rrn,
            p.transaction_id,
            p.provider_payment_id,
            p.provider_charge_id,
            p.provider_balance_transaction_id,
            p.amount,
            p.amount_in_paise,
            p.currency_code,
            p.payment_method,
            p.status,
            p.is_payment_success,
            p.failure_code,
            p.failure_message,
            p.paid_at,
            p.created_at,
            p.updated_at
          FROM payments p
          WHERE p.order_id = o.id
          ORDER BY
            p.is_payment_success DESC,
            p.paid_at DESC NULLS LAST,
            p.id DESC
          LIMIT 1
        ) payment_detail
      ) AS payment_transaction,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'item_id', oi.item_id,
            'category_id', oi.category_id,
            'item_name', oi.item_name,
            'item_description', oi.item_description,
            'item_image', oi.item_image,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'discount_price', oi.discount_price,
            'final_unit_price', oi.final_unit_price,
            'addon_amount', oi.addon_amount,
            'line_total', oi.line_total,
            'selected_addons', oi.selected_addons,
            'item_notes', oi.item_notes
          )
          ORDER BY oi.id
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = $1
      AND o.is_deleted = 0
    GROUP BY o.id
    LIMIT 1;
  `;

  const result = await db.query(query, [id]);
  return normalizeOrder(result.rows[0] || null);
};

const createOrder = async ({
  customer,
  orderStatus,
  paymentStatus,
  paymentMethod,
  currencyCode,
  orderNotes,
  deliveryAddress,
  items,
  subtotalAmount,
  discountAmount,
  addonAmount,
  taxAmount,
  deliveryFee,
  totalAmount,
}) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const orderNumber = generateOrderNumber();
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const orderInsertQuery = `
      INSERT INTO orders (
        order_number,
        customer_id,
        customer_name,
        customer_email,
        customer_phone,
        order_status,
        payment_status,
        payment_method,
        currency_code,
        item_count,
        subtotal_amount,
        discount_amount,
        addon_amount,
        tax_amount,
        delivery_fee,
        total_amount,
        order_notes,
        delivery_address
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb
      )
      RETURNING id;
    `;

    const orderInsertValues = [
      orderNumber,
      customer.id,
      customer.name,
      customer.email,
      customer.phone,
      orderStatus,
      paymentStatus,
      paymentMethod,
      currencyCode,
      itemCount,
      subtotalAmount,
      discountAmount,
      addonAmount,
      taxAmount,
      deliveryFee,
      totalAmount,
      orderNotes,
      JSON.stringify(deliveryAddress || {}),
    ];

    const orderResult = await client.query(orderInsertQuery, orderInsertValues);
    const orderId = orderResult.rows[0].id;

    const itemInsertQuery = `
      INSERT INTO order_items (
        order_id,
        item_id,
        category_id,
        item_name,
        item_description,
        item_image,
        quantity,
        unit_price,
        discount_price,
        final_unit_price,
        addon_amount,
        line_total,
        selected_addons,
        item_notes
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13::jsonb, $14
      );
    `;

    for (const item of items) {
      await client.query(itemInsertQuery, [
        orderId,
        item.item_id,
        item.category_id,
        item.item_name,
        item.item_description,
        item.item_image,
        item.quantity,
        item.unit_price,
        item.discount_price,
        item.final_unit_price,
        item.addon_amount,
        item.line_total,
        JSON.stringify(item.selected_addons || []),
        item.item_notes,
      ]);
    }

    await client.query("COMMIT");
    return await getOrderById(orderId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateOrderStatus = async ({
  id,
  orderStatus,
  paymentStatus,
}) => {
  const updates = [];
  const values = [id];

  if (orderStatus) {
    values.push(orderStatus);
    updates.push(`order_status = $${values.length}`);
  }

  if (paymentStatus) {
    values.push(paymentStatus);
    updates.push(`payment_status = $${values.length}`);
  }

  if (updates.length === 0) {
    return getOrderById(id);
  }

  values.push(new Date());
  updates.push(`updated_at = $${values.length}`);

  const query = `
    UPDATE orders
    SET ${updates.join(", ")}
    WHERE id = $1
      AND is_deleted = 0
    RETURNING id;
  `;

  const result = await db.query(query, values);

  if (!result.rows[0]) {
    return null;
  }

  return getOrderById(id);
};

const deleteOrder = async (id) => {
  const query = `
    UPDATE orders
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

module.exports = {
  ORDER_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  normalizeOrder,
  getCustomerById,
  getOrderList,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
};

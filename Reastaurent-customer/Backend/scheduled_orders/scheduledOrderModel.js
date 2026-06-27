const db = require("../config/db");

const normalizeOrder = (row) => {
  if (!row) return null;
  return {
    ...row,
    delivery_address: row.delivery_address || {},
    items: row.items || [],
    payments: row.payments || [],
  };
};

const getActiveCustomerById = async (customerId) => {
  const query = `
    SELECT id, name, email, phone, is_active, is_deleted
    FROM customers
    WHERE id = $1 AND is_deleted = 0
    LIMIT 1;
  `;
  const result = await db.query(query, [customerId]);
  return result.rows[0] || null;
};

const getActiveItemsByIds = async (itemIds) => {
  const query = `
    SELECT id, category_id, item_name, item_description, item_image, price, discount_price, is_active, is_deleted
    FROM items
    WHERE id = ANY($1::INT[]) AND is_deleted = 0 AND is_active = 1;
  `;
  const result = await db.query(query, [itemIds]);
  return result.rows.reduce((accumulator, item) => {
    accumulator[item.id] = item;
    return accumulator;
  }, {});
};

const getActiveAddonsByIds = async (addonIds) => {
  if (!addonIds.length) return {};
  const query = `
    SELECT aim.id, aim.addon_item_name, aim.price, aim.is_active, aim.is_deleted, ag.group_name
    FROM addon_item_master aim
    INNER JOIN addon_group_master ag ON ag.id = aim.group_id
    WHERE aim.id = ANY($1::INT[]) AND aim.is_deleted = 0 AND aim.is_active = 1 AND ag.is_deleted = 0 AND ag.is_active = 1;
  `;
  const result = await db.query(query, [addonIds]);
  return result.rows.reduce((accumulator, addon) => {
    accumulator[addon.id] = addon;
    return accumulator;
  }, {});
};

const getActiveAddonGroupsByItemIds = async (itemIds) => {
  if (!itemIds.length) return {};
  const query = `
    SELECT DISTINCT aefi.item_id, aeio.addon_item_id, ag.group_name AS addon_group
    FROM addons_eligible_for_items aefi
    INNER JOIN addon_group_master ag ON ag.id = aefi.group_id
    INNER JOIN addons_eligible_item_options aeio ON aeio.eligibility_id = aefi.id
    INNER JOIN addon_item_master aim ON aim.id = aeio.addon_item_id AND aim.group_id = ag.id
    WHERE aefi.item_id = ANY($1::INT[]) AND aefi.is_deleted = 0 AND aefi.is_active = 1 AND ag.is_deleted = 0 AND ag.is_active = 1 AND aim.is_deleted = 0 AND aim.is_active = 1;
  `;
  const result = await db.query(query, [itemIds]);
  return result.rows.reduce((accumulator, row) => {
    const itemId = Number(row.item_id);
    accumulator[itemId] = accumulator[itemId] || [];
    accumulator[itemId].push(row);
    return accumulator;
  }, {});
};

const getOrderByIdForCustomer = async ({ orderId, customerId }) => {
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
      ) AS items,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', p.id,
              'gateway', p.gateway,
              'transaction_id', p.transaction_id,
              'provider_payment_id', p.provider_payment_id,
              'provider_charge_id', p.provider_charge_id,
              'provider_balance_transaction_id', p.provider_balance_transaction_id,
              'amount', p.amount,
              'amount_in_paise', p.amount_in_paise,
              'currency_code', p.currency_code,
              'payment_method', p.payment_method,
              'status', p.status,
              'is_payment_success', p.is_payment_success,
              'failure_code', p.failure_code,
              'failure_message', p.failure_message,
              'metadata', p.metadata,
              'raw_event', p.raw_event,
              'paid_at', p.paid_at,
              'created_at', p.created_at,
              'updated_at', p.updated_at
            )
            ORDER BY p.id DESC
          )
          FROM payments p
          WHERE (p.order_id = o.id OR p.metadata->>'orderId' = o.id::TEXT)
            AND (p.customer_id = o.customer_id OR p.customer_id IS NULL OR p.metadata->>'customerId' = o.customer_id::TEXT)
        ),
        '[]'::json
      ) AS payments
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = $1 AND o.customer_id = $2 AND o.is_deleted = 0
    GROUP BY o.id
    LIMIT 1;
  `;
  const result = await db.query(query, [orderId, customerId]);
  return normalizeOrder(result.rows[0] || null);
};

const generateOrderNumber = () => {
  const stamp = Date.now().toString().slice(-8);
  const randomPart = Math.floor(Math.random() * 9000 + 1000);
  return `ORD-SCH-${stamp}-${randomPart}`;
};

const createScheduledOrderForCustomer = async ({
  customer,
  deliveryAddress,
  orderNotes,
  paymentMethod,
  currencyCode,
  items,
  subtotalAmount,
  discountAmount,
  addonAmount,
  taxAmount,
  deliveryFee,
  totalAmount,
  scheduledDatetime,
  scheduledSlot,
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
        delivery_address,
        order_type,
        scheduled_datetime,
        scheduled_slot
      )
      VALUES (
        $1, $2, $3, $4, $5, 'placed', 'pending', $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16::jsonb, 'SCHEDULED', $17, $18
      )
      RETURNING id;
    `;

    const orderResult = await client.query(orderInsertQuery, [
      orderNumber,
      customer.id,
      customer.name,
      customer.email,
      customer.phone,
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
      scheduledDatetime ? new Date(scheduledDatetime) : null,
      scheduledSlot || null,
    ]);

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
    return await getOrderByIdForCustomer({ orderId, customerId: customer.id });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getActiveCustomerById,
  getActiveItemsByIds,
  getActiveAddonsByIds,
  getActiveAddonGroupsByItemIds,
  createScheduledOrderForCustomer,
  getOrderByIdForCustomer,
};

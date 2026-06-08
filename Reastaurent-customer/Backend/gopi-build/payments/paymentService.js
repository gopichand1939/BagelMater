const Stripe = require("stripe");
const db = require("../config/db");
const orderModel = require("../orders/orderModel");
const { publishOrderChangeSafely } = require("../realtime/orderEvents");
const { publishPaymentChangeSafely } = require("../realtime/paymentEvents");

const STRIPE_CURRENCY = "inr";
const PAYMENT_GATEWAY = "stripe";
const STRIPE_MIN_INR_AMOUNT = Number(process.env.STRIPE_MIN_INR_AMOUNT || 50);

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return Stripe(process.env.STRIPE_SECRET_KEY);
};

const normalizeAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Number(amount.toFixed(2));
};

const toPaise = (amount) => Math.round(amount * 100);

const generateRrn = () => {
  const stamp = Date.now().toString().slice(-10);
  const randomPart = Math.floor(Math.random() * 900000 + 100000);
  return `PAY-${stamp}-${randomPart}`;
};

const getCustomerOrder = async ({ orderId, customerId }) => {
  const query = `
    SELECT
      id,
      order_number,
      customer_id,
      customer_email,
      payment_status,
      payment_method,
      total_amount,
      currency_code,
      is_deleted
    FROM orders
    WHERE id = $1
      AND customer_id = $2
      AND is_deleted = 0
    LIMIT 1;
  `;

  const result = await db.query(query, [orderId, customerId]);
  return result.rows[0] || null;
};

const createPaymentRecord = async ({
  orderId,
  customerId,
  paymentIntent,
  amount,
  amountInPaise,
  metadata,
}) => {
  const query = `
    INSERT INTO payments (
      order_id,
      customer_id,
      gateway,
      rrn,
      transaction_id,
      amount,
      amount_in_paise,
      currency_code,
      status,
      is_payment_success,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10::jsonb)
    ON CONFLICT (transaction_id)
    DO UPDATE SET
      order_id = EXCLUDED.order_id,
      customer_id = EXCLUDED.customer_id,
      rrn = payments.rrn,
      amount = EXCLUDED.amount,
      amount_in_paise = EXCLUDED.amount_in_paise,
      currency_code = EXCLUDED.currency_code,
      status = EXCLUDED.status,
      metadata = EXCLUDED.metadata,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  const result = await db.query(query, [
    orderId,
    customerId,
    PAYMENT_GATEWAY,
    generateRrn(),
    paymentIntent.id,
    amount,
    amountInPaise,
    String(paymentIntent.currency || STRIPE_CURRENCY).toUpperCase(),
    paymentIntent.status,
    JSON.stringify(metadata || {}),
  ]);

  const payment = result.rows[0] || null;

  if (payment) {
    await publishPaymentChangeSafely({
      entity: "payment",
      action: "created",
      entityId: payment.id,
      paymentId: payment.id,
      orderId: payment.order_id,
      customerId: payment.customer_id,
      entityData: payment,
    });
  }

  return payment;
};

const createPaymentIntent = async ({ amount, orderId = null, customer }) => {
  if (!customer?.id) {
    const error = new Error("Customer authentication is required");
    error.statusCode = 401;
    throw error;
  }

  let order = null;
  let payableAmount = normalizeAmount(amount);

  if (orderId) {
    order = await getCustomerOrder({
      orderId: Number(orderId),
      customerId: customer.id,
    });

    if (!order) {
      const error = new Error("Order not found for this customer");
      error.statusCode = 404;
      throw error;
    }

    if (String(order.payment_status || "").toLowerCase() === "paid") {
      const error = new Error("This order is already paid");
      error.statusCode = 400;
      throw error;
    }

    payableAmount = normalizeAmount(order.total_amount);
  }

  if (!payableAmount) {
    const error = new Error("A valid amount is required");
    error.statusCode = 400;
    throw error;
  }

  if (payableAmount < STRIPE_MIN_INR_AMOUNT) {
    const error = new Error(
      `Online payment minimum is Rs ${STRIPE_MIN_INR_AMOUNT.toFixed(
        2
      )}. Please add more items or choose cash on delivery.`
    );
    error.statusCode = 400;
    throw error;
  }

  const amountInPaise = toPaise(payableAmount);
  const metadata = {
    orderId: order?.id ? String(order.id) : "",
    orderNumber: order?.order_number || "",
    customerId: String(customer.id),
    customerEmail: customer.email || order?.customer_email || "",
  };

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: amountInPaise,
    currency: STRIPE_CURRENCY,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
    metadata,
  });

  const payment = await createPaymentRecord({
    orderId: order?.id || null,
    customerId: customer.id,
    paymentIntent,
    amount: payableAmount,
    amountInPaise,
    metadata,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    payment,
  };
};

const ensurePendingCheckoutTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS pending_payment_checkouts (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      checkout_payload JSONB NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'created',
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pending_payment_checkouts_customer_id
    ON pending_payment_checkouts(customer_id);
  `);
};

const normalizePositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const buildOrderDraftForCheckout = async ({
  customerId,
  items,
  deliveryAddress = {},
  orderNotes = "",
  currencyCode = "INR",
  taxAmount = 0,
  deliveryFee = 0,
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("At least one order item is required");
    error.statusCode = 400;
    throw error;
  }

  const customer = await orderModel.getActiveCustomerById(customerId);
  if (!customer || Number(customer.is_active) !== 1) {
    const error = new Error("Customer account is not active");
    error.statusCode = 401;
    throw error;
  }

  const normalizedItemIds = items
    .map((item) => Number(item.item_id))
    .filter((itemId) => Number.isInteger(itemId) && itemId > 0);

  if (normalizedItemIds.length !== items.length) {
    const error = new Error("Each item must include a valid item_id");
    error.statusCode = 400;
    throw error;
  }

  const activeItemsMap = await orderModel.getActiveItemsByIds(normalizedItemIds);
  const requestedAddonIds = [
    ...new Set(
      items.flatMap((item) =>
        (Array.isArray(item.addons) ? item.addons : item.selected_addons || [])
          .map((addon) => Number(addon.addonOptionId ?? addon.id))
          .filter((addonId) => Number.isInteger(addonId) && addonId > 0)
      )
    ),
  ];
  const activeAddonsMap = await orderModel.getActiveAddonsByIds(requestedAddonIds);
  const addonGroupsByItemId =
    await orderModel.getActiveAddonGroupsByItemIds(normalizedItemIds);
  const normalizedItems = [];

  for (const rawItem of items) {
    const sourceItem = activeItemsMap[Number(rawItem.item_id)];

    if (!sourceItem) {
      const error = new Error(`Item ${rawItem.item_id} is not available`);
      error.statusCode = 400;
      throw error;
    }

    const quantity = normalizePositiveNumber(rawItem.quantity, 0);
    if (quantity < 1) {
      const error = new Error("Each item quantity must be at least 1");
      error.statusCode = 400;
      throw error;
    }

    const unitPrice = Number(sourceItem.price || 0);
    const discountPrice =
      sourceItem.discount_price === null ||
      sourceItem.discount_price === undefined ||
      sourceItem.discount_price === ""
        ? null
        : Number(sourceItem.discount_price);
    const finalUnitPrice =
      discountPrice !== null && discountPrice < unitPrice
        ? discountPrice
        : unitPrice;
    const rawAddons = Array.isArray(rawItem.addons)
      ? rawItem.addons
      : Array.isArray(rawItem.selected_addons)
        ? rawItem.selected_addons
        : [];
    const addonIds = rawAddons.map((addon) => Number(addon.addonOptionId ?? addon.id));

    if (addonIds.some((addonId) => !Number.isInteger(addonId) || addonId < 1)) {
      const error = new Error("Each add-on must include a valid addonOptionId");
      error.statusCode = 400;
      throw error;
    }

    const selectedAddons = addonIds.map((addonId) => activeAddonsMap[addonId]);

    if (selectedAddons.some((addon) => !addon || addon.item_id !== null)) {
      const error = new Error("One or more add-ons are not available in Addon Master");
      error.statusCode = 400;
      throw error;
    }

    const addonCountsByGroup = selectedAddons.reduce((acc, addon) => {
      const key = addon.addon_group;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    for (const group of addonGroupsByItemId[sourceItem.id] || []) {
      const selectedCount = addonCountsByGroup[group.addon_group] || 0;
      const minSelect = Number(group.min_select || 0);
      const maxSelect = Number(group.max_select || 99);

      if (selectedCount < minSelect || selectedCount > maxSelect) {
        const error = new Error(`${group.addon_group} allows ${minSelect}-${maxSelect} selections`);
        error.statusCode = 400;
        throw error;
      }
    }

    const normalizedSelectedAddons = selectedAddons.map((addon) => ({
      addonOptionId: addon.id,
      id: addon.id,
      addon_group: addon.addon_group,
      addon_name: addon.addon_name,
      addon_price: Number(addon.addon_price || 0),
    }));
    const addonAmount = selectedAddons.reduce(
      (sum, addon) => sum + Number(addon.addon_price || 0),
      0
    );

    normalizedItems.push({
      item_id: sourceItem.id,
      category_id: sourceItem.category_id,
      item_name: sourceItem.item_name,
      item_description: sourceItem.item_description || "",
      item_image: sourceItem.item_image || "",
      quantity,
      unit_price: Number(unitPrice.toFixed(2)),
      discount_price:
        discountPrice === null ? null : Number(discountPrice.toFixed(2)),
      final_unit_price: Number(finalUnitPrice.toFixed(2)),
      addon_amount: Number(addonAmount.toFixed(2)),
      line_total: Number(((finalUnitPrice + addonAmount) * quantity).toFixed(2)),
      selected_addons: normalizedSelectedAddons,
      item_notes: rawItem.item_notes ? String(rawItem.item_notes).trim() : "",
    });
  }

  const subtotalAmount = Number(
    normalizedItems
      .reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
      .toFixed(2)
  );
  const discountAmount = Number(
    normalizedItems
      .reduce((sum, item) => {
        const discountPerUnit =
          item.discount_price !== null
            ? Math.max(item.unit_price - item.discount_price, 0)
            : 0;
        return sum + discountPerUnit * item.quantity;
      }, 0)
      .toFixed(2)
  );
  const addonAmount = Number(
    normalizedItems
      .reduce((sum, item) => sum + item.addon_amount * item.quantity, 0)
      .toFixed(2)
  );
  const normalizedTaxAmount = Number(normalizePositiveNumber(taxAmount, 0).toFixed(2));
  const normalizedDeliveryFee = Number(
    normalizePositiveNumber(deliveryFee, 0).toFixed(2)
  );
  const totalAmount = Number(
    (
      subtotalAmount -
      discountAmount +
      addonAmount +
      normalizedTaxAmount +
      normalizedDeliveryFee
    ).toFixed(2)
  );

  if (totalAmount < STRIPE_MIN_INR_AMOUNT) {
    const error = new Error(
      `Online payment minimum is Rs ${STRIPE_MIN_INR_AMOUNT.toFixed(
        2
      )}. Please add more items or choose cash on delivery.`
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    customer,
    deliveryAddress:
      deliveryAddress && typeof deliveryAddress === "object" ? deliveryAddress : {},
    orderNotes: String(orderNotes || "").trim(),
    paymentMethod: "stripe",
    currencyCode: String(currencyCode || "INR").trim() || "INR",
    items: normalizedItems,
    subtotalAmount,
    discountAmount,
    addonAmount,
    taxAmount: normalizedTaxAmount,
    deliveryFee: normalizedDeliveryFee,
    totalAmount,
  };
};

const publishCreatedOrder = async (order) => {
  if (!order) {
    return;
  }

  await publishOrderChangeSafely({
    entity: "order",
    action: "created",
    entityId: order.id,
    orderId: order.id,
    customerId: order.customer_id,
    entityData: buildOrderRealtimePayload(order),
  });
};

const assertCustomerOrderForPayment = async ({ orderId, customer }) => {
  if (!customer?.id) {
    const error = new Error("Customer authentication is required");
    error.statusCode = 401;
    throw error;
  }

  const order = await getCustomerOrder({
    orderId: Number(orderId),
    customerId: customer.id,
  });

  if (!order) {
    const error = new Error("Order not found for this customer");
    error.statusCode = 404;
    throw error;
  }

  if (String(order.payment_status || "").toLowerCase() === "paid") {
    const error = new Error("This order is already paid");
    error.statusCode = 400;
    throw error;
  }

  const payableAmount = normalizeAmount(order.total_amount);
  if (!payableAmount) {
    const error = new Error("A valid order amount is required");
    error.statusCode = 400;
    throw error;
  }

  if (payableAmount < STRIPE_MIN_INR_AMOUNT) {
    const error = new Error(
      `Online payment minimum is Rs ${STRIPE_MIN_INR_AMOUNT.toFixed(
        2
      )}. Please add more items or choose cash on delivery.`
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    order,
    payableAmount,
  };
};

const createCheckoutSession = async ({
  orderId,
  checkoutPayload,
  successUrl,
  cancelUrl,
  customer,
}) => {
  if (!successUrl || !cancelUrl) {
    const error = new Error("successUrl and cancelUrl are required");
    error.statusCode = 400;
    throw error;
  }

  let order = null;
  let orderDraft = null;
  let payableAmount = null;

  if (checkoutPayload) {
    if (!customer?.id) {
      const error = new Error("Customer authentication is required");
      error.statusCode = 401;
      throw error;
    }

    orderDraft = await buildOrderDraftForCheckout({
      customerId: customer.id,
      items: checkoutPayload.items,
      deliveryAddress: checkoutPayload.delivery_address,
      orderNotes: checkoutPayload.order_notes,
      currencyCode: checkoutPayload.currency_code,
      taxAmount: checkoutPayload.tax_amount,
      deliveryFee: checkoutPayload.delivery_fee,
    });
    payableAmount = orderDraft.totalAmount;
  } else {
    if (!orderId) {
      const error = new Error("orderId or checkoutPayload is required");
      error.statusCode = 400;
      throw error;
    }

    const result = await assertCustomerOrderForPayment({
      orderId,
      customer,
    });
    order = result.order;
    payableAmount = result.payableAmount;
  }

  const amountInPaise = toPaise(payableAmount);
  const metadata = {
    orderId: order?.id ? String(order.id) : "",
    orderNumber: order?.order_number || "",
    customerId: String(customer.id),
    customerEmail: customer.email || order?.customer_email || "",
    createsOrderAfterPayment: orderDraft ? "1" : "0",
  };

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: customer.email || order?.customer_email || undefined,
    client_reference_id: order?.id ? String(order.id) : `customer_${customer.id}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: STRIPE_CURRENCY,
          unit_amount: amountInPaise,
          product_data: {
            name: order
              ? `Order ${order.order_number || order.id}`
              : "Bagel Master Cafe online order",
            description: "Bagel Master Cafe online order",
          },
        },
      },
    ],
    payment_intent_data: {
      metadata,
    },
    metadata,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (orderDraft) {
    await ensurePendingCheckoutTable();
    await db.query(
      `
        INSERT INTO pending_payment_checkouts (
          session_id,
          customer_id,
          checkout_payload,
          status
        )
        VALUES ($1, $2, $3::jsonb, 'created')
        ON CONFLICT (session_id)
        DO UPDATE SET
          checkout_payload = EXCLUDED.checkout_payload,
          status = 'created',
          updated_at = CURRENT_TIMESTAMP;
      `,
      [
        session.id,
        customer.id,
        JSON.stringify({
          orderDraft,
        }),
      ]
    );
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
};

const buildOrderRealtimePayload = (order) =>
  order
    ? {
        id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        order_status: order.order_status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        total_amount: order.total_amount,
        item_count: order.item_count,
        created_at: order.created_at,
        updated_at: order.updated_at,
      }
    : null;

const getOrderById = async (orderId) => {
  const query = `
    SELECT
      id,
      order_number,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      order_status,
      payment_status,
      payment_method,
      total_amount,
      item_count,
      created_at,
      updated_at
    FROM orders
    WHERE id = $1
      AND is_deleted = 0
    LIMIT 1;
  `;

  const result = await db.query(query, [orderId]);
  return result.rows[0] || null;
};

const markOrderPaid = async ({
  orderId,
  paymentMethod = "stripe",
  publishChange = true,
}) => {
  if (!orderId) {
    return null;
  }

  const query = `
    UPDATE orders
    SET
      payment_status = 'paid',
      payment_method = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND is_deleted = 0
      AND payment_status <> 'paid'
    RETURNING
      id,
      order_number,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      order_status,
      payment_status,
      payment_method,
      total_amount,
      item_count,
      created_at,
      updated_at;
  `;

  const result = await db.query(query, [orderId, paymentMethod]);
  const order = result.rows[0] || null;

  if (order && publishChange) {
    await publishOrderChangeSafely({
      entity: "order",
      action: "updated",
      entityId: order.id,
      orderId: order.id,
      customerId: order.customer_id,
      changeCategory: "payment_status",
      entityData: buildOrderRealtimePayload(order),
    });
  }

  return order;
};

const updatePaymentFromSucceededIntent = async ({
  paymentIntent,
  event,
  overrideOrderId = null,
  overrideCustomerId = null,
  suppressOrderPaidEvent = false,
}) => {
  const orderId =
    Number(overrideOrderId || paymentIntent.metadata?.orderId || 0) || null;
  const customerId =
    Number(overrideCustomerId || paymentIntent.metadata?.customerId || 0) || null;
  const chargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id || null;
  const existingPaymentResult = await db.query(
    `
      SELECT
        id,
        status,
        is_payment_success
      FROM payments
      WHERE transaction_id = $1
      LIMIT 1;
    `,
    [paymentIntent.id]
  );
  const existingPayment = existingPaymentResult.rows[0] || null;
  const wasAlreadySucceeded =
    existingPayment &&
    String(existingPayment.status || "").toLowerCase() === "succeeded" &&
    Number(existingPayment.is_payment_success) === 1;

  const query = `
    INSERT INTO payments (
      order_id,
      customer_id,
      gateway,
      rrn,
      transaction_id,
      provider_payment_id,
      provider_charge_id,
      amount,
      amount_in_paise,
      currency_code,
      payment_method,
      status,
      is_payment_success,
      failure_code,
      failure_message,
      metadata,
      raw_event,
      paid_at
    )
    VALUES (
      $2,
      $3,
      $13,
      $14,
      $1,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      1,
      NULL,
      NULL,
      $11::jsonb,
      $12::jsonb,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (transaction_id)
    DO UPDATE SET
      order_id = COALESCE(payments.order_id, EXCLUDED.order_id),
      customer_id = COALESCE(payments.customer_id, EXCLUDED.customer_id),
      provider_payment_id = EXCLUDED.provider_payment_id,
      provider_charge_id = EXCLUDED.provider_charge_id,
      amount = EXCLUDED.amount,
      amount_in_paise = EXCLUDED.amount_in_paise,
      currency_code = EXCLUDED.currency_code,
      payment_method = COALESCE(EXCLUDED.payment_method, payments.payment_method),
      status = EXCLUDED.status,
      is_payment_success = 1,
      failure_code = NULL,
      failure_message = NULL,
      metadata = EXCLUDED.metadata,
      raw_event = EXCLUDED.raw_event,
      paid_at = COALESCE(payments.paid_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  const result = await db.query(query, [
    paymentIntent.id,
    orderId,
    customerId,
    paymentIntent.id,
    chargeId,
    Number((paymentIntent.amount_received / 100).toFixed(2)),
    paymentIntent.amount_received,
    String(paymentIntent.currency || STRIPE_CURRENCY).toUpperCase(),
    paymentIntent.payment_method_types?.[0] || "stripe",
    paymentIntent.status,
    JSON.stringify(paymentIntent.metadata || {}),
    JSON.stringify(event || {}),
    PAYMENT_GATEWAY,
    generateRrn(),
  ]);

  const payment = result.rows[0] || null;

  if (payment?.order_id) {
    await markOrderPaid({
      orderId: payment.order_id,
      paymentMethod: "stripe",
      publishChange: !suppressOrderPaidEvent,
    });
  }

  if (payment && !wasAlreadySucceeded) {
    await publishPaymentChangeSafely({
      entity: "payment",
      action: "succeeded",
      entityId: payment.id,
      paymentId: payment.id,
      orderId: payment.order_id,
      customerId: payment.customer_id,
      entityData: payment,
    });
  }

  return payment;
};

const finalizePaidCheckoutSession = async ({ session, expectedCustomerId = null }) => {
  const metadataCustomerId = Number(session.metadata?.customerId || 0);

  if (expectedCustomerId && metadataCustomerId !== Number(expectedCustomerId)) {
    const error = new Error("Checkout session does not belong to this customer");
    error.statusCode = 403;
    throw error;
  }

  if (session.payment_status !== "paid" || !session.payment_intent) {
    const error = new Error(`Checkout is not paid yet. Current status: ${session.payment_status}`);
    error.statusCode = 400;
    throw error;
  }

  await ensurePendingCheckoutTable();
  let order = null;
  let createdOrderForThisCheckout = null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const pendingResult = await client.query(
      `
        SELECT *
        FROM pending_payment_checkouts
        WHERE session_id = $1
          AND customer_id = $2
        LIMIT 1
        FOR UPDATE;
      `,
      [session.id, metadataCustomerId]
    );
    const pendingCheckout = pendingResult.rows[0] || null;
    const existingPaymentResult = await client.query(
      `
        SELECT order_id
        FROM payments
        WHERE transaction_id = $1
          AND order_id IS NOT NULL
        LIMIT 1
        FOR UPDATE;
      `,
      [paymentIntentId]
    );
    const existingPaymentOrderId =
      Number(existingPaymentResult.rows[0]?.order_id || 0) || null;
    const existingOrderId = existingPaymentOrderId || pendingCheckout?.order_id;

    if (existingOrderId) {
      order = await getOrderById(existingOrderId);

      if (pendingCheckout && Number(pendingCheckout.order_id || 0) !== Number(existingOrderId)) {
        await client.query(
          `
            UPDATE pending_payment_checkouts
            SET
              status = 'paid',
              order_id = $2,
              updated_at = CURRENT_TIMESTAMP
            WHERE session_id = $1;
          `,
          [session.id, existingOrderId]
        );
      }
    } else if (pendingCheckout?.checkout_payload?.orderDraft) {
      createdOrderForThisCheckout = await orderModel.createOrderForCustomer({
        ...pendingCheckout.checkout_payload.orderDraft,
        paymentMethod: "stripe",
      });
      order = createdOrderForThisCheckout;

      await client.query(
        `
          UPDATE pending_payment_checkouts
          SET
            status = 'paid',
            order_id = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE session_id = $1;
        `,
        [session.id, order.id]
      );
    }

    if (order?.id) {
      await client.query(
        `
        UPDATE pending_payment_checkouts
        SET
          status = 'paid',
          updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $1;
      `,
        [session.id]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const fallbackOrderId = Number(session.metadata?.orderId || 0);
  if (!order && fallbackOrderId) {
    order = await getOrderById(fallbackOrderId);
  }

  const payment = await updatePaymentFromSucceededIntent({
    paymentIntent: session.payment_intent,
    event: {
      type: "frontend.checkout_confirmed",
      id: `checkout_${session.id}`,
      checkoutSessionId: session.id,
    },
    overrideOrderId: order?.id || null,
    overrideCustomerId: metadataCustomerId,
    suppressOrderPaidEvent: Boolean(createdOrderForThisCheckout),
  });
  const confirmedOrder = order?.id ? await getOrderById(order.id) : null;

  if (createdOrderForThisCheckout && confirmedOrder) {
    await publishCreatedOrder(confirmedOrder);
  }

  return {
    payment,
    order: confirmedOrder,
  };
};

const confirmCheckoutSession = async ({ sessionId, customer }) => {
  if (!sessionId) {
    const error = new Error("sessionId is required");
    error.statusCode = 400;
    throw error;
  }

  if (!customer?.id) {
    const error = new Error("Customer authentication is required");
    error.statusCode = 401;
    throw error;
  }

  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge"],
  });

  return finalizePaidCheckoutSession({
    session,
    expectedCustomerId: customer.id,
  });
};

const updatePaymentFromFailedIntent = async ({ paymentIntent, event }) => {
  const query = `
    UPDATE payments
    SET
      status = $2,
      is_payment_success = 0,
      failure_code = $3,
      failure_message = $4,
      raw_event = $5::jsonb,
      updated_at = CURRENT_TIMESTAMP
    WHERE transaction_id = $1
    RETURNING *;
  `;

  const result = await db.query(query, [
    paymentIntent.id,
    paymentIntent.status,
    paymentIntent.last_payment_error?.code || null,
    paymentIntent.last_payment_error?.message || null,
    JSON.stringify(event || {}),
  ]);

  const payment = result.rows[0] || null;

  if (payment) {
    await publishPaymentChangeSafely({
      entity: "payment",
      action: "failed",
      entityId: payment.id,
      paymentId: payment.id,
      orderId: payment.order_id,
      customerId: payment.customer_id,
      entityData: payment,
    });
  }

  return payment;
};

const confirmPayment = async ({ paymentIntentId, customer }) => {
  if (!paymentIntentId) {
    const error = new Error("paymentIntentId is required");
    error.statusCode = 400;
    throw error;
  }

  if (!customer?.id) {
    const error = new Error("Customer authentication is required");
    error.statusCode = 401;
    throw error;
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const metadataCustomerId = Number(paymentIntent.metadata?.customerId || 0);

  if (metadataCustomerId !== Number(customer.id)) {
    const error = new Error("Payment does not belong to this customer");
    error.statusCode = 403;
    throw error;
  }

  if (paymentIntent.status !== "succeeded") {
    const error = new Error(`Payment is not successful yet. Current status: ${paymentIntent.status}`);
    error.statusCode = 400;
    throw error;
  }

  const payment = await updatePaymentFromSucceededIntent({
    paymentIntent,
    event: {
      type: "frontend.payment_confirmed",
      id: `frontend_${paymentIntent.id}`,
    },
  });
  const orderId = Number(paymentIntent.metadata?.orderId || 0);
  const order = orderId ? await getOrderById(orderId) : null;

  return {
    payment,
    order,
  };
};

const handleStripeWebhook = async ({ rawBody, signature }) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    const error = new Error("STRIPE_WEBHOOK_SECRET is not configured");
    error.statusCode = 500;
    throw error;
  }

  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }

  if (event.type === "payment_intent.succeeded") {
    await updatePaymentFromSucceededIntent({
      paymentIntent: event.data.object,
      event,
    });
  }

  if (event.type === "payment_intent.payment_failed") {
    await updatePaymentFromFailedIntent({
      paymentIntent: event.data.object,
      event,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = await getStripe().checkout.sessions.retrieve(event.data.object.id, {
      expand: ["payment_intent.latest_charge"],
    });

    await finalizePaidCheckoutSession({
      session,
    });
  }

  return event;
};

module.exports = {
  createPaymentIntent,
  createCheckoutSession,
  confirmPayment,
  confirmCheckoutSession,
  handleStripeWebhook,
  getOrderById,
};

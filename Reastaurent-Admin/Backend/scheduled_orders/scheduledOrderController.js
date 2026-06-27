const scheduledOrderModel = require("./scheduledOrderModel");
const { publishOrderChangeSafely } = require("../realtime/orderEvents");

const normalizePositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const normalizePageNumber = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
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
        currency_code: order.currency_code,
        item_count: order.item_count,
        total_amount: order.total_amount,
        order_type: order.order_type,
        scheduled_datetime: order.scheduled_datetime,
        scheduled_slot: order.scheduled_slot,
        created_at: order.created_at,
        updated_at: order.updated_at,
      }
    : null;

const validateAndNormalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "At least one order item is required" };
  }

  const normalizedItems = [];
  for (const item of items) {
    const quantity = normalizePositiveNumber(item.quantity, 0);
    const unitPrice = normalizePositiveNumber(item.unit_price, 0);
    const discountPrice =
      item.discount_price === null || item.discount_price === undefined || item.discount_price === ""
        ? null
        : normalizePositiveNumber(item.discount_price, 0);
    const addonAmount = normalizePositiveNumber(item.addon_amount, 0);
    const finalUnitPrice =
      discountPrice !== null && discountPrice < unitPrice ? discountPrice : unitPrice;

    if (!item.item_id || !item.item_name || quantity < 1 || unitPrice < 0) {
      return {
        error: "Each item must include item_id, item_name, quantity greater than zero, and unit_price",
      };
    }

    normalizedItems.push({
      item_id: Number(item.item_id),
      category_id: item.category_id ? Number(item.category_id) : null,
      item_name: String(item.item_name).trim(),
      item_description: item.item_description ? String(item.item_description).trim() : "",
      item_image: item.item_image ? String(item.item_image).trim() : "",
      quantity,
      unit_price: Number(unitPrice.toFixed(2)),
      discount_price: discountPrice === null ? null : Number(discountPrice.toFixed(2)),
      final_unit_price: Number(finalUnitPrice.toFixed(2)),
      addon_amount: Number(addonAmount.toFixed(2)),
      line_total: Number(((finalUnitPrice + addonAmount) * quantity).toFixed(2)),
      selected_addons: Array.isArray(item.selected_addons) ? item.selected_addons : [],
      item_notes: item.item_notes ? String(item.item_notes).trim() : "",
    });
  }

  return { items: normalizedItems };
};

const createScheduledOrder = async (req, res) => {
  try {
    const {
      customer_id,
      items,
      payment_method = "cash_on_delivery",
      payment_status = "pending",
      order_status = "placed",
      currency_code = "INR",
      order_notes = "",
      delivery_address = {},
      tax_amount = 0,
      delivery_fee = 0,
      scheduled_datetime,
      scheduled_slot,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id is required",
      });
    }

    if (!scheduled_datetime) {
      return res.status(400).json({
        success: false,
        message: "scheduled_datetime is required for scheduled orders",
      });
    }

    const normalizedItemsResult = validateAndNormalizeItems(items);
    if (normalizedItemsResult.error) {
      return res.status(400).json({
        success: false,
        message: normalizedItemsResult.error,
      });
    }

    const customer = await scheduledOrderModel.getCustomerById(customer_id);
    if (!customer || Number(customer.is_active) !== 1) {
      return res.status(404).json({
        success: false,
        message: "Active customer not found",
      });
    }

    const normalizedItems = normalizedItemsResult.items;
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
    const normalizedTaxAmount = Number(normalizePositiveNumber(tax_amount, 0).toFixed(2));
    const normalizedDeliveryFee = Number(normalizePositiveNumber(delivery_fee, 0).toFixed(2));
    const totalAmount = Number(
      (
        subtotalAmount -
        discountAmount +
        addonAmount +
        normalizedTaxAmount +
        normalizedDeliveryFee
      ).toFixed(2)
    );

    const order = await scheduledOrderModel.createScheduledOrder({
      customer,
      orderStatus: order_status,
      paymentStatus: payment_status,
      paymentMethod: String(payment_method).trim() || "cash_on_delivery",
      currencyCode: String(currency_code).trim() || "INR",
      orderNotes: String(order_notes || "").trim(),
      deliveryAddress: delivery_address && typeof delivery_address === "object" ? delivery_address : {},
      items: normalizedItems,
      subtotalAmount,
      discountAmount,
      addonAmount,
      taxAmount: normalizedTaxAmount,
      deliveryFee: normalizedDeliveryFee,
      totalAmount,
      scheduledDatetime: scheduled_datetime,
      scheduledSlot: scheduled_slot,
    });

    await publishOrderChangeSafely({
      entity: "order",
      action: "created",
      entityId: order.id,
      orderId: order.id,
      customerId: order.customer_id,
      entityData: buildOrderRealtimePayload(order),
    });

    return res.status(200).json({
      success: true,
      message: "Scheduled order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error creating scheduled order:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getScheduledOrderList = async (req, res) => {
  try {
    const page = normalizePageNumber(req.body.page, 1);
    const limit = normalizePageNumber(req.body.limit, 10);
    const search = req.body.search ? String(req.body.search).trim() : "";

    const rows = await scheduledOrderModel.getScheduledOrderList({
      page,
      limit,
      search,
    });

    const totalRecords = rows.length > 0 ? Number(rows[0].total_records) : 0;
    const data = rows.map(({ total_records, ...order }) => order);
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      message: "Scheduled order list fetched successfully",
      data,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching scheduled order list:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getScheduledOrderById = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const order = await scheduledOrderModel.getOrderById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Scheduled order not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching scheduled order by id:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateScheduledOrder = async (req, res) => {
  try {
    const { id, order_status = "", payment_status = "", order_type = "", scheduled_datetime, scheduled_slot } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const order = await scheduledOrderModel.updateScheduledOrder({
      id,
      orderStatus: order_status,
      paymentStatus: payment_status,
      orderType: order_type,
      scheduledDatetime: scheduled_datetime,
      scheduledSlot: scheduled_slot,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Scheduled order not found or could not be updated",
      });
    }

    await publishOrderChangeSafely({
      entity: "order",
      action: "updated",
      entityId: order.id,
      orderId: order.id,
      customerId: order.customer_id,
      entityData: buildOrderRealtimePayload(order),
    });

    return res.status(200).json({
      success: true,
      message: "Scheduled order updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error updating scheduled order:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Check for scheduled orders that are due (within preparation buffer) and transition them to ASAP
const checkAndTransitionDueOrders = async (req, res) => {
  try {
    const bufferMinutes = req.body.buffer_minutes ? Number(req.body.buffer_minutes) : 30;
    const transitionedIds = await scheduledOrderModel.transitionDueScheduledOrders(bufferMinutes);

    if (transitionedIds.length > 0) {
      console.log(`🚀 Transitioned ${transitionedIds.length} scheduled orders to live queue.`);
      
      // Publish live updates so the admin workstation orders screen refreshes immediately!
      for (const orderId of transitionedIds) {
        const order = await scheduledOrderModel.getOrderById(orderId);
        if (order) {
          await publishOrderChangeSafely({
            entity: "order",
            action: "updated", // Broadcast status update
            entityId: order.id,
            orderId: order.id,
            customerId: order.customer_id,
            entityData: buildOrderRealtimePayload(order),
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Checked and processed scheduled orders. Transitioned: ${transitionedIds.length}`,
      transitioned_ids: transitionedIds,
    });
  } catch (error) {
    console.error("Error checking and transitioning scheduled orders:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  createScheduledOrder,
  getScheduledOrderList,
  getScheduledOrderById,
  updateScheduledOrder,
  checkAndTransitionDueOrders,
};

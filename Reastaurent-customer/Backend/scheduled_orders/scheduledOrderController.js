const orderModel = require("./scheduledOrderModel");
const { publishOrderChangeSafely } = require("../realtime/orderEvents");

const normalizePageNumber = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
};

const normalizePositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const toOrderRealtimePayload = (order) =>
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
        order_type: order.order_type,
        scheduled_datetime: order.scheduled_datetime,
        scheduled_slot: order.scheduled_slot,
        created_at: order.created_at,
        updated_at: order.updated_at,
      }
    : null;

const createScheduledOrder = async (req, res) => {
  try {
    const {
      items,
      delivery_address = {},
      order_notes = "",
      payment_method = "cash_on_delivery",
      currency_code = "INR",
      tax_amount = 0,
      delivery_fee = 0,
      totalAmount,
      scheduled_datetime,
      scheduled_slot,
    } = req.body;

    if (!scheduled_datetime) {
      return res.status(400).json({
        success: false,
        message: "scheduled_datetime is required for scheduled orders",
      });
    }

    if (!scheduled_slot || !scheduled_slot.trim()) {
      return res.status(400).json({
        success: false,
        message: "scheduled_slot is required for scheduled orders",
      });
    }

    const scheduledDate = new Date(scheduled_datetime);
    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled_datetime format",
      });
    }

    if (scheduledDate.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: "scheduled_datetime must be in the future",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one order item is required",
      });
    }

    const customer = await orderModel.getActiveCustomerById(req.customer.id);
    if (!customer || Number(customer.is_active) !== 1) {
      return res.status(401).json({
        success: false,
        message: "Customer account is not active",
      });
    }

    const normalizedItemIds = items
      .map((item) => Number(item.item_id))
      .filter((itemId) => Number.isInteger(itemId) && itemId > 0);

    if (normalizedItemIds.length !== items.length) {
      return res.status(400).json({
        success: false,
        message: "Each item must include a valid item_id",
      });
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
    const addonGroupsByItemId = await orderModel.getActiveAddonGroupsByItemIds(normalizedItemIds);

    const normalizedItems = [];

    for (const rawItem of items) {
      const sourceItem = activeItemsMap[Number(rawItem.item_id)];

      if (!sourceItem) {
        return res.status(400).json({
          success: false,
          message: `Item ${rawItem.item_id} is not available`,
        });
      }

      const quantity = normalizePositiveNumber(rawItem.quantity, 0);
      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Each item quantity must be at least 1",
        });
      }

      const unitPrice = Number(sourceItem.price || 0);
      const discountPrice =
        sourceItem.discount_price === null ||
        sourceItem.discount_price === undefined ||
        sourceItem.discount_price === ""
          ? null
          : Number(sourceItem.discount_price);
      const finalUnitPrice =
        discountPrice !== null && discountPrice < unitPrice ? discountPrice : unitPrice;

      const rawAddons = Array.isArray(rawItem.addons)
        ? rawItem.addons
        : rawItem.selected_addons || [];

      const parsedAddons = [];
      let itemAddonTotal = 0;

      for (const addonOption of rawAddons) {
        const optionId = Number(addonOption.addonOptionId ?? addonOption.id);
        const sourceAddon = activeAddonsMap[optionId];

        if (!sourceAddon) {
          return res.status(400).json({
            success: false,
            message: `Addon option ID ${optionId} is not active or deleted`,
          });
        }

        const addonEligibleList = addonGroupsByItemId[Number(rawItem.item_id)] || [];
        const isEligibleOption = addonEligibleList.some(
          (eligible) => Number(eligible.addon_item_id) === optionId
        );

        if (!isEligibleOption) {
          return res.status(400).json({
            success: false,
            message: `Addon ${sourceAddon.addon_item_name} is not eligible for item ${sourceItem.item_name}`,
          });
        }

        const addonPrice = normalizePositiveNumber(addonOption.price ?? sourceAddon.price, 0);
        itemAddonTotal += addonPrice;

        parsedAddons.push({
          addonOptionId: optionId,
          addonName: String(addonOption.addonName ?? sourceAddon.addon_item_name).trim(),
          addonGroupName: String(addonOption.addonGroupName ?? sourceAddon.group_name).trim(),
          price: addonPrice,
        });
      }

      const lineTotal = quantity * (finalUnitPrice + itemAddonTotal);

      normalizedItems.push({
        item_id: sourceItem.id,
        category_id: sourceItem.category_id,
        item_name: sourceItem.item_name,
        item_description: sourceItem.item_description,
        item_image: sourceItem.item_image,
        quantity,
        unit_price: unitPrice,
        discount_price: discountPrice,
        final_unit_price: finalUnitPrice,
        addon_amount: itemAddonTotal,
        line_total: lineTotal,
        selected_addons: parsedAddons,
        item_notes: String(rawItem.notes ?? rawItem.item_notes ?? "").trim(),
      });
    }

    const subtotalAmount = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.final_unit_price,
      0
    );
    const addonAmount = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.addon_amount,
      0
    );
    const discountAmount = normalizedItems.reduce(
      (sum, item) =>
        sum +
        (item.discount_price !== null && item.discount_price < item.unit_price
          ? item.quantity * (item.unit_price - item.discount_price)
          : 0),
      0
    );

    const normalizedTaxAmount = normalizePositiveNumber(tax_amount, 0);
    const normalizedDeliveryFee = normalizePositiveNumber(delivery_fee, 0);
    const calculatedTotal = subtotalAmount + addonAmount + normalizedTaxAmount + normalizedDeliveryFee;

    const marginOfError = 0.5;
    const requestedTotal = Number(totalAmount || 0);

    if (Math.abs(calculatedTotal - requestedTotal) > marginOfError) {
      return res.status(400).json({
        success: false,
        message: `Order amount calculation mismatch. Client sent: ${requestedTotal}, server computed: ${calculatedTotal}`,
      });
    }

    const totalAmountValue = calculatedTotal;
    const normalizedPaymentMethod = String(payment_method || "cash_on_delivery").trim();

    const order = await orderModel.createScheduledOrderForCustomer({
      customer,
      deliveryAddress:
        delivery_address && typeof delivery_address === "object" ? delivery_address : {},
      orderNotes: String(order_notes || "").trim(),
      paymentMethod: normalizedPaymentMethod,
      currencyCode: String(currency_code || "INR").trim() || "INR",
      items: normalizedItems,
      subtotalAmount,
      discountAmount,
      addonAmount,
      taxAmount: normalizedTaxAmount,
      deliveryFee: normalizedDeliveryFee,
      totalAmount: totalAmountValue,
      scheduledDatetime: scheduled_datetime,
      scheduledSlot: scheduled_slot,
    });

    await publishOrderChangeSafely({
      entity: "order",
      action: "created",
      entityId: order.id,
      orderId: order.id,
      customerId: order.customer_id,
      entityData: toOrderRealtimePayload(order),
    });

    return res.status(200).json({
      success: true,
      message: "Scheduled Order placed successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error placing customer scheduled order:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  createScheduledOrder,
};

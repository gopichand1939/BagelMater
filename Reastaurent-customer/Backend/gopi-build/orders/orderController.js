const orderModel = require("./orderModel");
const { publishOrderChangeSafely } = require("../realtime/orderEvents");

const STRIPE_MIN_INR_AMOUNT = Number(process.env.STRIPE_MIN_INR_AMOUNT || 50);

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
        created_at: order.created_at,
        updated_at: order.updated_at,
      }
    : null;

const placeOrder = async (req, res) => {
  try {
    const {
      items,
      delivery_address = {},
      order_notes = "",
      payment_method = "cash_on_delivery",
      currency_code = "INR",
      tax_amount = 0,
      delivery_fee = 0,
    } = req.body;

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
    const addonGroupsByItemId =
      await orderModel.getActiveAddonGroupsByItemIds(normalizedItemIds);

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
        return res.status(400).json({
          success: false,
          message: "Each add-on must include a valid addonOptionId",
        });
      }

      const selectedAddons = addonIds.map((addonId) => activeAddonsMap[addonId]);

      if (selectedAddons.some((addon) => !addon || addon.item_id !== null)) {
        return res.status(400).json({
          success: false,
          message: "One or more add-ons are not available in Addon Master",
        });
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
          return res.status(400).json({
            success: false,
            message: `${group.addon_group} allows ${minSelect}-${maxSelect} selections`,
          });
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
    const normalizedTaxAmount = Number(normalizePositiveNumber(tax_amount, 0).toFixed(2));
    const normalizedDeliveryFee = Number(
      normalizePositiveNumber(delivery_fee, 0).toFixed(2)
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
    const normalizedPaymentMethod =
      String(payment_method || "cash_on_delivery").trim() || "cash_on_delivery";

    if (
      normalizedPaymentMethod === "stripe" &&
      totalAmount < STRIPE_MIN_INR_AMOUNT
    ) {
      return res.status(400).json({
        success: false,
        message: `Online payment minimum is Rs ${STRIPE_MIN_INR_AMOUNT.toFixed(
          2
        )}. Please add more items or choose cash on delivery.`,
      });
    }

    const order = await orderModel.createOrderForCustomer({
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
      totalAmount,
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
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error placing customer order:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const page = normalizePageNumber(req.body.page, 1);
    const limit = normalizePageNumber(req.body.limit, 10);

    const rows = await orderModel.getOrdersByCustomerId({
      customerId: req.customer.id,
      page,
      limit,
    });

    const totalRecords = rows.length > 0 ? Number(rows[0].total_records) : 0;
    const data = rows.map(({ total_records, ...order }) => order);
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getMyOrderById = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const order = await orderModel.getOrderByIdForCustomer({
      orderId: Number(id),
      customerId: req.customer.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order details fetched successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error fetching customer order by id:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getMyOrderById,
};

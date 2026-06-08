const notificationModel = require("./notificationModel");

const normalizePageNumber = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
};

const getNotificationList = async (req, res) => {
  try {
    const page = normalizePageNumber(req.body.page, 1);
    const limit = normalizePageNumber(req.body.limit, 10);

    const rows = await notificationModel.getNotificationList({
      customerId: req.customer.id,
      page,
      limit,
      isRead:
        req.body.is_read === undefined || req.body.is_read === null
          ? null
          : Number(req.body.is_read) === 1
            ? 1
            : 0,
      entity: String(req.body.entity || "").trim(),
      notificationType: String(req.body.notification_type || "").trim(),
      search: String(req.body.search || "").trim(),
    });

    const totalRecords = rows.length > 0 ? Number(rows[0].total_records) : 0;
    const data = rows.map(({ total_records, ...notification }) => notification);
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
    console.error("Error fetching customer notifications:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getNotificationById = async (req, res) => {
  try {
    const id = Number(req.body.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const notification = await notificationModel.getNotificationById({
      customerId: req.customer.id,
      id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error fetching customer notification:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const id = Number(req.body.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const notification = await notificationModel.markNotificationAsRead({
      customerId: req.customer.id,
      id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Error marking customer notification as read:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await notificationModel.markAllNotificationsAsRead(req.customer.id);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all customer notifications as read:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getUnreadSummary = async (req, res) => {
  try {
    const limit = normalizePageNumber(req.body.limit, 10);
    const summary = await notificationModel.getUnreadSummary({
      customerId: req.customer.id,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching customer unread notification summary:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  getNotificationList,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadSummary,
};

const express = require("express");
const { requireCustomerAuth } = require("../auth/customerAuthMiddleware");
const notificationController = require("./NotificationController");

const router = express.Router();

router.use(requireCustomerAuth);

router.post("/list", notificationController.getNotificationList);
router.post("/by-id", notificationController.getNotificationById);
router.post("/mark-as-read", notificationController.markNotificationAsRead);
router.post("/mark-all-as-read", notificationController.markAllNotificationsAsRead);
router.post("/unread-summary", notificationController.getUnreadSummary);

module.exports = router;

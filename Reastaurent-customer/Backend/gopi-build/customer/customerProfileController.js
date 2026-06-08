const customerProfileModel = require("./customerProfileModel");
const {
  createCustomerNotificationSafely,
} = require("../notifications/notificationService");

const getProfile = async (req, res) => {
  try {
    const customer = await customerProfileModel.getCustomerById(req.customer.id);

    return res.status(200).json({
      success: true,
      data: customerProfileModel.sanitizeCustomer(customer),
    });
  } catch (error) {
    console.error("Error fetching customer profile:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateProfileWithNotification = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "name, email and phone are required",
      });
    }

    const result = await customerProfileModel.updateProfile({
      id: req.customer.id,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
    });

    if (!result?.target_exists) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (result.duplicate_email_exists) {
      return res.status(409).json({
        success: false,
        message: "A customer with this email already exists",
      });
    }

    if (result.duplicate_phone_exists) {
      return res.status(409).json({
        success: false,
        message: "A customer with this phone already exists",
      });
    }

    const sanitizedCustomer = customerProfileModel.sanitizeCustomer(result);

    await createCustomerNotificationSafely({
      customerId: req.customer.id,
      notificationType: "profile_alert",
      entity: "customer",
      action: "profile_updated",
      entityId: req.customer.id,
      title: "Profile updated",
      message: "Your customer profile details were updated successfully.",
      redirectPath: "profile",
      payload: sanitizedCustomer,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: sanitizedCustomer,
    });
  } catch (error) {
    console.error("Error updating customer profile:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  getProfile,
  updateProfile: updateProfileWithNotification,
};

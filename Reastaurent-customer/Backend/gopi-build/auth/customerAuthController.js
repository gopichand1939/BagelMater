const bcrypt = require("bcryptjs");
const customerAuthModel = require("./customerAuthModel");
const {
  createCustomerNotificationSafely,
} = require("../notifications/notificationService");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
  generateSessionId,
  hashToken,
} = require("./customerTokenService");

const buildAuthResponse = (message, customer, accessToken, refreshToken) => ({
  success: true,
  message,
  data: {
    customer: customerAuthModel.sanitizeCustomer(customer),
    access_token: accessToken,
    refresh_token: refreshToken,
  },
});

const registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, password, confirm_password } = req.body;

    if (!name || !email || !phone || !password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "name, email, phone, password and confirm_password are required",
      });
    }

    if (String(password) !== String(confirm_password)) {
      return res.status(400).json({
        success: false,
        message: "password and confirm_password must match",
      });
    }

    if (String(password).trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const existingCustomer = await customerAuthModel.getCustomerByEmail(email);
    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "A customer with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const createdCustomer = await customerAuthModel.createCustomer({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      passwordHash,
    });

    if (!createdCustomer) {
      return res.status(409).json({
        success: false,
        message: "A customer with this email or phone already exists",
      });
    }

    const sessionId = generateSessionId();
    const refreshExpiryDate = getRefreshTokenExpiryDate();
    const accessToken = generateAccessToken(createdCustomer, sessionId);
    const refreshToken = generateRefreshToken(createdCustomer, sessionId);
    const savedCustomer = await customerAuthModel.updateLoginSession(
      createdCustomer.id,
      sessionId,
      hashToken(refreshToken),
      refreshExpiryDate
    );

    await createCustomerNotificationSafely({
      customerId: savedCustomer.id,
      notificationType: "account_alert",
      entity: "customer",
      action: "registered",
      entityId: savedCustomer.id,
      title: "Welcome to Flavour Hub",
      message: "Your customer account was created successfully.",
      redirectPath: "profile",
      payload: {
        customerId: savedCustomer.id,
        name: savedCustomer.name,
        email: savedCustomer.email,
      },
    });

    return res
      .status(201)
      .json(
        buildAuthResponse(
          "Customer registered successfully",
          savedCustomer,
          accessToken,
          refreshToken
        )
      );
  } catch (error) {
    console.error("Error registering customer:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const customer = await customerAuthModel.getCustomerByEmail(email);
    if (!customer || Number(customer.is_active) !== 1) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(String(password), customer.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const sessionId = generateSessionId();
    const refreshExpiryDate = getRefreshTokenExpiryDate();
    const accessToken = generateAccessToken(customer, sessionId);
    const refreshToken = generateRefreshToken(customer, sessionId);
    const savedCustomer = await customerAuthModel.updateLoginSession(
      customer.id,
      sessionId,
      hashToken(refreshToken),
      refreshExpiryDate
    );

    await createCustomerNotificationSafely({
      customerId: savedCustomer.id,
      notificationType: "account_alert",
      entity: "customer",
      action: "logged_in",
      entityId: savedCustomer.id,
      title: "Signed in successfully",
      message: "You signed in to your customer account.",
      redirectPath: "profile",
      payload: {
        customerId: savedCustomer.id,
        name: savedCustomer.name,
        lastLoginAt: savedCustomer.last_login_at,
      },
    });

    return res
      .status(200)
      .json(buildAuthResponse("Login successful", savedCustomer, accessToken, refreshToken));
  } catch (error) {
    console.error("Error logging in customer:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const refreshCustomerToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: "refresh_token is required",
      });
    }

    const payload = verifyRefreshToken(refresh_token);
    const customer = await customerAuthModel.getCustomerForSessionValidation(payload.sub);

    if (
      !customer ||
      Number(customer.is_active) !== 1 ||
      customer.email !== payload.email ||
      customer.current_session_id !== payload.sid ||
      customer.refresh_token_hash !== hashToken(refresh_token) ||
      !customer.session_expires_at ||
      new Date(customer.session_expires_at) <= new Date() ||
      !customer.refresh_token_expires_at ||
      new Date(customer.refresh_token_expires_at) <= new Date()
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const refreshExpiryDate = getRefreshTokenExpiryDate();
    const accessToken = generateAccessToken(customer, payload.sid);
    const newRefreshToken = generateRefreshToken(customer, payload.sid);
    const savedCustomer = await customerAuthModel.updateLoginSession(
      customer.id,
      payload.sid,
      hashToken(newRefreshToken),
      refreshExpiryDate
    );

    return res.status(200).json(
      buildAuthResponse(
        "Token refreshed successfully",
        savedCustomer,
        accessToken,
        newRefreshToken
      )
    );
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

const logoutCustomer = async (req, res) => {
  try {
    const clearedSession = await customerAuthModel.clearSession(
      req.customer.id,
      req.auth.sessionId
    );

    if (!clearedSession) {
      return res.status(400).json({
        success: false,
        message: "Session already expired or invalid",
      });
    }

    await createCustomerNotificationSafely({
      customerId: req.customer.id,
      notificationType: "account_alert",
      entity: "customer",
      action: "logged_out",
      entityId: req.customer.id,
      title: "Signed out",
      message: "You signed out from your customer account.",
      redirectPath: "profile",
      payload: {
        customerId: req.customer.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Error logging out customer:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "current_password, new_password and confirm_password are required",
      });
    }

    if (String(new_password) !== String(confirm_password)) {
      return res.status(400).json({
        success: false,
        message: "new_password and confirm_password must match",
      });
    }

    if (String(new_password).trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const customerWithPassword = await customerAuthModel.getCustomerByEmail(req.customer.email);
    const isPasswordValid = await bcrypt.compare(
      String(current_password),
      customerWithPassword.password_hash
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    await customerAuthModel.updatePassword(
      req.customer.id,
      await bcrypt.hash(String(new_password), 10)
    );

    await createCustomerNotificationSafely({
      customerId: req.customer.id,
      notificationType: "security_alert",
      entity: "customer",
      action: "password_changed",
      entityId: req.customer.id,
      title: "Password changed",
      message: "Your account password was changed successfully.",
      redirectPath: "account",
      payload: {
        customerId: req.customer.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Error changing customer password:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  registerCustomer,
  loginCustomer,
  refreshCustomerToken,
  logoutCustomer,
  changePassword,
};

const customerAuthModel = require("./customerAuthModel");
const { verifyAccessToken } = require("./customerTokenService");

const requireCustomerAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const token = authorization.slice(7).trim();
    const payload = verifyAccessToken(token);
    const customer = await customerAuthModel.getCustomerForSessionValidation(payload.sub);

    if (
      !customer ||
      Number(customer.is_active) !== 1 ||
      customer.current_session_id !== payload.sid ||
      !customer.session_expires_at ||
      new Date(customer.session_expires_at) <= new Date()
    ) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid. Please login again.",
      });
    }

    req.customer = customerAuthModel.sanitizeCustomer(customer);
    req.auth = {
      sessionId: payload.sid,
      tokenType: payload.type,
      customerId: payload.sub,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = {
  requireCustomerAuth,
};

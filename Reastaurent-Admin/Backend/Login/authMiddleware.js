const adminModel = require("./adminModel");
const { verifyAccessToken } = require("./tokenService");

const requireAdminAuth = async (req, res, next) => {
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
    const admin = await adminModel.getAdminForSessionValidation(payload.sub);
    const session = await adminModel.getSessionByAdminAndSessionId(payload.sub, payload.sid);

    if (
      !admin ||
      Number(admin.is_active) !== 1 ||
      !session ||
      !session.session_expires_at ||
      new Date(session.session_expires_at) <= new Date()
    ) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid. Please login again.",
      });
    }

    req.admin = adminModel.sanitizeAdmin(admin);
    req.auth = {
      sessionId: payload.sid,
      tokenType: payload.type,
      adminId: payload.sub,
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
  requireAdminAuth,
};

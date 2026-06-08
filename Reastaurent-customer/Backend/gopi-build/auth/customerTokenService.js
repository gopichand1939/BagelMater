const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const accessSecret = process.env.JWT_SECRET || "super_secret_key_123";
const refreshSecret = process.env.REFRESH_TOKEN_SECRET || accessSecret;
const accessExpiresIn = process.env.TOKEN_EXPIRES_IN || "1h";
const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

const parseDurationToMs = (value) => {
  const match = String(value).trim().match(/^(\d+)([smhd])$/i);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplierMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multiplierMap[unit];
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const generateSessionId = () => crypto.randomBytes(24).toString("hex");

const generateAccessToken = (customer, sessionId) =>
  jwt.sign(
    {
      sub: customer.id,
      email: customer.email,
      role: "customer",
      type: "access",
      sid: sessionId,
    },
    accessSecret,
    { expiresIn: accessExpiresIn }
  );

const generateRefreshToken = (customer, sessionId) =>
  jwt.sign(
    {
      sub: customer.id,
      email: customer.email,
      role: "customer",
      type: "refresh",
      sid: sessionId,
    },
    refreshSecret,
    { expiresIn: refreshExpiresIn }
  );

const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, accessSecret);

  if (payload.type !== "access" || !payload.sid) {
    throw new Error("Invalid access token");
  }

  return payload;
};

const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, refreshSecret);

  if (payload.type !== "refresh" || !payload.sid) {
    throw new Error("Invalid refresh token");
  }

  return payload;
};

const getRefreshTokenExpiryDate = () =>
  new Date(Date.now() + parseDurationToMs(refreshExpiresIn));

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
  generateSessionId,
  hashToken,
};

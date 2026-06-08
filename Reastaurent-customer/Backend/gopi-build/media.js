const trimTrailingSlash = (value = "") => String(value || "").replace(/\/+$/g, "");

const normalizeStoredImagePath = (value = "") =>
  String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/g, "");

const getPublicAssetBaseUrl = (req) => {
  const configuredBaseUrl = trimTrailingSlash(process.env.PUBLIC_ASSET_BASE_URL || "");

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const protocol = req.protocol || "http";
  const host = req.get("host");

  return host ? `${protocol}://${host}` : "";
};

const buildImageUrl = (req, storedPath) => {
  if (!storedPath) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(storedPath) || /^data:/i.test(storedPath)) {
    return storedPath;
  }

  const normalizedPath = normalizeStoredImagePath(storedPath);
  const baseUrl = getPublicAssetBaseUrl(req);

  return baseUrl ? `${baseUrl}/images/${normalizedPath}` : `/images/${normalizedPath}`;
};

const attachImageUrl = (req, entity, fieldName) => ({
  ...entity,
  [`${fieldName}_url`]: buildImageUrl(req, entity?.[fieldName]),
});

module.exports = {
  attachImageUrl,
};

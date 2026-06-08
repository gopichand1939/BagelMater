const MENU_CHANGES_CHANNEL = "menu_changes";

const parseMenuChangePayload = (payload) => {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    console.error("Failed to parse menu change payload:", error);
    return null;
  }
};

module.exports = {
  MENU_CHANGES_CHANNEL,
  parseMenuChangePayload,
};

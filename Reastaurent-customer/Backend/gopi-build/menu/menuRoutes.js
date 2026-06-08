const express = require("express");
const {
  getCategory,
  getItemsByCategory,
  getItemAddons,
} = require("./menuController");

const router = express.Router();

router.post("/categories", getCategory);
router.post("/items-by-category", getItemsByCategory);
router.post("/item-addons", getItemAddons);

module.exports = router;

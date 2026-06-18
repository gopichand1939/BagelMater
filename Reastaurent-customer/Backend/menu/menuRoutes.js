const express = require("express");
const {
  getCategory,
  getItemsByCategory,
  getItemAddons,
  getTopProducts,
} = require("./menuController");

const router = express.Router();

router.post("/categories", getCategory);
router.post("/items-by-category", getItemsByCategory);
router.post("/item-addons", getItemAddons);
router.post("/top-products", getTopProducts);
router.get("/top-products", getTopProducts);

module.exports = router;


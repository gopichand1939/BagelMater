const express = require("express");
const {
  createGroup,
  getGroupList,
  getGroupById,
  updateGroup,
  deleteGroup,
  createAddonItem,
  getAddonItemList,
  getAddonItemById,
  updateAddonItem,
  deleteAddonItem,
  getEligibilityLookups,
  getAddonItemsByGroup,
  createEligibility,
  bulkAssignEligibility,
  getEligibilityList,
  getEligibilityById,
  updateEligibility,
  deleteEligibility,
  getAddonsByItem,
  reorderAddonGroups,
  reorderAddonItems,
} = require("./AddonController");

const router = express.Router();

router.post("/create_addon_group", createGroup);
router.post("/addon_group_list", getGroupList);
router.post("/add_on_master_getById", getGroupById);
router.post("/update_addon_group", updateGroup);
router.post("/delete_addon_group", deleteGroup);

router.post("/create_addon_item", createAddonItem);
router.post("/addon_item_list", getAddonItemList);
router.post("/get_addon_item_byId", getAddonItemById);
router.post("/update_addon_item", updateAddonItem);
router.post("/delete_addon_item", deleteAddonItem);

router.post("/addon_eligibility_lookups", getEligibilityLookups);
router.post("/addon_items_by_group", getAddonItemsByGroup);
router.post("/create_addon_eligibility", createEligibility);
router.post("/bulk_assign_addon_eligibility", bulkAssignEligibility);
router.post("/addon_eligibility_list", getEligibilityList);
router.post("/get_addon_eligibility_byId", getEligibilityById);
router.post("/update_addon_eligibility", updateEligibility);
router.post("/delete_addon_eligibility", deleteEligibility);

router.post("/get_addons_by_item", getAddonsByItem);
router.post("/reorder_addon_groups", reorderAddonGroups);
router.post("/reorder_addon_items", reorderAddonItems);

module.exports = router;

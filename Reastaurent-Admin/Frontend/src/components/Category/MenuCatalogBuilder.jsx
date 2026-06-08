import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import {
  MdAdd,
  MdClose,
  MdDeleteOutline,
  MdEdit,
  MdExpandLess,
  MdExpandMore,
  MdImage,
  MdRestaurantMenu,
  MdSearch,
} from "react-icons/md";
import {
  ADDON_CREATE,
  ADDON_DELETE,
  ADDON_LIST,
  ADDON_UPDATE,
  CATEGORY_CREATE,
  CATEGORY_DELETE,
  CATEGORY_LIST,
  CATEGORY_UPDATE,
  ITEM_CREATE,
  ITEM_DELETE,
  ITEM_LIST,
  ITEM_UPDATE,
} from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { getImageUrl } from "../../Utils/imageUrl";
import { setAddonData, setCategoryData, setItemData } from "../../Redux/CardSlice";
import ImageDropZone from "../common/ImageDropZone";
import StatusPill from "../common/StatusPill";
import { Button, Card, InputField, PageSection } from "../ui";

const blankCategoryForm = () => ({
  category_name: "",
  category_description: "",
  is_active: true,
  image_file: null,
  image_label: "No image selected",
  image_preview_url: "",
  image_existing_url: "",
});

const blankItemForm = (categoryId = "") => ({
  category_id: categoryId ? String(categoryId) : "",
  item_name: "",
  item_description: "",
  price: "",
  discount_price: "",
  preparation_time: "",
  is_popular: false,
  is_new: false,
  is_veg: null,
  is_active: true,
  image_file: null,
  image_label: "No image selected",
  image_preview_url: "",
  image_existing_url: "",
});

const blankAddonForm = (itemId = "") => ({
  item_id: itemId ? String(itemId) : "",
  addon_group: "",
  addon_name: "",
  addon_price: "",
  sort_order: "0",
  is_active: true,
});

const money = (value) => `GBP ${Number(value || 0).toFixed(2)}`;

const placeholder = (label, tone = "eaf8f2") =>
  `https://placehold.co/240x180/${tone}/205c49?text=${encodeURIComponent(label || "Menu")}`;

const toFormBool = (value, fallback = true) =>
  typeof value === "undefined" || value === null ? fallback : Number(value) === 1;

const foodTypeOptions = [
  { label: "Veg", value: 1, activeClassName: "border-emerald-500 bg-emerald-50 text-emerald-700" },
  { label: "Non-Veg", value: 0, activeClassName: "border-red-500 bg-red-50 text-red-600" },
  { label: "Both / N/A", value: 2, activeClassName: "border-slate-500 bg-slate-100 text-slate-800" },
];

const foodTypeLabel = (value) =>
  foodTypeOptions.find((option) => option.value === Number(value))?.label || "Non-Veg";

const foodTypeBadgeClassName = (value) => {
  if (Number(value) === 1) {
    return "bg-success-bg text-success-text";
  }

  if (Number(value) === 2) {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-error-bg text-error-text";
};

const toFoodTypeValue = (value) => {
  const numericValue = Number(value);
  return [0, 1, 2].includes(numericValue) ? numericValue : null;
};

const buildCategoryForm = (category) => ({
  category_name: category?.category_name || "",
  category_description: category?.category_description || "",
  is_active: toFormBool(category?.is_active),
  image_file: null,
  image_label: getImageUrl(category, "category_image") ? "Current image selected" : "No image selected",
  image_preview_url: getImageUrl(category, "category_image") || "",
  image_existing_url: getImageUrl(category, "category_image") || "",
});

const buildItemForm = (item) => ({
  category_id: item?.category_id ? String(item.category_id) : "",
  item_name: item?.item_name || "",
  item_description: item?.item_description || "",
  price: item?.price != null ? String(item.price) : "",
  discount_price: item?.discount_price != null ? String(item.discount_price) : "",
  preparation_time: item?.preparation_time != null ? String(item.preparation_time) : "",
  is_popular: toFormBool(item?.is_popular, false),
  is_new: toFormBool(item?.is_new, false),
  is_veg: toFoodTypeValue(item?.is_veg),
  is_active: toFormBool(item?.is_active),
  image_file: null,
  image_label: getImageUrl(item, "item_image") ? "Current image selected" : "No image selected",
  image_preview_url: getImageUrl(item, "item_image") || "",
  image_existing_url: getImageUrl(item, "item_image") || "",
});

const buildAddonForm = (addon) => ({
  item_id: addon?.item_id ? String(addon.item_id) : "",
  addon_group: addon?.addon_group || "",
  addon_name: addon?.addon_name || "",
  addon_price: addon?.addon_price != null ? String(addon.addon_price) : "",
  sort_order: addon?.sort_order != null ? String(addon.sort_order) : "0",
  is_active: toFormBool(addon?.is_active),
});

function FieldToggle({ label, active, activeText, inactiveText, onClick }) {
  return (
    <div className="ui-field-shell">
      <span className="ui-label">{label}</span>
      <button
        type="button"
        aria-pressed={active}
        className={`group inline-flex h-11 w-fit items-center gap-3 rounded-full border px-1.5 pr-4 text-[0.9rem] font-extrabold shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 ${
          active
            ? "border-emerald-500/20 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
        onClick={onClick}
      >
        <span
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
            active ? "bg-emerald-500" : "bg-slate-300"
          }`}
          aria-hidden="true"
        >
          <span
            className={`h-6 w-6 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.22)] transition-transform duration-200 ${
              active ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </span>
        <span>
          {active ? activeText : inactiveText}
        </span>
      </button>
    </div>
  );
}

function FoodTypeChoice({ value, onChange }) {
  return (
    <div className="ui-field-shell">
      <span className="ui-label">Food type</span>
      <div className="inline-flex w-fit flex-wrap rounded-full border border-slate-200 bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        {foodTypeOptions.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={isSelected}
              className={`rounded-full px-4 py-2 text-[0.9rem] font-extrabold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 ${
                isSelected ? option.activeClassName : "border-transparent text-slate-500 hover:bg-slate-50"
              }`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InlineStatusToggle({
  active,
  activeText = "Active",
  inactiveText = "Inactive",
  disabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-1.5 py-1 pr-3 text-[0.78rem] font-extrabold shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-emerald-500/20 bg-emerald-500 text-white hover:bg-emerald-600"
          : "border-red-500/20 bg-red-500 text-white hover:bg-red-600"
      }`}
      onClick={onClick}
    >
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-white/25 p-0.5 shadow-inner">
        <span
          className={`grid h-5 w-5 place-items-center rounded-full bg-white shadow-[0_3px_8px_rgba(15,23,42,0.22)] transition-transform duration-200 ${
            active ? "translate-x-5 text-emerald-600" : "translate-x-0 text-red-600"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
        </span>
      </span>
      <span>{active ? activeText : inactiveText}</span>
    </button>
  );
}

function MenuCatalogBuilder() {
  const dispatch = useDispatch();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const [openAddonItemId, setOpenAddonItemId] = useState(null);
  const [categoryMode, setCategoryMode] = useState(null);
  const [categoryForm, setCategoryForm] = useState(blankCategoryForm);
  const [itemMode, setItemMode] = useState(null);
  const [itemForm, setItemForm] = useState(blankItemForm);
  const [addonMode, setAddonMode] = useState(null);
  const [addonForm, setAddonForm] = useState(blankAddonForm);
  const [submittingKey, setSubmittingKey] = useState("");

  const fetchCatalog = async (preferredOpenCategoryId) => {
    setLoading(true);

    try {
      const [categoryResponse, itemResponse, addonResponse] = await Promise.all([
        fetchWithRefreshToken(CATEGORY_LIST, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 500 }),
        }),
        fetchWithRefreshToken(ITEM_LIST, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 1000 }),
        }),
        fetchWithRefreshToken(ADDON_LIST, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 3000 }),
        }),
      ]);

      const [categoryData, itemData, addonData] = await Promise.all([
        categoryResponse.json(),
        itemResponse.json(),
        addonResponse.json(),
      ]);

      if (!categoryResponse.ok || categoryData.success === false) {
        throw new Error(categoryData.message || "Failed to fetch categories");
      }

      if (!itemResponse.ok || itemData.success === false) {
        throw new Error(itemData.message || "Failed to fetch items");
      }

      if (!addonResponse.ok || addonData.success === false) {
        throw new Error(addonData.message || "Failed to fetch add-ons");
      }

      const nextCategories = categoryData.data || [];
      const nextItems = itemData.data || [];
      const nextAddons = addonData.data || [];

      setCategories(nextCategories);
      setItems(nextItems);
      setAddons(nextAddons);
      dispatch(setCategoryData(nextCategories));
      dispatch(setItemData(nextItems));
      dispatch(setAddonData(nextAddons));

      if (typeof preferredOpenCategoryId !== "undefined") {
        setOpenCategoryId(preferredOpenCategoryId);
      }
    } catch (error) {
      toast.error(error.message || "Failed to load menu catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    return () => {
      if (categoryForm.image_preview_url?.startsWith("blob:")) {
        URL.revokeObjectURL(categoryForm.image_preview_url);
      }

      if (itemForm.image_preview_url?.startsWith("blob:")) {
        URL.revokeObjectURL(itemForm.image_preview_url);
      }
    };
  }, [categoryForm.image_preview_url, itemForm.image_preview_url]);

  const itemsByCategory = useMemo(() => {
    return items.reduce((grouped, item) => {
      const key = String(item.category_id || "uncategorized");
      grouped[key] = grouped[key] || [];
      grouped[key].push(item);
      return grouped;
    }, {});
  }, [items]);

  const addonsByItem = useMemo(() => {
    return addons.reduce((grouped, addon) => {
      const key = String(addon.item_id || "unassigned");
      grouped[key] = grouped[key] || [];
      grouped[key].push(addon);
      return grouped;
    }, {});
  }, [addons]);

  const filteredCategories = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return categories;
    }

    return categories.filter((category) => {
      const categoryMatch = `${category.category_name || ""} ${category.category_description || ""}`
        .toLowerCase()
        .includes(query);
      const itemMatch = (itemsByCategory[String(category.id)] || []).some((item) =>
        `${item.item_name || ""} ${item.item_description || ""}`.toLowerCase().includes(query) ||
        (addonsByItem[String(item.id)] || []).some((addon) =>
          `${addon.addon_group || ""} ${addon.addon_name || ""}`.toLowerCase().includes(query)
        )
      );

      return categoryMatch || itemMatch;
    });
  }, [addonsByItem, categories, itemsByCategory, searchText]);

  const totalActiveItems = items.filter((item) => Number(item.is_active) === 1).length;
  const totalActiveAddons = addons.filter((addon) => Number(addon.is_active) === 1).length;
  const selectedCategoryName =
    categories.find((category) => String(category.id) === String(openCategoryId))?.category_name ||
    "Choose a category";
  const selectedAddonItemName =
    items.find((item) => String(item.id) === String(openAddonItemId))?.item_name ||
    "this item";

  const setCategoryField = (field, value) => {
    setCategoryForm((current) => ({ ...current, [field]: value }));
  };

  const setItemField = (field, value) => {
    setItemForm((current) => ({ ...current, [field]: value }));
  };

  const setAddonField = (field, value) => {
    setAddonForm((current) => ({ ...current, [field]: value }));
  };

  const startAddCategory = () => {
    setCategoryMode("add");
    setCategoryForm(blankCategoryForm());
    setItemMode(null);
    setAddonMode(null);
  };

  const startEditCategory = (category) => {
    setCategoryMode({ type: "edit", id: category.id });
    setCategoryForm(buildCategoryForm(category));
    setItemMode(null);
    setAddonMode(null);
  };

  const closeCategoryForm = () => {
    if (categoryForm.image_preview_url?.startsWith("blob:")) {
      URL.revokeObjectURL(categoryForm.image_preview_url);
    }

    setCategoryMode(null);
    setCategoryForm(blankCategoryForm());
  };

  const startAddItem = (categoryId) => {
    setOpenCategoryId(categoryId);
    setItemMode({ type: "add", categoryId });
    setItemForm(blankItemForm(categoryId));
    setCategoryMode(null);
    setAddonMode(null);
  };

  const startEditItem = (item) => {
    setOpenCategoryId(item.category_id);
    setItemMode({ type: "edit", id: item.id, categoryId: item.category_id });
    setItemForm(buildItemForm(item));
    setCategoryMode(null);
    setAddonMode(null);
  };

  const closeItemForm = () => {
    if (itemForm.image_preview_url?.startsWith("blob:")) {
      URL.revokeObjectURL(itemForm.image_preview_url);
    }

    setItemMode(null);
    setItemForm(blankItemForm());
  };

  const startAddAddon = (item) => {
    setOpenCategoryId(item.category_id);
    setOpenAddonItemId(item.id);
    setAddonMode({ type: "add", itemId: item.id });
    setAddonForm(blankAddonForm(item.id));
    setCategoryMode(null);
    setItemMode(null);
  };

  const startEditAddon = (addon) => {
    const item = items.find((currentItem) => String(currentItem.id) === String(addon.item_id));

    if (item?.category_id) {
      setOpenCategoryId(item.category_id);
    }

    setOpenAddonItemId(addon.item_id);
    setAddonMode({ type: "edit", id: addon.id, itemId: addon.item_id });
    setAddonForm(buildAddonForm(addon));
    setCategoryMode(null);
    setItemMode(null);
  };

  const closeAddonForm = () => {
    setAddonMode(null);
    setAddonForm(blankAddonForm());
  };

  const handleCategoryImage = (file) => {
    if (categoryForm.image_preview_url?.startsWith("blob:")) {
      URL.revokeObjectURL(categoryForm.image_preview_url);
    }

    setCategoryForm((current) => ({
      ...current,
      image_file: file,
      image_label: file?.name || "No image selected",
      image_preview_url: file ? URL.createObjectURL(file) : "",
    }));
  };

  const clearCategoryImageUpload = () => {
    if (categoryForm.image_preview_url?.startsWith("blob:")) {
      URL.revokeObjectURL(categoryForm.image_preview_url);
    }

    setCategoryForm((current) => ({
      ...current,
      image_file: null,
      image_label: current.image_existing_url ? "Current image selected" : "No image selected",
      image_preview_url: current.image_existing_url || "",
    }));
  };

  const handleItemImage = (file) => {
    if (itemForm.image_preview_url?.startsWith("blob:")) {
      URL.revokeObjectURL(itemForm.image_preview_url);
    }

    setItemForm((current) => ({
      ...current,
      image_file: file,
      image_label: file?.name || "No image selected",
      image_preview_url: file ? URL.createObjectURL(file) : "",
    }));
  };

  const clearItemImageUpload = () => {
    if (itemForm.image_preview_url?.startsWith("blob:")) {
      URL.revokeObjectURL(itemForm.image_preview_url);
    }

    setItemForm((current) => ({
      ...current,
      image_file: null,
      image_label: current.image_existing_url ? "Current image selected" : "No image selected",
      image_preview_url: current.image_existing_url || "",
    }));
  };

  const submitCategory = async (event) => {
    event.preventDefault();

    if (!categoryForm.category_name.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (categoryMode === "add" && !categoryForm.image_file) {
      toast.error("Please add a category image");
      return;
    }

    const isEdit = categoryMode?.type === "edit";
    const formData = new FormData();

    if (isEdit) {
      formData.append("id", categoryMode.id);
      formData.append("is_active", categoryForm.is_active ? 1 : 0);
    }

    formData.append("category_name", categoryForm.category_name.trim());
    formData.append("category_description", categoryForm.category_description.trim());

    if (categoryForm.image_file) {
      formData.append("category_image", categoryForm.image_file);
    }

    setSubmittingKey("category");

    try {
      const response = await fetchWithRefreshToken(isEdit ? CATEGORY_UPDATE : CATEGORY_CREATE, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to save category");
      }

      const categoryToOpenAfterSave = isEdit
        ? openCategoryId
        : data.data?.id || categoryMode?.id || openCategoryId;

      toast.success(isEdit ? "Category updated" : "Category created");
      closeCategoryForm();
      await fetchCatalog(categoryToOpenAfterSave);
    } catch (error) {
      toast.error(error.message || "Failed to save category");
    } finally {
      setSubmittingKey("");
    }
  };

  const submitItem = async (event) => {
    event.preventDefault();

    if (!itemForm.category_id || !itemForm.item_name.trim()) {
      toast.error("Category and item name are required");
      return;
    }

    if (itemMode?.type === "add" && !itemForm.image_file) {
      toast.error("Please add an item image");
      return;
    }

    if (itemForm.is_veg === null) {
      toast.error("Please select Veg, Non-Veg, or Both / N/A food type");
      return;
    }

    const isEdit = itemMode?.type === "edit";
    const formData = new FormData();

    if (isEdit) {
      formData.append("id", itemMode.id);
      formData.append("is_active", itemForm.is_active ? 1 : 0);
    }

    formData.append("category_id", itemForm.category_id);
    formData.append("item_name", itemForm.item_name.trim());
    formData.append("item_description", itemForm.item_description.trim());
    formData.append("price", itemForm.price === "" ? 0 : itemForm.price);
    formData.append("is_popular", itemForm.is_popular ? 1 : 0);
    formData.append("is_new", itemForm.is_new ? 1 : 0);
    formData.append("is_veg", itemForm.is_veg);

    if (itemForm.discount_price !== "") {
      formData.append("discount_price", itemForm.discount_price);
    }

    if (itemForm.preparation_time !== "") {
      formData.append("preparation_time", itemForm.preparation_time);
    }

    if (itemForm.image_file) {
      formData.append("item_image", itemForm.image_file);
    }

    setSubmittingKey("item");

    try {
      const response = await fetchWithRefreshToken(isEdit ? ITEM_UPDATE : ITEM_CREATE, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to save item");
      }

      toast.success(isEdit ? "Item updated" : "Item created");
      closeItemForm();
      await fetchCatalog(Number(itemForm.category_id));
    } catch (error) {
      toast.error(error.message || "Failed to save item");
    } finally {
      setSubmittingKey("");
    }
  };

  const toggleCategoryStatus = async (category) => {
    const nextActive = Number(category.is_active) === 1 ? 0 : 1;
    const formData = new FormData();
    formData.append("id", category.id);
    formData.append("category_name", category.category_name || "");
    formData.append("category_description", category.category_description || "");
    formData.append("is_active", nextActive);

    setSubmittingKey(`category-status-${category.id}`);

    try {
      const response = await fetchWithRefreshToken(CATEGORY_UPDATE, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to update category status");
      }

      toast.success(nextActive ? "Category activated" : "Category hidden");
      await fetchCatalog(openCategoryId);
    } catch (error) {
      toast.error(error.message || "Failed to update category status");
    } finally {
      setSubmittingKey("");
    }
  };

  const toggleItemStatus = async (item) => {
    const nextActive = Number(item.is_active) === 1 ? 0 : 1;
    const formData = new FormData();
    formData.append("id", item.id);
    formData.append("category_id", item.category_id);
    formData.append("item_name", item.item_name || "");
    formData.append("item_description", item.item_description || "");
    formData.append("is_active", nextActive);
    formData.append("price", item.price != null ? item.price : 0);
    formData.append("is_popular", Number(item.is_popular) === 1 ? 1 : 0);
    formData.append("is_new", Number(item.is_new) === 1 ? 1 : 0);
    formData.append("is_veg", toFoodTypeValue(item.is_veg) ?? 0);

    if (item.discount_price != null) {
      formData.append("discount_price", item.discount_price);
    }

    if (item.preparation_time != null) {
      formData.append("preparation_time", item.preparation_time);
    }

    setSubmittingKey(`item-status-${item.id}`);

    try {
      const response = await fetchWithRefreshToken(ITEM_UPDATE, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to update item status");
      }

      toast.success(nextActive ? "Item available" : "Item hidden");
      await fetchCatalog(item.category_id);
    } catch (error) {
      toast.error(error.message || "Failed to update item status");
    } finally {
      setSubmittingKey("");
    }
  };

  const submitAddon = async (event) => {
    event.preventDefault();

    if (!addonForm.item_id || !addonForm.addon_group.trim() || !addonForm.addon_name.trim()) {
      toast.error("Add-on group and add-on name are required");
      return;
    }

    const isEdit = addonMode?.type === "edit";

    setSubmittingKey("addon");

    try {
      const response = await fetchWithRefreshToken(isEdit ? ADDON_UPDATE : ADDON_CREATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: addonMode?.id,
          item_id: Number(addonForm.item_id),
          addon_group: addonForm.addon_group.trim(),
          addon_name: addonForm.addon_name.trim(),
          addon_price: addonForm.addon_price === "" ? 0 : Number(addonForm.addon_price),
          sort_order: addonForm.sort_order === "" ? 0 : Number(addonForm.sort_order),
          is_active: addonForm.is_active ? 1 : 0,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to save add-on");
      }

      toast.success(isEdit ? "Add-on updated" : "Add-on created");
      setOpenAddonItemId(Number(addonForm.item_id));
      closeAddonForm();
      await fetchCatalog(openCategoryId);
    } catch (error) {
      toast.error(error.message || "Failed to save add-on");
    } finally {
      setSubmittingKey("");
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete "${category.category_name}" and hide it from the menu?`)) {
      return;
    }

    setSubmittingKey(`category-delete-${category.id}`);

    try {
      const response = await fetchWithRefreshToken(CATEGORY_DELETE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category.id }),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to delete category");
      }

      toast.success("Category deleted");
      await fetchCatalog();
    } catch (error) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setSubmittingKey("");
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.item_name}" from this category?`)) {
      return;
    }

    setSubmittingKey(`item-delete-${item.id}`);

    try {
      const response = await fetchWithRefreshToken(ITEM_DELETE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to delete item");
      }

      toast.success("Item deleted");
      await fetchCatalog();
    } catch (error) {
      toast.error(error.message || "Failed to delete item");
    } finally {
      setSubmittingKey("");
    }
  };

  const deleteAddon = async (addon) => {
    if (!window.confirm(`Delete "${addon.addon_name}" from this item?`)) {
      return;
    }

    setSubmittingKey(`addon-delete-${addon.id}`);

    try {
      const response = await fetchWithRefreshToken(ADDON_DELETE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: addon.id }),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to delete add-on");
      }

      toast.success("Add-on deleted");
      await fetchCatalog(openCategoryId);
    } catch (error) {
      toast.error(error.message || "Failed to delete add-on");
    } finally {
      setSubmittingKey("");
    }
  };

  const renderCategoryForm = () => {
    if (!categoryMode) {
      return null;
    }

    const isEdit = categoryMode?.type === "edit";
    const compactInputClassName =
      "h-11 rounded-[12px] border-slate-200 bg-white px-3.5 py-2 text-[0.94rem] shadow-none";
    const compactTextareaClassName =
      "h-[96px] resize-none rounded-[12px] border-slate-200 bg-white px-3.5 py-2.5 text-[0.94rem] leading-6 shadow-none";

    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-slate-950/45 p-4 backdrop-blur-md"
        onClick={closeCategoryForm}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          className="grid max-h-[calc(100dvh-32px)] w-full max-w-[980px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.24)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex min-w-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
            <div className="min-w-0">
              <p className="m-0 text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-emerald-600">
                {isEdit ? "Edit category" : "New category"}
              </p>
              <h3 id="category-modal-title" className="m-0 mt-1 text-[1.22rem] font-extrabold leading-tight text-slate-950">
                {isEdit ? "Update this food group" : "Create a food group"}
              </h3>
              <p className="m-0 mt-1 text-[0.88rem] leading-5 text-slate-500">
                Category changes stay connected to this menu list.
              </p>
            </div>
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-xl text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
              onClick={closeCategoryForm}
              aria-label="Close category dialog"
            >
              <MdClose aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={submitCategory} className="contents">
            <div className="grid min-h-0 min-w-0 gap-6 overflow-y-auto overflow-x-hidden px-6 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
              <div className="grid min-w-0 content-start gap-4">
                <InputField
                  label="Category name"
                  value={categoryForm.category_name}
                  onChange={(event) => setCategoryField("category_name", event.target.value)}
                  placeholder="Example: Breakfast Bagels"
                  inputClassName={compactInputClassName}
                />
                <InputField
                  label="Description"
                  as="textarea"
                  rows="3"
                  value={categoryForm.category_description}
                  onChange={(event) => setCategoryField("category_description", event.target.value)}
                  placeholder="A simple note for the team"
                  inputClassName={compactTextareaClassName}
                />
                {isEdit ? (
                  <FieldToggle
                    label="Status"
                    active={categoryForm.is_active}
                    activeText="Active"
                    inactiveText="Inactive"
                    onClick={() => setCategoryField("is_active", !categoryForm.is_active)}
                  />
                ) : null}
              </div>

              <aside className="grid min-w-0 content-start gap-4 overflow-hidden">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="ui-label">Image preview</span>
                    {categoryForm.image_preview_url || categoryForm.image_file ? (
                      <button
                        type="button"
                        className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-[0.78rem] font-extrabold text-red-500 transition-colors hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-500/10"
                        onClick={clearCategoryImageUpload}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="grid h-[132px] overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    {categoryForm.image_preview_url ? (
                      <img
                        src={categoryForm.image_preview_url}
                        alt="Category preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid place-items-center p-4 text-center text-slate-500">
                        <div>
                          <MdImage className="mx-auto text-3xl text-emerald-500" aria-hidden="true" />
                          <p className="m-0 mt-1 text-[0.92rem] font-extrabold text-slate-900">No preview yet</p>
                          <p className="m-0 mt-1 text-[0.8rem] leading-5">
                            Add a square or landscape category image.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <ImageDropZone
                  label={isEdit ? "Change category photo" : "Category photo"}
                  imageLabel={categoryForm.image_label}
                  onFileSelect={handleCategoryImage}
                  onError={(message) => toast.error(message)}
                  compact
                />
              </aside>
            </div>

            <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
              <Button variant="secondary" onClick={closeCategoryForm} className="min-w-[104px] rounded-[12px]">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingKey === "category"} className="min-w-[140px] rounded-[12px]">
                {submittingKey === "category" ? "Saving..." : "Save Category"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderItemForm = (categoryId) => {
    if (!itemMode || String(itemMode.categoryId) !== String(categoryId)) {
      return null;
    }

    const isEdit = itemMode.type === "edit";
    const compactInputClassName =
      "min-h-[44px] rounded-[12px] px-3 py-2 text-[0.95rem]";
    const compactTextareaClassName =
      "min-h-[84px] rounded-[12px] px-3 py-2 text-[0.95rem] resize-y";

    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
        onClick={closeItemForm}
      >
        <div
          className="max-h-[88vh] w-full max-w-[1040px] overflow-y-auto rounded-[8px] border-2 border-brand-500/20 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfa_100%)] p-4 shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[0.76rem] font-extrabold uppercase tracking-[0.16em] text-brand-600">
                {isEdit ? "Edit item" : "New item"}
              </p>
              <h4 className="m-0 mt-1 text-[1.14rem] font-extrabold text-text-strong">
                {isEdit ? "Update this menu item" : `Add item to ${selectedCategoryName}`}
              </h4>
              {!isEdit ? (
                <p className="m-0 mt-1 text-[0.9rem] text-text-muted">
                  This item will be created inside the opened category.
                </p>
              ) : null}
            </div>
            <Button variant="ghost" size="sm" leadingIcon={<MdClose />} onClick={closeItemForm}>
              Close
            </Button>
          </div>

          <form onSubmit={submitItem} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <InputField
                  label="Item name"
                  value={itemForm.item_name}
                  onChange={(event) => setItemField("item_name", event.target.value)}
                  placeholder="Example: Crispy Fish Bagel"
                  inputClassName={compactInputClassName}
                />
                <InputField
                  label="Category"
                  as="select"
                  value={itemForm.category_id}
                  onChange={(event) => setItemField("category_id", event.target.value)}
                  inputClassName={compactInputClassName}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category_name}
                    </option>
                  ))}
                </InputField>
              </div>
              <InputField
                label="Description"
                as="textarea"
                rows="3"
                value={itemForm.item_description}
                onChange={(event) => setItemField("item_description", event.target.value)}
                placeholder="What makes this item clear for staff and customers?"
                inputClassName={compactTextareaClassName}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <InputField
                  label="Price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(event) => setItemField("price", event.target.value)}
                  placeholder="0.00"
                  inputClassName={compactInputClassName}
                />
                <InputField
                  label="Discount price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.discount_price}
                  onChange={(event) => setItemField("discount_price", event.target.value)}
                  placeholder="Optional"
                  inputClassName={compactInputClassName}
                />
                <InputField
                  label="Prep time"
                  type="number"
                  min="0"
                  step="1"
                  value={itemForm.preparation_time}
                  onChange={(event) => setItemField("preparation_time", event.target.value)}
                  placeholder="Minutes"
                  inputClassName={compactInputClassName}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FoodTypeChoice
                  value={itemForm.is_veg}
                  onChange={(value) => setItemField("is_veg", value)}
                />
                <FieldToggle
                  label="Popular"
                  active={itemForm.is_popular}
                  activeText="Popular"
                  inactiveText="Standard"
                  onClick={() => setItemField("is_popular", !itemForm.is_popular)}
                />
                <FieldToggle
                  label="New item"
                  active={itemForm.is_new}
                  activeText="New"
                  inactiveText="Regular"
                  onClick={() => setItemField("is_new", !itemForm.is_new)}
                />
                {isEdit ? (
                  <FieldToggle
                    label="Availability"
                    active={itemForm.is_active}
                    activeText="Available"
                    inactiveText="Hidden"
                    onClick={() => setItemField("is_active", !itemForm.is_active)}
                  />
                ) : null}
              </div>
            </div>
            <aside className="grid content-start gap-2">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="ui-label">Image Preview</span>
                  {itemForm.image_preview_url || itemForm.image_file ? (
                    <button
                      type="button"
                      className="rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-[0.78rem] font-extrabold text-red-500 transition-colors hover:bg-red-500/10"
                      onClick={clearItemImageUpload}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid min-h-[145px] overflow-hidden rounded-[8px] border border-border-subtle bg-surface-muted">
                  {itemForm.image_preview_url ? (
                    <img
                      src={itemForm.image_preview_url}
                      alt="Item preview"
                      className="h-full min-h-[145px] w-full object-cover"
                    />
                  ) : (
                    <div className="grid min-h-[145px] place-items-center p-4 text-center text-text-muted">
                      <div>
                        <MdImage className="mx-auto text-3xl text-brand-500" />
                        <p className="m-0 mt-1 font-bold text-text-strong">No preview yet</p>
                        <p className="m-0 mt-1 text-[0.86rem]">
                          Drag or browse an image below.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <ImageDropZone
                label={isEdit ? "Change item photo" : "Item photo"}
                imageLabel={itemForm.image_label}
                onFileSelect={handleItemImage}
                onError={(message) => toast.error(message)}
                compact
              />
            </aside>
            <div className="flex flex-wrap gap-2 xl:col-span-2">
              <Button type="submit" disabled={submittingKey === "item"}>
                {submittingKey === "item" ? "Saving..." : isEdit ? "Save Item" : "Create Item"}
              </Button>
              <Button variant="secondary" onClick={closeItemForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderAddonForm = (itemId) => {
    if (!addonMode || String(addonMode.itemId) !== String(itemId)) {
      return null;
    }

    const isEdit = addonMode.type === "edit";

    return (
      <div className="rounded-[8px] border-2 border-brand-500/20 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-[0.74rem] font-extrabold uppercase tracking-[0.16em] text-brand-600">
              {isEdit ? "Edit add-on" : "New add-on"}
            </p>
            <h5 className="m-0 mt-1 text-[1rem] font-extrabold text-text-strong">
              {isEdit ? "Update this add-on" : `Add option for ${selectedAddonItemName}`}
            </h5>
          </div>
          <Button variant="ghost" size="sm" leadingIcon={<MdClose />} onClick={closeAddonForm}>
            Close
          </Button>
        </div>

        <form onSubmit={submitAddon} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InputField
              label="Group"
              value={addonForm.addon_group}
              onChange={(event) => setAddonField("addon_group", event.target.value)}
              placeholder="Example: Add sides"
            />
            <InputField
              label="Option name"
              value={addonForm.addon_name}
              onChange={(event) => setAddonField("addon_name", event.target.value)}
              placeholder="Example: Chips"
            />
            <InputField
              label="Price"
              type="number"
              min="0"
              step="0.01"
              value={addonForm.addon_price}
              onChange={(event) => setAddonField("addon_price", event.target.value)}
              placeholder="0.00"
            />
            <InputField
              label="Sort order"
              type="number"
              min="0"
              step="1"
              value={addonForm.sort_order}
              onChange={(event) => setAddonField("sort_order", event.target.value)}
              placeholder="0"
            />
          </div>

          {isEdit ? (
            <FieldToggle
              label="Add-on status"
              active={addonForm.is_active}
              activeText="Active"
              inactiveText="Inactive"
              onClick={() => setAddonField("is_active", !addonForm.is_active)}
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submittingKey === "addon"}>
              {submittingKey === "addon" ? "Saving..." : isEdit ? "Save Add-on" : "Create Add-on"}
            </Button>
            <Button variant="secondary" onClick={closeAddonForm}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="ui-page">
      <div className="px-6 pt-3 pb-6">
        <PageSection
          eyebrow="Menu Manager"
          title="Menu Management"
          actions={
            <Button leadingIcon={<MdAdd />} onClick={startAddCategory}>
              Add Category
            </Button>
          }
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="bg-[linear-gradient(135deg,#ffffff_0%,#f5fbf7_100%)]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-[8px] bg-brand-500 text-3xl text-white">
                <MdRestaurantMenu />
              </div>
       

     <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div>
                <strong className="block text-[1.7rem] text-text-strong">{categories.length}</strong>
                <span className="text-[0.78rem] font-bold uppercase tracking-wide text-text-muted">
                  Categories
                </span>
              </div>
              <div>
                <strong className="block text-[1.7rem] text-text-strong">{items.length}</strong>
                <span className="text-[0.78rem] font-bold uppercase tracking-wide text-text-muted">
                  Items
                </span>
              </div>
              <div>
                <strong className="block text-[1.7rem] text-text-strong">{totalActiveItems}</strong>
                <span className="text-[0.78rem] font-bold uppercase tracking-wide text-text-muted">
                  Active
                </span>
              </div>
              <div>
                <strong className="block text-[1.7rem] text-text-strong">{totalActiveAddons}</strong>
                <span className="text-[0.78rem] font-bold uppercase tracking-wide text-text-muted">
                  Add-ons
                </span>
              </div>
            </div>


            </div>
          </Card>

 
        </div>

        <div className="mt-5 grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-border-subtle bg-white px-4 py-3 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
            <label className="relative min-w-[260px] flex-1">
              <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-text-muted" />
              <input
                className="ui-input-base pl-10"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search category or item"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOpenCategoryId(null)}>
                Collapse All
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOpenCategoryId(filteredCategories[0]?.id || null)}
                disabled={!filteredCategories.length}
              >
                Open First
              </Button>
            </div>
          </div>

          {loading ? (
            <Card>
              <p className="m-0 text-text-muted">Loading menu catalog...</p>
            </Card>
          ) : null}

          {!loading && filteredCategories.length === 0 ? (
            <Card>
              <div className="grid min-h-[180px] place-items-center text-center">
                <div>
                  <MdImage className="mx-auto text-5xl text-brand-500" />
                  <h3 className="m-0 mt-2 text-[1.25rem] font-extrabold text-text-strong">
                    No categories found
                  </h3>
                  <p className="m-0 mt-1 text-text-muted">
                    Create a category first, then add food items inside it.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {!loading &&
            filteredCategories.map((category) => {
              const categoryItems = itemsByCategory[String(category.id)] || [];
              const isOpen = String(openCategoryId) === String(category.id);
              const categoryIsActive = Number(category.is_active) === 1;

              return (
                <Card
                  key={category.id}
                  className={`relative overflow-hidden p-0 transition-all duration-200 ${
                    isOpen
                      ? "border-2 border-emerald-500/35 bg-[linear-gradient(180deg,#f3fcf8_0%,#ffffff_100%)] shadow-[0_24px_60px_rgba(16,185,129,0.16)]"
                      : categoryIsActive
                        ? "bg-white"
                        : "bg-surface-muted/70"
                  }`}
                >
                  {isOpen ? (
                    <span className="absolute left-0 top-0 h-full w-1.5 bg-emerald-500" aria-hidden="true" />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                    <button
                      type="button"
                      className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-border-subtle bg-surface-muted"
                      onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
                    >
                      <img
                        className={`h-full w-full object-cover ${
                          categoryIsActive ? "" : "opacity-45 grayscale"
                        }`}
                        src={getImageUrl(category, "category_image") || placeholder(category.category_name)}
                        alt={category.category_name}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.src = placeholder(category.category_name);
                        }}
                      />
                    </button>

                    <button
                      type="button"
                      className={`min-w-[220px] flex-1 text-left ${
                        categoryIsActive ? "" : "opacity-60"
                      }`}
                      onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="m-0 text-[1.35rem] font-extrabold text-text-strong">
                          {category.category_name}
                        </h3>
                        {isOpen ? (
                          <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[0.72rem] font-extrabold uppercase tracking-wide text-white">
                            Open
                          </span>
                        ) : null}
                      </div>
                      <p className="m-0 mt-1 max-w-[72ch] text-[0.94rem] leading-6 text-text-muted">
                        {category.category_description || "No description added yet."}
                      </p>
                    </button>

                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                      <span className="rounded-full bg-surface-panel px-3 py-2 text-[0.88rem] font-extrabold text-text-strong">
                        {categoryItems.length} items
                      </span>
                      <InlineStatusToggle
                        active={categoryIsActive}
                        activeText="Active"
                        inactiveText="Disabled"
                        disabled={submittingKey === `category-status-${category.id}`}
                        onClick={() => toggleCategoryStatus(category)}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        leadingIcon={<MdEdit />}
                        onClick={() => startEditCategory(category)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leadingIcon={<MdDeleteOutline />}
                        disabled={submittingKey === `category-delete-${category.id}`}
                        onClick={() => deleteCategory(category)}
                      >
                        Delete
                      </Button>
                      <button
                        type="button"
                        className="grid h-10 w-10 place-items-center rounded-[8px] border border-border-subtle bg-white text-2xl text-brand-600 transition-colors hover:bg-surface-panel"
                        onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
                        aria-label={isOpen ? "Collapse category" : "Expand category"}
                      >
                        {isOpen ? <MdExpandLess /> : <MdExpandMore />}
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="border-t border-emerald-500/20 bg-[#f8fffb] p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="m-0 text-[1.08rem] font-extrabold text-text-strong">
                            Items in {category.category_name}
                          </h4>
                          <p className="m-0 mt-1 text-[0.9rem] text-text-muted">
                            Add or edit items in a focused popup while this category stays open.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          leadingIcon={<MdAdd />}
                          onClick={() => startAddItem(category.id)}
                        >
                          Add Item
                        </Button>
                      </div>

                      {categoryItems.length === 0 ? (
                        <div className="rounded-[8px] border border-dashed border-border-subtle bg-white p-6 text-center">
                          <p className="m-0 font-bold text-text-strong">No food items in this category yet.</p>
                          <p className="m-0 mt-1 text-text-muted">Use Add Item to create the first one.</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {categoryItems.map((item) => {
                            const itemAddons = addonsByItem[String(item.id)] || [];
                            const areAddonsOpen = String(openAddonItemId) === String(item.id);
                            const itemIsActive = Number(item.is_active) === 1;

                            return (
                              <div
                                key={item.id}
                                className={`overflow-hidden rounded-[8px] border border-border-subtle ${
                                  itemIsActive ? "bg-white" : "bg-surface-muted/70"
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-4 p-3 sm:p-4">
                                  <img
                                    className={`h-20 w-24 shrink-0 rounded-[8px] object-cover ${
                                      itemIsActive ? "" : "opacity-45 grayscale"
                                    }`}
                                    src={getImageUrl(item, "item_image") || placeholder(item.item_name, "f7efe5")}
                                    alt={item.item_name}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(event) => {
                                      event.currentTarget.src = placeholder(item.item_name, "f7efe5");
                                    }}
                                  />
                                  <div className={`min-w-[220px] flex-1 ${itemIsActive ? "" : "opacity-60"}`}>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h5 className="m-0 text-[1.05rem] font-extrabold text-text-strong">
                                        {item.item_name}
                                      </h5>
                                      <span className={`rounded-full px-2.5 py-1 text-[0.72rem] font-extrabold uppercase ${foodTypeBadgeClassName(item.is_veg)}`}>
                                        {foodTypeLabel(item.is_veg)}
                                      </span>
                                      {Number(item.is_popular) === 1 ? (
                                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[0.72rem] font-extrabold uppercase text-amber-600">
                                          Popular
                                        </span>
                                      ) : null}
                                      {Number(item.is_new) === 1 ? (
                                        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[0.72rem] font-extrabold uppercase text-blue-600">
                                          New
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="m-0 mt-1 max-w-[76ch] text-[0.9rem] leading-6 text-text-muted">
                                      {item.item_description || "No description added yet."}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.9rem] font-bold">
                                      <span className="text-text-strong">
                                        {item.discount_price != null ? money(item.discount_price) : money(item.price)}
                                      </span>
                                      {item.discount_price != null ? (
                                        <span className="text-text-muted line-through">{money(item.price)}</span>
                                      ) : null}
                                      <span className="text-text-muted">
                                        {item.preparation_time != null ? `${item.preparation_time} min` : "Prep time not set"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-auto flex flex-wrap gap-2">
                                    <InlineStatusToggle
                                      active={itemIsActive}
                                      activeText="Available"
                                      inactiveText="Disabled"
                                      disabled={submittingKey === `item-status-${item.id}`}
                                      onClick={() => toggleItemStatus(item)}
                                    />
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      leadingIcon={areAddonsOpen ? <MdExpandLess /> : <MdExpandMore />}
                                      onClick={() => {
                                        setOpenAddonItemId(areAddonsOpen ? null : item.id);
                                        setAddonMode(null);
                                      }}
                                    >
                                      Add-ons ({itemAddons.length})
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      leadingIcon={<MdEdit />}
                                      onClick={() => startEditItem(item)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      leadingIcon={<MdDeleteOutline />}
                                      disabled={submittingKey === `item-delete-${item.id}`}
                                      onClick={() => deleteItem(item)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                                {areAddonsOpen ? (
                                  <div className="border-t border-border-subtle bg-surface-muted/40 p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <h6 className="m-0 text-[1rem] font-extrabold text-text-strong">
                                          Add-ons for {item.item_name}
                                        </h6>
                                        <p className="m-0 mt-1 text-[0.86rem] text-text-muted">
                                          Add choices like sauces, sides, extras, or custom options.
                                        </p>
                                      </div>
                                      <Button
                                        size="sm"
                                        leadingIcon={<MdAdd />}
                                        onClick={() => startAddAddon(item)}
                                      >
                                        Add Add-on
                                      </Button>
                                    </div>

                                    {addonMode?.type === "add" &&
                                    String(addonMode.itemId) === String(item.id) ? (
                                      <div className="mb-3">{renderAddonForm(item.id)}</div>
                                    ) : null}

                                    {itemAddons.length === 0 ? (
                                      <div className="rounded-[8px] border border-dashed border-border-subtle bg-white p-5 text-center">
                                        <p className="m-0 font-bold text-text-strong">
                                          No add-ons for this item yet.
                                        </p>
                                        <p className="m-0 mt-1 text-text-muted">
                                          Use Add Add-on to create choices for this food item.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="grid gap-2">
                                        {itemAddons.map((addon) => {
                                          const isEditingAddon =
                                            addonMode?.type === "edit" &&
                                            String(addonMode.id) === String(addon.id);

                                          return (
                                            <div
                                              key={addon.id}
                                              className="overflow-hidden rounded-[8px] border border-border-subtle bg-white"
                                            >
                                              <div className="flex flex-wrap items-center gap-3 p-3">
                                                <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-brand-500/10 text-xl font-black text-brand-600">
                                                  +
                                                </div>
                                                <div className="min-w-[200px] flex-1">
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <strong className="text-text-strong">
                                                      {addon.addon_name}
                                                    </strong>
                                                    <span className="rounded-full bg-surface-panel px-2.5 py-1 text-[0.74rem] font-extrabold text-text-muted">
                                                      {addon.addon_group}
                                                    </span>
                                                    <StatusPill
                                                      active={Number(addon.is_active) === 1}
                                                      label={Number(addon.is_active) === 1 ? "Active" : "Inactive"}
                                                    />
                                                  </div>
                                                  <p className="m-0 mt-1 text-[0.86rem] font-bold text-text-muted">
                                                    {money(addon.addon_price)} | Sort {addon.sort_order ?? 0}
                                                  </p>
                                                </div>
                                                <div className="ml-auto flex flex-wrap gap-2">
                                                  <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    leadingIcon={<MdEdit />}
                                                    onClick={() => startEditAddon(addon)}
                                                  >
                                                    Edit
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    leadingIcon={<MdDeleteOutline />}
                                                    disabled={submittingKey === `addon-delete-${addon.id}`}
                                                    onClick={() => deleteAddon(addon)}
                                                  >
                                                    Delete
                                                  </Button>
                                                </div>
                                              </div>
                                              {isEditingAddon ? (
                                                <div className="border-t border-border-subtle p-3">
                                                  {renderAddonForm(item.id)}
                                                </div>
                                              ) : null}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </Card>
              );
            })}

          {categoryMode ? renderCategoryForm() : null}
          {itemMode ? renderItemForm(itemMode.categoryId) : null}
        </div>
      </div>
    </div>
  );
}

export default MenuCatalogBuilder;

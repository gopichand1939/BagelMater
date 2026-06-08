import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORY_GET } from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import ImageDropZone from "../common/ImageDropZone";
import { getImageUrl } from "../../Utils/imageUrl";
import { Button, Card, InputField, PageSection } from "../ui";

const getInitialFormState = (selectedItem) => ({
  category_id: selectedItem?.category_id ? String(selectedItem.category_id) : "",
  item_name: selectedItem?.item_name || "",
  item_description: selectedItem?.item_description || "",
  item_image: selectedItem?.item_image || "",
  price: selectedItem?.price != null ? String(selectedItem.price) : "",
  discount_price: selectedItem?.discount_price != null ? String(selectedItem.discount_price) : "",
  preparation_time: selectedItem?.preparation_time != null ? String(selectedItem.preparation_time) : "",
  is_popular:
    selectedItem && typeof selectedItem.is_popular !== "undefined"
      ? Number(selectedItem.is_popular) === 1
      : false,
  is_new:
    selectedItem && typeof selectedItem.is_new !== "undefined"
      ? Number(selectedItem.is_new) === 1
      : false,
  is_veg:
    selectedItem && typeof selectedItem.is_veg !== "undefined"
      ? normalizeFoodType(selectedItem.is_veg)
      : null,
  is_active:
    selectedItem && typeof selectedItem.is_active !== "undefined"
      ? Number(selectedItem.is_active) === 1
      : true,
});

const foodTypeOptions = [
  { label: "Veg", value: 1, className: "bg-success-bg text-success-text" },
  { label: "Non-Veg", value: 0, className: "bg-red-500/10 text-red-500" },
  { label: "Both / N/A", value: 2, className: "bg-slate-100 text-slate-800" },
];

function normalizeFoodType(value) {
  const numericValue = Number(value);
  return [0, 1, 2].includes(numericValue) ? numericValue : null;
}

function ItemForm({ selectedItem, onSubmit, isSubmitting }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(getInitialFormState(selectedItem));
  const [errors, setErrors] = useState({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    setFormData(getInitialFormState(selectedItem));
    setErrors({});
    setPreviewUrl("");
    setSelectedFile(null);
  }, [selectedItem]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetchWithRefreshToken(CATEGORY_GET);
        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(data.message || "Failed to fetch categories");
        }

        setCategories(data.data || []);
      } catch (_error) {
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const imageLabel = useMemo(() => {
    if (selectedFile?.name) {
      return selectedFile.name;
    }

    if (!formData.item_image) {
      return "No image selected";
    }

    return formData.item_image;
  }, [formData.item_image, selectedFile]);

  const selectedCategoryData = useMemo(
    () =>
      categories.find(
        (category) => String(category.id) === String(formData.category_id)
      ) || null,
    [categories, formData.category_id]
  );

  const setFieldValue = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleImageSelect = (file) => {
    if (!file) {
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFieldValue("item_image", file.name);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.category_id) {
      nextErrors.category_id = "Category is required";
    }

    if (!formData.item_name.trim()) {
      nextErrors.item_name = "Item name is required";
    }

    if (!formData.item_description.trim()) {
      nextErrors.item_description = "Item description is required";
    }

    if (!selectedFile && !selectedItem?.item_image) {
      nextErrors.item_image = "Item image path is required";
    }

    if (formData.price !== "" && (isNaN(Number(formData.price)) || Number(formData.price) < 0)) {
      nextErrors.price = "Price must be a valid positive number";
    }

    if (formData.discount_price !== "" && (isNaN(Number(formData.discount_price)) || Number(formData.discount_price) < 0)) {
      nextErrors.discount_price = "Discount price must be a valid positive number";
    }

    if (formData.preparation_time !== "" && (isNaN(Number(formData.preparation_time)) || Number(formData.preparation_time) < 0)) {
      nextErrors.preparation_time = "Preparation time must be a valid positive number";
    }

    if (formData.is_veg === null) {
      nextErrors.is_veg = "Select Veg, Non-Veg, or Both / N/A";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event?.preventDefault?.();

    if (!validateForm()) {
      return;
    }

    onSubmit?.({
      id: selectedItem?.id,
      category_id: Number(formData.category_id),
      item_name: formData.item_name.trim(),
      item_description: formData.item_description.trim(),
      item_image: formData.item_image.trim(),
      item_image_file: selectedFile,
      price: formData.price !== "" ? parseFloat(formData.price) : 0,
      discount_price: formData.discount_price !== "" ? parseFloat(formData.discount_price) : null,
      preparation_time: formData.preparation_time !== "" ? parseInt(formData.preparation_time, 10) : null,
      is_popular: formData.is_popular ? 1 : 0,
      is_new: formData.is_new ? 1 : 0,
      is_veg: formData.is_veg,
      is_active: formData.is_active ? 1 : 0,
    });
  };

  return (
    <div className="ui-page">
      <Card>
        <PageSection
          eyebrow="Items"
          title={selectedItem ? "Edit Item" : "Create Item"}
          actions={
            <Button variant="secondary" onClick={() => navigate("/items")}>
              Back
            </Button>
          }
        />

        <form onSubmit={handleSubmit} className="mt-5 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="grid min-w-0 max-w-[760px] content-start gap-[18px]">
            <InputField
              label="Category"
              as="select"
              value={formData.category_id}
              onChange={(event) => setFieldValue("category_id", event.target.value)}
              error={errors.category_id}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.category_name}
                </option>
              ))}
            </InputField>

            <InputField
              label="Item Name"
              type="text"
              value={formData.item_name}
              onChange={(event) => setFieldValue("item_name", event.target.value)}
              placeholder="Enter item name"
              error={errors.item_name}
            />

            <InputField
              label="Description"
              as="textarea"
              rows="5"
              value={formData.item_description}
              onChange={(event) =>
                setFieldValue("item_description", event.target.value)
              }
              placeholder="Enter item description"
              inputClassName="min-h-[150px] resize-y"
              error={errors.item_description}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <InputField
                label="Price (£)"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(event) => setFieldValue("price", event.target.value)}
                placeholder="e.g. 5.95"
                error={errors.price}
              />

              <InputField
                label="Discount Price (£)"
                type="number"
                step="0.01"
                min="0"
                value={formData.discount_price}
                onChange={(event) => setFieldValue("discount_price", event.target.value)}
                placeholder="e.g. 4.50"
                hint="Leave empty for no discount"
                error={errors.discount_price}
              />
            </div>

            <InputField
              label="Preparation Time (minutes)"
              type="number"
              step="1"
              min="0"
              value={formData.preparation_time}
              onChange={(event) => setFieldValue("preparation_time", event.target.value)}
              placeholder="e.g. 25"
              error={errors.preparation_time}
            />

            <ImageDropZone
              label="Upload Item Image"
              imageLabel={imageLabel}
              error={errors.item_image}
              onFileSelect={handleImageSelect}
              onError={(message) => setErrors((prev) => ({ ...prev, item_image: message }))}
            />

            <InputField
              label="Stored Image Path"
              type="text"
              value={formData.item_image}
              readOnly
            />

            <div className="flex flex-wrap gap-6 pt-2">
              <div className="ui-field-shell">
                <span className="ui-label">Popular</span>
                <button
                  type="button"
                  className={`ui-status-toggle ${formData.is_popular ? "bg-amber-500/10 text-amber-500" : ""}`}
                  onClick={() => setFieldValue("is_popular", !formData.is_popular)}
                >
                  <span className={`ui-status-toggle-dot ${formData.is_popular ? "bg-amber-500" : "bg-text-muted/40"}`} />
                  <span className="text-[0.92rem] font-bold">
                    {formData.is_popular ? "Popular" : "Standard"}
                  </span>
                </button>
              </div>

              <div className="ui-field-shell">
                <span className="ui-label">New Item</span>
                <button
                  type="button"
                  className={`ui-status-toggle ${formData.is_new ? "bg-blue-500/20 text-blue-400" : ""}`}
                  onClick={() => setFieldValue("is_new", !formData.is_new)}
                >
                  <span className={`ui-status-toggle-dot ${formData.is_new ? "bg-blue-500" : "bg-text-muted/40"}`} />
                  <span className="text-[0.92rem] font-bold">{formData.is_new ? "NEW" : "Normal"}</span>
                </button>
              </div>

              <div className="ui-field-shell">
                <span className="ui-label">Food Type</span>
                <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  {foodTypeOptions.map((option) => {
                    const isSelected = formData.is_veg === option.value;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={isSelected}
                        className={`rounded-full px-4 py-2 text-[0.92rem] font-bold transition-all ${
                          isSelected ? option.className : "text-text-muted hover:bg-slate-50"
                        }`}
                        onClick={() => setFieldValue("is_veg", option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {errors.is_veg ? (
                  <span className="text-[0.82rem] font-semibold text-red-500">{errors.is_veg}</span>
                ) : null}
              </div>
            </div>

              <div className="ui-field-shell mt-2">
                <span className="ui-label">Active Status</span>
                <button
                  type="button"
                  className={`ui-status-toggle ${formData.is_active ? "bg-success-bg text-success-text" : ""}`}
                  onClick={() => setFieldValue("is_active", !formData.is_active)}
                >
                  <span className={`ui-status-toggle-dot ${formData.is_active ? "bg-success-text" : "bg-text-muted/40"}`} />
                  <span className="text-[0.92rem] font-bold">
                    {formData.is_active ? "Active" : "Inactive"}
                  </span>
                </button>
              </div>
          </div>

          <aside className="grid min-w-0 max-w-[460px] content-start gap-[18px]">
            <div className="grid gap-2">
              <span className="ui-label">Category Preview</span>
              <div className="grid min-h-[240px] max-h-[280px] place-items-center overflow-hidden rounded-[20px] border border-dashed border-border-subtle bg-surface-muted">
                {selectedCategoryData?.category_image ? (
                  <img
                    src={getImageUrl(selectedCategoryData, "category_image")}
                    alt={selectedCategoryData.category_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="p-6 text-center text-text-muted">
                    <p>Select category to preview it here.</p>
                  </div>
                )}
              </div>

              <Card tone="subtle" padding="sm" className="grid gap-[6px]">
                <span className="text-[0.86rem] font-semibold text-text-muted">Selected category</span>
                <strong className="break-words text-[0.95rem] text-text-strong">
                  {selectedCategoryData?.category_name || "No category selected"}
                </strong>
              </Card>
            </div>

            <div className="grid gap-2">
              <span className="ui-label">Item Image Preview</span>
              <div className="grid min-h-[240px] max-h-[280px] place-items-center overflow-hidden rounded-[20px] border border-dashed border-border-subtle bg-surface-muted">
                {previewUrl ? (
                  <img src={previewUrl} alt="Item preview" className="h-full w-full object-cover" />
                ) : formData.item_image ? (
                  <img
                    src={getImageUrl(selectedItem || { item_image: formData.item_image }, "item_image")}
                    alt="Item preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="p-6 text-center text-text-muted">
                    <p>Choose an image to preview it here.</p>
                  </div>
                )}
              </div>

              <Card tone="subtle" padding="sm" className="grid gap-[2px]">
                <span className="ui-label">Selected file</span>
                <strong className="break-words text-[0.95rem] font-bold text-text-strong">{imageLabel}</strong>
              </Card>
            </div>
          </aside>

          <div className="flex flex-wrap gap-2.5 lg:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default ItemForm;

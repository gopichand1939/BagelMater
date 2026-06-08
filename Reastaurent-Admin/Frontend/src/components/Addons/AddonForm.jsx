import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, InputField, PageSection } from "../ui";

const getInitialFormState = (selectedAddon) => ({
  addon_group: selectedAddon?.addon_group || "",
  min_select:
    selectedAddon?.min_select != null ? String(selectedAddon.min_select) : "0",
  max_select:
    selectedAddon?.max_select != null ? String(selectedAddon.max_select) : "99",
  addon_name: selectedAddon?.addon_name || "",
  addon_price:
    selectedAddon?.addon_price != null ? String(selectedAddon.addon_price) : "",
  sort_order:
    selectedAddon?.sort_order != null ? String(selectedAddon.sort_order) : "0",
  is_active:
    selectedAddon && typeof selectedAddon.is_active !== "undefined"
      ? Number(selectedAddon.is_active) === 1
      : true,
});

function AddonForm({ selectedAddon, onSubmit, isSubmitting }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(getInitialFormState(selectedAddon));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(getInitialFormState(selectedAddon));
    setErrors({});
  }, [selectedAddon]);

  const setFieldValue = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.addon_group.trim()) {
      nextErrors.addon_group = "Add-on group is required";
    }

    const minSelect = Number(formData.min_select);
    const maxSelect = Number(formData.max_select);

    if (
      formData.min_select === "" ||
      Number.isNaN(minSelect) ||
      minSelect < 0
    ) {
      nextErrors.min_select = "Minimum selections must be 0 or more";
    }

    if (
      formData.max_select === "" ||
      Number.isNaN(maxSelect) ||
      maxSelect < 1
    ) {
      nextErrors.max_select = "Maximum selections must be at least 1";
    }

    if (!nextErrors.min_select && !nextErrors.max_select && minSelect > maxSelect) {
      nextErrors.max_select = "Maximum must be greater than or equal to minimum";
    }

    if (!formData.addon_name.trim()) {
      nextErrors.addon_name = "Add-on name is required";
    }

    if (
      formData.addon_price !== "" &&
      (isNaN(Number(formData.addon_price)) || Number(formData.addon_price) < 0)
    ) {
      nextErrors.addon_price = "Add-on price must be a valid positive number";
    }

    if (
      formData.sort_order !== "" &&
      (isNaN(Number(formData.sort_order)) || Number(formData.sort_order) < 0)
    ) {
      nextErrors.sort_order = "Sort order must be a valid positive number";
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
      id: selectedAddon?.id,
      addon_group: formData.addon_group.trim(),
      min_select: parseInt(formData.min_select, 10),
      max_select: parseInt(formData.max_select, 10),
      addon_name: formData.addon_name.trim(),
      addon_price:
        formData.addon_price !== "" ? parseFloat(formData.addon_price) : 0,
      sort_order:
        formData.sort_order !== "" ? parseInt(formData.sort_order, 10) : 0,
      is_active: formData.is_active ? 1 : 0,
    });
  };

  return (
    <div className="ui-page">
      <Card>
        <PageSection
          eyebrow="Addon"
          title={selectedAddon ? "Edit Addon Master" : "Create Addon Master"}
          actions={
            <Button variant="secondary" onClick={() => navigate("/addon")}>
              Back
            </Button>
          }
        />

        <form onSubmit={handleSubmit} className="mt-5 grid max-w-[760px] gap-[18px]">
          <InputField
            label="Add-on Group"
            type="text"
            value={formData.addon_group}
            onChange={(event) => setFieldValue("addon_group", event.target.value)}
            placeholder="e.g. Add Sides?"
            error={errors.addon_group}
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <InputField
              label="Minimum Select"
              type="number"
              step="1"
              min="0"
              value={formData.min_select}
              onChange={(event) => setFieldValue("min_select", event.target.value)}
              placeholder="e.g. 0"
              error={errors.min_select}
            />

            <InputField
              label="Maximum Select"
              type="number"
              step="1"
              min="1"
              value={formData.max_select}
              onChange={(event) => setFieldValue("max_select", event.target.value)}
              placeholder="e.g. 5"
              error={errors.max_select}
            />
          </div>

          <InputField
            label="Add-on Name"
            type="text"
            value={formData.addon_name}
            onChange={(event) => setFieldValue("addon_name", event.target.value)}
            placeholder="e.g. Chips"
            error={errors.addon_name}
          />

          <InputField
            label="Add-on Price (£)"
            type="number"
            step="0.01"
            min="0"
            value={formData.addon_price}
            onChange={(event) => setFieldValue("addon_price", event.target.value)}
            placeholder="e.g. 3.50"
            error={errors.addon_price}
          />

          <InputField
            label="Sort Order"
            type="number"
            step="1"
            min="0"
            value={formData.sort_order}
            onChange={(event) => setFieldValue("sort_order", event.target.value)}
            placeholder="e.g. 1"
            error={errors.sort_order}
          />

          <div className="ui-field-shell">
            <span className="ui-label">Active Status</span>
            <button
              type="button"
              className={`ui-status-toggle ${formData.is_active ? "bg-success-bg text-success-text" : ""}`}
              onClick={() => setFieldValue("is_active", !formData.is_active)}
            >
              <span
                className={`ui-status-toggle-dot ${
                  formData.is_active ? "bg-success-text" : "bg-text-muted/40"
                }`}
              />
              <span className="text-[0.92rem] font-bold">
                {formData.is_active ? "Active" : "Inactive"}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AddonForm;

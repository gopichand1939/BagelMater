import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  ADDON_ELIGIBILITY_BULK_ASSIGN,
  ADDON_ELIGIBILITY_DELETE,
  ADDON_ELIGIBILITY_LIST,
  ADDON_ELIGIBILITY_LOOKUPS,
  ADDON_ELIGIBILITY_UPDATE,
  ADDON_ITEMS_BY_GROUP,
} from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import StatusPill from "../common/StatusPill";
import Table from "../Table";
import { Button, Card, InputField, PageSection } from "../ui";

const initialForm = {
  category_ids: [],
  item_ids: [],
  groupSelections: [],
};

const createGroupSelection = (groupId) => ({
  group_id: String(groupId),
  addon_item_ids: [],
  is_required: false,
  is_active: true,
});

function AddonEligibility() {
  const [data, setData] = useState([]);
  const [lookups, setLookups] = useState({ items: [], groups: [], categories: [] });
  const [addonItemsByGroup, setAddonItemsByGroup] = useState({});
  const [loadingGroups, setLoadingGroups] = useState({});
  const [pendingGroupId, setPendingGroupId] = useState("");
  const [formData, setFormData] = useState(initialForm);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const itemsByCategory = useMemo(() => {
    return lookups.items.reduce((grouped, item) => {
      const key = String(item.category_id || "uncategorized");
      grouped[key] = grouped[key] || [];
      grouped[key].push(item);
      return grouped;
    }, {});
  }, [lookups.items]);

  const selectedItemCount = formData.item_ids.length;

  const fetchLookups = async () => {
    try {
      const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_LOOKUPS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch eligibility lookups");
      }

      setLookups(responseData.data || { items: [], groups: [], categories: [] });
    } catch (error) {
      toast.error(error.message || "Failed to fetch eligibility lookups");
    }
  };

  const fetchData = async (page = currentPage, limit = pageSize) => {
    setLoading(true);

    try {
      const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_LIST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, limit }),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch addon eligibility");
      }

      setData(responseData.data || []);
      setTotalCount(responseData.pagination?.totalRecords || 0);
    } catch (error) {
      toast.error(error.message || "Failed to fetch addon eligibility");
    } finally {
      setLoading(false);
    }
  };

  const fetchAddonItemsByGroup = async (groupId) => {
    const key = String(groupId);

    if (!groupId || addonItemsByGroup[key]) {
      return;
    }

    setLoadingGroups((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await fetchWithRefreshToken(ADDON_ITEMS_BY_GROUP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: Number(groupId) }),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch addon items");
      }

      setAddonItemsByGroup((prev) => ({
        ...prev,
        [key]: responseData.data || [],
      }));
    } catch (error) {
      toast.error(error.message || "Failed to fetch addon items");
    } finally {
      setLoadingGroups((prev) => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const resetForm = () => {
    setSelectedMapping(null);
    setPendingGroupId("");
    setFormData(initialForm);
    setErrors({});
  };

  const setGroupField = (groupId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      groupSelections: prev.groupSelections.map((selection) =>
        String(selection.group_id) === String(groupId)
          ? { ...selection, [field]: value }
          : selection
      ),
    }));
    setErrors((prev) => ({ ...prev, groupSelections: null }));
  };

  const addGroupSelection = (groupId = pendingGroupId) => {
    if (!groupId) {
      setErrors((prev) => ({ ...prev, groupSelections: "Select an add-on group" }));
      return;
    }

    if (formData.groupSelections.some((selection) => String(selection.group_id) === String(groupId))) {
      setErrors((prev) => ({ ...prev, groupSelections: "This add-on group is already selected" }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      groupSelections: [...prev.groupSelections, createGroupSelection(groupId)],
    }));
    setPendingGroupId("");
    setErrors((prev) => ({ ...prev, groupSelections: null }));
    fetchAddonItemsByGroup(groupId);
  };

  const removeGroupSelection = (groupId) => {
    setFormData((prev) => ({
      ...prev,
      groupSelections: prev.groupSelections.filter(
        (selection) => String(selection.group_id) !== String(groupId)
      ),
    }));
  };

  const toggleAddonItem = (groupId, addonItemId) => {
    const id = Number(addonItemId);

    setFormData((prev) => ({
      ...prev,
      groupSelections: prev.groupSelections.map((selection) => {
        if (String(selection.group_id) !== String(groupId)) {
          return selection;
        }

        const selected = selection.addon_item_ids.includes(id);
        return {
          ...selection,
          addon_item_ids: selected
            ? selection.addon_item_ids.filter((itemId) => itemId !== id)
            : [...selection.addon_item_ids, id],
        };
      }),
    }));
    setErrors((prev) => ({ ...prev, groupSelections: null }));
  };

  const selectAllAddonItems = (groupId) => {
    const items = addonItemsByGroup[String(groupId)] || [];
    setGroupField(
      groupId,
      "addon_item_ids",
      items.map((item) => Number(item.id))
    );
  };

  const toggleCategory = (categoryId) => {
    const id = Number(categoryId);
    const categoryItems = itemsByCategory[String(categoryId)] || [];
    const categoryItemIds = categoryItems.map((item) => Number(item.item_id));

    setFormData((prev) => {
      const selected = prev.category_ids.includes(id);

      return {
        ...prev,
        category_ids: selected
          ? prev.category_ids.filter((value) => value !== id)
          : [...prev.category_ids, id],
        item_ids: selected
          ? prev.item_ids.filter((itemId) => !categoryItemIds.includes(itemId))
          : prev.item_ids,
      };
    });
    setErrors((prev) => ({ ...prev, item_ids: null }));
  };

  const toggleMainItem = (itemId) => {
    const id = Number(itemId);

    setFormData((prev) => {
      const selected = prev.item_ids.includes(id);

      return {
        ...prev,
        item_ids: selected
          ? prev.item_ids.filter((value) => value !== id)
          : [...prev.item_ids, id],
      };
    });
    setErrors((prev) => ({ ...prev, item_ids: null }));
  };

  const selectAllItemsInCategory = (categoryId) => {
    const categoryItems = itemsByCategory[String(categoryId)] || [];
    const categoryItemIds = categoryItems.map((item) => Number(item.item_id));

    setFormData((prev) => ({
      ...prev,
      item_ids: Array.from(new Set([...prev.item_ids, ...categoryItemIds])),
    }));
  };

  const clearItemsInCategory = (categoryId) => {
    const categoryItems = itemsByCategory[String(categoryId)] || [];
    const categoryItemIds = categoryItems.map((item) => Number(item.item_id));

    setFormData((prev) => ({
      ...prev,
      item_ids: prev.item_ids.filter((itemId) => !categoryItemIds.includes(itemId)),
    }));
    setErrors((prev) => ({ ...prev, item_ids: null }));
  };

  const handleEdit = (row) => {
    const groupSelection = {
      ...createGroupSelection(row.group_id),
      addon_item_ids: Array.isArray(row.addon_item_ids)
        ? row.addon_item_ids.map((itemId) => Number(itemId))
        : [],
      is_required: Number(row.is_required) === 1,
      is_active: Number(row.is_active) === 1,
    };

    setSelectedMapping(row);
    setFormData({
      category_ids: row.category_id ? [Number(row.category_id)] : [],
      item_ids: row.item_id ? [Number(row.item_id)] : [],
      groupSelections: [groupSelection],
    });
    fetchAddonItemsByGroup(row.group_id);
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.item_ids.length) {
      nextErrors.item_ids = "Select at least one main item";
    }

    if (!formData.groupSelections.length) {
      nextErrors.groupSelections = "Select at least one add-on group";
    }

    formData.groupSelections.forEach((selection) => {
      if (!selection.addon_item_ids.length) {
        nextErrors.groupSelections = "Every selected group needs at least one add-on item";
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const assignments = formData.groupSelections.map((selection) => ({
      group_id: Number(selection.group_id),
      addon_item_ids: selection.addon_item_ids,
      is_required: selection.is_required ? 1 : 0,
      is_active: selection.is_active ? 1 : 0,
    }));
    const payload = selectedMapping
      ? {
          ...assignments[0],
          id: selectedMapping.id,
          item_id: Number(formData.item_ids[0]),
        }
      : {
          target_mode: "selected_items",
          item_ids: formData.item_ids,
          assignments,
        };

    setIsSubmitting(true);
    try {
      const response = await fetchWithRefreshToken(
        selectedMapping ? ADDON_ELIGIBILITY_UPDATE : ADDON_ELIGIBILITY_BULK_ASSIGN,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to save eligibility");
      }

      toast.success(selectedMapping ? "Eligibility updated successfully" : "Addon eligibility assigned successfully");
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to save eligibility");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete addon eligibility for "${row.item_name}"?`)) {
      return;
    }

    try {
      const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_DELETE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to delete eligibility");
      }

      toast.success("Eligibility deleted successfully");
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to delete eligibility");
    }
  };

  const headers = [
    { key: "id", label: "Id", width: "60px" },
    { key: "item_name", label: "Item", width: "180px" },
    { key: "group_name", label: "Addon Group", width: "180px" },
    {
      key: "selected_addon_items",
      label: "Addon Items",
      width: "260px",
      content: (item) => item.selected_addon_items || "-",
    },
    {
      key: "is_required",
      label: "Required",
      width: "100px",
      content: (item) => (Number(item.is_required) === 1 ? "Yes" : "No"),
    },
    {
      key: "is_active",
      label: "Status",
      width: "90px",
      content: (item) => <StatusPill active={Number(item.is_active) === 1} />,
    },
    {
      key: "actions",
      label: "Actions",
      width: "170px",
      content: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => handleEdit(row)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => handleDelete(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="ui-page">
      <div className="px-6 pt-3 pb-1">
        <PageSection eyebrow="Addons" title="Addons Eligible For Items" />
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="grid gap-[22px]">
          <section className="grid gap-4">
            <div className="grid gap-1">
              <h3 className="m-0 text-[1.05rem] font-black text-text-strong">
                Add-on Groups and Items
              </h3>
              <span className="text-[0.9rem] font-semibold text-text-muted">
                Add multiple groups, then choose the allowed add-on items under each group.
              </span>
            </div>

            <div className="grid max-w-[760px] gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <InputField
                label="Add-on Group"
                as="select"
                value={pendingGroupId}
                onChange={(event) => setPendingGroupId(event.target.value)}
                error={errors.groupSelections && !formData.groupSelections.length ? errors.groupSelections : null}
              >
                <option value="">Select add-on group</option>
                {lookups.groups
                  .filter(
                    (group) =>
                      !formData.groupSelections.some(
                        (selection) => String(selection.group_id) === String(group.id)
                      )
                  )
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.group_name}
                    </option>
                  ))}
              </InputField>
              <div className="flex items-end">
                <Button type="button" onClick={() => addGroupSelection()}>
                  Add Group
                </Button>
              </div>
            </div>

            {formData.groupSelections.length ? (
              <div className="grid gap-3">
                {formData.groupSelections.map((selection) => {
                  const group = lookups.groups.find(
                    (item) => String(item.id) === String(selection.group_id)
                  );
                  const addonItems = addonItemsByGroup[String(selection.group_id)] || [];
                  const loadingItems = Boolean(loadingGroups[String(selection.group_id)]);

                  return (
                    <div
                      key={selection.group_id}
                      className="grid gap-4 rounded-[8px] border border-border-subtle bg-surface-muted/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="m-0 text-[1rem] font-black text-text-strong">
                            {group?.group_name || "Selected Group"}
                          </h4>
                          <span className="text-[0.84rem] font-semibold text-text-muted">
                            {selection.addon_item_ids.length} add-on items selected
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" onClick={() => selectAllAddonItems(selection.group_id)}>
                            Select All
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setGroupField(selection.group_id, "addon_item_ids", [])}>
                            Clear
                          </Button>
                          <Button type="button" variant="danger" onClick={() => removeGroupSelection(selection.group_id)}>
                            Remove
                          </Button>
                        </div>
                      </div>

                      {loadingItems ? (
                        <p className="m-0 text-[0.92rem] font-semibold text-text-muted">Loading add-on items...</p>
                      ) : addonItems.length ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {addonItems.map((addonItem) => {
                            const checked = selection.addon_item_ids.includes(Number(addonItem.id));

                            return (
                              <label
                                key={addonItem.id}
                                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-2 transition-colors ${
                                  checked
                                    ? "border-emerald-500/30 bg-emerald-50 text-emerald-800"
                                    : "border-border-subtle bg-white text-text-strong hover:bg-surface-panel"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleAddonItem(selection.group_id, addonItem.id)}
                                  className="h-4 w-4 accent-emerald-600"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[0.92rem] font-bold">
                                    {addonItem.addon_item_name}
                                  </span>
                                  <span className="block text-[0.8rem] font-semibold text-text-muted">
                                    GBP {Number(addonItem.price || 0).toFixed(2)}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="m-0 text-[0.92rem] font-semibold text-text-muted">
                          No active add-on items found for this group.
                        </p>
                      )}

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="ui-field-shell">
                          <span className="ui-label">Required</span>
                          <button
                            type="button"
                            className={`ui-status-toggle ${selection.is_required ? "bg-amber-500/10 text-amber-500" : ""}`}
                            onClick={() => setGroupField(selection.group_id, "is_required", !selection.is_required)}
                          >
                            <span className={`ui-status-toggle-dot ${selection.is_required ? "bg-amber-500" : "bg-text-muted/40"}`} />
                            <span className="text-[0.92rem] font-bold">
                              {selection.is_required ? "Yes" : "No"}
                            </span>
                          </button>
                        </div>
                        <div className="ui-field-shell">
                          <span className="ui-label">Active Status</span>
                          <button
                            type="button"
                            className={`ui-status-toggle ${selection.is_active ? "bg-success-bg text-success-text" : ""}`}
                            onClick={() => setGroupField(selection.group_id, "is_active", !selection.is_active)}
                          >
                            <span className={`ui-status-toggle-dot ${selection.is_active ? "bg-success-text" : "bg-text-muted/40"}`} />
                            <span className="text-[0.92rem] font-bold">
                              {selection.is_active ? "Active" : "Inactive"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {errors.groupSelections ? <small className="ui-error-text">{errors.groupSelections}</small> : null}
          </section>

          <section className="grid gap-4">
            <div className="grid gap-1">
              <h3 className="m-0 text-[1.05rem] font-black text-text-strong">
                Main Item Categories
              </h3>
              <span className="text-[0.9rem] font-semibold text-text-muted">
                Select categories, then choose the main items inside each category.
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lookups.categories.map((category) => {
                const checked = formData.category_ids.includes(Number(category.id));

                return (
                  <label
                    key={category.id}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-2 ${
                      checked ? "border-emerald-500/30 bg-emerald-50 text-emerald-800" : "border-border-subtle bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(category.id)}
                      disabled={Boolean(selectedMapping)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span className="text-[0.92rem] font-bold">{category.category_name}</span>
                  </label>
                );
              })}
            </div>

            {formData.category_ids.length ? (
              <div className="grid gap-3">
                {formData.category_ids.map((categoryId) => {
                  const category = lookups.categories.find((item) => Number(item.id) === Number(categoryId));
                  const categoryItems = itemsByCategory[String(categoryId)] || [];
                  const categoryItemIds = categoryItems.map((item) => Number(item.item_id));
                  const selectedCategoryItemCount = categoryItemIds.filter((itemId) =>
                    formData.item_ids.includes(itemId)
                  ).length;
                  const allCategoryItemsSelected =
                    categoryItemIds.length > 0 && selectedCategoryItemCount === categoryItemIds.length;
                  const noCategoryItemsSelected = selectedCategoryItemCount === 0;

                  return (
                    <div key={categoryId} className="grid gap-3 rounded-[8px] border border-border-subtle bg-surface-muted/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-text-strong">{category?.category_name || "Category"}</strong>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => selectAllItemsInCategory(categoryId)}
                            disabled={Boolean(selectedMapping) || allCategoryItemsSelected || !categoryItemIds.length}
                          >
                            Select All Items
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => clearItemsInCategory(categoryId)}
                            disabled={Boolean(selectedMapping) || noCategoryItemsSelected}
                          >
                            Clear Items
                          </Button>
                        </div>
                      </div>

                      {categoryItems.length ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {categoryItems.map((item) => {
                            const checked = formData.item_ids.includes(Number(item.item_id));

                            return (
                              <label
                                key={item.item_id}
                                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-2 ${
                                  checked ? "border-emerald-500/30 bg-emerald-50 text-emerald-800" : "border-border-subtle bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleMainItem(item.item_id)}
                                  disabled={Boolean(selectedMapping) && Number(item.item_id) !== Number(formData.item_ids[0])}
                                  className="h-4 w-4 accent-emerald-600"
                                />
                                <span className="truncate text-[0.92rem] font-bold">{item.item_name}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="m-0 text-[0.92rem] font-semibold text-text-muted">
                          No active items found in this category.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {errors.item_ids ? <small className="ui-error-text">{errors.item_ids}</small> : null}
          </section>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Submitting..."
                : selectedMapping
                  ? "Update Eligibility"
                  : `Assign To ${selectedItemCount} Item${selectedItemCount === 1 ? "" : "s"}`}
            </Button>
            {selectedMapping ? (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel Edit
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Table
        data={data}
        headers={headers}
        loading={loading}
        searchPlaceholder="Search addon eligibility..."
        totalRowsLabel="Total Mappings"
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={(page, nextPageSize) => {
          setCurrentPage(page);
          setPageSize(nextPageSize);
        }}
        totalItems={totalCount}
      />
    </div>
  );
}

export default AddonEligibility;

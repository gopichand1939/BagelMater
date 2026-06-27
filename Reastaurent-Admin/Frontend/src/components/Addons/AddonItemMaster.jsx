import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  MdSearch,
  MdEdit,
  MdDeleteOutline,
  MdLayers,
  MdAttachMoney,
  MdOutlineDescription,
  MdChevronLeft,
  MdChevronRight,
  MdRefresh,
  MdInfoOutline,
  MdArrowDownward,
  MdUnfoldMore,
  MdUnfoldLess,
} from "react-icons/md";
import {
  ADDON_GROUP_BY_ID,
  ADDON_ITEM_CREATE,
  ADDON_ITEM_DELETE,
  ADDON_ITEM_LIST,
  ADDON_ITEM_UPDATE,
} from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { Button, Card, PageSection } from "../ui";

const initialForm = {
  group_id: "",
  addon_item_name: "",
  price: "",
  description: "",
  is_active: true,
};

function AddonItemMaster() {
  const [data, setData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [selectedItem, setSelectedItem] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collapse state for group cards
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Search query state
  const [searchQuery, setSearchQuery] = useState("");

  const fetchGroups = async () => {
    try {
      const response = await fetchWithRefreshToken(ADDON_GROUP_BY_ID, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch addon groups");
      }

      setGroups(responseData.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch addon groups");
    }
  };

  // Fetch all addon items (no pagination limit in backend request so we can display them grouped in full)
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetchWithRefreshToken(ADDON_ITEM_LIST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, limit: 1000 }), // large limit to retrieve all options for grouping
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch addon items");
      }

      setData(responseData.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch addon items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchData();
  }, []);

  const setFieldValue = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData(initialForm);
    setErrors({});
  };

  const handleEdit = (row) => {
    setSelectedItem(row);
    setFormData({
      group_id: row.group_id ? String(row.group_id) : "",
      addon_item_name: row.addon_item_name || "",
      price: row.price != null ? String(row.price) : "",
      description: row.description || "",
      is_active: Number(row.is_active) === 1,
    });
    // Scroll form into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validate = () => {
    const nextErrors = {};
    const price = Number(formData.price || 0);

    if (!formData.group_id) {
      nextErrors.group_id = "Group is required";
    }
    if (!formData.addon_item_name.trim()) {
      nextErrors.addon_item_name = "Addon item name is required";
    }
    if (Number.isNaN(price) || price < 0) {
      nextErrors.price = "Price must be 0 or more";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const payload = {
      id: selectedItem?.id,
      group_id: Number(formData.group_id),
      addon_item_name: formData.addon_item_name.trim(),
      price: formData.price !== "" ? Number(formData.price) : 0,
      description: formData.description.trim(),
      is_active: formData.is_active ? 1 : 0,
    };

    setIsSubmitting(true);
    try {
      const response = await fetchWithRefreshToken(
        selectedItem ? ADDON_ITEM_UPDATE : ADDON_ITEM_CREATE,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to save addon item");
      }

      toast.success(
        selectedItem ? "Addon item updated successfully" : "Addon item created successfully"
      );
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to save addon item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete addon option "${row.addon_item_name}"?`)) {
      return;
    }

    try {
      const response = await fetchWithRefreshToken(ADDON_ITEM_DELETE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to delete addon item");
      }

      toast.success("Addon item deleted successfully");
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to delete addon item");
    }
  };

  // Toggle active status directly from the card
  const handleToggleActive = async (item) => {
    try {
      const payload = {
        id: item.id,
        group_id: Number(item.group_id),
        addon_item_name: item.addon_item_name,
        price: Number(item.price || 0),
        description: item.description || "",
        is_active: Number(item.is_active) === 1 ? 0 : 1,
      };

      const response = await fetchWithRefreshToken(ADDON_ITEM_UPDATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to toggle status");
      }

      toast.success(`"${item.addon_item_name}" status updated`);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  // Collapse/Expand toggles
  const toggleCollapseGroup = (groupId) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleToggleAllGroups = (collapse) => {
    const next = {};
    groupedData.forEach((g) => {
      next[g.group_id] = collapse;
    });
    setCollapsedGroups(next);
  };

  // Group items under their respective master addon groups
  const groupedData = useMemo(() => {
    const map = new Map();

    // Initialize all master groups to keep the layout complete and logical
    groups.forEach((g) => {
      map.set(g.id, {
        group_id: g.id,
        group_name: g.group_name,
        items: [],
      });
    });

    // Populate group items
    data.forEach((item) => {
      const gId = item.group_id;
      if (!map.has(gId)) {
        map.set(gId, {
          group_id: gId,
          group_name: item.group_name || "Unassigned",
          items: [],
        });
      }
      map.get(gId).items.push(item);
    });

    return Array.from(map.values());
  }, [data, groups]);

  // Client-side search filtering at group and item levels
  const filteredGroupedData = useMemo(() => {
    return groupedData
      .map((g) => {
        const matchingItems = g.items.filter((item) => {
          const matchName = String(item.addon_item_name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
          const matchDesc = String(item.description || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
          return matchName || matchDesc;
        });

        return {
          ...g,
          items: matchingItems,
        };
      })
      .filter((g) => {
        // If there's an active search query, hide groups that have no matching options
        if (searchQuery) {
          return g.items.length > 0;
        }
        return true;
      });
  }, [groupedData, searchQuery]);

  return (
    <div className="ui-page min-h-[calc(100vh-80px)] bg-slate-50/70 p-4 sm:p-6 text-slate-800">
      <div className="max-w-full space-y-6">
        {/* Page title and intro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <PageSection eyebrow="Menu Inventory" title="Add-on Options Master" />
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              Create and manage individual choice items (e.g. Caramel Syrup, Hummus) grouped under
              their parent master categories. Link these groups to items in the **Link Add-ons** page.
            </p>
          </div>
        </div>

        {/* Side-by-side Workstation Grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          
          {/* Left Column: Create / Edit Form card */}
          <div className="lg:col-span-1">
            <Card className="border border-slate-200/80 shadow-sm bg-white p-5 rounded-2xl sticky top-6">
              <div className="border-b border-slate-100 pb-3 mb-3.5 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-800">
                  {selectedItem ? `Edit Option (ID: #${selectedItem.id})` : "Create Add-on Option"}
                </h3>
                {selectedItem && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                  >
                    Reset Form
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Group select */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MdLayers size={14} className="text-slate-400" />
                    Parent Add-on Group
                  </label>
                  <select
                    value={formData.group_id}
                    onChange={(event) => setFieldValue("group_id", event.target.value)}
                    className={`w-full rounded-xl border bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 ${
                      errors.group_id ? "border-red-400 focus:border-red-500" : "border-slate-200"
                    }`}
                  >
                    <option value="">Choose addon group...</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.group_name}
                      </option>
                    ))}
                  </select>
                  {errors.group_id && (
                    <span className="text-xs font-semibold text-red-500 block mt-1">
                      {errors.group_id}
                    </span>
                  )}
                </div>

                {/* Addon name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Option Name
                  </label>
                  <input
                    type="text"
                    value={formData.addon_item_name}
                    onChange={(event) => setFieldValue("addon_item_name", event.target.value)}
                    placeholder="e.g. Caramel Syrup"
                    className={`w-full rounded-xl border bg-slate-50/20 py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 ${
                      errors.addon_item_name ? "border-red-400 focus:border-red-500" : "border-slate-200"
                    }`}
                  />
                  {errors.addon_item_name && (
                    <span className="text-xs font-semibold text-red-500 block mt-1">
                      {errors.addon_item_name}
                    </span>
                  )}
                </div>

                {/* Price & Active Status Side-by-Side row */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <MdAttachMoney size={14} className="text-slate-400" />
                      Price (GBP)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(event) => setFieldValue("price", event.target.value)}
                      placeholder="e.g. 0.99"
                      className={`w-full rounded-xl border bg-slate-50/20 py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 ${
                        errors.price ? "border-red-400 focus:border-red-500" : "border-slate-200"
                      }`}
                    />
                    {errors.price && (
                      <span className="text-xs font-semibold text-red-500 block mt-1">
                        {errors.price}
                      </span>
                    )}
                  </div>

                  {/* Active Status toggler */}
                  <div className="flex flex-col">
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Active Status
                    </span>
                    <div className="flex items-center justify-between bg-slate-50 py-2 px-3 rounded-xl border border-slate-100 h-[38px] shrink-0">
                      <span className="text-xs text-slate-500 font-extrabold">
                        {formData.is_active ? "Active" : "Disabled"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFieldValue("is_active", !formData.is_active)}
                        className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out outline-none ${
                          formData.is_active ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-150 ease-in-out ${
                            formData.is_active ? "translate-x-3.5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MdOutlineDescription size={14} className="text-slate-400" />
                    Description (Optional)
                  </label>
                  <textarea
                    rows="2"
                    value={formData.description}
                    onChange={(event) => setFieldValue("description", event.target.value)}
                    placeholder="Describe option details..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/20 py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 resize-none"
                  />
                </div>

                {/* Submit actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100 mt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 font-bold text-sm shadow-sm"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : selectedItem
                      ? "Update Option"
                      : "Create Option"}
                  </Button>
                  {selectedItem && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetForm}
                      className="rounded-xl px-4 py-2.5 font-bold text-sm"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Groups Catalog Grid */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search Filter and Refresh panel */}
            <Card className="border border-slate-200/80 shadow-sm bg-white p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-md">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <MdSearch size={20} />
                </span>
                <input
                  type="text"
                  placeholder="Search option names or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end items-center">
                {/* Expand / Collapse All Accordion Controls */}
                {groupedData.length > 0 && (
                  <div className="flex border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden h-9 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAllGroups(true)}
                      className="flex items-center gap-1 px-3 text-[10px] font-extrabold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-r border-slate-100 transition"
                      title="Collapse All Groups"
                    >
                      <MdUnfoldLess size={14} />
                      Collapse All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllGroups(false)}
                      className="flex items-center gap-1 px-3 text-[10px] font-extrabold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                      title="Expand All Groups"
                    >
                      <MdUnfoldMore size={14} />
                      Expand All
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    fetchGroups();
                    fetchData();
                  }}
                  className="flex items-center gap-1 h-9 px-3 text-xs font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-xl transition shadow-xs"
                >
                  <MdRefresh size={16} />
                  Reload
                </button>
              </div>
            </Card>

            {/* Grid of Group Cards */}
            {loading ? (
              <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <span className="mt-3 text-xs font-semibold">Loading options database...</span>
              </div>
            ) : filteredGroupedData.length === 0 ? (
              <div className="text-center py-16 border border-slate-200 border-dashed rounded-2xl bg-white p-6">
                <MdLayers size={40} className="mx-auto text-slate-300 mb-2" />
                <h3 className="text-base font-extrabold text-slate-600">No Options Match Search</h3>
                <p className="text-sm text-slate-400 mt-1">Try resetting your search query.</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 items-start">
                {filteredGroupedData.map((group) => {
                  const isCollapsed = collapsedGroups[group.group_id] !== false;

                  return (
                    <div
                      key={group.group_id}
                      className="border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Group Header panel */}
                        <div
                          className={`bg-slate-50/55 px-5 py-4 flex items-center justify-between transition-all ${
                            isCollapsed ? "" : "border-b border-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Collapse/Expand trigger chevron */}
                            <button
                              type="button"
                              onClick={() => toggleCollapseGroup(group.group_id)}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/40 transition shrink-0"
                              title={isCollapsed ? "Expand Options" : "Collapse Options"}
                            >
                              {isCollapsed ? (
                                <MdChevronRight size={18} />
                              ) : (
                                <MdArrowDownward size={18} />
                              )}
                            </button>

                            <span className="rounded-lg bg-emerald-100 text-emerald-800 text-[0.72rem] px-2.5 py-1 font-black shrink-0 uppercase tracking-wide">
                              Group
                            </span>
                            <h4
                              onClick={() => toggleCollapseGroup(group.group_id)}
                              className="m-0 text-[1.05rem] font-black text-slate-700 truncate cursor-pointer select-none"
                            >
                              {group.group_name}
                            </h4>
                          </div>
                          
                          <span className="text-xs text-slate-400 font-extrabold shrink-0 pl-1">
                            {group.items.length} options
                          </span>
                        </div>

                        {/* Options list inside Group (conditionally hidden on collapse) */}
                        {!isCollapsed && (
                          <div className="p-4 space-y-3 animate-fade-in">
                            {group.items.length === 0 ? (
                              <div className="text-center py-8 border border-slate-100 border-dashed rounded-xl bg-slate-50/20 text-slate-400 flex flex-col items-center gap-1.5">
                                <MdInfoOutline size={18} className="text-slate-300" />
                                <span className="text-xs font-bold">No options.</span>
                                <span className="text-[10px] text-slate-400 px-2 leading-relaxed">
                                  Add items to group &quot;{group.group_name}&quot; using the form.
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {group.items.map((item) => {
                                  const isActive = Number(item.is_active) === 1;
                                  const isEditing = selectedItem?.id === item.id;
                                  
                                  return (
                                    <div
                                      key={item.id}
                                      className={`border rounded-xl p-3 bg-white transition duration-150 flex flex-col justify-between ${
                                        isEditing
                                          ? "border-emerald-500 bg-emerald-50/5 ring-2 ring-emerald-500/10 shadow-xs"
                                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/10"
                                      }`}
                                    >
                                      <div>
                                        {/* Item Header: Name & Quick Active status switch */}
                                        <div className="flex items-start justify-between gap-3 mb-1">
                                          <span className="font-extrabold text-[0.82rem] text-slate-800 truncate block">
                                            {item.addon_item_name}
                                          </span>
                                          
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => handleToggleActive(item)}
                                              className={`relative inline-flex h-4.5 w-7.5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out outline-none ${
                                                isActive ? "bg-emerald-500" : "bg-slate-200"
                                              }`}
                                              title={isActive ? "Set Inactive" : "Set Active"}
                                            >
                                              <span
                                                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-150 ease-in-out ${
                                                  isActive ? "translate-x-3" : "translate-x-0"
                                                }`}
                                              />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Info details row */}
                                        <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                          <span className="text-slate-400 font-bold uppercase">
                                            ID: #{item.id}
                                          </span>
                                          <span className="h-1 w-1 bg-slate-200 rounded-full shrink-0" />
                                          <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-500/5">
                                            £ {Number(item.price || 0).toFixed(2)}
                                          </span>
                                        </div>

                                        {/* Notes/description box */}
                                        {item.description ? (
                                          <p className="mt-2 text-[0.72rem] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100/60 line-clamp-1 leading-relaxed">
                                            {item.description}
                                          </p>
                                        ) : (
                                          <span className="text-[0.7rem] text-slate-400 italic block mt-2">
                                            No description.
                                          </span>
                                        )}
                                      </div>

                                      {/* Actions bottom panel */}
                                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleEdit(item)}
                                          className="flex items-center gap-1 text-[0.7rem] font-bold text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition"
                                        >
                                          <MdEdit size={11} />
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(item)}
                                          className="flex items-center gap-1 text-[0.7rem] font-bold text-red-500 hover:text-white border border-red-50 hover:bg-red-500 px-2.5 py-1 rounded-lg transition"
                                        >
                                          <MdDeleteOutline size={11} />
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddonItemMaster;

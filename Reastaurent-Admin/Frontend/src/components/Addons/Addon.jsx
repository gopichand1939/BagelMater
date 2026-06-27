import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  MdSearch,
  MdEdit,
  MdDeleteOutline,
  MdLayers,
  MdOutlineDescription,
  MdChevronLeft,
  MdChevronRight,
  MdRefresh,
} from "react-icons/md";
import {
  ADDON_GROUP_CREATE,
  ADDON_GROUP_DELETE,
  ADDON_GROUP_LIST,
  ADDON_GROUP_UPDATE,
} from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { Button, Card, PageSection } from "../ui";

const initialForm = {
  group_name: "",
  description: "",
  is_active: true,
};

function Addon() {
  const [data, setData] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search filter query state
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch groups in a single call for client-side catalog rendering
      const response = await fetchWithRefreshToken(ADDON_GROUP_LIST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, limit: 1000 }),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch addon groups");
      }

      setData(responseData.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch addon groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const setFieldValue = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const resetForm = () => {
    setSelectedGroup(null);
    setFormData(initialForm);
    setErrors({});
  };

  const handleEdit = (row) => {
    setSelectedGroup(row);
    setFormData({
      group_name: row.group_name || "",
      description: row.description || "",
      is_active: Number(row.is_active) === 1,
    });
    // Scroll form into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.group_name.trim()) {
      nextErrors.group_name = "Group name is required";
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
      id: selectedGroup?.id,
      group_name: formData.group_name.trim(),
      description: formData.description.trim(),
      is_active: formData.is_active ? 1 : 0,
    };

    setIsSubmitting(true);
    try {
      const response = await fetchWithRefreshToken(
        payload.id ? ADDON_GROUP_UPDATE : ADDON_GROUP_CREATE,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to save addon group");
      }

      toast.success(
        payload.id ? "Addon group updated successfully" : "Addon group created successfully"
      );
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to save addon group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete addon group "${row.group_name}"?`)) {
      return;
    }

    try {
      const response = await fetchWithRefreshToken(ADDON_GROUP_DELETE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to delete addon group");
      }

      toast.success("Addon group deleted successfully");
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to delete addon group");
    }
  };

  // Toggle active status directly from the card
  const handleToggleActive = async (item) => {
    try {
      const payload = {
        id: item.id,
        group_name: item.group_name,
        description: item.description || "",
        is_active: Number(item.is_active) === 1 ? 0 : 1,
      };

      const response = await fetchWithRefreshToken(ADDON_GROUP_UPDATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();

      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to toggle status");
      }

      toast.success(`"${item.group_name}" status updated`);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  // Client-side search filtering of groups
  const filteredGroups = useMemo(() => {
    return data.filter((item) => {
      const matchName = String(item.group_name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchDesc = String(item.description || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchName || matchDesc;
    });
  }, [data, searchQuery]);

  return (
    <div className="ui-page min-h-[calc(100vh-80px)] bg-slate-50/70 p-4 sm:p-6 text-slate-800">
      <div className="max-w-full space-y-6">
        {/* Page title and intro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <PageSection eyebrow="Menu Inventory" title="Add-on Group Master" />
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              Create and manage parent add-on groups (e.g. Choose Milk, Extras Sauce). Add options to
              these groups in **Add-on Items** and configure links to menu items.
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
                  {selectedGroup ? `Edit Group (ID: #${selectedGroup.id})` : "Create Add-on Group"}
                </h3>
                {selectedGroup && (
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
                {/* Group Name input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MdLayers size={14} className="text-slate-400" />
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={formData.group_name}
                    onChange={(event) => setFieldValue("group_name", event.target.value)}
                    placeholder="e.g. Extras Sauce"
                    className={`w-full rounded-xl border bg-slate-50/20 py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 ${
                      errors.group_name ? "border-red-400 focus:border-red-500" : "border-slate-200"
                    }`}
                  />
                  {errors.group_name && (
                    <span className="text-xs font-semibold text-red-500 block mt-1">
                      {errors.group_name}
                    </span>
                  )}
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
                    placeholder="Describe group requirements..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/20 py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 resize-none"
                  />
                </div>

                {/* Active Status toggler */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 h-[48px] shrink-0">
                  <div>
                    <span className="text-[0.78rem] font-bold text-slate-700 block">
                      Active Status
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-none">
                      Enable group selection
                    </span>
                  </div>
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

                {/* Submit actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100 mt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 font-bold text-sm shadow-sm"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : selectedGroup
                      ? "Update Group"
                      : "Create Group"}
                  </Button>
                  {selectedGroup && (
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
            
            {/* Search and Refresh panel */}
            <Card className="border border-slate-200/80 shadow-sm bg-white p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-md">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <MdSearch size={20} />
                </span>
                <input
                  type="text"
                  placeholder="Search group names or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end items-center">
                <button
                  type="button"
                  onClick={() => fetchData()}
                  className="flex items-center gap-1 h-9 px-3 text-xs font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-xl transition shadow-xs"
                >
                  <MdRefresh size={16} />
                  Reload
                </button>
                <div className="px-3.5 py-2 text-xs font-black bg-slate-100 text-slate-600 rounded-xl">
                  {data.length} Total Groups
                </div>
              </div>
            </Card>

            {/* Grid of Group Cards */}
            {loading ? (
              <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <span className="mt-3 text-xs font-semibold">Loading groups database...</span>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-16 border border-slate-200 border-dashed rounded-2xl bg-white p-6">
                <MdLayers size={40} className="mx-auto text-slate-300 mb-2" />
                <h3 className="text-base font-extrabold text-slate-600">No Groups Match Search</h3>
                <p className="text-sm text-slate-400 mt-1">Try resetting your search query.</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 items-start">
                {filteredGroups.map((group) => {
                  const isActive = Number(group.is_active) === 1;
                  const isEditing = selectedGroup?.id === group.id;

                  return (
                    <div
                      key={group.id}
                      className={`border rounded-2xl p-4 bg-white shadow-xs transition duration-150 flex flex-col justify-between ${
                        isEditing
                          ? "border-emerald-500 bg-emerald-50/5 ring-2 ring-emerald-500/10 shadow-xs"
                          : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div>
                        {/* Group Header: Title & Quick Active toggler */}
                        <div className="flex items-center justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="rounded-lg bg-emerald-100 text-emerald-800 text-[0.68rem] px-2 py-0.5 font-black uppercase tracking-wide shrink-0">
                              Group
                            </span>
                            <h4 className="m-0 text-[1.05rem] font-black text-slate-700 truncate">
                              {group.group_name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase">
                              {isActive ? "Active" : "Disabled"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(group)}
                              className={`relative inline-flex h-4.5 w-7.5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out outline-none ${
                                isActive ? "bg-emerald-500" : "bg-slate-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-150 ease-in-out ${
                                  isActive ? "translate-x-3.5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* ID info */}
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">
                          ID: #{group.id}
                        </span>

                        {/* Description Notes */}
                        {group.description ? (
                          <p className="mt-3 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3 leading-relaxed">
                            {group.description}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400 italic block mt-3 py-1">
                            No group notes provided.
                          </span>
                        )}
                      </div>

                      {/* Actions footer */}
                      <div className="mt-5 border-t border-slate-50 pt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(group)}
                          className="flex items-center gap-1 text-xs font-bold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition"
                        >
                          <MdEdit size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(group)}
                          className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-white border border-red-100 hover:bg-red-500 px-3 py-1.5 rounded-xl transition"
                        >
                          <MdDeleteOutline size={14} />
                          Delete
                        </button>
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

export default Addon;

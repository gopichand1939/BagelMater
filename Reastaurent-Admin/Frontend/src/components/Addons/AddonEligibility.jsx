import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  MdAdd,
  MdClose,
  MdDeleteOutline,
  MdDragIndicator,
  MdSearch,
  MdCheck,
  MdOutlineSettings,
  MdOutlineCategory,
  MdArrowBack,
  MdChevronRight,
  MdHelpOutline,
  MdListAlt,
  MdArrowDownward,
  MdUnfoldMore,
  MdUnfoldLess,
} from "react-icons/md";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  ADDON_ELIGIBILITY_CREATE,
  ADDON_ELIGIBILITY_DELETE,
  ADDON_ELIGIBILITY_LOOKUPS,
  ADDON_ELIGIBILITY_UPDATE,
  ADDON_ITEMS_BY_GROUP,
  ADDON_BY_ITEM,
  ADDON_ELIGIBILITY_REORDER_GROUPS,
  ADDON_ELIGIBILITY_REORDER_ITEMS,
} from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { Button, Card, PageSection } from "../ui";

function AddonEligibility() {
  // Lookups loaded from server on startup
  const [lookups, setLookups] = useState({ items: [], groups: [], categories: [] });
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Selected item state
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [linkedGroups, setLinkedGroups] = useState([]);
  const [loadingAddons, setLoadingAddons] = useState(false);

  // Collapse state for group cards
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Caching master addon items per group
  const [addonItemsByGroup, setAddonItemsByGroup] = useState({});
  const [loadingMasterItems, setLoadingMasterItems] = useState({});

  // Item Catalog search / filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Modal / form states for linking new group
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState("");
  const [pendingAddonItemIds, setPendingAddonItemIds] = useState([]);
  const [isLinking, setIsLinking] = useState(false);

  // Fetch initial lookups (items, groups, categories)
  const fetchLookups = async () => {
    setLoadingLookups(true);
    try {
      const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_LOOKUPS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const responseData = await response.json();
      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch lookups");
      }
      setLookups(responseData.data || { items: [], groups: [], categories: [] });
    } catch (error) {
      toast.error(error.message || "Failed to fetch categories & items");
    } finally {
      setLoadingLookups(false);
    }
  };

  // Fetch addons for currently selected item
  const fetchAddonsForItem = async (itemId) => {
    if (!itemId) return;
    setLoadingAddons(true);
    try {
      const response = await fetchWithRefreshToken(ADDON_BY_ITEM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: Number(itemId) }),
      });
      const responseData = await response.json();
      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch addons");
      }
      setLinkedGroups(responseData.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load item addons");
    } finally {
      setLoadingAddons(false);
    }
  };

  // Fetch master addon items for a group (e.g. all possible options)
  const fetchAddonItemsByGroup = async (groupId) => {
    const key = String(groupId);
    if (!groupId || addonItemsByGroup[key]) return;

    setLoadingMasterItems((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetchWithRefreshToken(ADDON_ITEMS_BY_GROUP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: Number(groupId) }),
      });
      const responseData = await response.json();
      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to fetch master items");
      }
      setAddonItemsByGroup((prev) => ({
        ...prev,
        [key]: responseData.data || [],
      }));
    } catch (error) {
      toast.error(error.message || "Failed to load available addon options");
    } finally {
      setLoadingMasterItems((prev) => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    if (selectedItemId) {
      fetchAddonsForItem(selectedItemId);
      setCollapsedGroups({});
    } else {
      setLinkedGroups([]);
    }
  }, [selectedItemId]);

  // Load master items automatically for all linked groups when list is loaded
  useEffect(() => {
    if (linkedGroups && linkedGroups.length > 0) {
      linkedGroups.forEach((group) => {
        fetchAddonItemsByGroup(group.group_id);
      });
    }
  }, [linkedGroups]);

  // Load master items when a new group is selected for pending link
  useEffect(() => {
    if (pendingGroupId) {
      fetchAddonItemsByGroup(pendingGroupId);
      setPendingAddonItemIds([]);
    }
  }, [pendingGroupId]);

  // Selected item configuration
  const selectedItemInfo = useMemo(() => {
    if (!selectedItemId) return null;
    return lookups.items.find((it) => Number(it.item_id) === Number(selectedItemId));
  }, [selectedItemId, lookups.items]);

  // Filter items in catalog
  const filteredCatalogItems = useMemo(() => {
    return lookups.items.filter((item) => {
      const matchSearch = String(item.item_name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchCategory =
        selectedCategoryFilter === "all" ||
        String(item.category_id) === String(selectedCategoryFilter);
      return matchSearch && matchCategory;
    });
  }, [lookups.items, searchQuery, selectedCategoryFilter]);

  // Collapse/Expand togglers
  const toggleCollapseGroup = (groupId) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleToggleAllGroups = (collapse) => {
    const next = {};
    linkedGroups.forEach((g) => {
      next[g.id] = collapse;
    });
    setCollapsedGroups(next);
  };

  // Required or Active status switch trigger
  const handleToggleGroupSetting = async (group, field) => {
    const nextRequired = field === "is_required" ? !group.is_required : group.is_required;
    const nextActive = field === "is_active" ? !group.is_active : group.is_active;

    // Locally update state for responsive UI
    setLinkedGroups((prev) =>
      prev.map((g) =>
        g.id === group.id
          ? { ...g, is_required: nextRequired, is_active: nextActive }
          : g
      )
    );

    try {
      const payload = {
        id: group.id,
        item_id: Number(selectedItemId),
        group_id: Number(group.group_id),
        is_required: nextRequired ? 1 : 0,
        is_active: nextActive ? 1 : 0,
        addon_item_ids: group.options.map((opt) => opt.id),
      };

      const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_UPDATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to update settings");
      }
      toast.success(`Updated settings for "${group.addon_group}"`);
    } catch (error) {
      toast.error(error.message || "Error saving changes");
      fetchAddonsForItem(selectedItemId);
    }
  };

  // Add/Remove addon item via checklist trigger
  const handleToggleAddonItem = async (group, addonItemId) => {
    const optionExists = group.options.some((opt) => opt.id === addonItemId);
    let updatedAddonItemIds = [];

    if (optionExists) {
      updatedAddonItemIds = group.options
        .filter((opt) => opt.id !== addonItemId)
        .map((opt) => opt.id);
    } else {
      updatedAddonItemIds = [...group.options.map((opt) => opt.id), addonItemId];
    }

    if (updatedAddonItemIds.length === 0) {
      toast.warning("Every linked addon group needs at least one enabled addon item.");
      return;
    }

    // Direct local state update for latency compensation
    setLinkedGroups((prev) =>
      prev.map((g) => {
        if (g.id !== group.id) return g;
        const masterList = addonItemsByGroup[String(group.group_id)] || [];
        const nextOptions = masterList.filter((item) =>
          updatedAddonItemIds.includes(Number(item.id))
        ).map((item) => ({
          id: Number(item.id),
          addonOptionId: Number(item.id),
          addon_name: item.addon_item_name,
          addon_item_name: item.addon_item_name,
          price: Number(item.price || 0),
          addon_price: Number(item.price || 0),
          description: item.description,
        }));
        return { ...g, options: nextOptions };
      })
    );

    try {
      const payload = {
        id: group.id,
        item_id: Number(selectedItemId),
        group_id: Number(group.group_id),
        is_required: group.is_required ? 1 : 0,
        is_active: group.is_active ? 1 : 0,
        addon_item_ids: updatedAddonItemIds,
      };

      const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_UPDATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to update items");
      }
      toast.success(optionExists ? "Option removed successfully" : "Option added successfully");
    } catch (error) {
      toast.error(error.message || "Error saving items change");
      fetchAddonsForItem(selectedItemId);
    }
  };

  // Delete eligibility mapping (unlink group)
  const handleUnlinkGroup = async (eligibilityId, groupName) => {
    if (
      !window.confirm(
        `Are you sure you want to unlink the add-on group "${groupName}" from this item?`
      )
    ) {
      return;
    }

    // Optimistic local delete
    setLinkedGroups((prev) => prev.filter((g) => g.id !== eligibilityId));

    try {
      const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_DELETE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eligibilityId }),
      });
      const responseData = await response.json();
      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to delete eligibility");
      }
      toast.success(`Unlinked group "${groupName}"`);
    } catch (error) {
      toast.error(error.message || "Error unlinking group");
      fetchAddonsForItem(selectedItemId);
    }
  };

  // Toggle selection in link group modal checklist
  const handleTogglePendingItem = (itemId) => {
    setPendingAddonItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Create new eligibility mapping
  const handleLinkNewGroupSubmit = async (e) => {
    e.preventDefault();
    if (!pendingGroupId) {
      toast.error("Please select an add-on group");
      return;
    }
    if (pendingAddonItemIds.length === 0) {
      toast.error("Please select at least one add-on item to enable");
      return;
    }

    setIsLinking(true);
    try {
      const payload = {
        item_id: Number(selectedItemId),
        group_id: Number(pendingGroupId),
        is_required: 0,
        is_active: 1,
        addon_item_ids: pendingAddonItemIds,
      };

      const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_CREATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      if (!response.ok || responseData.success === false) {
        throw new Error(responseData.message || "Failed to link add-on group");
      }

      toast.success("Add-on group linked successfully");
      setIsLinkModalOpen(false);
      setPendingGroupId("");
      setPendingAddonItemIds([]);
      fetchAddonsForItem(selectedItemId);
    } catch (error) {
      toast.error(error.message || "Failed to link group");
    } finally {
      setIsLinking(false);
    }
  };

  // Drag and drop reordering handler
  const handleDragEnd = async (result) => {
    const { destination, source, type } = result;
    if (
      !destination ||
      (destination.droppableId === source.droppableId && destination.index === source.index)
    ) {
      return;
    }

    // 1. Group Reordering
    if (type === "GROUPS") {
      const originalGroups = [...linkedGroups];
      const reorderedList = [...linkedGroups];
      const [removed] = reorderedList.splice(source.index, 1);
      reorderedList.splice(destination.index, 0, removed);

      setLinkedGroups(reorderedList);

      try {
        const groupIds = reorderedList.map((g) => g.group_id);
        const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_REORDER_GROUPS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_id: Number(selectedItemId), group_ids: groupIds }),
        });
        const responseData = await response.json();
        if (!response.ok || responseData.success === false) {
          throw new Error(responseData.message || "Failed to update groups order");
        }
        toast.success("Add-on groups order updated");
      } catch (error) {
        toast.error(error.message || "Failed to save reorder. Rolling back.");
        setLinkedGroups(originalGroups);
      }
    }

    // 2. Addon Items Reordering (within a group)
    if (type === "ITEMS") {
      const eligibilityId = Number(source.droppableId.replace("items-droppable-", ""));
      const groupIndex = linkedGroups.findIndex((g) => g.id === eligibilityId);
      if (groupIndex === -1) return;

      const group = linkedGroups[groupIndex];
      const originalGroups = [...linkedGroups];

      const reorderedOptions = [...group.options];
      const [removed] = reorderedOptions.splice(source.index, 1);
      reorderedOptions.splice(destination.index, 0, removed);

      const nextGroups = [...linkedGroups];
      nextGroups[groupIndex] = { ...group, options: reorderedOptions };

      setLinkedGroups(nextGroups);

      try {
        const addonItemIds = reorderedOptions.map((opt) => opt.id);
        const response = await fetchWithRefreshToken(ADDON_ELIGIBILITY_REORDER_ITEMS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eligibility_id: eligibilityId, addon_item_ids: addonItemIds }),
        });
        const responseData = await response.json();
        if (!response.ok || responseData.success === false) {
          throw new Error(responseData.message || "Failed to update options order");
        }
        toast.success(`Rearranged options in "${group.addon_group}"`);
      } catch (error) {
        toast.error(error.message || "Failed to reorder items. Rolling back.");
        setLinkedGroups(originalGroups);
      }
    }
  };

  return (
    <div className="ui-page min-h-[calc(100vh-80px)] bg-slate-50/70 p-4 sm:p-6 text-slate-800">
      {/* If NO item is selected: Show catalog */}
      {!selectedItemId ? (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <PageSection eyebrow="Add-ons Management" title="Link Add-ons to Menu Items" />
              <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
                Configure modifications, optional sides, and required toppings for menu items. Select
                an item below to customize active add-on groups and control their display order.
              </p>
            </div>
          </div>

          {/* Search, Filter card */}
          <Card className="border border-slate-200/80 shadow-sm bg-white p-5 rounded-2xl">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Autocomplete Search input */}
              <div className="relative w-full md:max-w-md">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <MdSearch size={20} />
                </span>
                <input
                  type="text"
                  placeholder="Search for a menu item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/30 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                />
              </div>

              {/* Categories filters */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("all")}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                    selectedCategoryFilter === "all"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  All Categories
                </button>
                {lookups.categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                      String(selectedCategoryFilter) === String(cat.id)
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {cat.category_name}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Grid of Items */}
          {loadingLookups ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
              <span className="mt-3 text-sm font-semibold">Loading menu items...</span>
            </div>
          ) : filteredCatalogItems.length === 0 ? (
            <div className="text-center py-16 border border-slate-200 border-dashed rounded-2xl bg-white p-6">
              <MdListAlt size={40} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-base font-extrabold text-slate-600">No items match filters</h3>
              <p className="text-sm text-slate-400 mt-1">Try resetting your search query or choosing another category.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredCatalogItems.map((item) => (
                <div
                  key={item.item_id}
                  onClick={() => setSelectedItemId(item.item_id)}
                  className="group relative cursor-pointer overflow-hidden border border-slate-200/80 bg-white p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[0.68rem] font-extrabold text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1 tracking-wider uppercase block w-fit mb-3">
                      {item.category_name || "Food"}
                    </span>
                    <h3 className="text-[0.95rem] font-black text-slate-700 leading-snug group-hover:text-emerald-700 transition">
                      {item.item_name}
                    </h3>
                    <span className="text-xs text-slate-400 font-semibold block mt-1">
                      ID: {item.item_id}
                    </span>
                  </div>

                  <div className="mt-5 border-t border-slate-50 pt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 font-extrabold">
                      GBP {Number(item.price || 0).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                      Configure Add-ons
                      <MdChevronRight size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* If an item IS selected: Show drag-and-drop workspace */
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top workspace navigation bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-sm"
                title="Back to Catalog"
              >
                <MdArrowBack size={20} />
              </button>
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                  Add-on Ordering Workstation
                </span>
                <h1 className="text-xl font-black text-slate-800 leading-tight">
                  {selectedItemInfo?.item_name || "Configure Add-ons"}
                </h1>
                <span className="text-xs text-slate-400 font-semibold block">
                  Category: {selectedItemInfo?.category_name || "Breakfast"} (ID: {selectedItemId})
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 items-center">
              {/* Expand / Collapse All Accordion Controls */}
              {linkedGroups.length > 0 && (
                <div className="flex border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden h-10 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleAllGroups(true)}
                    className="flex items-center gap-1 px-3 text-xs font-extrabold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-r border-slate-100 transition"
                    title="Collapse All Groups"
                  >
                    <MdUnfoldLess size={16} />
                    Collapse All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAllGroups(false)}
                    className="flex items-center gap-1 px-3 text-xs font-extrabold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                    title="Expand All Groups"
                  >
                    <MdUnfoldMore size={16} />
                    Expand All
                  </button>
                </div>
              )}

              <Button
                onClick={() => setIsLinkModalOpen(true)}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 text-white font-bold text-sm px-4 hover:bg-emerald-700 shadow-sm transition"
              >
                <MdAdd size={18} />
                Link Add-on Group
              </Button>
            </div>
          </div>

          {/* Loader or Board */}
          {loadingAddons ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
              <span className="mt-3 text-sm font-semibold text-slate-500">Loading configurations...</span>
            </div>
          ) : linkedGroups.length === 0 ? (
            // No Linked groups
            <div className="text-center py-20 border border-slate-200 border-dashed rounded-2xl bg-white p-8">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                <MdOutlineSettings size={32} />
              </div>
              <h2 className="text-lg font-black text-slate-700">No Add-on Groups Linked</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                Add-on groups represent modular options like &quot;Choose Bread&quot;, &quot;Add Extras&quot;, or &quot;Select Drinks&quot;. Link your first group to start setting up customized items.
              </p>
              <Button
                onClick={() => setIsLinkModalOpen(true)}
                className="mt-6 flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 px-5 font-bold mx-auto"
              >
                <MdAdd size={18} />
                Link First Add-on Group
              </Button>
            </div>
          ) : (
            // Drag-and-drop workspace container
            <div className="space-y-6">
              {/* Guidance Alert */}
              <div className="bg-amber-50/60 border border-amber-200/40 rounded-2xl p-4 text-[0.88rem] text-amber-800 flex gap-3 shadow-xs">
                <MdHelpOutline size={20} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong className="font-extrabold block mb-0.5">Drag-and-Drop Guide:</strong>
                  <span className="block leading-relaxed">
                    1. Reorder Groups: Drag the outer group cards by their handles (<MdDragIndicator className="inline" />) up or down. Tip: **Click Collapse All** at the top right to make dragging groups fast and simple!
                    <br />
                    2. Reorder Items: Drag the inner items within their group box to specify which item goes first. Orders sync instantly!
                  </span>
                </div>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="groups-droppable" type="GROUPS">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {linkedGroups.map((group, index) => {
                        const masterOptions = addonItemsByGroup[String(group.group_id)] || [];
                        const isLoadingOptions = Boolean(
                          loadingMasterItems[String(group.group_id)]
                        );

                        // Find options that are NOT currently active
                        const activeIds = new Set(group.options.map((opt) => Number(opt.id)));
                        const availableOptions = masterOptions.filter(
                          (mItem) => !activeIds.has(Number(mItem.id))
                        );

                        const isCollapsed = collapsedGroups[group.id] !== false;

                        return (
                          <Draggable
                            key={String(group.id)}
                            draggableId={String(group.id)}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`rounded-2xl border bg-white shadow-sm transition-all ${
                                  snapshot.isDragging
                                    ? "border-emerald-500 shadow-lg ring-4 ring-emerald-500/10"
                                    : "border-slate-200/80 hover:border-slate-300"
                                }`}
                              >
                                {/* Group Header Panel */}
                                <div
                                  className={`flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-50/40 rounded-2xl transition-all ${
                                    isCollapsed ? "" : "border-b border-slate-100 rounded-b-none"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Drag Handle */}
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition shrink-0"
                                      title="Drag to reorder group"
                                    >
                                      <MdDragIndicator size={20} />
                                    </div>

                                    {/* Chevron indicator to collapse/expand */}
                                    <button
                                      type="button"
                                      onClick={() => toggleCollapseGroup(group.id)}
                                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition shrink-0"
                                      title={isCollapsed ? "Expand Options" : "Collapse Options"}
                                    >
                                      {isCollapsed ? (
                                        <MdChevronRight size={20} />
                                      ) : (
                                        <MdArrowDownward size={20} />
                                      )}
                                    </button>

                                    {/* Sequence indicator */}
                                    <span className="rounded-lg bg-emerald-100 text-emerald-800 text-[0.72rem] px-2.5 py-1 font-black shrink-0 uppercase tracking-wide">
                                      Group #{index + 1}
                                    </span>

                                    {/* Group Title */}
                                    <h3
                                      onClick={() => toggleCollapseGroup(group.id)}
                                      className="m-0 text-[1.05rem] font-black text-slate-700 truncate pr-1 cursor-pointer select-none"
                                    >
                                      {group.addon_group}
                                    </h3>
                                    
                                    {isCollapsed && (
                                      <span className="text-xs text-slate-400 font-semibold italic shrink-0">
                                        ({group.options.length} options active)
                                      </span>
                                    )}
                                  </div>

                                  {/* Setting Controls */}
                                  <div className="flex items-center gap-4 shrink-0 flex-wrap">
                                    {/* Required Setting Toggle */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleGroupSetting(group, "is_required")
                                        }
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out outline-none ${
                                          group.is_required ? "bg-amber-500" : "bg-slate-200"
                                        }`}
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                            group.is_required ? "translate-x-4" : "translate-x-0"
                                          }`}
                                        />
                                      </button>
                                      <span className="text-xs font-bold text-slate-500">
                                        Required
                                      </span>
                                    </div>

                                    {/* Active Setting Toggle */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleGroupSetting(group, "is_active")
                                        }
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out outline-none ${
                                          group.is_active ? "bg-emerald-500" : "bg-slate-200"
                                        }`}
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                            group.is_active ? "translate-x-4" : "translate-x-0"
                                          }`}
                                        />
                                      </button>
                                      <span className="text-xs font-bold text-slate-500">
                                        Active
                                      </span>
                                    </div>

                                    <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

                                    {/* Delete Eligibility link */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUnlinkGroup(group.id, group.addon_group)
                                      }
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                      title="Unlink group from item"
                                    >
                                      <MdDeleteOutline size={18} />
                                    </button>
                                  </div>
                                </div>

                                {/* Workspace content (conditionally hidden on collapse) */}
                                {!isCollapsed && (
                                  <div className="p-5 bg-white rounded-b-2xl space-y-6 animate-fade-in">
                                    {/* Section 1: Draggable Option Cards list */}
                                    <div>
                                      <div className="flex items-center gap-1.5 mb-3">
                                        <span className="text-[0.76rem] font-extrabold uppercase text-slate-400 tracking-wide block">
                                          1. Active options (Drag rows to reorder)
                                        </span>
                                        <span className="h-4 w-4 rounded-full bg-slate-100 text-[10px] text-slate-500 font-extrabold flex items-center justify-center">
                                          {group.options.length}
                                        </span>
                                      </div>

                                      <Droppable
                                        droppableId={`items-droppable-${group.id}`}
                                        type="ITEMS"
                                      >
                                        {(providedInner, snapshotInner) => (
                                          <div
                                            {...providedInner.droppableProps}
                                            ref={providedInner.innerRef}
                                            className={`rounded-2xl p-2 transition-colors duration-200 min-h-[48px] ${
                                              snapshotInner.isDraggingOver
                                                ? "bg-slate-50/80 border border-dashed border-slate-200"
                                                : "bg-transparent border border-transparent"
                                            } space-y-2`}
                                          >
                                            {group.options.map((opt, optIndex) => (
                                              <Draggable
                                                key={`option-${group.id}-${opt.id}`}
                                                draggableId={`option-${group.id}-${opt.id}`}
                                                index={optIndex}
                                              >
                                                {(providedOpt, snapshotOpt) => (
                                                  <div
                                                    ref={providedOpt.innerRef}
                                                    {...providedOpt.draggableProps}
                                                    className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm transition-all ${
                                                      snapshotOpt.isDragging
                                                        ? "border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/10"
                                                        : "border-slate-100 hover:bg-slate-50/50 hover:border-slate-200 text-slate-700 bg-white"
                                                    }`}
                                                  >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                      {/* Drag handle */}
                                                      <div
                                                        {...providedOpt.dragHandleProps}
                                                        className="cursor-grab text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition shrink-0"
                                                        title="Drag to reorder"
                                                      >
                                                        <MdDragIndicator size={16} />
                                                      </div>

                                                      {/* Badge for Option order index */}
                                                      <span className="font-extrabold text-slate-400 shrink-0 text-xs w-4">
                                                        {optIndex + 1}.
                                                      </span>

                                                      {/* Option name */}
                                                      <span className="font-bold text-[0.88rem] truncate">
                                                        {opt.addon_name}
                                                      </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                      {/* Price tag */}
                                                      <span className="text-[0.8rem] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                                        £{Number(opt.price || 0).toFixed(2)}
                                                      </span>

                                                      {/* Quick delete option */}
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          handleToggleAddonItem(
                                                            group,
                                                            Number(opt.id)
                                                          )
                                                        }
                                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                                                        title="Remove option"
                                                      >
                                                        <MdClose size={15} />
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                              </Draggable>
                                            ))}
                                            {providedInner.placeholder}
                                          </div>
                                        )}
                                      </Droppable>
                                    </div>

                                    {/* Section 2: Available Options checklist (Layman click-to-add grid) */}
                                    <div className="border-t border-slate-100 pt-5">
                                      <span className="text-[0.76rem] font-extrabold uppercase text-slate-400 tracking-wide block mb-3">
                                        2. Other available options in group (Click to add)
                                      </span>

                                      {isLoadingOptions ? (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold py-2">
                                          <div className="h-4 w-4 animate-spin rounded-full border border-emerald-500 border-t-transparent" />
                                          Loading other options...
                                        </div>
                                      ) : availableOptions.length === 0 ? (
                                        <span className="text-xs text-slate-400 block py-1 bg-slate-50 border border-slate-100 border-dashed p-3 rounded-xl text-center">
                                          All master options are already active.
                                        </span>
                                      ) : (
                                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                                          {availableOptions.map((mItem) => (
                                            <div
                                              key={mItem.id}
                                              onClick={() =>
                                                handleToggleAddonItem(group, Number(mItem.id))
                                              }
                                              className="flex cursor-pointer items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-emerald-50/20 hover:border-emerald-500/30 hover:shadow-xs transition duration-200 text-[0.8rem] font-bold group"
                                            >
                                              <span className="truncate pr-2 group-hover:text-emerald-700 transition">
                                                {mItem.addon_item_name}
                                              </span>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[0.72rem] text-slate-400 group-hover:text-emerald-600 font-extrabold transition">
                                                  + £{Number(mItem.price || 0).toFixed(2)}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>
      )}

      {/* Link Group Modal Overlay */}
      {isLinkModalOpen && (
        <>
          <div
            onClick={() => setIsLinkModalOpen(false)}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          />
          <div className="fixed left-1/2 top-1/2 z-[51] w-[min(540px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-100 bg-white p-6 shadow-xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-extrabold text-slate-800">Link Add-on Group</h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-100 rounded-lg"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleLinkNewGroupSubmit} className="space-y-4">
              {/* Group selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Select Add-on Group
                </label>
                <select
                  value={pendingGroupId}
                  onChange={(e) => setPendingGroupId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5"
                >
                  <option value="">Choose a master group...</option>
                  {lookups.groups
                    .filter(
                      (g) => !linkedGroups.some((linked) => Number(linked.group_id) === Number(g.id))
                    )
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.group_name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Addon Items Options checklist */}
              {pendingGroupId && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Select Options to Enable (Click cards to check)
                  </label>
                  {loadingMasterItems[String(pendingGroupId)] ? (
                    <div className="text-xs text-slate-400 py-2 font-semibold flex items-center gap-1.5">
                      <div className="h-4 w-4 animate-spin rounded-full border border-emerald-500 border-t-transparent" />
                      Loading group options...
                    </div>
                  ) : (addonItemsByGroup[String(pendingGroupId)] || []).length === 0 ? (
                    <span className="text-xs text-slate-400 block py-1">
                      No active options found in this group master.
                    </span>
                  ) : (
                    <div className="grid gap-2 grid-cols-2 max-h-[220px] overflow-y-auto p-1.5 border border-slate-100 rounded-xl bg-slate-50/50">
                      {(addonItemsByGroup[String(pendingGroupId)] || []).map((masterItem) => {
                        const checked = pendingAddonItemIds.includes(Number(masterItem.id));
                        return (
                          <div
                            key={masterItem.id}
                            onClick={() => handleTogglePendingItem(Number(masterItem.id))}
                            className={`flex cursor-pointer items-center justify-between px-3 py-2.5 border rounded-xl text-[0.8rem] font-bold transition-all ${
                              checked
                                ? "bg-emerald-50 border-emerald-500/20 text-emerald-800 shadow-xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span className="truncate pr-2">{masterItem.addon_item_name}</span>
                            {checked ? (
                              <span className="h-4 w-4 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] shrink-0">
                                <MdCheck size={12} />
                              </span>
                            ) : (
                              <span className="text-[0.72rem] text-slate-400 shrink-0 font-extrabold">
                                £{Number(masterItem.price || 0).toFixed(2)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 bg-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLinking || !pendingGroupId || pendingAddonItemIds.length === 0}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLinking ? "Linking..." : "Link Group"}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default AddonEligibility;

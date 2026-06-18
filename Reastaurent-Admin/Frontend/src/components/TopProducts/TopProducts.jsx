import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  MdAdd,
  MdClose,
  MdDeleteOutline,
  MdDragIndicator,
  MdSearch,
  MdStar,
  MdStarBorder,
} from "react-icons/md";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  CATEGORY_LIST,
  TOP_PRODUCT_LIST,
  TOP_PRODUCT_ADD,
  TOP_PRODUCT_UPDATE,
  TOP_PRODUCT_DELETE,
  TOP_PRODUCT_REORDER,
  TOP_PRODUCT_SEARCH_ITEMS,
} from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import { getImageUrl } from "../../Utils/imageUrl";
import { Button, Card, InputField, PageSection } from "../ui";

function InlineStatusToggle({ active, onClick, disabled = false }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-65 ${
          active ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            active ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className={`text-[0.78rem] font-extrabold w-[45px] transition-colors duration-150 ${active ? "text-emerald-500" : "text-text-muted"}`}>
        {active ? "Active" : "Hidden"}
      </span>
    </div>
  );
}

function TopProducts() {
  const [topProducts, setTopProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limitFilter, setLimitFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Modal Search states
  const [searchCategory, setSearchCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchItems, setSearchItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Load category and top products list
  const loadData = async () => {
    setLoading(true);
    try {
      const [topRes, catRes] = await Promise.all([
        fetchWithRefreshToken(TOP_PRODUCT_LIST, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
        fetchWithRefreshToken(CATEGORY_LIST, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 1, limit: 500 }),
        }),
      ]);

      const topData = await topRes.json();
      const catData = await catRes.json();

      if (!topRes.ok || topData.success === false) {
        throw new Error(topData.message || "Failed to load top products");
      }
      if (!catRes.ok || catData.success === false) {
        throw new Error(catData.message || "Failed to load categories");
      }

      setTopProducts(topData.data || []);
      setCategories(catData.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load top products data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter top products based on selected Limit
  const filteredProducts = useMemo(() => {
    if (limitFilter === "all") {
      return topProducts;
    }
    const limit = parseInt(limitFilter, 10);
    return topProducts.slice(0, limit);
  }, [topProducts, limitFilter]);

  // Drag and drop reordering
  const handleDragEnd = async (result) => {
    const { destination, source } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const originalProducts = [...topProducts];
    const reorderedList = [...topProducts];
    const [removed] = reorderedList.splice(source.index, 1);
    reorderedList.splice(destination.index, 0, removed);

    setTopProducts(reorderedList);

    try {
      const orderedIds = reorderedList.map((item) => item.id);
      const response = await fetchWithRefreshToken(TOP_PRODUCT_REORDER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to save order");
      }
      toast.success("Top products order updated");
    } catch (error) {
      toast.error(error.message || "Failed to reorder. Rolling back.");
      setTopProducts(originalProducts);
    }
  };

  // Toggle status
  const toggleActiveStatus = async (item) => {
    const nextActive = Number(item.is_active) === 1 ? 0 : 1;
    try {
      const response = await fetchWithRefreshToken(TOP_PRODUCT_UPDATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_active: nextActive }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to update status");
      }
      toast.success(nextActive ? "Top product activated" : "Top product deactivated");
      setTopProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_active: nextActive } : p))
      );
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  // Delete product
  const handleDeleteProduct = async (item) => {
    if (!window.confirm(`Remove "${item.item_name}" from top products?`)) {
      return;
    }

    try {
      const response = await fetchWithRefreshToken(TOP_PRODUCT_DELETE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to delete");
      }
      toast.success("Top product removed successfully");
      setTopProducts((prev) => prev.filter((p) => p.id !== item.id));
    } catch (error) {
      toast.error(error.message || "Failed to delete top product");
    }
  };

  // Perform search for products to add
  const executeSearch = async () => {
    setSearching(true);
    try {
      const response = await fetchWithRefreshToken(TOP_PRODUCT_SEARCH_ITEMS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: searchCategory, search: searchQuery }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to search items");
      }
      setSearchItems(data.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to query items");
    } finally {
      setSearching(false);
    }
  };

  // Run search on query/category updates
  useEffect(() => {
    if (isAddModalOpen) {
      const debounceTimer = setTimeout(() => {
        executeSearch();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchCategory, searchQuery, isAddModalOpen]);

  // Open/Close modal
  const openModal = () => {
    setIsAddModalOpen(true);
    setSearchCategory("all");
    setSearchQuery("");
    setSelectedItemIds([]);
    setSearchItems([]);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
  };

  // Toggle item selection in modal
  const toggleItemSelection = (itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Submit adding top products
  const handleAddSubmit = async () => {
    if (selectedItemIds.length === 0) {
      toast.warn("Please select at least one item to add");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithRefreshToken(TOP_PRODUCT_ADD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_ids: selectedItemIds }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to add products");
      }
      toast.success("Top products added successfully");
      closeModal();
      loadData();
    } catch (error) {
      toast.error(error.message || "Failed to add products");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-[24px]">
      <PageSection
        eyebrow="Menu management"
        title="Top Products"
        subtitle="Manage hot recommendations and highlight them in the customer storefront."
        actions={
          <Button variant="primary" leadingIcon={<MdAdd size={20} />} onClick={openModal}>
            Add Top Product
          </Button>
        }
      />

      <Card padding="md" className="flex flex-col gap-4">
        {/* Controls Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[0.9rem] font-bold text-text-muted">Display filter:</span>
            <InputField
              as="select"
              value={limitFilter}
              onChange={(e) => setLimitFilter(e.target.value)}
              className="max-w-[200px]"
              inputClassName="min-h-[38px] rounded-xl text-[0.88rem] px-3 py-1"
            >
              <option value="all">Show All</option>
              <option value="5">Top 5 Products</option>
              <option value="10">Top 10 Products</option>
              <option value="20">Top 20 Products</option>
            </InputField>
          </div>
          <span className="text-sm font-semibold text-text-muted">
            Total Top Products: {topProducts.length} (Filtered: {filteredProducts.length})
          </span>
        </div>

        {/* Loading / Empty States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-text-muted text-sm font-semibold">Loading top products list...</p>
          </div>
        ) : topProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">★</div>
            <h3 className="text-lg font-bold text-text-strong mb-1">No Top Products Highlighted</h3>
            <p className="text-sm text-text-muted max-w-[40ch] mb-6">
              Highlight your best items to display at the top of the customer portal home page.
            </p>
            <Button variant="secondary" onClick={openModal}>
              Add Your First Product
            </Button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="top-products-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex flex-col border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle"
                >
                  <div className="grid grid-cols-[40px_60px_90px_1fr_140px_100px_160px] gap-4 bg-surface-muted text-text-muted text-xs font-bold uppercase tracking-wider px-4 py-3.5">
                    <div></div>
                    <div>Order</div>
                    <div>Image</div>
                    <div>Item Name</div>
                    <div>Category</div>
                    <div className="text-right pr-4">Price</div>
                    <div className="text-right pr-6">Actions</div>
                  </div>

                  {filteredProducts.map((item, index) => (
                    <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`grid grid-cols-[40px_60px_90px_1fr_140px_100px_160px] gap-4 items-center px-4 py-3 bg-surface-panel transition-colors duration-150 ${
                            snapshot.isDragging ? "bg-surface-hover shadow-lg" : "hover:bg-surface-hover"
                          }`}
                        >
                          <div
                            {...dragProvided.dragHandleProps}
                            className="text-text-muted hover:text-text-base cursor-grab active:cursor-grabbing grid place-items-center h-8 w-8 rounded-lg hover:bg-surface-muted transition-all"
                            title="Drag to reorder"
                          >
                            <MdDragIndicator size={20} />
                          </div>

                          <div className="text-sm font-black text-text-strong pl-1">
                            #{index + 1}
                          </div>

                          <div className="h-12 w-16 rounded-xl border border-border-subtle overflow-hidden bg-surface-muted shrink-0">
                            {getImageUrl(item, "item_image") ? (
                              <img
                                src={getImageUrl(item, "item_image")}
                                alt={item.item_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center text-lg">🍽️</div>
                            )}
                          </div>

                          <div className="flex flex-col pr-4 min-w-0">
                            <span className="font-extrabold text-[0.95rem] text-text-strong truncate">
                              {item.item_name}
                            </span>
                            {item.item_description && (
                              <span className="text-xs text-text-muted truncate mt-0.5">
                                {item.item_description}
                              </span>
                            )}
                          </div>

                          <span className="text-sm font-semibold text-text-muted truncate">
                            {item.category_name || "Uncategorized"}
                          </span>

                          <div className="text-right pr-4 flex flex-col justify-center shrink-0">
                            {item.discount_price && item.discount_price < item.price ? (
                              <>
                                <span className="text-sm font-bold text-emerald-500">
                                  ₹{item.discount_price}
                                </span>
                                <span className="text-xs text-text-muted line-through text-[0.75rem]">
                                  ₹{item.price}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-bold text-text-strong">
                                ₹{item.price}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-3.5 pr-6 shrink-0">
                            <InlineStatusToggle
                              active={Number(item.is_active) === 1}
                              onClick={() => toggleActiveStatus(item)}
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(item)}
                              className="h-9 w-9 grid place-items-center rounded-xl border border-red-500/10 text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white transition-all shadow-sm shrink-0"
                              title="Delete top product"
                            >
                              <MdDeleteOutline size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Card>

      {/* Add Top Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="flex flex-col w-full max-w-[720px] max-h-[82vh] rounded-[24px] border border-border-subtle bg-surface-panel shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                  <MdStar size={20} />
                </div>
                <h3 className="text-lg font-black text-text-strong">Select items to feature</h3>
              </div>
              <button
                onClick={closeModal}
                className="h-8 w-8 grid place-items-center rounded-lg border border-border-subtle text-text-muted hover:bg-surface-hover hover:text-text-base transition-all"
              >
                <MdClose size={18} />
              </button>
            </div>

            {/* Filter bar */}
            <div className="grid gap-3 sm:grid-cols-2 bg-surface-muted/50 p-4 border-b border-border-subtle">
              <InputField
                label="Category Filter"
                as="select"
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                inputClassName="min-h-[40px] rounded-xl text-[0.9rem]"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </InputField>

              <InputField
                label="Search Products"
                placeholder="Type name, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                inputClassName="min-h-[40px] rounded-xl text-[0.9rem]"
                trailingIcon={<MdSearch className="mr-3 text-text-muted" size={20} />}
              />
            </div>

            {/* Items scroll area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
              {searching ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  <p className="text-text-muted text-sm">Searching match items...</p>
                </div>
              ) : searchItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <span className="text-4xl mb-2">🍽️</span>
                  <p className="text-sm font-semibold text-text-muted">No items matched search query.</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {searchItems.map((item) => {
                    const isAdded = item.is_top_product;
                    const isSelected = selectedItemIds.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isAdded}
                        onClick={() => toggleItemSelection(item.id)}
                        className={`flex items-center gap-4 w-full p-2.5 rounded-2xl border text-left transition-all duration-150 ${
                          isAdded
                            ? "border-border-subtle bg-surface-muted opacity-60 cursor-not-allowed"
                            : isSelected
                              ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/40"
                              : "border-border-subtle bg-surface-panel hover:border-border-strong hover:bg-surface-hover"
                        }`}
                      >
                        <div className="h-10 w-14 rounded-lg overflow-hidden border border-border-subtle bg-surface-muted shrink-0">
                          {item.item_image_url ? (
                            <img
                              src={item.item_image_url}
                              alt={item.item_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-md">🍽️</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <span className="font-extrabold text-[0.88rem] text-text-strong truncate">
                            {item.item_name}
                          </span>
                          <span className="text-[0.74rem] text-text-muted truncate">
                            {item.category_name} • ₹{item.price}
                          </span>
                        </div>

                        <div className="pr-2 shrink-0">
                          {isAdded ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[0.72rem] font-bold">
                              Featured
                            </span>
                          ) : isSelected ? (
                            <span className="text-emerald-500 flex items-center justify-center bg-emerald-500/15 h-8 w-8 rounded-full">
                              <MdStar size={20} />
                            </span>
                          ) : (
                            <span className="text-text-muted hover:text-text-base flex items-center justify-center border border-border-strong h-8 w-8 rounded-full">
                              <MdStarBorder size={20} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border-subtle bg-surface-muted/30 px-6 py-4">
              <span className="text-xs font-semibold text-text-muted">
                {selectedItemIds.length} items selected
              </span>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAddSubmit}
                  disabled={submitting || selectedItemIds.length === 0}
                >
                  {submitting ? "Adding..." : "Add Featured Products"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TopProducts;

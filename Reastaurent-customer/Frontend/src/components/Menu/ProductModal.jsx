import React, { useEffect, useMemo, useState } from "react";
import { X, ShoppingBag, Check } from "lucide-react";
import { getImageUrl } from "../../Utils/imageUrl";

export default function ProductModal({ item, addons, loading, onClose, onConfirm, initialSelectedAddons = [] }) {
  const [selectedAddons, setSelectedAddons] = useState(initialSelectedAddons);

  useEffect(() => {
    setSelectedAddons(initialSelectedAddons || []);
  }, [item?.id]);

  const groupedAddons = useMemo(() => {
    const map = new Map();
    addons.forEach((addon) => {
      const groupName = addon.addon_group || addon.title || "Add-ons";
      if (!map.has(groupName)) {
        map.set(groupName, []);
      }
      map.get(groupName).push(addon);
    });
    return Array.from(map.entries());
  }, [addons]);

  const basePrice =
    item?.discount_price && Number(item.discount_price) < Number(item.price)
      ? Number(item.discount_price)
      : Number(item?.price || 0);

  const addonTotal = selectedAddons.reduce(
    (sum, addon) => sum + Number(addon.addon_price || 0),
    0
  );

  const totalPrice = (basePrice + addonTotal).toFixed(2);

  const updateAddonQty = (addon, delta) => {
    setSelectedAddons((prev) => {
      const addonId = addon.addonOptionId || addon.id;
      const groupName = addon.addon_group || addon.title || "Add-ons";
      const maxSelect = Number(addon.max_select || 0);

      const currentQty = prev.filter(
        (selected) => (selected.addonOptionId || selected.id) === addonId
      ).length;

      if (delta > 0) {
        const selectedInGroup = prev.filter(
          (selected) =>
            (selected.addon_group || selected.title || "Add-ons") === groupName
        ).length;

        if (maxSelect > 0 && selectedInGroup >= maxSelect) {
          return prev;
        }

        return [...prev, addon];
      } else if (delta < 0 && currentQty > 0) {
        const indexToRemove = prev.findIndex(
          (selected) => (selected.addonOptionId || selected.id) === addonId
        );
        if (indexToRemove !== -1) {
          const next = [...prev];
          next.splice(indexToRemove, 1);
          return next;
        }
      }

      return prev;
    });
  };

  const hasDiscount = item?.discount_price && Number(item.discount_price) < Number(item.price);

  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Container */}
      <div className="fixed left-1/2 top-1/2 z-[301] flex h-[min(90vh,800px)] w-[min(95vw,1000px)] -translate-x-1/2 -translate-y-1/2 flex-col md:flex-row overflow-hidden rounded-[2rem] border border-white/10 bg-[#110e0d] shadow-2xl">
        
        {/* Left Column: Image & Basic Info */}
        <div className="relative w-full md:w-1/2 h-[40vh] md:h-full bg-[#1a1715] flex-shrink-0">
          {getImageUrl(item, "item_image") ? (
            <img
              src={getImageUrl(item, "item_image")}
              alt={item.item_name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-7xl">☕</div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#110e0d] via-[#110e0d]/40 md:via-transparent to-transparent opacity-90 md:opacity-100" />
          
          {/* Badges */}
          <div className="absolute top-6 left-6 flex flex-wrap gap-2">
            {item.is_new === 1 && (
              <span className="rounded-full bg-white px-4 py-1.5 font-sans text-xs font-bold uppercase tracking-wider text-[#110e0d] shadow-lg">
                New
              </span>
            )}
            {item.is_popular === 1 && (
              <span className="rounded-full bg-cafe-gold px-4 py-1.5 font-sans text-xs font-bold uppercase tracking-wider text-[#110e0d] shadow-lg">
                Popular
              </span>
            )}
          </div>

          <div className="absolute bottom-6 left-6 right-6 md:hidden">
            <h2 className="text-3xl font-serif font-bold text-white mb-2 shadow-sm">{item.item_name}</h2>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-cafe-gold">£ {basePrice}</span>
              {hasDiscount && (
                <span className="text-white/40 line-through">£{item.price}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Details, Addons, Actions */}
        <div className="flex flex-1 flex-col w-full md:w-1/2 h-[50vh] md:h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
            <h3 className="text-cafe-gold font-sans font-bold uppercase tracking-widest text-sm">Product Details</h3>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/60 transition-colors hover:bg-cafe-gold hover:text-[#110e0d]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
            <div className="hidden md:block mb-8">
              <h2 className="text-2xl   text-white mb-4">{item.item_name}</h2>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold text-cafe-gold">£ {basePrice}</span>
                {hasDiscount && (
                  <span className="text-lg text-white/40 line-through">£{item.price}</span>
                )}
              </div>

            </div>



            {loading ? (
              <div className="py-10 text-center">
                <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-cafe-gold border-t-transparent" />
                <p className="mt-4 text-white/50 text-sm">Loading options...</p>
              </div>
            ) : addons.length > 0 ? (
              <div className="space-y-8">
                <div >
                  <h4 className="text-xl font-serif font-bold text-white mb-6">Customize Your Order</h4>
                  {groupedAddons.map(([groupName, groupAddons]) => (
                    <div key={groupName} className="mb-6 last:mb-0">
                      <h5 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">{groupName}</h5>
                      <div className="grid gap-3">
                        {groupAddons.map((addon) => {
                          const qty = selectedAddons.filter((selected) => (selected.addonOptionId || selected.id) === (addon.addonOptionId || addon.id)).length;
                          const isSelected = qty > 0;
                          return (
                            <div
                              key={addon.id}
                              className={`flex items-center justify-between p-1 rounded-xl border ${
                                isSelected
                                  ? "border-cafe-gold bg-cafe-gold/5"
                                  : "border-white/10 bg-white/5"
                              }`}
                            >
                              <span className={` ${isSelected ? "text-white font-bold" : "text-white/80"}`}>
                                {addon.addon_name}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-cafe-gold text-sm">£ {Number(addon.addon_price || 0).toFixed(2)}</span>
                                {qty > 0 ? (
                                  <div className="flex items-center gap-2 rounded-full border border-cafe-gold/30 bg-cafe-gold/10 p-1">
                                    <button
                                      onClick={() => updateAddonQty(addon, -1)}
                                      className="w-7 h-7 flex items-center justify-center rounded-full text-cafe-gold hover:bg-cafe-gold/20"
                                    >
                                      -
                                    </button>
                                    <span className="min-w-[16px] text-center text-sm font-bold text-cafe-gold">{qty}</span>
                                    <button
                                      onClick={() => updateAddonQty(addon, 1)}
                                      className="w-7 h-7 flex items-center justify-center rounded-full text-cafe-gold hover:bg-cafe-gold/20"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => updateAddonQty(addon, 1)}
                                    className="px-4 py-1 text-xs font-bold uppercase tracking-wider text-white/80 border border-white/20 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer Action */}
          <div className="border-t border-white/5 bg-[#1a1715] px-8 py-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-bold text-white leading-none mt-1">£ {totalPrice}</span>
            </div>
            <button
              onClick={() => onConfirm(selectedAddons)}
              className="flex h-11 items-center justify-center gap-2 px-8 bg-cafe-gold text-[#110e0d] font-bold text-sm rounded-xl hover:bg-white transition-colors shadow-lg shadow-cafe-gold/20"
            >
              <ShoppingBag className="w-4 h-4" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

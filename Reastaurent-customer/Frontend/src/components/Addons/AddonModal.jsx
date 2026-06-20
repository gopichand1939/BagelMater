import { useEffect, useMemo, useState } from "react";
import { getImageUrl } from "../../Utils/imageUrl";

function AddonModal({ item, addons, loading, onClose, onConfirm }) {
  const [selectedAddons, setSelectedAddons] = useState([]);

  useEffect(() => {
    setSelectedAddons([]);
  }, [item?.id]);

  const groupedAddons = useMemo(() => {
    return addons.reduce((groups, addon) => {
      if (!groups[addon.addon_group]) {
        groups[addon.addon_group] = [];
      }
      groups[addon.addon_group].push(addon);
      return groups;
    }, {});
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

  const toggleAddon = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((selected) => selected.id === addon.id);
      if (exists) {
        return prev.filter((selected) => selected.id !== addon.id);
      }
      return [...prev, addon];
    });
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-md"
      />

      <div className="fixed left-1/2 top-1/2 z-[301] flex h-[min(84vh,760px)] w-[min(680px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,26,46,0.98)_0%,rgba(15,12,41,0.98)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 pb-[18px] pt-[22px] sm:px-6">
          <div>
            <p className="m-0 text-xs uppercase tracking-[1px] text-white/40">
              Customize Item
            </p>
            <h2 className="mt-1.5 text-2xl font-extrabold text-white">
              {item?.item_name}
            </h2>
            <p className="mt-2 text-[13px] text-white/55">
              Pick the add-ons you want for this item.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-0 bg-white/10 text-[22px] text-white transition hover:bg-white/15"
          >
            ×
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-5 py-5 sm:px-6">
          {getImageUrl(item, "item_image") ? (
            <img
              src={getImageUrl(item, "item_image")}
              alt={item.item_name}
              className="h-[min(220px,28vh)] w-full flex-shrink-0 rounded-[18px] border border-white/10 object-cover"
            />
          ) : null}

          {loading ? (
            <div className="py-8 text-center text-[15px] text-white/55">
              Loading add-ons...
            </div>
          ) : addons.length === 0 ? (
            <div className="py-5 text-center text-[15px] text-white/55">
              No add-ons available for this item.
            </div>
          ) : (
            Object.entries(groupedAddons).map(([groupName, groupAddons]) => (
              <div
                key={groupName}
                className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4"
              >
                <h3 className="m-0 text-base font-bold text-white">
                  {groupName}
                </h3>

                <div className="mt-[14px] flex flex-col gap-2.5">
                  {groupAddons.map((addon) => {
                    const isSelected = selectedAddons.some(
                      (selected) => selected.id === addon.id
                    );

                    return (
                      <button
                        key={addon.id}
                        onClick={() => toggleAddon(addon)}
                        className={`flex items-center justify-between rounded-[14px] px-4 py-[14px] text-left transition ${
                          isSelected
                            ? "border border-amber-400/60 bg-gradient-to-br from-amber-500/20 to-red-500/20"
                            : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-white">
                            {addon.addon_name}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {isSelected ? "Selected" : "Tap to add"}
                          </div>
                        </div>

                        <div className="text-sm font-extrabold text-amber-300">
                          +₹{Number(addon.addon_price || 0).toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-[#12102f] px-5 pb-6 pt-[18px] sm:px-6">
          <div>
            <div className="text-xs uppercase tracking-[1px] text-white/45">
              Total
            </div>
            <div className="mt-1 text-[26px] font-extrabold text-white">
              ₹{totalPrice}
            </div>
          </div>

          <button
            onClick={() => onConfirm(selectedAddons)}
            className="rounded-2xl border-0 bg-gradient-to-br from-amber-500 to-red-500 px-[22px] py-[14px] text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(245,158,11,0.24)] transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
          >
            Add Item
          </button>
        </div>
      </div>
    </>
  );
}

export default AddonModal;

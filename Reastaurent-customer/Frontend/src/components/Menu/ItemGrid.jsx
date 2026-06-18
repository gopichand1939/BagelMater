import { useState } from "react";
import { getImageUrl } from "../../Utils/imageUrl";

const getFoodTypeMarker = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "vegan") {
    return {
      borderClassName: "border-green-500",
      dotClassName: "bg-green-500",
      label: "Vegan",
    };
  }

  if (normalized === "halal") {
    return {
      borderClassName: "border-red-500",
      dotClassName: "bg-red-500",
      label: "Halal",
    };
  }

  return {
    borderClassName: "border-slate-300",
    dotClassName: "bg-slate-300",
    label: "N/A",
  };
};

export function ItemCard({
  item,
  onAddToCart,
  onOpenAddons,
  cartQty,
  onRemoveFromCart,
}) {
  const [hovered, setHovered] = useState(false);
  const hasDiscount = item.discount_price && item.discount_price < item.price;
  const foodTypeMarker = getFoodTypeMarker(item.is_veg);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex flex-col overflow-hidden rounded-[20px] border border-white/[0.06] transition-all duration-300 ${
        hovered
          ? "-translate-y-1 bg-white/[0.08] shadow-glow"
          : "translate-y-0 bg-white/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
      }`}
    >
      <button
        onClick={() => onOpenAddons(item)}
        className="relative overflow-hidden border-0 bg-transparent p-0 text-left"
      >
        {getImageUrl(item, "item_image") ? (
          <img
            src={getImageUrl(item, "item_image")}
            alt={item.item_name}
            loading="lazy"
            decoding="async"
            className={`h-[180px] w-full object-cover transition-transform duration-500 ${
              hovered ? "scale-[1.08]" : "scale-100"
            }`}
          />
        ) : (
          <div className="grid h-[180px] w-full place-items-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-5xl">
            🍽️
          </div>
        )}

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {item.is_new === 1 ? (
            <span className="rounded-full bg-gradient-to-br from-violet-500 to-violet-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.5px] text-white">
              New
            </span>
          ) : null}
          {item.is_popular === 1 ? (
            <span className="rounded-full bg-gradient-to-br from-amber-500 to-amber-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.5px] text-white">
              Popular
            </span>
          ) : null}
          {hasDiscount ? (
            <span className="rounded-full bg-gradient-to-br from-red-500 to-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.5px] text-white">
              {Math.round(((item.price - item.discount_price) / item.price) * 100)}%
              OFF
            </span>
          ) : null}
        </div>

        {(item.is_veg === "Vegan" || item.is_veg === "Halal") ? (
          <div
            className={`absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-md border-2 bg-black/60 backdrop-blur ${
              foodTypeMarker.borderClassName
            }`}
            title={foodTypeMarker.label}
            aria-label={foodTypeMarker.label}
          >
            <div className={`h-2.5 w-2.5 rounded-full ${foodTypeMarker.dotClassName}`} />
          </div>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="m-0 text-base font-bold leading-[1.3] text-white">
          {item.item_name}
        </h3>

        {item.item_description ? (
          <p className="m-0 overflow-hidden text-[13px] leading-[1.5] text-white/45 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {item.item_description}
          </p>
        ) : null}

        {item.preparation_time ? (
          <div className="flex items-center gap-1 text-xs text-white/40">
            <span>⏱️</span>
            <span>{item.preparation_time} min</span>
          </div>
        ) : null}

        <button
          onClick={() => onOpenAddons(item)}
          className="self-start border-0 bg-transparent p-0 text-xs font-bold text-amber-300"
        >
          Tap image to customize
        </button>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            {hasDiscount ? (
              <>
                <span className="text-lg font-extrabold text-green-500">
                  ₹{item.discount_price}
                </span>
                <span className="ml-1.5 text-[13px] text-white/35 line-through">
                  ₹{item.price}
                </span>
              </>
            ) : (
              <span className="text-lg font-extrabold text-white">₹{item.price}</span>
            )}
          </div>

          {cartQty > 0 ? (
            <div className="flex items-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-red-500">
              <button
                onClick={() => onRemoveFromCart(item.id)}
                className="border-0 bg-transparent px-3 py-2 text-base font-bold text-white"
              >
                −
              </button>
              <span className="min-w-5 text-center text-sm font-bold text-white">
                {cartQty}
              </span>
              <button
                onClick={() => onAddToCart(item)}
                className="border-0 bg-transparent px-3 py-2 text-base font-bold text-white"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAddToCart(item)}
              className="rounded-xl bg-gradient-to-br from-amber-500 to-red-500 px-[18px] py-2 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(245,158,11,0.3)] transition-all duration-200 hover:shadow-lg"
            >
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemGrid({
  items,
  loading,
  onAddToCart,
  onOpenAddons,
  cart,
  onRemoveFromCart,
  sentinelRef,
  isFetchingMore,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 px-4 py-5 sm:px-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-[20px] bg-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-[60px]">
        <div className="text-5xl">🍽️</div>
        <p className="m-0 text-base text-white/40">
          No items available in this category
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 px-4 pb-24 pt-5 sm:px-6">
      {items.map((item) => {
        const cartQty = cart
          .filter((cartItem) => cartItem.id === item.id)
          .reduce((sum, cartItem) => sum + cartItem.qty, 0);

        return (
          <ItemCard
            key={item.id}
            item={item}
            onAddToCart={onAddToCart}
            onOpenAddons={onOpenAddons}
            cartQty={cartQty}
            onRemoveFromCart={onRemoveFromCart}
          />
        );
      })}

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="col-span-full h-10" />

      {isFetchingMore ? (
        <div className="col-span-full flex justify-center py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : null}
    </div>
  );
}

export default ItemGrid;

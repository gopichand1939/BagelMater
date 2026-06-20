import { useState } from "react";
import { getImageUrl } from "../../Utils/imageUrl";

function ItemCard({
  item,
  onAddToCart,
  onOpenAddons,
  cartQty,
  onRemoveFromCart,
}) {
  const [hovered, setHovered] = useState(false);
  const hasDiscount = item.discount_price && item.discount_price < item.price;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`customer-card flex flex-col overflow-hidden p-0 transition-all duration-500 ${
        hovered ? "-translate-y-2 shadow-premium border-cafe-gold/30" : "translate-y-0"
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
            className={`h-[220px] w-full object-cover transition-transform duration-700 ${
              hovered ? "scale-110" : "scale-100"
            }`}
          />
        ) : (
          <div className="grid h-[220px] w-full place-items-center bg-[#1c1917] text-5xl">
            ☕
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#110e0d] via-transparent to-transparent opacity-80" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {item.is_new === 1 ? (
            <span className="rounded-full bg-white px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#110e0d] shadow-lg">
              New
            </span>
          ) : null}
          {item.is_popular === 1 ? (
            <span className="rounded-full bg-cafe-gold px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#110e0d] shadow-lg">
              Popular
            </span>
          ) : null}
          {hasDiscount ? (
            <span className="rounded-full bg-red-600 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
              {Math.round(((item.price - item.discount_price) / item.price) * 100)}% OFF
            </span>
          ) : null}
        </div>

        {(item.is_veg === "Vegan" || item.is_veg === "Halal") && (
          <div
            className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md"
            title={item.is_veg}
          >
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                item.is_veg === "Vegan" ? "bg-green-400" : "bg-red-400"
              }`}
            />
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="m-0 font-serif text-xl font-bold leading-tight text-white">
          {item.item_name}
        </h3>

        {item.item_description ? (
          <p className="m-0 overflow-hidden font-sans text-sm font-light leading-relaxed text-white/60 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {item.item_description}
          </p>
        ) : null}

        {item.preparation_time ? (
          <div className="flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-white/40">
            <span>⏱️</span>
            <span>{item.preparation_time} min prep</span>
          </div>
        ) : null}

        <button
          onClick={() => onOpenAddons(item)}
          className="self-start border-0 bg-transparent p-0 font-sans text-xs font-semibold tracking-wide text-cafe-gold hover:text-white transition-colors"
        >
          Customize details
        </button>

        <div className="mt-auto flex items-end justify-between pt-4">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="font-sans text-[13px] text-white/40 line-through">
                  ₹{item.price}
                </span>
                <span className="font-serif text-2xl font-bold text-cafe-gold">
                  ₹{item.discount_price}
                </span>
              </>
            ) : (
              <span className="font-serif text-2xl font-bold text-cafe-gold">₹{item.price}</span>
            )}
          </div>

          {cartQty > 0 ? (
            <div className="flex items-center overflow-hidden rounded-full border border-cafe-gold/30 bg-[#1c1917]">
              <button
                onClick={() => onRemoveFromCart(item.id)}
                className="border-0 bg-transparent px-3 py-1.5 text-lg font-bold text-cafe-gold hover:bg-white/5 transition-colors"
              >
                −
              </button>
              <span className="min-w-[28px] text-center font-sans text-sm font-bold text-white">
                {cartQty}
              </span>
              <button
                onClick={() => onAddToCart(item)}
                className="border-0 bg-transparent px-3 py-1.5 text-lg font-bold text-cafe-gold hover:bg-white/5 transition-colors"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAddToCart(item)}
              className="rounded-full bg-cafe-gold px-5 py-2 font-sans text-sm font-bold tracking-wide text-[#110e0d] transition-transform hover:scale-105"
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
  searchQuery = "",
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
          {searchQuery ? `No items found matching "${searchQuery}"` : "No items available in this category"}
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

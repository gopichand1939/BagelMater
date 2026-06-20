import { useState } from "react";
import { getImageUrl } from "../../Utils/imageUrl";

function CategoryBar({ categories, selectedCategory, onSelect, loading }) {
  const [hoveredId, setHoveredId] = useState(null);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto px-4 py-5 sm:px-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-[110px] min-w-[100px] animate-pulse rounded-2xl bg-white/[0.05]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pb-2 pt-5 sm:px-6">
      <h2 className="mb-[14px] text-base font-semibold uppercase tracking-[1.5px] text-white/50">
        Categories
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const isHovered = hoveredId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              onMouseEnter={() => setHoveredId(cat.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`flex min-w-[120px] flex-shrink-0 cursor-pointer flex-col items-center gap-3 rounded-3xl border border-white/5 p-4 transition-all duration-300 ${
                isSelected
                  ? "bg-cafe-gold text-[#110e0d] shadow-warm scale-[1.02]"
                  : isHovered
                    ? "bg-white/[0.08] text-white border-white/20"
                    : "bg-white/[0.02] text-white/60"
              }`}
            >
              {getImageUrl(cat, "category_image") ? (
                <div className="overflow-hidden rounded-full h-14 w-14 border border-white/10 p-0.5">
                  <img
                    src={getImageUrl(cat, "category_image")}
                    alt={cat.category_name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              ) : (
                <div className={`grid h-14 w-14 place-items-center rounded-full border border-white/10 text-2xl ${isSelected ? "bg-[#110e0d]/10" : "bg-white/5"}`}>
                  ☕
                </div>
              )}
              <span
                className={`max-w-[100px] truncate text-center font-sans text-sm tracking-wide ${
                  isSelected ? "font-bold" : "font-medium"
                }`}
              >
                {cat.category_name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryBar;

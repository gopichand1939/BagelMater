import React from 'react';
import { getImageUrl } from "../../Utils/imageUrl";

function CategoryGrid({ categories = [], onSelect, loading }) {
  // 1. Fixed Layout Shift: Skeleton cards match exact real card height (h-[220px])
  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 px-4 py-8 sm:px-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[220px] animate-pulse rounded-[28px] bg-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  // Filter safely with optional chaining protection
  const displayCategories = categories.filter((cat) => cat?.id !== "all");

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mb-10 text-center">
        <h2 className="mb-3 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Explore Our Menu
        </h2>
        <p className="mx-auto max-w-lg font-sans text-sm text-white/50">
          Discover a wide variety of freshly prepared meals, from our signature
          bagels to handcrafted beverages.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
        {displayCategories.map((cat) => {
          // 2. Performance Polish: Cache the image URL value locally to avoid duplicate executions
          const imageUrl = getImageUrl(cat, "category_image");

          return (
            <button
              key={cat.id}
              onClick={() => onSelect && onSelect(cat.id)}
              className="group relative flex h-[220px] w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#1c1917] p-0 text-left transition-all duration-500 hover:-translate-y-2 hover:border-cafe-gold/30 hover:shadow-premium focus:outline-none focus:ring-2 focus:ring-cafe-gold/50"
            >
              {/* Image & Fallback layers */}
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={cat.category_name || "Menu category"}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-black/40 text-5xl opacity-40 transition-transform duration-500 group-hover:scale-110">
                  ☕
                </div>
              )}

              {/* 3. Improved Premium Overlay: Added a solid 20% layer below the gradient to guarantee white text readability over bright images */}
              <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

              {/* Text Meta Container */}
              <div className="relative mt-auto p-6 w-full">
                <h3 className="m-0 font-serif text-2xl font-bold tracking-wide text-white drop-shadow-md transition-colors duration-300 group-hover:text-cafe-gold">
                  {cat.category_name}
                </h3>
                
                {/* Micro-Interaction Button Token */}
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 font-sans text-xs font-semibold tracking-wider text-white backdrop-blur-md transition-all duration-300 group-hover:bg-cafe-gold group-hover:text-[#110e0d] group-hover:px-5">
                  <span>VIEW ITEMS</span>
                  <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryGrid;
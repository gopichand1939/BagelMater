import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { CategoryBar, ItemGrid, CategoryGrid } from "../../components/Menu";

export default function MenuPage() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    loadingCategories,
    items,
    loadingItems,
    addToCart,
    openAddonsForItem,
    cart,
    removeFromCart,
    sentinelRef,
    isFetchingMore
  } = useOutletContext();

  return (
    <div className="w-full pt-32 pb-16 min-h-screen bg-[#110e0d]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <span className="  font-sans text-sm font-bold uppercase tracking-[0.2em] text-cafe-gold">
            Taste the Magic
          </span>
          {/* <h1 className="font-serif text-4xl font-bold text-white md:text-5xl">Our Menu</h1> */}
        </div>
        
        {!selectedCategory ? (
          <CategoryGrid
            categories={categories}
            onSelect={setSelectedCategory}
            loading={loadingCategories}
          />
        ) : (
          <>
            <div className="flex items-center justify-between pt-5 mb-6">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 font-sans text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                ← Back to Categories
              </button>
            </div>
            <CategoryBar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
              loading={loadingCategories}
            />
            <ItemGrid
              items={items}
              loading={loadingItems}
              onAddToCart={addToCart}
              onOpenAddons={openAddonsForItem}
              cart={cart}
              onRemoveFromCart={removeFromCart}
              sentinelRef={sentinelRef}
              isFetchingMore={isFetchingMore}
            />
          </>
        )}
      </div>
    </div>
  );
}

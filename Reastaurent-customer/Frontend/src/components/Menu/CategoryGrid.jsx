import { getImageUrl } from "../../Utils/imageUrl";

function CategoryGrid({ categories, onSelect, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 px-4 py-8 sm:px-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[200px] animate-pulse rounded-3xl bg-white/[0.05]"
          />
        ))}
      </div>
    );
  }

  const displayCategories = categories.filter((cat) => cat.id !== "all");

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
        {displayCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="group relative flex h-[220px] w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#1c1917] p-0 text-left transition-all duration-500 hover:-translate-y-2 hover:border-cafe-gold/30 hover:shadow-premium"
          >
            {getImageUrl(cat, "category_image") ? (
              <img
                src={getImageUrl(cat, "category_image")}
                alt={cat.category_name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-black/40 text-6xl">
                ☕
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="relative mt-auto p-6">
              <h3 className="m-0 font-serif text-2xl font-bold tracking-wide text-white drop-shadow-md transition-colors duration-300 group-hover:text-cafe-gold">
                {cat.category_name}
              </h3>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 font-sans text-xs font-semibold tracking-wider text-white backdrop-blur-md transition-colors duration-300 group-hover:bg-cafe-gold group-hover:text-[#110e0d]">
                <span>VIEW ITEMS</span>
                <span className="text-lg leading-none">→</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CategoryGrid;

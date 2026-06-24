import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchTopProducts } from '../../services/topProductsApi';
import { getImageUrl } from '../../Utils/imageUrl';

const MotionDiv = motion.div;

export default function TopSellers() {
  const navigate = useNavigate();
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadTopProducts = async () => {
      try {
        setLoading(true);
        setError('');
        const items = await fetchTopProducts();

        if (isMounted) {
          setTopItems(items);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load top products');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTopProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleItems = topItems.slice(0, 4);

  return (
    <section className="py-24 border-t relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cafe-gold/10 rounded-full blur-[180px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <span className="text-cafe-gold font-sans font-bold uppercase tracking-[0.2em] mb-4 block">
              Customer Favorites
            </span>
            <h2 className="text-white font-serif text-4xl md:text-5xl font-bold">
              Our Top Sellers
            </h2>
          </div>
          <button
            onClick={() => navigate('/menu')}
            className="text-white/60 uppercase font-bold tracking-widest text-sm hover:text-cafe-gold transition-colors border-b border-transparent hover:border-cafe-gold pb-1 self-start md:self-end"
          >
            View Full Menu
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
          {loading
            ? [1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-[420px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
                />
              ))
            : null}

          {!loading && error ? (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-8 text-center text-white/60">
              {error}
            </div>
          ) : null}

          {!loading && !error && visibleItems.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-8 text-center text-white/60">
              No top sellers available right now.
            </div>
          ) : null}

          {!loading && !error
            ? visibleItems.map((item, i) => {
                const imageUrl = getImageUrl(item, 'item_image');
                const hasDiscount =
                  item.discount_price && Number(item.discount_price) < Number(item.price);
                const displayPrice = hasDiscount ? item.discount_price : item.price;

                return (
                  <MotionDiv
                    key={item.id || item.top_product_id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                    className="group relative bg-[#110e0d] rounded-3xl overflow-hidden border border-white/10 hover:border-cafe-gold/30 transition-colors flex flex-col h-full"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden relative">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.item_name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-[#1c1917] text-cafe-gold">
                          <ShoppingBag className="h-10 w-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#110e0d] via-transparent to-transparent opacity-80" />
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-3">
                        <h3 className="text-xl font-serif font-bold text-white shadow-sm">
                          {item.item_name}
                        </h3>
                        <div className="shrink-0 bg-[#110e0d]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-cafe-gold shadow-lg">
                          {'\u00a3'}{displayPrice}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <p className="text-white/60 font-sans text-sm leading-relaxed h-[72px] mb-6 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
                        {item.item_description || item.category_name || 'Freshly prepared customer favorite.'}
                      </p>
                      <button
                        onClick={() => navigate('/menu')}
                        className=" mt-auto w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm uppercase tracking-wider hover:bg-cafe-gold hover:text-[#110e0d] transition-colors flex items-center justify-center gap-2 group-hover:border-cafe-gold/50"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Order Now
                      </button>
                    </div>
                  </MotionDiv>
                );
              })
            : null}
        </div>
      </div>
    </section>
  );
}

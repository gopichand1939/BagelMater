import React from 'react';
import { motion } from 'framer-motion';

const galleryImages = [
  { id: 1, src: "https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?q=80&w=2070&auto=format&fit=crop", title: "Morning Brew" },
  {
  id: 11,
  src: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=2070&auto=format&fit=crop",
  title: "Freshly Baked Bagels"
},
  { id: 3, src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070&auto=format&fit=crop", title: "Cozy Corner" },
  { id: 4, src: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1974&auto=format&fit=crop", title: "Latte Art" },
  { id: 5, src: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop", title: "Atmosphere" },
  { id: 6, src: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1974&auto=format&fit=crop", title: "Barista at Work" },
 {
  id: 12,
  src: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=2070&auto=format&fit=crop",
  title: "Breakfast Special"
},
  {
  id: 8,
  src: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=2070&auto=format&fit=crop",
  title: "Signature Bagels"
}
];

export default function GalleryPage() {
  return (
    <div className="w-full pt-32 pb-24 min-h-screen text-[#4D483F]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="mb-4 inline-block font-sans text-sm font-bold uppercase tracking-[0.2em] text-cafe-gold">
              Visual Journey
            </span>
            <h1 className="font-serif text-4xl font-bold text-white md:text-5xl">Our Gallery</h1>
            <p className="mt-4 text-white/60 font-sans max-w-2xl mx-auto">
              Step inside and experience the ambiance of Bagel Cafe. A visual collection of our daily craft and aesthetic space.
            </p>
          </motion.div>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {galleryImages.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative overflow-hidden rounded-2xl group break-inside-avoid"
            >
              <img
                src={image.src}
                alt={image.title}
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute bottom-0 left-0 p-6">
                  <h3 className="text-xl font-serif font-bold text-white">{image.title}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";

const galleryImages = [
  "https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1445116572660-236099ce4059?q=80&w=2071&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1974&auto=format&fit=crop",
];

export default function Gallery() {
  return (
    <section className="relative overflow-hidden bg-[#110e0d] py-24">
      <div className="mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block font-sans text-sm font-bold uppercase tracking-[0.2em] text-cafe-gold">
            Atmosphere
          </span>
          <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">
            Inside <span className="italic">Bagel Cafe</span>
          </h2>
        </motion.div>
      </div>

      <div className="w-full">
        <Swiper
          modules={[Autoplay, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1500}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          loop={true}
          className="h-[50vh] min-h-[400px] w-full lg:h-[70vh]"
        >
          {galleryImages.map((src, index) => (
            <SwiperSlide key={index}>
              <div className="relative h-full w-full">
                <img
                  src={src}
                  alt={`Cafe Atmosphere ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

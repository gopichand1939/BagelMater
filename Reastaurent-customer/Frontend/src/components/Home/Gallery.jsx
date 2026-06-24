import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";

const galleryImages = [
  "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=2070&auto=format&fit=crop",
 
  "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?q=80&w=2070&auto=format&fit=crop",
];
export default function Gallery() {
  return (
    <section className="relative overflow-hidden bg-[#0F0B08] ">
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

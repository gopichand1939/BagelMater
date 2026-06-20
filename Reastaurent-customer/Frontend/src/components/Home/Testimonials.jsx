import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Jenkins",
    role: "Regular Customer",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop",
    text: "The best bagels in town, hands down. Their smoked salmon on an everything bagel is my weekend ritual. The coffee is always perfectly brewed.",
  },
  {
    name: "Michael Chen",
    role: "Local Guide",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop",
    text: "I've tried cafes all over the city, but Bagel Cafe's atmosphere and quality keep bringing me back. The staff is incredibly friendly and the pastries are divine.",
  },
  {
    name: "Emily Rodriguez",
    role: "Food Blogger",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
    text: "Aesthetic perfection meets culinary excellence. Every item on the menu is carefully crafted. Their seasonal lattes are a must-try!",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-cafe-bg py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="mb-4 inline-block font-sans text-sm font-bold uppercase tracking-[0.2em] text-cafe-gold">
              Words of Love
            </span>
            <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">
              From Our <span className="italic text-cafe-cream/80">Community</span>
            </h2>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            breakpoints={{
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            pagination={{ clickable: true, bulletActiveClass: "bg-cafe-gold", bulletClass: "swiper-pagination-bullet bg-white/20" }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            className="pb-16"
          >
            {testimonials.map((testimonial, idx) => (
              <SwiperSlide key={idx}>
                <div className="customer-card flex h-full flex-col items-center text-center">
                  <div className="mb-6 flex gap-1 text-cafe-gold">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mb-8 flex-1 font-sans text-lg font-light italic leading-relaxed text-white/70">
                    "{testimonial.text}"
                  </p>
                  <div className="flex flex-col items-center">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.name}
                      className="mb-3 h-14 w-14 rounded-full border-2 border-cafe-gold/20 object-cover"
                    />
                    <h4 className="font-sans text-sm font-bold text-white">{testimonial.name}</h4>
                    <span className="font-sans text-xs text-white/40">{testimonial.role}</span>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      </div>
    </section>
  );
}

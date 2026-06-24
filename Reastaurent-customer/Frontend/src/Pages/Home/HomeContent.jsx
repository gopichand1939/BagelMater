import React from 'react';
import { motion } from 'framer-motion';
// import BannerCarousel from "../../components/Home/BannerCarousel";
import Hero from "../../components/Home/Hero";
import Gallery from "../../components/Home/Gallery";
import WelcomeOfferModal from "../../components/promotions/WelcomeOfferModal";

import TopSellers from "../../components/Home/TopSellers";
import Newsletter from "../../components/Home/Newsletter";

const MotionDiv = motion.div;

export default function HomeContent() {
  return (
    <div className="w-full bg-[#0F0B08]">
      <WelcomeOfferModal />
      <Hero />
      {/* <div className="py-12">
        <BannerCarousel />
      </div> */}

      <TopSellers />

      {/* Freshly Baked Daily Section */}
      {/* <section className="py-24 bg-[#0F0B08] relative" id="handcrafted">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="text-cafe-gold font-sans font-bold uppercase tracking-[0.2em] mb-4 block">
              Handcrafted
            </span>
            <h2 className="text-white font-serif text-4xl md:text-5xl font-bold drop-shadow-lg">
              Freshly Baked Daily
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {[
              {
                title: "Classic Bagels",
                desc: "Boiled and baked to perfection with a chewy interior and crisp crust.",
              img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?q=80&w=2070&auto=format&fit=crop"
              },
              {
                title: "Artisanal Coffee",
                desc: "Sourced from sustainable farms and roasted in-house every morning.",
                img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1974&auto=format&fit=crop"
              },
              {
                title: "Signature Spreads",
                desc: "Whipped cream cheeses made with fresh, locally sourced ingredients.",
               img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1999&auto=format&fit=crop"
              },
              {
                title: "Fresh Sandwiches",
                desc: "Crafted daily with premium ingredients, crisp vegetables, and artisan breads.",
                img: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=2070&auto=format&fit=crop"
              }
            ].map((item, i) => (
              <MotionDiv 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                className="group relative overflow-hidden rounded-[2rem] border border-white/5 shadow-2xl bg-[#1A120D]"
              >
                <div className="h-80 w-full overflow-hidden">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                </div>
                <div className="p-8 relative z-10 transition-transform duration-500">
                  <h3 className="text-2xl font-serif font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/60 font-sans leading-relaxed">{item.desc}</p>
                </div>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section> */}

      {/* Our Craft / Philosophy Section */}
      <section className="py-24 bg-[#F5EFE6] relative">
        {/* Soft transition gradient overlay */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0F0B08] to-transparent opacity-10" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <MotionDiv 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-[#8B5A33] font-sans font-bold uppercase tracking-[0.2em] mb-4 block">
                Our Philosophy
              </span>
              <h2 className="text-[#2D1B12] font-serif text-4xl md:text-5xl font-bold mb-6">
                The Art of Time
              </h2>
              <p className="text-[#2D1B12]/80 font-sans text-lg leading-relaxed mb-6 font-medium">
                Great bagels cannot be rushed. Our dough undergoes a slow, cold fermentation process for 24 hours to develop its distinct, complex flavor profile. This patience yields a perfectly blistered crust and a satisfyingly chewy center that defines the classic bagel experience.
              </p>
              <p className="text-[#2D1B12]/80 font-sans text-lg leading-relaxed mb-8 font-medium">
                Paired with our meticulously calibrated espresso extraction, every morning at Bagel Cafe is an exercise in culinary precision and passion.
              </p>
              <button onClick={() => document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth" })} className="text-[#8B5A33] uppercase font-bold tracking-widest text-sm hover:text-[#2D1B12] transition-colors border-b-2 border-[#8B5A33] pb-1 hover:border-[#2D1B12]">
                Discover Our Process
              </button>
            </MotionDiv>
            <MotionDiv 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative rounded-[3rem] overflow-hidden shadow-[0_20px_50px_rgba(45,27,18,0.15)] ring-1 ring-[#2D1B12]/5"
            >
              <img src="https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2071&auto=format&fit=crop" alt="Coffee preparation" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2D1B12]/20 to-transparent" />
            </MotionDiv>
          </div>
        </div>
      </section>

      <Newsletter />
      <Gallery />
    </div>
  );
}

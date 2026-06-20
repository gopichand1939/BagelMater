import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative h-screen min-h-[600px] w-full overflow-hidden flex items-center justify-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2071&auto=format&fit=crop')"
        }}
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#110e0d]/80 via-[#110e0d]/50 to-cafe-bg" />
      </div>

      <div className="relative z-10 w-full max-w-[1200px] px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="mb-4 inline-block font-sans text-sm font-bold uppercase tracking-[0.2em] text-cafe-gold">
            Premium Roasters & Bakers
          </span>
          <h1 className="mb-6 font-serif text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            The Art of <br />
            <span className="italic text-cafe-cream/90">Coffee & Bagels</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mx-auto mb-10 max-w-2xl font-sans text-lg font-light text-white/80 md:text-xl"
        >
          Experience the perfect blend of artisanal bagels baked fresh daily and ethically sourced coffee roasted to perfection.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <button 
            onClick={() => document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth" })}
            className="group flex items-center gap-2 rounded-full bg-cafe-gold px-8 py-4 font-sans text-sm font-bold uppercase tracking-wider text-[#110e0d] transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_rgba(197,168,128,0.4)]"
          >
            Explore Menu
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button 
            onClick={() => document.getElementById("about-section")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full border border-white/20 bg-white/5 px-8 py-4 font-sans text-sm font-bold uppercase tracking-wider text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:text-cafe-gold"
          >
            Our Story
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="font-sans text-xs uppercase tracking-[0.2em] text-white/50">Scroll</span>
        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="h-12 w-[1px] bg-gradient-to-b from-cafe-gold to-transparent"
        />
      </motion.div>
    </section>
  );
}

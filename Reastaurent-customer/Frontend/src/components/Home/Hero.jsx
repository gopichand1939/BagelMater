import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom"; 

import turkeyReuben from "../../assets/turkey-reuben.png";
import falafelWrap from "../../assets/falafel-wrap.png";
import chickenBagel from "../../assets/chicken-salad-bagel.png";
import blueberryFrappe from "../../assets/blueberry-frappe.png";
// import caramelCoffee from "../../assets/caramel-coffee.png";
// import orangeJuice from "../../assets/orange-juice.png";

export default function Hero() {
  const navigate = useNavigate();
  return (
<section className="relative h-screen min-h-[550px] overflow-hidden bg-[#0F0B08] flex items-center justify-center">

  <div className="absolute inset-0 overflow-hidden">

  <div
    className="
    absolute
    left-1/2
    top-1/2
    h-[900px]
    w-[900px]
    -translate-x-1/2
    -translate-y-1/2
    rounded-full
    bg-[#D4B483]/8
    blur-[220px]
    "
  />

</div>

  {/* Background Text */}
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <h2 className="text-[18rem] font-black uppercase text-white/[0.015] leading-none">
      BAGELS
    </h2>
  </div>

  {/* Golden Glow */}
  <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4B483]/10 blur-[180px]" />

  {/* ================= LEFT SIDE ================= */}

  {/* Turkey Reuben */}
{/* <motion.div
  animate={{ y: [0, -12, 0] }}
  transition={{ repeat: Infinity, duration: 5 }}
  className="absolute top-20 left-12 hidden xl:block z-20"
>

  <div className="absolute inset-0 rounded-full bg-[#D4B483]/10 blur-3xl" />

  <img
    src={turkeyReuben}
    alt=""
    className="
    relative
    w-[360px]
    rotate-[-3deg]
    drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]
    "
  />

</motion.div> */}

  {/* Falafel Wrap */}
{/* <motion.div
  animate={{ y: [0, 10, 0] }}
  transition={{ repeat: Infinity, duration: 6 }}
  className="absolute left-10 top-[62%] hidden xl:block z-20"
>
  <div className="absolute inset-0 rounded-full bg-[#D4B483]/10 blur-3xl" />

  <img
    src={falafelWrap}
    alt=""
    className="
    w-[230px]
    rotate-[2deg]
    drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)]
    "
  />
</motion.div> */}

  {/* Caramel Coffee */}
  {/* <motion.div
    animate={{ y: [0, -10, 0] }}
    transition={{ repeat: Infinity, duration: 4 }}
    className="absolute bottom-10 left-20 hidden xl:block z-20"
  >
    <img
      src={caramelCoffee}
      alt=""
      className="w-[160px] drop-shadow-2xl"
    />
  </motion.div> */}

  {/* ================= RIGHT SIDE ================= */}

  {/* Blueberry Frappe */}
{/* <motion.div
  animate={{ y: [0, -12, 0] }}
  transition={{ repeat: Infinity, duration: 5 }}
  className="absolute right-20 top-[120px] hidden xl:block z-20"
>
  <div className="absolute inset-0 rounded-full bg-[#D4B483]/10 blur-3xl" />

  <img
    src={blueberryFrappe}
    alt=""
    className="
    w-[190px]
    rotate-[3deg]
    drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)]
    "
  />
</motion.div> */}

  {/* Chicken Bagel */}
{/* <motion.div
  animate={{ y: [0, 12, 0] }}
  transition={{ repeat: Infinity, duration: 6 }}
  className="absolute right-10 top-[60%] hidden xl:block z-20"
>
  <div className="absolute inset-0 rounded-full bg-[#D4B483]/10 blur-3xl" />

  <img
    src={chickenBagel}
    alt=""
    className="
    w-[260px]
    rotate-[-2deg]
    drop-shadow-[0_25px_50px_rgba(0,0,0,0.4)]
    "
  />
</motion.div> */}

  {/* Orange Juice */}
  {/* <motion.div
    animate={{ y: [0, -10, 0] }}
    transition={{ repeat: Infinity, duration: 4 }}
    className="absolute bottom-10 right-20 hidden xl:block z-20"
  >
    <img
      src={orangeJuice}
      alt=""
      className="w-[160px] drop-shadow-2xl"
    />
  </motion.div> */}

  {/* ================= CENTER CONTENT ================= */}

<div className="relative z-30 max-w-[850px] px-6 text-center">

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >

     <span className="tracking-[0.25em] uppercase text-[#D4B483] text-sm">
       The Art of 
      </span>

      <h1 className="mt-6 mb-8 text-white text-7xl md:text-8xl lg:text-[6rem] font-serif font-bold leading-[0.9]">
        Bagel Master
      </h1>
      <div className="mx-auto mb-8 h-[1px] w-40 bg-gradient-to-r from-transparent via-[#D4B483] to-transparent" />

     <div className="mb-8 tracking-[0.4em] uppercase text-[#D4B483] text-sm font-semibold">
        Artisan Coffee • Fresh Bagels
      </div>

      <p className="mx-auto max-w-2xl text-xl text-white/75 leading-relaxed">
        Freshly baked artisan bagels and expertly crafted coffee,
        served daily in a warm and welcoming atmosphere.
      </p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-8 flex flex-col sm:flex-row justify-center gap-4"
    >

      <button
        onClick={() => navigate("/menu")}
        className="group flex items-center justify-center gap-2 rounded-full bg-[#D4B483] px-8 py-4 text-sm font-bold uppercase tracking-wider text-[#110e0d] transition-all duration-300 hover:scale-105 hover:bg-[#E2C89B]"
      >
        Explore Menu
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </button>

      <button
        onClick={() => navigate("/about")}
        className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all duration-300 hover:bg-white/20"
      >
        Our Story
      </button>

    </motion.div>

    {/* Popular Product Pill */}
    {/* <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-10 flex justify-center"
    >
      <div className="flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-md">

        <img
          src={turkeyReuben}
          alt=""
          className="h-12 w-12 rounded-full object-cover"
        />

        <div className="text-left">
          <p className="text-xs text-white/60 uppercase">
            Most Popular
          </p>
          <p className="text-cafe-gold font-semibold">
            Turkey Reuben Bagel
          </p>
        </div>

      </div>
    </motion.div> */}

  </div>

</section>
  );
}

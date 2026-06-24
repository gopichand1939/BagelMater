// import React from 'react';
// import { Swiper, SwiperSlide } from 'swiper/react';
// import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
// import 'swiper/css';
// import 'swiper/css/pagination';
// import 'swiper/css/effect-fade';
// import { motion } from 'framer-motion';

// const bannerImages = [
//   {
//     id: 1,
//     src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070&auto=format&fit=crop",
//     title: "Morning Freshness",
//     subtitle: "Start your day right"
//   },
//   {
//     id: 2,
//     src: "https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?q=80&w=2070&auto=format&fit=crop",
//     title: "Artisanal Roasts",
//     subtitle: "Ethically sourced beans"
//   },
//   {
//     id: 3,
//     src: "https://images.unsplash.com/photo-1445116572660-236099ce4059?q=80&w=2071&auto=format&fit=crop",
//     title: "Warm & Cozy",
//     subtitle: "Your second home"
//   }
// ];

// export default function BannerCarousel() {
//   return (
//     <div className="w-full h-[70vh] min-h-[500px] relative mt-20">
//       <Swiper
//         modules={[Autoplay, Pagination, EffectFade]}
//         effect="fade"
//         pagination={{ clickable: true }}
//         speed={1000}
//         autoplay={{
//           delay: 5000,
//           disableOnInteraction: false,
//         }}
//         loop={true}
//         className="w-full h-full rounded-3xl overflow-hidden mx-auto max-w-[96%]"
//       >
//         {bannerImages.map((banner) => (
//           <SwiperSlide key={banner.id}>
//             <div className="relative w-full h-full">
//               <img
//                 src={banner.src}
//                 alt={banner.title}
//                 className="w-full h-full object-cover"
//               />
//               <div className="absolute inset-0 bg-gradient-to-t from-[#110e0d]/90 via-[#110e0d]/40 to-transparent flex flex-col justify-end p-12 md:p-24">
//                 <motion.div
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ duration: 0.8 }}
//                 >
//                   <span className="text-cafe-gold font-sans font-bold uppercase tracking-[0.2em] mb-4 block">
//                     {banner.subtitle}
//                   </span>
//                   <h2 className="text-white font-serif text-5xl md:text-7xl font-bold">
//                     {banner.title}
//                   </h2>
//                 </motion.div>
//               </div>
//             </div>
//           </SwiperSlide>
//         ))}
//       </Swiper>
//     </div>
//   );
// }

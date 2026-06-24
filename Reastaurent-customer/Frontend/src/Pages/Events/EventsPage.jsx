import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Coffee,
  HeartHandshake,
  Mail,
  MapPin,
  Music2,
  PartyPopper,
  Phone,
  Sparkles,
  Users,
  
} from "lucide-react";

const eventTypes = [
  {
    title: "Private Celebrations",
    description: "Birthdays, anniversaries, small reunions, and warm family evenings.",
    icon: PartyPopper,
  },
  {
    title: "Corporate Cafe Meets",
    description: "Team catch-ups, networking mornings, product chats, and casual client sessions.",
    icon: HeartHandshake,
  },
  {
    title: "Coffee Tastings",
    description: "Curated tasting tables with signature brews, bagels, and chef-picked bites.",
    icon: Coffee,
  },
  {
    title: "Acoustic Evenings",
    description: "Soft music, cozy lights, and a relaxed cafe setup for intimate gatherings.",
    icon: Music2,
  },
];

const packages = [
  {
    name: "Morning Table",
    detail: "Breakfast gatherings with coffee, bagels, pastries, and fresh juice.",
    meta: "12-25 guests",
  },
  {
    name: "Golden Hour",
    detail: "Premium snacks, mocktails, desserts, and a reserved cafe corner.",
    meta: "20-45 guests",
  },
  {
    name: "Full Cafe Moment",
    detail: "A tailored private setup with menu planning, decor mood, and host support.",
    meta: "Up to 70 guests",
  },
];

const inclusions = [
  "Reserved seating layout",
  "Custom food and beverage menu",
  "Premium cafe styling",
  "Dedicated event coordinator",
  "Optional cake and dessert table",
  "Photo-friendly lighting setup",
];

export default function EventsPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="w-full bg-[#110e0d] text-white">
      <section className="relative min-h-[92vh] overflow-hidden pt-20">
        <img
          src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop"
          alt="Premium cafe event setting"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,14,13,0.94)_0%,rgba(17,14,13,0.76)_46%,rgba(17,14,13,0.42)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#110e0d] to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-7xl items-center px-4 pb-20 pt-12 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
          
            <h1 className="font-serif text-5xl font-bold leading-tight text-white md:text-7xl">
              Make your next gathering feel unforgettable.
            </h1>
            <p className="mt-6 max-w-2xl font-sans text-lg font-light leading-8 text-white/72 md:text-xl">
              Host intimate celebrations, team socials, tasting sessions, and special evenings in a warm cafe space built around handcrafted food, beautiful coffee, and thoughtful service.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a href="#event-enquiry" className="customer-primary-button text-center">
                Enquire Now
              </a>
              <a href="#event-packages" className="customer-secondary-button text-center">
                View Packages
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      

      <section id ="event-packages" className="py-20 md:py-24 bg-[#F5EFE7]">
  <div className="mx-auto max-w-7xl px-4 sm:px-6">
    <div className="mb-14 text-center">
      <span className="font-sans text-sm font-semibold uppercase tracking-[0.18em] text-[#F08B27]">
        Catering & Events
      </span>

      <h2 className="mt-3 font-serif text-4xl font-bold text-[#2B1412] md:text-5xl">
        Every Occasion, Beautifully Hosted
      </h2>

      <p className="mx-auto mt-5 max-w-3xl leading-7 text-[#6B4B3E]">
        From intimate gatherings to large celebrations, we bring handcrafted
        food, premium bagels, fresh coffee, and warm hospitality to every
        event.
      </p>
    </div>

    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[
        {
          title: "Weddings",
          description:
            "Baraat, Mehendi, Walima — delicious catering for the day that matters most.",
          icon: HeartHandshake,
        },
        {
          title: "Corporate Events",
          description:
            "Boardrooms, launches, away-days, and team gatherings with premium catering.",
          icon: Users,
        },
        {
          title: "Birthdays",
          description:
            "From five to fifty-five — bagels, breakfast platters, desserts, and coffee.",
          icon: PartyPopper,
        },
        {
          title: "Festivals",
          description:
            "Eid, Diwali, Ramadan, and community celebrations catered at scale.",
          icon: Sparkles,
        },
        {
          title: "Private Parties",
          description:
            "Engagement nights, house gatherings, and intimate celebrations.",
          icon: Coffee,
        },
        {
          title: "Community Events",
          description:
            "Charity events, cultural programs, and community kitchens.",
          icon: HeartHandshake,
        },
      ].map((item, index) => {
        const Icon = item.icon;

        return (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="
              flex
              items-start
              gap-4
              rounded-2xl
              border
              border-[#E7D8C8]
              bg-white
              p-6
              transition-all
              duration-300
              hover:-translate-y-1
              hover:shadow-lg
            "
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F08B27]/10 text-[#F08B27]">
              <Icon className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#2B1412]">
                {item.title}
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#6B4B3E]">
                {item.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
</section>

      {/* <section id="event-packages" className="border-y border-white/5 bg-white/[0.025] py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <span className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-cafe-gold">
              Signature hosting
            </span>
            <h2 className="mt-3 font-serif text-4xl font-bold leading-tight text-white md:text-5xl">
              Choose the mood. We will shape the table.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/62">
              From a calm breakfast table to an evening takeover, each event can be adjusted around your guest count, preferred menu, and occasion style.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {inclusions.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white/72">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-cafe-gold" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-4">
            {packages.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="rounded-[26px] border border-white/10 bg-[#171311]/80 p-6 shadow-premium backdrop-blur-xl md:p-7"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-serif text-3xl font-bold text-white">{item.name}</h3>
                    <p className="mt-3 max-w-2xl leading-7 text-white/60">{item.detail}</p>
                  </div>
                  <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-cafe-gold/25 bg-cafe-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-cafe-gold">
                    {item.meta}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

<section id="event-enquiry" className="py-20 md:py-28 bg-[#FFFDFB]">
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <span className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#6B4B3E]">
          Get a Quote
        </span>
        <h2 className="mt-2 font-serif text-4xl font-bold tracking-tight text-[#2B1412] md:text-5xl">
          Tell us about your event.
        </h2>
        <p className="mt-4 max-w-2xl font-sans text-base text-[#6B4B3E]/80 leading-relaxed">
          Drop the details below and the catering team will come back to you as soon as they can with a tailored quote.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-14"
      >
        {submitted ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#6B4B3E]/10 text-[#6B4B3E]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#2B1412]">Enquiry Submitted</h3>
            <p className="mt-3 max-w-md text-[#6B4B3E]">
              Thank you! Our catering team will review your details and get back to you shortly.
            </p>
            <button 
              type="button" 
              onClick={() => setSubmitted(false)} 
              className="mt-8 text-sm font-semibold uppercase tracking-wider text-[#2B1412] underline underline-offset-4 hover:text-[#6B4B3E]"
            >
              Send Another Enquiry
            </button>
          </div>
        ) : (
          <form className="space-y-10" onSubmit={handleSubmit}>
            <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {/* Name */}
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#6B4B3E]">
                  Name
                </label>
                <input 
                  type="text" 
                  required 
                  className="mt-2 w-full border-b border-[#2B1412]/20 bg-transparent py-3 font-sans text-base text-[#2B1412] placeholder-[#6B4B3E]/40 outline-none transition-colors focus:border-[#2B1412]"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#6B4B3E]">
                  Email
                </label>
                <input 
                  type="email" 
                  required 
                  className="mt-2 w-full border-b border-[#2B1412]/20 bg-transparent py-3 font-sans text-base text-[#2B1412] placeholder-[#6B4B3E]/40 outline-none transition-colors focus:border-[#2B1412]"
                />
              </div>
            </div>

            <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {/* Phone */}
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#6B4B3E]">
                  Phone Number
                </label>
                <input 
                  type="tel" 
                  required 
                  className="mt-2 w-full border-b border-[#2B1412]/20 bg-transparent py-3 font-sans text-base text-[#2B1412] placeholder-[#6B4B3E]/40 outline-none transition-colors focus:border-[#2B1412]"
                />
              </div>

              {/* Postcode */}
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#6B4B3E]">
                  Postcode of Event
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. BR6 8AQ" 
                  required 
                  className="mt-2 w-full border-b border-[#2B1412]/20 bg-transparent py-3 font-sans text-base text-[#2B1412] placeholder-[#6B4B3E]/40 outline-none transition-colors focus:border-[#2B1412]"
                />
              </div>
            </div>

            <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {/* Date */}
              <div className="flex flex-col relative">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#6B4B3E]">
                  Date of Event
                </label>
                <div className="relative mt-2">
                  <input 
                    type="date" 
                    required 
                    className="w-full border-b border-[#2B1412]/20 bg-transparent py-3 font-sans text-base text-[#2B1412] outline-none
                     transition-colors focus:border-[#2B1412] cursor-pointer"
                  />
                  <CalendarDays className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B4B3E]/50" />
                </div>
              </div>

              {/* Event Type / Custom Field if needed, otherwise matches spacing */}
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#6B4B3E]">
                  Event Type
                </label>
<select
  required
  defaultValue=""
  className="mt-2 w-full border-b border-[#2B1412]/20 bg-transparent py-3 font-sans text-base text-[#2B1412] 
  outline-none transition-colors focus:border-[#2B1412] cursor-pointer appearance-none"
>
  <option value="" disabled>
    Select an option
  </option>

  <option value="weddings">Weddings</option>
  <option value="corporate">Corporate Events</option>
  <option value="birthdays">Birthdays</option>
  <option value="festivals">Festivals</option>
  <option value="private">Private Parties</option>
  <option value="community">Community Events</option>
   <option value="community">others</option>
</select>
              </div>
            </div>

            {/* Message */}
            <div className="flex flex-col pt-2">
              <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#6B4B3E]">
                Message
              </label>
              <textarea 
                rows="2" 
                placeholder="Guest count, style, timings, dietary requirements — anything that would help." 
                required 
                className="mt-2 w-full resize-none border-b border-[#2B1412]/20 bg-transparent py-3 font-sans text-base text-[#2B1412] placeholder-[#6B4B3E]/50 outline-none transition-colors focus:border-[#2B1412]"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="submit" 
                className="w-full bg-[#967466] py-4 text-sm font-semibold uppercase tracking-widest text-white transition-all duration-300 hover:bg-[#856356] active:scale-[0.99]"
              >
                send enquiry
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  </section>
    </div>
  );
}

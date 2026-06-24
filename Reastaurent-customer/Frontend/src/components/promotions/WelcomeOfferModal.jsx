import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BagelLogo from "../../assets/begal_logo.ico";
const SESSION_SHOWN_KEY = "bagel_cafe_welcome_offer_shown_session";
const SHOW_DELAY_MS = 2000;

const MotionDiv = motion.div;
const MotionButton = motion.button;

const canUseBrowserStorage = () => typeof window !== "undefined";

const readStorageFlag = (storage, key) => {
  try {
    return storage.getItem(key) === "true";
  } catch {
    return false;
  }
};

const writeStorageFlag = (storage, key) => {
  try {
    storage.setItem(key, "true");
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
};

export default function WelcomeOfferModal({
  user = null,
  enabled = true,
  delayMs = SHOW_DELAY_MS,

  sessionShownKey = SESSION_SHOWN_KEY,
  onOrderNow,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isEligibleForFirstOrderOffer = useMemo(() => {
    if (!user || typeof user.totalOrders !== "number") {
      return true;
    }

    return user.totalOrders === 0;
  }, [user]);

  useEffect(() => {
    if (!enabled || !isEligibleForFirstOrderOffer || !canUseBrowserStorage()) {
      return undefined;
    }


    const hasShownThisSession = readStorageFlag(
      window.sessionStorage,
      sessionShownKey
    );

  if (hasShownThisSession) {
  return undefined;
}

    const timerId = window.setTimeout(() => {
      writeStorageFlag(window.sessionStorage, sessionShownKey);
      setOpen(true);
    }, delayMs);

    return () => window.clearTimeout(timerId);
  }, [delayMs,  enabled, isEligibleForFirstOrderOffer, sessionShownKey]);

  const dismiss = () => {
    if (canUseBrowserStorage()) {
      
      writeStorageFlag(window.sessionStorage, sessionShownKey);
    }

    setOpen(false);
  };

  const handleOrderNow = () => {
    dismiss();

    if (typeof onOrderNow === "function") {
      onOrderNow();
      return;
    }

    navigate("/menu");
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <MotionDiv
            className="relative w-full max-w-[420px] m-auto overflow-hidden rounded-[24px] border border-cafe-gold/20 bg-[#12100f] shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.28 }}
          >
            {/* Top Glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cafe-gold to-transparent" />

            <div className="absolute -top-20 right-0 h-40 w-40 rounded-full bg-cafe-gold/10 blur-[80px]" />

            {/* Close */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close welcome offer"
              className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-7 py-8 text-center">
              {/* Logo */}
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-cafe-gold/25 bg-white p-2 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                <img
                  src={BagelLogo}
                  alt="Bagel Cafe"
                  className="h-12 w-12 object-contain"
                />
              </div>

              {/* Tag */}
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-cafe-gold">
                New Customer Offer
              </p>

              {/* Heading */}
              <h2
                id="welcome-offer-title"
                className="text-3xl font-bold leading-tight text-white"
              >
                Enjoy Free Delivery
                <span className="mt-1 block text-cafe-gold">
                  On Your First Order
                </span>
              </h2>

              {/* Description */}
              <p
                id="welcome-offer-description"
                className="mx-auto mt-4 max-w-xs text-sm leading-7 text-white/70"
              >
                Fresh bagels, premium coffee, and handcrafted sandwiches delivered to your doorstep.
              </p>

              {/* Divider */}
              <div className="mx-auto mt-5 h-px w-16 bg-cafe-gold/40" />

              {/* Offer Card */}
              <div className="mt-5 rounded-2xl border border-cafe-gold/15 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-white/50">
                  Welcome Benefit
                </p>

                <h3 className="mt-1 text-xl font-bold text-cafe-gold">
                  FREE DELIVERY
                </h3>

                <p className="mt-1 text-xs text-white/50">
                  Valid on your first order only
                </p>
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-col gap-3">
                <MotionButton
                  type="button"
                  onClick={handleOrderNow}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.01 }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E9C46A] to-[#D4AF37] px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#12100f] shadow-[0_12px_30px_rgba(212,175,55,0.25)]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Order Now
                </MotionButton>

            
              </div>

              {/* Footer */}
              <p className="mt-4 text-[11px] text-white/35">
                Freshly baked daily • Premium ingredients
              </p>
            </div>
          </MotionDiv>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

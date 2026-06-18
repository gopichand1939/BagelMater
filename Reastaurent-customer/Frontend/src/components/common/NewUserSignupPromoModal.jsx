import { useEffect, useState } from "react";

function NewUserSignupPromoModal({ promo, onClose }) {
  const [copied, setCopied] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger entrance animation delay
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!promo) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promo.coupon_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_error) {
      // Fallback if clipboard API fails
      const el = document.createElement("textarea");
      el.value = promo.coupon_code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClose = () => {
    setAnimate(false);
    setTimeout(onClose, 200); // Wait for exit animation
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 z-[400] bg-slate-950/75 backdrop-blur-md transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Centered Modal Container */}
      <div
        className={`fixed left-1/2 top-1/2 z-[401] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#1e1b4b_0%,#090514_100%)] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] transition-all duration-300 ${
          animate ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Glow Effects */}
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-orange-500/20 blur-[50px] pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-red-500/20 blur-[50px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-0 bg-white/10 text-xl text-white/60 transition hover:bg-white/15 hover:text-white"
        >
          &times;
        </button>

        {/* Modal Content */}
        <div className="flex flex-col items-center text-center mt-3">
          {/* Confetti & Gift Icon Decor */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 shadow-[0_8px_24px_rgba(249,115,22,0.3)]">
            <svg
              className="h-9 w-9 text-white animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </div>

          <h2 className="m-0 bg-gradient-to-r from-orange-400 via-amber-300 to-red-400 bg-clip-text text-2xl font-extrabold text-transparent">
            {promo.promo_title}
          </h2>

          <p className="mt-3 text-[14px] leading-relaxed text-white/70 px-2">
            {promo.promo_message || "Get a special offer on your first order!"}
          </p>

          {/* Coupon Code Section */}
          <div className="mt-5 w-full rounded-[18px] border border-white/10 bg-white/[0.03] p-4 flex flex-col items-center">
            <span className="text-xs uppercase tracking-[1.5px] text-white/40">
              Your Welcome Coupon Code
            </span>
            <div className="mt-2.5 flex items-center justify-between w-full rounded-[14px] bg-white/[0.04] border border-dashed border-white/20 pl-4 pr-2 py-2">
              <span className="text-lg font-black tracking-widest text-amber-300">
                {promo.coupon_code}
              </span>
              <button
                onClick={handleCopy}
                className={`rounded-[10px] border-0 px-4 py-2 text-xs font-bold text-white transition-all duration-200 ${
                  copied
                    ? "bg-emerald-500/80 shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
                    : "bg-orange-500 hover:bg-orange-600 active:scale-95"
                }`}
              >
                {copied ? "Copied! ✓" : "Copy Code"}
              </button>
            </div>
          </div>

          {/* Call To Action */}
          <button
            onClick={handleClose}
            className="mt-6 w-full rounded-[16px] border-0 bg-gradient-to-br from-orange-500 to-red-500 px-4 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:shadow-[0_4px_16px_rgba(249,115,22,0.25)] hover:scale-[1.01]"
          >
            Awesome, Let's Eat!
          </button>
        </div>
      </div>
    </>
  );
}

export default NewUserSignupPromoModal;

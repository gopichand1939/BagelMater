/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cafe: {
          bg: "#110e0d", // Dark roasted coffee almost black
          panel: "rgba(255, 255, 255, 0.03)",
          panelStrong: "rgba(255, 255, 255, 0.08)",
          border: "rgba(255, 255, 255, 0.08)",
          muted: "rgba(255, 255, 255, 0.55)",
          cream: "#F9F6F0",
          beige: "#EBE3D5",
          coffee: "#5C4033",
          gold: "#C5A880",
          brown: {
            50: "#fdf8f6",
            100: "#f2e8e5",
            200: "#eaddd7",
            300: "#e0cec7",
            400: "#d2bab0",
            500: "#a77b66",
            600: "#8d5d47",
            700: "#754630",
            800: "#603724",
            900: "#412112",
          }
        },
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
      boxShadow: {
        glow: "0 12px 40px rgba(0,0,0,0.3)",
        warm: "0 10px 30px rgba(197,168,128,0.15)",
        premium: "0 20px 40px rgba(0,0,0,0.4)",
      },
      animation: {
        "customer-overlay-in": "customerOverlayFadeIn 220ms ease-out",
        "customer-drawer-in": "customerDrawerSlideIn 260ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        customerOverlayFadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        customerDrawerSlideIn: {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

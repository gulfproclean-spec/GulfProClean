/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        tide: "#0B3142",
        tideLight: "#154A63",
        shallow: "#12897E",
        shallowLight: "#5FC7B8",
        sand: "#F5F7F6",
        sandCard: "#FFFFFF",
        ink: "#0E211D",
        inkSoft: "#4A5C58",
        coral: "#FF5A36",
        coralDark: "#E2431E",
        mist: "#DCE6E4",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        dash: { to: { strokeDashoffset: "0" } },
        pulsePin: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.6)", opacity: "0.45" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        radar: {
          "0%": { transform: "scale(0.6)", opacity: "0.9" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        dash: "dash 2.2s ease-out forwards",
        pulsePin: "pulsePin 2s ease-in-out infinite",
        fadeUp: "fadeUp 0.7s ease-out both",
        radar: "radar 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        "glow-pulse": "glow-pulse 1.6s ease-in-out infinite",
        "float-up": "float-up 6s linear infinite",
        "particle-drift": "particle-drift 8s ease-in-out infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(76,175,80,0.6), 0 0 24px rgba(76,175,80,0.3)" },
          "50%":      { boxShadow: "0 0 24px rgba(76,175,80,0.9), 0 0 48px rgba(76,175,80,0.5)" },
        },
        "float-up": {
          "0%":   { transform: "translateY(0px) scale(1)", opacity: "0" },
          "20%":  { opacity: "1" },
          "100%": { transform: "translateY(-200px) scale(0.4)", opacity: "0" },
        },
        "particle-drift": {
          "0%, 100%": { transform: "translateX(0px) translateY(0px)" },
          "25%":      { transform: "translateX(20px) translateY(-30px)" },
          "50%":      { transform: "translateX(-10px) translateY(-60px)" },
          "75%":      { transform: "translateX(15px) translateY(-90px)" },
        },
      },
    },
  },
  plugins: [],
}
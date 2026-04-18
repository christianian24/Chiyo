/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d0e12", // Deeper black
        surface: "#15171e",    // Darker surface
        "surface-lighter": "#1c1f26",
        accent: "#ff4d4d",     // Vibrant Red
        text: {
          DEFAULT: "#f1f1f1",  // Crisp white
          muted: "#71717a",    // Zinc-like muted text
        },
        // Status colors mapping to the new theme
        primary: "#ff4d4d",     // Red for reading
        success: "#22c55e",     // Green for completed
        warning: "#eab308",     // Amber highlight
        error: "#ef4444",       // Dropped
      },
      boxShadow: {
        'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}

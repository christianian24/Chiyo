/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0b0d", // Deep ink
        surface: "#12141a",    // Dark charcoal
        "surface-lighter": "#1c1f26", // Lighter charcoal for hover
        accent: "#ffffff",     // Pure white for highlights
        text: {
          DEFAULT: "#e1e1e6",  // Off-white text
          muted: "#71717a",    // Zinc-like muted text
        },
        // Status colors remain for badges as requested
        primary: "#3b82f6",     // Blue highlight (reading)
        success: "#22c55e",     // Green highlight (completed)
        warning: "#eab308",     // Amber highlight (on-hold)
        error: "#ef4444",       // Red highlight (dropped)
      },
      boxShadow: {
        'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}

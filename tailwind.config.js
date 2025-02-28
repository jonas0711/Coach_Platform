/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    // ... din eksisterende theme config
  },
  plugins: [
    require("daisyui"),  // Tilføj DaisyUI
    require("tailwindcss-animate")
  ],
  // Tilføj DaisyUI konfiguration (valgfrit)
  daisyui: {
    themes: ["light", "dark", "cupcake"],
  },
} 
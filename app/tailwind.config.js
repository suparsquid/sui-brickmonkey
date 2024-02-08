const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      width: {
        '500px': '500px',
      },
      fontFamily: {
        sans: ["Inter var", ...defaultTheme.fontFamily.sans],
        "share-tech-mono": ['"Share Tech Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f5f0",
          100: "#ebe6da",
          200: "#d6ccb4",
          300: "#b8a886",
          400: "#9a8860",
          500: "#7d6d4a",
          600: "#63563c",
          700: "#4f4532",
          800: "#42392b",
          900: "#393126",
        },
      },
      fontFamily: {
        sans: ["var(--font-literary-serif)", "Noto Serif KR", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

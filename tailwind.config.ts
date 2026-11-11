import type { Config } from "tailwindcss";

/**
 * Brand tokens (design plan):
 *  ube    – Filipino purple yam; primary, calm and caring
 *  mango  – warm accent for highlights and the logo hub
 *  ink    – deep ube for text
 * Font: Atkinson Hyperlegible (designed by the Braille Institute for low-vision readers),
 * chosen because many users are seniors or caregivers reading on phones.
 */
const config: Config = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ube: {
          50: "#F6F2FC",
          100: "#EDE5F8",
          200: "#DACCF1",
          300: "#BFA6E5",
          400: "#9C78D3",
          500: "#7A55BB",
          600: "#6544A3",
          700: "#5B3E96",
          800: "#46307A",
          900: "#33245A",
          950: "#2A2146",
        },
        mango: { 50: "#FFF9EC", 100: "#FDF3DC", 300: "#F6CE6E", 400: "#F0B740", 500: "#E9A31F", 700: "#9A6409", 900: "#5A3A05" },
        page: "#F8F7FB",
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

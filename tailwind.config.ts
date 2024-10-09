import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        "geist-sans": ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans],
        "geist-mono": ["var(--font-geist-mono)", ...defaultTheme.fontFamily.mono]
      }
    },
  },
  plugins: [],
};
export default config;

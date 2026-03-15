// tailwind.config.ts
// Tailwind CSS configuration for FlashGrid dashboard.
// Defines a clean, Apple-inspired light color palette with neutral tones.

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          primary: "#FFFFFF",
          secondary: "#F5F5F7",
          tertiary: "#E8E8ED",
          hover: "#F0F0F2",
        },
        content: {
          primary: "#1D1D1F",
          secondary: "#6E6E73",
          tertiary: "#86868B",
          inverse: "#FFFFFF",
        },
        border: {
          DEFAULT: "#D2D2D7",
          light: "#E8E8ED",
          focus: "#0071E3",
        },
        accent: {
          blue: "#0071E3",
          green: "#34C759",
          red: "#FF3B30",
          orange: "#FF9500",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "JetBrains Mono",
          "Fira Code",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

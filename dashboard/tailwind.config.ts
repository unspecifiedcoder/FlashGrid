import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        monad: {
          purple: "#836EF9",
          dark: "#0D0B1A",
          darker: "#080613",
          card: "#141024",
          border: "#2A2440",
          text: "#A89EC8",
          accent: "#00E5A0",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        flash: "flash 0.5s ease-out",
      },
      keyframes: {
        flash: {
          "0%": { opacity: "1", transform: "scale(1.2)" },
          "100%": { opacity: "0.7", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

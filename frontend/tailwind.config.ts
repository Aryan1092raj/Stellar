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
        primary: {
          DEFAULT: "#0052ff",
          active: "#003ecc",
          disabled: "#a8b8cc",
        },
        ink: "#0a0b0d",
        body: {
          DEFAULT: "#5b616e",
          strong: "#0a0b0d",
        },
        muted: {
          DEFAULT: "#7c828a",
          soft: "#a8acb3",
        },
        hairline: {
          DEFAULT: "#dee1e6",
          soft: "#eef0f3",
        },
        canvas: "#ffffff",
        surface: {
          soft: "#f7f7f7",
          card: "#ffffff",
          strong: "#eef0f3",
          dark: "#0a0b0d",
          "dark-elevated": "#16181c",
        },
        on: {
          primary: "#ffffff",
          dark: "#ffffff",
          "dark-soft": "#a8acb3",
        },
        semantic: {
          up: "#05b169",
          down: "#cf202f",
        },
        accent: {
          yellow: "#f4b000",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        none: "0px",
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        pill: "100px",
      },
      spacing: {
        xxs: "4px",
        xs: "8px",
        xxl: "48px",
        section: "96px",
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0, 0, 0, 0.04)",
      },
      letterSpacing: {
        "mega": "-2px",
        "xl": "-1.6px",
        "lg": "-1.3px",
        "md": "-1px",
        "sm": "-0.5px",
        "title-lg": "-0.4px",
      },
    },
  },
  plugins: [],
};

export default config;

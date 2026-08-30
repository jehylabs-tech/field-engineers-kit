import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zone: {
          bg: "var(--spec-panel)",
          surface: "var(--spec-bg)",
          border: "var(--spec-border)",
          muted: "var(--spec-text2)",
          ink: "var(--spec-text)",
          accent: "var(--spec-accent)",
          accentSoft: "var(--spec-accent-bg)",
        },
        spec: {
          bg: "var(--spec-bg)",
          panel: "var(--spec-panel)",
          border: "var(--spec-border)",
          borderStrong: "var(--spec-border-strong)",
          text: "var(--spec-text)",
          text2: "var(--spec-text2)",
          text3: "var(--spec-text3)",
          accent: "var(--spec-accent)",
          accentBg: "var(--spec-accent-bg)",
          accentText: "var(--spec-accent-text)",
          danger: "var(--spec-danger)",
          dangerBg: "var(--spec-danger-bg)",
          success: "var(--spec-success)",
          successBg: "var(--spec-success-bg)",
          sponBg: "var(--spec-spon-bg)",
          sponBorder: "var(--spec-spon-border)",
          sponText: "var(--spec-spon-text)",
          adBg: "var(--spec-ad-bg)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "SFMono-Regular",
          "ui-monospace",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      height: {
        "header-spec": "3.5rem",
        "header-mobile": "3rem",
      },
      spacing: {
        "header-spec": "3.5rem",
        "header-mobile": "3rem",
      },
      maxWidth: {
        home: "72rem", // Tailwind max-w-6xl ≈ 1152px
      },
    },
  },
  plugins: [],
};

export default config;

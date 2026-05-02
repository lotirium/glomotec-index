import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        // Surfaces
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-soft": "hsl(var(--surface-soft) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        "line-soft": "hsl(var(--line-soft) / <alpha-value>)",
        // Ink
        ink: {
          DEFAULT: "hsl(var(--ink) / <alpha-value>)",
          soft: "hsl(var(--ink-soft) / <alpha-value>)",
          muted: "hsl(var(--ink-muted) / <alpha-value>)",
          faint: "hsl(var(--ink-faint) / <alpha-value>)",
        },
        // Brand accent
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          soft: "hsl(var(--accent-soft) / <alpha-value>)",
          deep: "hsl(var(--accent-deep) / <alpha-value>)",
          tint: "hsl(var(--accent-tint) / <alpha-value>)",
        },
        // Band semantic colours
        band: {
          "high-bg": "hsl(var(--band-high-bg) / <alpha-value>)",
          "high-fg": "hsl(var(--band-high-fg) / <alpha-value>)",
          "medium-bg": "hsl(var(--band-medium-bg) / <alpha-value>)",
          "medium-fg": "hsl(var(--band-medium-fg) / <alpha-value>)",
          "low-bg": "hsl(var(--band-low-bg) / <alpha-value>)",
          "low-fg": "hsl(var(--band-low-fg) / <alpha-value>)",
          "below-bg": "hsl(var(--band-below-bg) / <alpha-value>)",
          "below-fg": "hsl(var(--band-below-fg) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
      },
      boxShadow: {
        soft: "0 1px 2px hsl(var(--ink) / 0.03), 0 1px 3px hsl(var(--ink) / 0.04)",
        card: "0 1px 2px hsl(var(--ink) / 0.04), 0 6px 18px hsl(var(--ink) / 0.04), 0 24px 48px -12px hsl(var(--ink) / 0.06)",
        hero: "0 1px 2px hsl(var(--ink) / 0.04), 0 12px 32px hsl(var(--ink) / 0.05), 0 32px 80px -16px hsl(var(--accent) / 0.08)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-x": {
          from: { transform: "scaleX(0)", opacity: "0" },
          to: { transform: "scaleX(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "result-arrive": {
          from: { opacity: "0.4", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 540ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "scale-x": "scale-x 700ms cubic-bezier(0.2, 0.8, 0.2, 1) 280ms both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "result-arrive": "result-arrive 300ms ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

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
        // Brand accent (Deep Navy primary, Bright Cyan chromatic)
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          soft: "hsl(var(--accent-soft) / <alpha-value>)",
          deep: "hsl(var(--accent-deep) / <alpha-value>)",
          tint: "hsl(var(--accent-tint) / <alpha-value>)",
        },
        cyan: {
          DEFAULT: "hsl(var(--cyan) / <alpha-value>)",
          tint: "hsl(var(--cyan-tint) / <alpha-value>)",
        },
        // Brand neutrals
        glacier: "hsl(var(--glacier) / <alpha-value>)",
        frost: "hsl(var(--frost) / <alpha-value>)",
        slate: "hsl(var(--slate) / <alpha-value>)",
        charcoal: "hsl(var(--charcoal) / <alpha-value>)",
        silver: "hsl(var(--silver) / <alpha-value>)",
        // Band semantic colours (cool palette only)
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
        // Inter only, per brand v1.0
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Eight brand roles (page 15 of brand doc v1.0)
        display: ["2.5rem", { lineHeight: "3.75rem", fontWeight: "700" }],
        h1: ["2rem", { lineHeight: "2.25rem", fontWeight: "700" }],
        h2: ["1.375rem", { lineHeight: "1.625rem", fontWeight: "700" }],
        h3: ["0.875rem", { lineHeight: "1.25rem", fontWeight: "700" }],
        lead: ["0.75rem", { lineHeight: "1.125rem", fontWeight: "400" }],
        body: ["0.625rem", { lineHeight: "1rem", fontWeight: "400" }],
        bodysm: ["0.5625rem", { lineHeight: "0.875rem", fontWeight: "400" }],
        kicker: ["0.5rem", { lineHeight: "0.6875rem", fontWeight: "700", letterSpacing: "0.18em" }],
        // Legacy size retained for backwards compatibility with existing components
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        kicker: "0.18em",
      },
      // No card shadows — hairline borders only per brand v1.0
      boxShadow: {
        soft: "none",
        card: "none",
        hero: "none",
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

/** @type {import('tailwindcss').Config} */
// Tailwind v3 — los valores apuntan a las variables CSS definidas en app/globals.css (:root),
// así la paleta se mantiene en un único lugar.
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          light: "var(--color-primary-light)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          hover: "var(--color-secondary-hover)",
          light: "var(--color-secondary-light)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          muted: "var(--color-ink-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "var(--color-accent-light)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          hover: "var(--color-danger-hover)",
          light: "var(--color-danger-light)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          light: "var(--color-warning-light)",
        },
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        foreground: "var(--color-foreground)",
        "on-primary": "var(--color-on-primary)",
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        "warm-sm": "var(--shadow-warm-sm)",
        warm: "var(--shadow-warm)",
        "warm-lg": "var(--shadow-warm-lg)",
        focus: "var(--shadow-focus)",
        "focus-accent": "var(--shadow-focus-accent)",
      },
      transitionTimingFunction: {
        soft: "var(--ease-soft)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};

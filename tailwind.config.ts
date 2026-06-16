import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import { ideezaPreset } from "./src/styles/tailwind-preset";

export default {
  presets: [ideezaPreset],
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg-page)",
        foreground: "var(--color-text-primary)",
        card: {
          DEFAULT: "var(--color-bg-surface)",
          foreground: "var(--color-text-primary)",
        },
        popover: {
          DEFAULT: "var(--color-bg-surface-raised)",
          foreground: "var(--color-text-primary)",
        },
        primary: {
          DEFAULT: "var(--color-button-primary-bg)",
          foreground: "var(--color-button-primary-text)",
        },
        secondary: {
          DEFAULT: "var(--color-button-secondary-bg)",
          foreground: "var(--color-button-secondary-text)",
        },
        muted: {
          DEFAULT: "var(--color-bg-subtle)",
          foreground: "var(--color-text-secondary)",
        },
        accent: {
          DEFAULT: "var(--color-bg-brand-subtle)",
          foreground: "var(--color-text-brand)",
        },
        destructive: {
          DEFAULT: "var(--color-button-danger-bg)",
          foreground: "var(--color-text-inverse)",
        },
        input: "var(--color-border-default)",
        ring: "var(--color-border-focus)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

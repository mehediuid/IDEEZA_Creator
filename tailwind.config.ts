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
      // Tailwind's preflight applies `border: 0 solid <theme.borderColor.DEFAULT>`
      // to every element. Without this override the default border color falls
      // back to Tailwind's hardcoded #e5e7eb instead of the DS token.
      borderColor: {
        DEFAULT: "var(--color-border-default)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

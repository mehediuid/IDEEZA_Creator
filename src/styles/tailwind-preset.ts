/**
 * Tailwind preset for the IDEEZA design system.
 * Maps Tailwind utility classes to the CSS variables exposed by
 * `@ideeza/tokens/css`.
 *
 * Usage (in your app's tailwind.config.ts):
 *
 *   import { ideezaPreset } from "@ideeza/tokens/tailwind-preset";
 *   export default {
 *     presets: [ideezaPreset],
 *     content: ["./src/**\/*.{ts,tsx}"],
 *   };
 */
import type { Config } from "tailwindcss";

export const ideezaPreset = {
  content: [],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-family-body)"],
        display: ["var(--font-family-display)"],
        mono: ["var(--font-family-mono)"],
      },
      fontSize: {
        "2xs": "var(--font-size-2xs)",
        xs: "var(--font-size-xs)",
        sm: "var(--font-size-sm)",
        md: "var(--font-size-md)",
        lg: "var(--font-size-lg)",
        xl: "var(--font-size-xl)",
        "2xl": "var(--font-size-2xl)",
        "3xl": "var(--font-size-3xl)",
        "4xl": "var(--font-size-4xl)",
        "5xl": "var(--font-size-5xl)",
        "6xl": "var(--font-size-6xl)",
        "7xl": "var(--font-size-7xl)",
        "8xl": "var(--font-size-8xl)",
      },
      fontWeight: {
        regular: "var(--font-weight-regular)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
        extrabold: "var(--font-weight-extrabold)",
      },
      spacing: {
        0: "var(--spacing-0)",
        1: "var(--spacing-1)",
        2: "var(--spacing-2)",
        3: "var(--spacing-3)",
        4: "var(--spacing-4)",
        5: "var(--spacing-5)",
        6: "var(--spacing-6)",
        7: "var(--spacing-7)",
        8: "var(--spacing-8)",
        10: "var(--spacing-10)",
        12: "var(--spacing-12)",
        16: "var(--spacing-16)",
        20: "var(--spacing-20)",
        24: "var(--spacing-24)",
        32: "var(--spacing-32)",
        40: "var(--spacing-40)",
        48: "var(--spacing-48)",
      },
      borderRadius: {
        none: "var(--radius-none)",
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        full: "var(--radius-full)",
      },
      borderWidth: {
        1: "var(--border-width-1)",
        "1-5": "var(--border-width-1-5)",
        2: "var(--border-width-2)",
        3: "var(--border-width-3)",
        4: "var(--border-width-4)",
      },
      boxShadow: {
        none: "var(--elevation-0)",
        1: "var(--elevation-1)",
        2: "var(--elevation-2)",
        3: "var(--elevation-3)",
        4: "var(--elevation-4)",
        5: "var(--elevation-5)",
        6: "var(--elevation-6)",
        inner: "var(--elevation-inner)",
      },
      transitionDuration: {
        instant: "var(--motion-duration-instant)",
        fast: "var(--motion-duration-fast)",
        normal: "var(--motion-duration-normal)",
        slow: "var(--motion-duration-slow)",
        slower: "var(--motion-duration-slower)",
      },
      transitionTimingFunction: {
        standard: "var(--motion-easing-standard)",
        decelerate: "var(--motion-easing-decelerate)",
        accelerate: "var(--motion-easing-accelerate)",
        sharp: "var(--motion-easing-sharp)",
        spring: "var(--motion-easing-spring)",
      },
      zIndex: {
        base: "var(--z-base)",
        sticky: "var(--z-sticky)",
        dropdown: "var(--z-dropdown)",
        overlay: "var(--z-overlay)",
        sheet: "var(--z-sheet)",
        modal: "var(--z-modal)",
        popover: "var(--z-popover)",
        toast: "var(--z-toast)",
        notification: "var(--z-notification)",
        max: "var(--z-max)",
      },
      colors: {
        // Primitives
        violet: {
          50: "var(--color-violet-50)",
          100: "var(--color-violet-100)",
          200: "var(--color-violet-200)",
          300: "var(--color-violet-300)",
          400: "var(--color-violet-400)",
          500: "var(--color-violet-500)",
          600: "var(--color-violet-600)",
          700: "var(--color-violet-700)",
          800: "var(--color-violet-800)",
          900: "var(--color-violet-900)",
          950: "var(--color-violet-950)",
        },
        // Semantic — bg
        bg: {
          page: "var(--color-bg-page)",
          surface: "var(--color-bg-surface)",
          "surface-raised": "var(--color-bg-surface-raised)",
          subtle: "var(--color-bg-subtle)",
          inverse: "var(--color-bg-inverse)",
          overlay: "var(--color-bg-overlay)",
          brand: "var(--color-bg-brand)",
          "brand-hover": "var(--color-bg-brand-hover)",
          "brand-pressed": "var(--color-bg-brand-pressed)",
          "brand-subtle": "var(--color-bg-brand-subtle)",
          blue: "var(--color-bg-blue)",
          "blue-subtle": "var(--color-bg-blue-subtle)",
          success: "var(--color-bg-success)",
          "success-subtle": "var(--color-bg-success-subtle)",
          warning: "var(--color-bg-warning)",
          "warning-subtle": "var(--color-bg-warning-subtle)",
          error: "var(--color-bg-error)",
          "error-subtle": "var(--color-bg-error-subtle)",
          ai: "var(--color-bg-ai)",
          "ai-subtle": "var(--color-bg-ai-subtle)",
        },
        // Semantic — text
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
          "on-brand": "var(--color-text-on-brand)",
          brand: "var(--color-text-brand)",
          link: "var(--color-text-link)",
          success: "var(--color-text-success)",
          warning: "var(--color-text-warning)",
          error: "var(--color-text-error)",
          ai: "var(--color-text-ai)",
        },
        // Semantic — border
        border: {
          DEFAULT: "var(--color-border-default)",
          strong: "var(--color-border-strong)",
          subtle: "var(--color-border-subtle)",
          focus: "var(--color-border-focus)",
          error: "var(--color-border-error)",
          brand: "var(--color-border-brand)",
          ai: "var(--color-border-ai)",
        },
        // Component-scoped — handy for direct utility access
        button: {
          "primary-bg": "var(--color-button-primary-bg)",
          "primary-bg-hover": "var(--color-button-primary-bg-hover)",
          "primary-bg-pressed": "var(--color-button-primary-bg-pressed)",
          "primary-text": "var(--color-button-primary-text)",
          "secondary-bg": "var(--color-button-secondary-bg)",
          "secondary-border": "var(--color-button-secondary-border)",
          "secondary-text": "var(--color-button-secondary-text)",
          "ghost-bg-hover": "var(--color-button-ghost-bg-hover)",
          "danger-bg": "var(--color-button-danger-bg)",
        },
      },
    },
  },
} satisfies Partial<Config>;

export default ideezaPreset;

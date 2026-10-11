import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The commerce boundary (Build and Earn P1-1). Engineering (src/lib/manual)
// never imports commerce — lib/commerce, lib/market, lib/wallet and the moved
// lib/brief/{wallet,gas} — except in its composition files, which put both
// layers together for a surface; commerce imports engineering only through
// src/lib/manual/public.ts. tests/projects/commerce-boundary.test.mjs scans
// every import against the same rules, holds the TODO for each temporary
// exception, and checks these lists match its own.
export const COMMERCE_FILES = [
  "src/lib/commerce/**/*.{ts,tsx}",
  "src/lib/market/**/*.{ts,tsx}",
  "src/lib/wallet/**/*.{ts,tsx}",
  "src/lib/brief/wallet.ts",
  "src/lib/brief/gas.ts",
];
export const ENGINEERING_COMPOSITION = [
  "src/lib/manual/delete-plan.ts",
  "src/lib/manual/earn-view.ts",
  "src/lib/manual/p2-types.ts",
  "src/lib/manual/permissions.ts",
  "src/lib/manual/project-read.ts",
  "src/lib/manual/project-summary.ts",
  "src/lib/manual/rail-copy.ts",
  "src/lib/manual/rail-rows.ts",
];
export const ENGINEERING_EXCEPTIONS = [
  "src/lib/manual/customers.ts",
  "src/lib/manual/edit-gate.ts",
  "src/lib/manual/journey.ts",
  "src/lib/manual/ownership.ts",
  "src/lib/manual/projects.tsx",
];
export const COMMERCE_EXCEPTIONS = [];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The node:test harness's compiled output (tests/projects/tsconfig.json).
    ".tmp-test/**",
  ]),
  {
    // Verbatim ports of the prototype's display-only HTML string builders.
    // They use `@ts-nocheck` + loose typing on purpose to mirror the source.
    files: ["src/lib/pcb/content.ts", "src/lib/pcb/data.tsx"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "off",
    },
  },
  {
    name: "commerce-boundary/engineering",
    files: ["src/lib/manual/**/*.{ts,tsx}"],
    ignores: [...ENGINEERING_COMPOSITION, ...ENGINEERING_EXCEPTIONS],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)(market|wallet|commerce)(/|$)|(^|/)brief/(wallet|gas)$",
              message:
                "Engineering doesn't import commerce (Build and Earn P1-1): ask through the guards (lib/manual/guards.ts), or compose in a composition file.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "commerce-boundary/commerce",
    files: COMMERCE_FILES,
    ignores: COMMERCE_EXCEPTIONS,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)manual/(?!public$)",
              message: "Commerce imports engineering only through src/lib/manual/public.ts (Build and Earn P1-1).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

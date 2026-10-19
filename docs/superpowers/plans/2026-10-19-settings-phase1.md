# Settings Phase 1 Implementation Plan

> **For agentic workers:** each workstream below ran as its own agent in its own worktree, following superpowers:test-driven-development and the spec. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of the account Settings approved on 2026-10-19 (spec `docs/superpowers/specs/2026-10-19-settings-design.md`, decisions D1–D18 as recommended).

**Architecture:** One settings frame and side-nav (W0) that every page sits in; one versioned preferences record `ideeza:settings` with a fixed schema; per-page search rows; each page group built in parallel on its own branch off `feat/settings`, then merged back in order.

**Tech Stack:** Next.js 16 (modified App Router), React 19, TypeScript, Tailwind preset over the IDEEZA DS tokens, node:test for pure `src/lib` modules, headless Chrome over CDP for browser checks.

## Global Constraints
- AGENTS.md rules: tokens only, light + dark, classes not inline style, `Page` frame, one control one home, contextual disable not stubs, no new dependencies, docs in the same change.
- Figma User Panel V2 "✅ Settings" is the requirement and layout source; the DS is the look; never restyle an existing page.
- Phase 2 rows (sign-in, OTP, email/push, server) are not shown, or are disabled options with "Not available yet" / "Arrives with sign-in".
- Done = `tsc --noEmit` clean, `npm run test:projects` green, eslint clean on changed files, browser-verified at 1440 and 390 in both themes, docs updated.

## W0 — Shell (done, `feat/settings` ebd566c)
- [x] `lib/settings/prefs.ts` + `use-settings.ts` (schema, normalize, patch, quiet hours/mode, hidden words) — tests `settings-prefs.test.mjs`
- [x] `lib/settings/registry.ts`, `rows/*.ts`, `search.ts` — tests `settings-search.test.mjs`
- [x] `components/settings/` frame, nav, card/row/field, choice dialog, arrival highlight, home (Find a setting, Most visited, legal cards), Security
- [x] Doors: popover Settings row, ⌘K (Settings, Plan & pricing, Wallet & tokens, settings search; dead rows removed), Plan & pricing crumb
- [x] Docs: features/settings.md, app-map, src/app/README, PRODUCT.md, STRUCTURE.md

## Workstreams (branches off `feat/settings` @ ebd566c, merged back in this order)
| # | Branch / worktree | Port | Scope (spec §) |
|---|---|---|---|
| W8 | `feat/settings-cleanup` / `settings-cleanup` | 3058 | §5.13 editor account menu, theme duplicates, PCB settings persistence + units, small fixes |
| W6 | `feat/settings-billing` / `settings-billing` | 3056 | §5.11 Plan & pricing additions, monthly cap, auto top-up, Running low |
| W1 | `feat/settings-profile` / `settings-profile` | 3051 | §5.2–5.3 Profile, Personal Information, profile page reads |
| W4 | `feat/settings-audience` / `settings-audience` | 3054 | §5.10 Profile locking, Profile & Share, Blocking, Messages rules |
| W5 | `feat/settings-prefs` / `settings-prefs` | 3055 | §5.7–5.9 Language, Appearance & accessibility, AI Properties, dates helper |
| W2 | `feat/settings-commerce` / `settings-commerce` | 3052 | §5.5 KYC, Get Paid, Earn links |
| W3 | `feat/settings-notifications` / `settings-notifications` | 3053 | §5.6 Notification, notice model, bells, toasts |
| W7 | `feat/settings-data` / `settings-data` | 3057 | §5.12 Privacy, Personal Data export, Activity, Report |

Each workstream: write the failing pure-logic tests first (`tests/projects/settings-<area>-*.test.mjs`), build its pages and effects, verify in the browser, append its sections to `docs/guides/features/settings.md`, commit on its branch.

## Integration
- [ ] Merge each branch into `feat/settings` in the order above; resolve `docs/guides/features/settings.md` by keeping every section.
- [ ] Switch Get Paid and the notification pages' date cells to `lib/settings/dates.ts` once W5 is in.
- [ ] Full checks: `tsc`, `test:projects`, eslint on the changed set, `next build`.
- [ ] Walk every settings page and every door on :3050 at 1440 and 390, light and dark; screenshots for the owner.
- [ ] Owner verifies; push only after their OK.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# IDEEZA Creator — Project Guide

`ideeza-creator-panel` — a browser-based **AI-driven hardware-creation platform**. A maker describes an electronics idea; AI drafts the **schematic, parts list and build steps**, refined in editor modules (PCB, Code, 3D, Assembly, Wiring, Preview, Brief), then **minted on-chain (Utility NFT)** and shared/sold via the community feed and marketplace. The deepest module is an **EasyEDA-inspired schematic + PCB editor** with a native (KiCad-less) Schematic→PCB pipeline. This is a **real product, not a prototype** — every control must do real, verified work. This file is the one guide for every agent (Claude Code loads it via `CLAUDE.md`).

## Read first
1. This file. 2. The router for the task under [docs/map/](docs/map/PRODUCT.md), then only the files it links.

When documents disagree: the owner's instruction > this file > the feature's design spec (`docs/superpowers/specs/`, Part 4 spec) > `docs/guides/` > plans (historical). For what the code does today, the code wins — fix the doc that drifted.

## Scope discipline
- Do exactly what was asked — nothing more. No unsolicited features, refactors, or "improvements" to nearby code.
- Keep diffs minimal; don't touch files unrelated to the task.
- No new dependencies without asking first.
- No comments unless the logic is non-obvious; no dead code, no leftover console.logs or debug flags.
- If the task is ambiguous or needs a structural change, ask before writing code.
- Communicate concisely; keep changes tightly scoped to what's asked.

## Keeping docs current (REQUIRED)
**[docs/guides/features/](docs/guides/features/README.md) is the living feature inventory, one guide per area — the source of truth for what exists.** Update it **in the same change** as the feature, not later; feature notes go there, never into this file:
- **Added** → a one-line entry under the right subsection of the area's guide. **Changed** → revise its entry so it stays true. **Removed** → delete its entry.
- **Convention or UI/UX pattern** → the rules below, detail in [ui-ux.md](docs/guides/ui-ux.md). **Persisted state or a `CanvasObject` field** → [pcb-architecture.md](docs/guides/pcb-architecture.md).
- **Route** → [app-map.md](docs/guides/app-map.md) + [src/app/README.md](src/app/README.md). **Folder or significant file** → [STRUCTURE.md](STRUCTURE.md) + the router naming it.

Keep entries short and accurate; **never list something that isn't actually working and browser-verified** (that would be a stub-by-documentation). An out-of-date feature list is a defect, same as broken code. Treat "update the docs" as part of the definition of done.

## Tech stack
**Next.js 16.2.9** (App Router, modified — heed the rule at the top), **React 19**, **TypeScript**, pnpm. Styling: tokens in `src/styles/tokens.css` + `reset.css`, Tailwind preset `tailwind-preset.ts`, per-module CSS (`src/app/pcb/pcb-editor.css`). Icons: `@hugeicons/react` via `DsIcon`, raw-SVG fallback. 3D: `three` + `@react-three/fiber`/`drei`. Code module: `@monaco-editor/react`, `blockly`. No backend — state persists to `localStorage`.

## Running & verifying
```bash
npm run dev                       # next dev (http://localhost:3000)
npx tsc --noEmit -p tsconfig.json # MUST pass before considering work done
npm run lint                      # eslint
npm run test:projects             # node:test over pure src/lib modules
```
**Verification is mandatory, not optional.** Prove behaviour by driving the real app in **headless Chrome over CDP** (seed a project into `localStorage`, open `/project/<slug>/pcb`, dispatch real mouse/key events, read the DOM, screenshot — WebSocket to `/json`, `Input.dispatchMouseEvent`, `Page.captureScreenshot`). "Done" means `tsc` passes **and** the behaviour is browser-verified.

## Coding conventions
- **Use the superpowers skills for code work:** start with **`/using-superpowers`** — **brainstorming** before a feature, **writing-plans** for multi-step work, **test-driven-development** while implementing, **systematic-debugging** for any bug, **verification-before-completion** before claiming done. Don't jump straight to editing.
- **Real logic, never stubs.** No button that only `flashToast`s or sets a dead flag. Implement the actual behaviour (correct math — group rotate/flip pivots on the selection centroid; z-order reorders the objects array), then **verify in a real browser**. Be upfront about anything still incomplete.
- **`tsc --noEmit` must pass.** `data.tsx` is `@ts-nocheck` (pure data builders) — everything else is type-checked.
- **PCB store discipline, one `CanvasObject` model, existing builders:** binding rules in [src/components/pcb/README.md](src/components/pcb/README.md).
- **Match the surrounding code** — comment density, naming, idiom. Reference files as `path:line`. Commits: `feat(area): …`, `fix(area): …`, `docs: …`.

## UI/UX hard rules
Reasoning, component notes, exceptions: [docs/guides/ui-ux.md](docs/guides/ui-ux.md).
- **Use `/ui-ux-pro-max` and `/impeccable`** to plan and build every interface, visual, layout or design-system change, before deciding.
- **Tokens only** — never hardcode color/spacing/radius/shadow/type (`--color-*` `--spacing-*` `--radius-*` `--font-size-*` `--line-height-*` `--letter-spacing-*` `--elevation-*` `--border-width-*`); **light + dark** (`data-theme` + `prefers-color-scheme`). Tokens come from the Figma variables — never guessed or minted; a missing value is left out and reported.
- **Classes, not `style={{…}}`**, except where the value is data. **Line height pairs with font size**; no arbitrary `leading-[…]`/`tracking-[…]`. **10px is for a micro-label, not for reading** (one exception, see the guide). **Prose gets a measure** (`62ch`).
- **Brand = violet** (`--color-violet-600`); accent for **selection / active / primary only**. **Weight matches urgency.** **No card inside a card.**
- **One control, one home** — never duplicate a control across surfaces (the Position panel owns z-order; the Route menu owns corners).
- **Contextual disable, not stubs** — grey a control whose precondition isn't met, with the reason. **Empty states teach.**
- **Menus & dropdowns never clip** — portal to `<body>`, `position: fixed`, clamp into the viewport; anchor context menus at the cursor.
- **Earned familiarity** — behave like Figma / EasyEDA / KiCad / Linear; no invented affordances for standard actions.
- **Motion** 150–250 ms ease-out, state feedback only (one exception, see the guide); **animate `transform`, not `width`**. No em-dash doing a full stop's job in copy.

## Reflexes
| When you are about to… | Do this |
|---|---|
| write Next-specific code | read `node_modules/next/dist/docs/` first |
| put `/60`-style opacity on a token colour | it compiles to no rule: use `color-mix(…)` or a token (the border key is `bg-border`) |
| give a `<button>` a border | name its style (`border-solid`) — the reset sets `none` |

## Project map
Before opening files, read the router for the task, then only the files it points to:
- [docs/map/PRODUCT.md](docs/map/PRODUCT.md): where the code for each area lives, and its features guide
- [docs/map/OPERATIONS.md](docs/map/OPERATIONS.md): setup, checks, tests, deploy, configuration, services
- [docs/map/DOCS.md](docs/map/DOCS.md): which spec, plan or guide answers which question

The map guides what to read first; it never replaces the rules above or a release gate. **Keep the map true:** a change that adds, moves or removes a file a router names updates that router in the same change. Each code area keeps a short README router, linked from PRODUCT.md (`public/` ships to users, so docs/map/ routes it). Routers stay ~15–35 lines, link only to files that exist, never hold secrets. Reference material goes in docs/, not here.

## Scope / direction
Shipped in phases (schematic → PCB → routing/DRC → manufacturing/export). The Schematic→PCB engine is **native in-app**: `kicad-export.ts` exports to KiCad, but conversion/placement/routing are our own.

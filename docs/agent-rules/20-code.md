# Code rules

## Real logic, never stubs
1. No control may only `flashToast`, set a dead flag, or open a dialog whose
   Confirm does nothing. Implement the real behaviour, or make the control
   **disabled with the reason** ("X isn't built yet"). A pretty stub is a bug.
2. Never fabricate data (fake stock numbers, invented prices, placeholder
   rows presented as real). An empty cell beats an invented value; demo data
   must be honest about being demo data.
3. Be upfront in your report about anything left incomplete.

## Architecture (PCB module)
4. Store discipline (`src/lib/pcb/store.tsx`): view/UI change → `merge`;
   model change (undoable) → `mergeWithHistory`. Read the latest state inside
   event/async actions via `stateRef.current`.
5. New persisted state → add it in all three places: the doc type, the
   sanitizer (`sanitizePcbDoc`), and the save effect. `PcbState`/`initialState`
   live in `types.ts`, not `store.tsx`.
6. Everything placed on a canvas goes through `CanvasObject` +
   `placed-objects.tsx` — never a bespoke renderer.
7. Extend the existing builders (`data.tsx`, `inspector-schema.ts`) instead of
   creating parallel systems.
8. A new tool must be registered in `TOOLBAR_CATALOGS` (`types.ts`) or the
   customization whitelist will cull its button silently.

## Style
9. `npx tsc --noEmit` must pass. Only `src/lib/pcb/data.tsx` and
   `src/lib/pcb/content.ts` are deliberately `@ts-nocheck`; do not add more.
10. Comments only where the logic is non-obvious — state the constraint the
    code can't show, not what the next line does. No dead code, no leftover
    `console.log`/debug flags.
11. Match the surrounding code's naming, idiom and comment density. Reference
    code as `path:line`.
12. This repo runs a **modified Next.js 16** — read
    `node_modules/next/dist/docs/` before writing any Next-specific code; do
    not trust training-data knowledge of Next APIs.
13. ESLint is `eslint-config-next` (core-web-vitals + typescript). Do not add
    per-file rule overrides without asking.

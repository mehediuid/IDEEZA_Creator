# Add Network Implementation Plan

> **For agentic workers:** executed inline (superpowers:executing-plans) in the
> session that wrote it. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The review card's Add Network, a project-page Network section, a
5-step Add Network wizard and a Connection Map page — Figma requirements, the
app's own style — per `docs/superpowers/specs/2026-09-24-add-network-design.md`.

**Architecture:** Pure logic in `src/lib/network/` (catalog of Figma tables,
types, derivation rules, rule planner, a `localStorage` store read through
`useSyncExternalStore`). UI in `src/components/network/` (one canvas + panels
shared by the wizard's Connect step and the map page's edit mode; one product
form shared by Review and the map's product panel). One API route asks the
text model for a map and the client validates it, falling back to the planner.

**Tech Stack:** Next.js 16 (modified — App Router, async `params`), React 19,
TypeScript, Tailwind preset over `src/styles/tokens.css`, `@hugeicons`.

## Global Constraints

- Tokens only: no hex, no new `--` variables; spacing/radius/type from the preset scale.
- Brand violet marks selection / active / primary only — links and nodes are neutral until selected.
- One control, one home (D3: link delete lives in the link panel + Delete key).
- No new dependencies. `npx tsc --noEmit -p tsconfig.json` passes; lint adds no new errors; `npm run build` compiles.
- Stage only this work's files — another session commits in this repo; never `git add -A`; never push.
- Copy is honest: nothing is "live" (D4); the AI banner says when rules drew the map.

## File map

| File | Responsibility |
|---|---|
| `src/lib/network/types.ts` | `Network`, `MapNode`, `MapLink`, `ProductSettings`, enums |
| `src/lib/network/catalog.ts` | 12 protocols, intents, every dropdown's options, role rules, scenarios, labels |
| `src/lib/network/derive.ts` | parts → MCU/radios/sensor · link sides · roles · auto-fill · filled-in · summaries · diff · master change (D7) · validation |
| `src/lib/network/planner.ts` | node set per intent, layout, rule-based links, AI-answer validation |
| `src/lib/network/store.ts` | `useProjectNetwork`, `saveNetwork`, `deleteNetwork`, sanitizer |
| `src/lib/network/products.ts` | `networkProducts(project, build)` — the project's products as `NetProduct[]` |
| `src/app/api/network/automap/route.ts` | text-model call → raw links |
| `src/components/network/map-canvas.tsx` | nodes, ports, links, pan/zoom, draw, legend |
| `src/components/network/map-editor.tsx` | toolbar + canvas + side panel + history (wizard Connect, map edit) |
| `src/components/network/link-panel.tsx` | the three questions + filled-in-for-you |
| `src/components/network/product-form.tsx` | per-product settings fields |
| `src/components/network/dialogs.tsx` | modal frame, confirm, how-to-draw, all-parameters |
| `src/components/network/add-network-dialog.tsx` | wizard shell + steps |
| `src/components/network/network-settings-dialog.tsx` | Figma 16 (+ Delete network, D9) |
| `src/components/network/network-section.tsx` | project-page section (Figma 01 / 10) |
| `src/components/network/connection-map-page.tsx` | Figma 11–17 |
| `src/app/(create)/projects/[id]/network/page.tsx` | route |
| edits | `review-outputs.tsx` (HeaderAction → live), `project-details.tsx` (section), `CLAUDE.md` §5, `STRUCTURE.md` |

## Tasks

### Task 1: Logic layer (`src/lib/network/*`)
- [ ] types + catalog from the Figma tables (all 12 protocols, 17 sensors, option lists).
- [ ] derive: `detectMcu`, `detectRadios`, `detectSensor`, `linkEnds`, `rolesOf`, `autoSettings`, `filledIn`, `networkSummary`, `diffNetworks`, `masterChange`, `createBlocker`.
- [ ] planner: `nodesFor(intent, products)`, `layout`, `planLinks`, `validateAiLinks`.
- [ ] store + products adapter.
- [ ] Node test harness in the scratchpad (compile with `tsc --module commonjs`, run `node --test`): roles for the Figma 4-product example (Thermostat Master · Light Bulb/Smart Fan Slave · Door Sensor Independent), standby, gateway, master change removes the old master's two-way link, validation drops bad AI links, frequency filtering.
- [ ] `tsc` passes. Commit.

### Task 2: AI route
- [ ] `POST /api/network/automap` — system prompt with the node ids and enums, 20 s timeout, lenient JSON extraction, returns `{ links: unknown[] }` (empty on any failure). Commit.

### Task 3: Canvas + editor + panels + dialogs
- [ ] `map-canvas` (HTML nodes + SVG links in one transformed layer; select/draw tools; ports as buttons; node drag; pan; wheel/ctrl-zoom; Fit; legend; line style per Q2; arrowheads per Q1).
- [ ] `map-editor` (toolbar, protocol for new links, undo/redo with ⌘Z/⇧⌘Z, V/L/Delete/Esc keys, pending new link, status line).
- [ ] `link-panel`, `product-form`, `dialogs`. `tsc`. Commit.

### Task 4: Wizard
- [ ] `add-network-dialog`: stepper, Setup, Method, AI suggested map, Connect, Review (network settings + All parameters + product accordions + Expand all + blocker line), Done (09 / 09b), discard confirm. `tsc`. Commit.

### Task 5: Surfaces
- [ ] review card button states (D1), project-page Network section, Connection Map page + route (read / product / link / edit + unsaved diff / breaking warning / settings / delete). `tsc`. Commit.

### Task 6: Verify + docs
- [ ] CDP run in headless Chrome: seed project + build, run wizard via AI (with the model unreachable too → fallback banner), manual draw by port clicks, review edits, create, reload, map read/edit/save, master-change warning, settings, delete; dark + light screenshots beside the Figma frames.
- [ ] lint (no new errors), `npm run build`, CLAUDE.md §5 + STRUCTURE.md. Commit.

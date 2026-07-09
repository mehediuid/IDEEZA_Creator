# PCB Section — Menu / Toolbar / Sidebar Fixes — Design

**Date:** 2026-07-09
**Author:** design@ideeza.com (spec), Claude (drafting)
**Scope:** The PCB section only (`src/lib/pcb/*`, `src/components/pcb/*`). No other module is touched.

## Problem statement (5 points from the user)

1. **No subgroups in the main menu** except where "IDEEZA Menu Final List 3" marks a cascade.
2. **Leaf-level dialogs are missing.** When a menu drills to its last layer, clicking a leaf must open the dialog defined in the Excel (cascade column) and the pop-ups PDF. Today many leaves only show a toast or do nothing.
3. **Remove the "flagged for removal" marking** from the 21 flagged items; they must work like any other feature.
4. **The main-menu toolbar is unattractive / confusing.** Make it clearer (incremental polish, not a rewrite).
5. **Sidebar properties are incomplete.** Every sidebar property element must be clickable and placeable on the canvas, in both schematic and 2D. Follow the Sidebar Property PDF.

## Source-of-truth documents

All docs are in hand, in `/Users/ideeza/Downloads/` (not committed to the repo):

| Doc file | Drives |
|---|---|
| `Ideeza_Menu_Final_List_3.xlsx` | Which menu items are flat vs cascade (point 1); top-level menu order |
| `Ideeza_All_Popups_Only.pdf`, `Ideeza_Menu_Popups_Schematic_and_2D_v4.pdf`, `Ideeza_Popup_Full_Parameter_List.pdf` | Dialog contents per leaf (point 2) |
| `Ideeza_Main_Toolbar_Comparison.xlsx` | Toolbar reference (point 4) |
| `Sidebar Properties.xlsx` (SCHEMATIC + 2D sheets), `Ideeza_EasyEDA_PCB2D_Sidebar_Properties_1.pdf` | Sidebar property fields per selected-item type (point 5) |

Reference tool is **EasyEDA** (pro.easyeda.com). The **approach** below is stable regardless of these docs; the docs supply item-level *data* (which items, which fields, which properties). Points 3 and 4 need no doc. `inspector-schema.ts` was already built from `Sidebar Properties.xlsx`, so the field lists already match — the gap is behaviour, not fields.

## Sequencing (user directive: one workstream at a time)

The user chose to do these **one by one, sidebar (Workstream C) FIRST**. Order: **C → then the rest**, each with its own implementation plan.

## Current state (from code audit, 2026-07-09)

### Menu — `src/lib/pcb/data.tsx` + `src/components/pcb/menu-bar.tsx`
- Four builder functions, one per mode: `buildMenus` (pcb), `buildMenusSchematic`, `buildMenus2D`, `buildMenus3D`.
- **Nesting is at most 2 levels everywhere** — there is no 3+ level violation. The renderer (`menu-bar.tsx:226-308`) only supports 2 levels anyway.
- **Cascade is heavy**: e.g. schematic `File ▸ New` has 17 leaves; `File ▸ Import`, `Edit ▸ Delete/Move`, `View ▸ Unit/GridSize/GridType/Appearance`, `Place ▸ Net`, `Layout ▸ Align/Distribute/Rotate/Flip/Level` are all cascades.
- **Top-level order diverges across builders** — `buildMenus` has no `File` menu; the others do.
- **Missing behavior** (point 2): many leaves call `actions.flashToast("… coming soon")` or silently `closeAll()`. Full inventory in the implementation plan. Notable: all `File ▸ New`, most `File ▸ Import` formats, `Save`/`Save All`, `View ▸ Grid Type`/`Appearance`, `Layout ▸ Group`, **`Layout ▸ Align` (does nothing)**, all `Help` items.
- **All dialog ids referenced by menus have a matching modal component** — no broken references. Dialogs live in `modals.tsx` (switch at `1939-2014`) and `pcb-manager-modals.tsx`.
- **Bug:** `buildMenus` `Import ▸ Schematic/Netlist/Library/Footprint` all wrongly open the DXF modal (catch-all else at `data.tsx:119`).

### Flagged items (point 3) — 21 total
- Schematic (6): Board Shape, Reannotate, Convert to New Version, Insert BOM Table, Generate Data From Chatbot, Import Image.
- 2D `Design` menu (15): Polygon Pour, Fill all Plane, Vias, Export, Rotate left, Rotate Right, Align Left, Align Right, Align Top, Align Bottom, Align Center, Align Vertical Center, Align Grid, Bring To Front, Send to Back.
- Some already have real behavior (Vias→`setTool`, Rotate→`rotateSelectedPlaced`, Bring/Send→z-order). The rest are toast-only.
- Rendered with a ⚑ glyph + italic/muted style + tooltip (`menu-bar.tsx:49-54, 207-214, 286-294`).

### Toolbar (point 4) — `src/components/pcb/toolbar.tsx`
- One wrapping strip driven by `ITEMS` (schematic/pcb) and `ITEMS_2D` (2d/3d). ~70+ controls visible at once in schematic mode.
- All buttons are **icon-only, monochrome, uniform 30×30**; grouping is conveyed only by 1px dividers with **no visible labels**.
- **No overflow / "more" menu / scroll** — the strip just wraps taller; `left-rail.tsx:27` hardcodes `top:145` assuming ~2 rows.
- **Heavy duplication with the menu bar** — nearly every button also exists as a menu item.
- **No toggle/active feedback** for stateful buttons (Snap, Grid Style).
- **Bugs:** in `ITEMS_2D`, Copy/Paste are wired to `openDistribute` (`toolbar.tsx:241-242`); Distribute H and Distribute V both call the same modal; several items reuse the same icon key.
- Styling: inline styles that mostly use design tokens (`--color-*`, `--spacing-*`), but with scattered magic numbers and raw hex.

### Sidebar properties (point 5)
- Right panel routes by mode + selection (`right-panel.tsx:96-119`): `SchematicProperties` / `TwoDProperties` / `PcbDefaultProperties` when nothing is selected; schema-driven `InspectorPanel` when something is selected.
- `inspector-schema.ts` defines 7 schematic types + 8 2D types. **A field is editable only if it has a `bind` token** (`obj:*` / `wire:*` / `doc:*`); most fields are **read-only display stubs** (Manufacturer, Supplier, Pin props, Solder/Paste Mask, Thermal, Font, Value, most Canvas fields).
- **Placement today is toolbar-only**: `setTool` → click canvas → `store.placeObject`. `PLACE_TOOLS` (35) + `DRAFT_TOOLS` (8) in `types.ts:193-247`.
- **The left library panel (`library-panel.tsx`) is inert** — clicking a part only mutates library UI state, never places anything on the canvas. This is the biggest gap for "clickable and placeable."
- **12 kinds have no glyph** (render as a generic dot) and several kinds fall back to the wrong "Canvas" inspector (gnd, junction, image, mountingHole, prohibitedRegion, constraintRegion, vcc5v, agnd, pgnd, noConnect, shortFlag, port).
- **Schematic Pin is not placeable** (no tool). `placed-properties.tsx` is **dead code** (imported nowhere). `CoordReadout` footer shows dummy values.
- 2D/PCB inspector is more complete than schematic.

## Architecture / approach

Work is grouped into three workstreams by the files they touch, executed in this order:

### Workstream A — Point 3 (flags) [no doc] — FIRST
1. Remove `flagged: true` from all 21 items and the ⚑ flag-rendering branch in `menu-bar.tsx` (keep the `flagged`/`note` type fields harmless or delete them once unused).
2. Wire the toast-only flagged items to real behavior, matching sibling items:
   - `Polygon Pour` → `setTool('polygon')`; `Fill all Plane` → real fill action; `Vias` → already `setTool` (keep).
   - `Rotate left/right`, `Bring To Front`, `Send to Back` → already real (keep).
   - `Align Left/Right/Top/Bottom/Center/Vertical Center/Grid` → implement a real `alignObjects(kind)` action in `store.tsx`. **This same action fixes the broken `Layout ▸ Align` (points 2) and the toolbar Align buttons (point 4)** — implement once, reuse everywhere.
   - `Board Shape` → `setTool('boardOutline')` (or board-shape dialog if the pop-ups PDF defines one).
   - `Reannotate` → wire to the existing `reannotate` modal; `Insert BOM Table` → BOM-insert dialog/`tableProps`.
   - `Convert to New Version`, `Generate Data From Chatbot`, `Export` (2D flagged) → decide real behavior with the user (may map to existing actions / menus).
3. **Decision gate:** a few flagged items (Convert to New Version, Generate Data From Chatbot) have no obvious existing behavior — confirm intended action before wiring.

### Workstream B — Point 4 (toolbar incremental polish) [no doc] — SECOND
Keep the existing single-strip structure; improve clarity:
1. **Visible group labels** — render the group name (already present as source comments) as a small muted label at each divider, so groups read as sections.
2. **Fix bugs** — correct 2D Copy/Paste wiring, split Distribute H/V, dedupe icon keys so distinct tools have distinct glyphs.
3. **Toggle/active state** — Snap and Grid Style (and any other store toggles) render an on/off visual state.
4. **Tooltips** — every button gets a consistent `title` with its keyboard shortcut where one exists.
5. **Spacing/tokens** — replace magic numbers with tokens; consistent gaps; ensure wrapping is tidy. (No overflow menu — that would be a structural rewrite; out of scope for "incremental".)
6. **Reduce dead-ends** — toast-only toolbar buttons either get wired (via Workstream A actions) or a clear disabled/"soon" affordance.

### Workstream C — Point 5 (sidebar) — FIRST (in progress)

**Confirmed scope (user):** all three of — (1) right-hand property inspector complete & every field editable, (2) every object type placeable on canvas, (3) left library click/drag-to-place — for **both** schematic and 2D.

**C1 — Every inspector field editable ("clickable").** Today a field is interactive only if it has a `bind`; most fields are read-only display stubs (e.g. schematic Pin has zero binds; Component Key/More Properties, Canvas Drawing Border/Title Block, 2D Pad/Via Mask+Thermal, Copper Fills actions are all display-only).
- Add a generic **`props: Record<string, unknown>`** bag to `CanvasObject` (`types.ts`) and a **`prop:<key>`** bind token resolved by `right-panel.tsx`'s `FieldRow` → a single generic `setObjectProp(id, key, value)` store action (undoable via history). This makes every per-object field editable + persisted without adding ~40 typed columns.
- Give every currently-unbound **per-object** field a `prop:<key>` bind in `inspector-schema.ts` (Manufacturer, Supplier, Pin Name/Type/Shape, mask/thermal, font, silk color, value, 3D model, etc.).

**C2 — Canvas / board-wide fields wired to real settings.** Canvas-type fields are not per-object; bind them to store board settings:
- 2D **Selection Filter** must actually filter what the mouse can select on canvas (drive `canvas-area.tsx` hit-testing from the filter state).
- 2D **Common Setting** (Start/Track width, Via sizes, Routing Mode, Remove Loop, etc.) sets the board defaults used by `placeObject`/routing.
- 2D **Document** + schematic **Drawing Border / Title Block** bind to the existing `twoD` / `schemBorder` / `schemTitleFields` store slices (extend where a field is missing).

**C3 — Kind coverage & glyphs.** Add `KIND_TO_TYPE` entries for the 12 unmapped kinds (gnd, junction, image, mountingHole, prohibitedRegion, constraintRegion, vcc5v, agnd, pgnd, noConnect, shortFlag, port) so selection resolves the correct inspector type instead of falling back to Canvas; add real glyphs in `placed-objects.tsx` `GLYPHS` for kinds currently drawn as a generic dot.

**C4 — Every object placeable, both modes.** Verify each object type in the spec is placeable via the toolbar `setTool → placeObject` flow in its correct mode; make schematic **Pin** placeable (add a `pin` tool + `PLACE_TOOLS` entry). Ensure a placed object is auto-selected so its complete inspector shows.

**C5 — Left library click/drag-to-place.** Wire `library-panel.tsx` so selecting a part/element **places it on the canvas** (click-to-arm-then-place and/or drag-drop) via `store.placeObject`, in both schematic and 2D — today the library only mutates its own UI state and never touches the canvas.

**C6 — Cleanup.** Remove or wire the dead `placed-properties.tsx`; make `CoordReadout` show real cursor/selection coordinates instead of dummy values.

### Workstream D — Points 1 + 2 (menu cascade + leaf dialogs) [Final List 3 + pop-ups PDFs in hand] — LAST
1. **Reconcile top-level menus** across the four builders to match "IDEEZA Menu Final List 3" order/set.
2. **Flatten cascades** not marked "cascade" in the Final List; **keep** cascades that are marked. Since nesting depth is already ≤2, this is a data edit in `data.tsx`, not a renderer change.
3. **Wire every leaf** flagged with a dialog in the Excel to open a real dialog; build any missing dialog per the pop-ups PDF (most modal infrastructure already exists in `modals.tsx`).
4. **Fix the Import wrong-dialog bug** (`data.tsx:119`).
5. Menu tree + dialog contents finalized against Final List 3 / Excel / pop-ups PDF.

## Data flow (placement + property editing, point 5)

`toolbar/library → setTool | placeObject → CanvasObject added to store.objects + auto-selected → RightPanel reads selectedIds → resolveInspectorType(mode, kind) → InspectorPanel → bound FieldRow → setObjectField → PlacedObjects re-renders`. Completing point 5 = closing the gaps at the library (no placement), unmapped kinds (wrong inspector), and unbound fields (read-only).

## Testing / verification

- Per workstream, verify in the running app via the browser preview: open `/pcb`, exercise the changed menu items / toolbar buttons / sidebar placements, confirm dialogs open and objects place + edit, check console/network for errors.
- Point 3: every previously-flagged item now performs its action (no ⚑, no "coming soon" toast).
- Point 4: groups are labelled, toggles reflect state, the two wiring bugs are gone.
- Point 5: a part clicked in the library appears on canvas and its properties edit live, in both schematic and 2D.
- Points 1/2: menu tree matches Final List 3; every last-layer leaf opens its specified dialog.

## Out of scope

- Any non-PCB module.
- Toolbar structural rewrite / overflow system (point 4 is incremental only).
- New backend/persistence work beyond what the roadmap already established.

## Open decisions (to confirm during implementation)

1. Real behavior for `Convert to New Version` and `Generate Data From Chatbot` (Workstream A) — no obvious existing action.
2. Whether library click-to-place uses click-to-arm vs drag-drop (Workstream C5) — resolve in the C implementation plan.
3. Cascade-keep list + dialog field contents (Workstream D) — read directly from `Ideeza_Menu_Final_List_3.xlsx` + the pop-up PDFs when D starts.

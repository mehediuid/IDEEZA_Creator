# Architecture (PCB module)

Moved verbatim from `CLAUDE.md` §4 on 2026-09-29. The code-side router is [src/components/pcb/README.md](../../src/components/pcb/README.md).

> Full annotated folder tree for the **whole app**: see **[STRUCTURE.md](../../STRUCTURE.md)** (keep it current too — [AGENTS.md › Keeping docs current](../../AGENTS.md#keeping-docs-current-required)). The map below is the PCB module in brief.

```
src/lib/pcb/
  store.tsx            # single source of truth: React context, actions, undo/redo, persistence
  types.ts             # PcbState, PcbActions, CanvasObject, initialState, DEMO/DEFAULT objects, constants
  data.tsx             # @ts-nocheck — menu/toolbar/tree/context-menu builders (pure data)
  schematic-to-pcb.ts  # native Schematic→PCB: footprints + ratsnest + auto-place + auto-route
  nets.ts              # live schematic connectivity (pins + union-find netlist) + ERC
  shape-boolean.ts     # boolean/Combine geometry (rasterize + marching-squares)
  inspector-schema.ts  # schema-driven Properties inspector (panels + fields)
  icons.tsx / hicons.ts# DsIcon + icon dictionaries
  pcb-scene.ts         # 3D-tab scene: real board+tracks+vias+pads+bodies+regions from the 2D layout
  exporters.ts         # real file generators (Pick&Place/DXF/SVG/PDF/PNG/STL/OBJ) + download helpers
  drc-rules-map.ts     # PCB Design-Rules dialog form → PcbDrcConfig (feeds runDrcCheck)
  del-objects.ts       # Delete-Objects dialog: object kind → category (delCategoryOf)
  part-catalog.ts      # Parts + Agile-Module catalogue, rail queries, favourites/recents
  kicad-export.ts, design-rules-data.ts, colors.ts, content.ts, markup.ts, pcb-3d.ts
src/components/pcb/
  pcb-app.tsx          # shell composition
  canvas-area.tsx      # canvas: pan/zoom, selection authority (mousedown), place/draft, grab-move
  placed-objects.tsx   # renders every CanvasObject (glyphs, wires, combine polygons)
  schem-canvas.tsx / pcb-canvas.tsx / pcb-three-view*.tsx
  left-panel.tsx + project-navigator.tsx   # Sheets/Nets/Parts/Objects + Library
  right-panel.tsx + schem-properties.tsx / pcb-properties.tsx  # Properties/Filter/Layer
  toolbar.tsx (top) + menu-bar.tsx + top-bar.tsx
  context-menu.tsx     # canvas right-click (typed, portalled submenus)
  bottom-bar.tsx + bottom-content.tsx      # Logs/Parts Audit/DRC/Find/Property List
  modals.tsx, pcb-manager-modals.tsx, device-manager.tsx, footprint-manager.tsx, settings-*.tsx
```

## State / store (`store.tsx`)

- One `PcbState` object; actions built with `useMemo`.
- **`merge(patch)`** — plain state update (view/UI, no undo).
  **`mergeWithHistory(patch)`** — model changes; snapshots `SNAP_KEYS` for undo/redo (diffed, so no-ops don't pollute history).
- **`stateRef.current`** — read latest state inside async/event actions.
- **`setToolAs(tool, text)`** — arms a place tool whose object carries a given name (`state.placeText`, consumed + cleared by `placeObject`). Lets several menu rows share one symbol kind honestly: Insert ▸ Power & Ground places `vcc5v` as **VCC / +5V / -5V**, and the supply glyph draws `obj.text`.
- Actions may call `actions.<other>()` (safe — invoked on events, not during render).
- **Persistence:** the *document* (`objects, pcbBoard, twoD, threeD, gridSize, gridType, unit, snapEnabled, designRules, pcbDrcConfig, pcbLayers, pcbNets, pcbDefaults, boardSettings`) auto-saves (debounced) to `localStorage` under `ideeza:pcb:doc:<projectId>`, scoped by `ideeza:manual:active`. So layer colours/visibility/lock, net colours, place defaults, grid style and DRC rule-tuning now survive reload. UI flags (zoom, panels, menus, sheets) are session-only. `saveDoc()` force-writes; `sanitizePcbDoc()` shape-checks every key on load.

## `CanvasObject` — the universal placed-object model

`kind, x, y, endX/endY` (wires), `text, rotation, color, layer, net, footprint,
comment, side, props` (typed-field bag), `scope` (`"schematic"|"pcb"`),
`sheetId` (multi-sheet), `sourceId` (cross-probe link), `points` (real polygon
rings for Combine results). Add a field here + handle it in `placed-objects.tsx`
+ (if persisted) the doc sanitizer.

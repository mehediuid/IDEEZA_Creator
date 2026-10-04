# PCB module router (`src/components/pcb` + `src/lib/pcb`)

The schematic + PCB editor. Architecture, store and `CanvasObject` model: [docs/guides/pcb-architecture.md](../../../docs/guides/pcb-architecture.md). What each control does today: the features guides [pcb-schematic.md](../../../docs/guides/features/pcb-schematic.md), [pcb-board.md](../../../docs/guides/features/pcb-board.md), [pcb-tools-menus-panels.md](../../../docs/guides/features/pcb-tools-menus-panels.md). Back to [docs/map/PRODUCT.md](../../../docs/map/PRODUCT.md).

**Binding rules for PCB changes** (moved from the coding conventions):
- **Store discipline:** pick `merge` vs `mergeWithHistory` deliberately (model change → history). Read via `stateRef.current` in event/async actions. New persisted state → add to the doc type + sanitizer + save effect.
- **One model:** route new placed things through `CanvasObject` + `placed-objects.tsx` rather than bespoke rendering.
- Prefer editing the existing builders (`data.tsx`, `inspector-schema.ts`) over parallel systems.
- The editor's UI notes live in [ui-ux.md](../../../docs/guides/ui-ux.md): the shared `.ix-*` classes in `pcb-editor.css` (reuse them), `DsIcon`, symbol glyphs, pad colours, and the Position panel as the reference for dense control layout.

| Folder or file | What lives there | Read before changing |
|---|---|---|
| `lib/pcb/store.tsx` | `PcbProvider`: state, actions, undo/redo (`SNAP_KEYS`), debounced doc save to the product's `ideeza:pcb:doc:<projectId>:<productId>` (`setDocScope`), `sanitizePcbDoc` | pcb-architecture.md › State / store |
| `lib/pcb/types.ts` | `PcbState`, `CanvasObject`, `initialState`, `PLACE_TOOLS` / `DRAFT_TOOLS`, `nextDesignator` | pcb-architecture.md › `CanvasObject` |
| `lib/pcb/data.tsx` | `@ts-nocheck` pure builders: `buildMenusSchematic`, `buildMenus2D`, toolbar, tree, context menu | pcb-tools-menus-panels.md |
| `lib/pcb/inspector-schema.ts` | Schema-driven Properties inspector (panels + typed fields) | pcb-tools-menus-panels.md › Right panel |
| `lib/pcb/nets.ts` | Live connectivity (`computeNets`), ERC (`runErc`), netlist (`buildNetlist`) | pcb-schematic.md › Schematic connectivity |
| `lib/pcb/schematic-to-pcb.ts` | Native Schematic→PCB: footprints, ratsnest, auto-place, `routeRatsnest` | pcb-board.md › Native Schematic → PCB |
| `lib/pcb/route-path.ts`, `drc.ts`, `drc-rules-map.ts` | Track path planner (`planTrackPath`); the DRC engine (`runDrc`…); rules dialog → config | pcb-board.md › routing, DRC |
| `lib/pcb/pour.ts`, `teardrops.ts`, `suture-vias.ts`, `shape-boolean.ts` | Copper pour, teardrops, stitching vias, boolean/corner geometry | pcb-board.md; pcb-tools-menus-panels.md › Boolean |
| `lib/pcb/exporters.ts`, `glb-export.ts`, `kicad-export.ts`, `dxf-import.ts`, `gltf-import.ts` | File generators (Pick&Place, DXF, SVG, PDF, STL, OBJ, sheet PDF, GLB, KiCad) and importers; Gerber/DRC run through `src/app/api/kicad/` | pcb-tools-menus-panels.md › Top toolbar |
| `lib/pcb/part-catalog.ts`, `land-patterns.ts`, `board-parts.ts` | Parts + Agile-Module catalogue, personal parts; package → pad geometry; the board's placed parts | [parts-package.md](../../../docs/guides/features/parts-package.md) |
| `lib/pcb/pcb-scene.ts`, `pcb-3d.ts` | The 3D tab's scene, derived from the 2D layout | pcb-board.md › PCB editor |
| `lib/pcb/icons.tsx`, `hicons.ts`, `glyphs.tsx`, `tool-labels.ts` | `DsIcon` + dictionaries; symbol glyphs (`GLYPHS`); armed-tool names + hints | [ui-ux.md](../../../docs/guides/ui-ux.md) |
| `lib/pcb/from-build.ts` | A built product's schematic, from its parts and nets (BUILDLOAD) | spec `2026-09-28-project-details-phase2-design.md` |
| `pcb-app.tsx`, `editor-shell.tsx`, `left-rail.tsx`, `splitter.tsx` | Shell composition, full-viewport root, module switcher, draggable panel edges | [app-map.md](../../../docs/guides/app-map.md) |
| `canvas-area.tsx`, `placed-objects.tsx`, `schem-canvas.tsx`, `pcb-canvas.tsx` | Pan/zoom, selection authority (mousedown), place/draft, the left `ToolPalette` (`SCHEM_TOOLS` / `PCB_TOOLS`); renders every `CanvasObject`; backdrops | pcb-schematic.md; pcb-board.md |
| `toolbar.tsx`, `menu-bar.tsx`, `top-bar.tsx`, `context-menu.tsx` | Top toolbar (`SCHEM_ESSENTIAL` / `PCB_ESSENTIAL`), menus, canvas right-click | pcb-tools-menus-panels.md |
| `left-panel.tsx`, `project-navigator.tsx`, `library-panel.tsx` | Sheets / Nets / Parts / Objects, the Library | pcb-tools-menus-panels.md › Left panel |
| `right-panel.tsx`, `schem-properties.tsx`, `pcb-properties.tsx` | Properties / Filter / Layer, Position panel | pcb-tools-menus-panels.md › Right panel |
| `bottom-bar.tsx`, `bottom-content.tsx`, `drc-markers.tsx` | Logs / Parts Audit / DRC / Find / Property List, layer strip; findings on the canvas | pcb-tools-menus-panels.md › Bottom panel |
| `modals.tsx`, `modal-kit.tsx`, `pcb-manager-modals.tsx`, `settings-*.tsx`, `device-manager.tsx`, `footprint-manager.tsx`, `color-picker.tsx` | Dialogs (sheet export, Gerber, `PcbDrcModal`, group managers), settings, managers | pcb-board.md › DRC; pcb-tools-menus-panels.md |
| `pcb-three-view.tsx`, `pcb-three-view-impl.tsx`, `pcb-meshes.tsx` | The 3D board view (three.js) | pcb-board.md › PCB editor |

@AGENTS.md

# IDEEZA Creator — Project Guide

`ideeza-creator-panel` — a browser-based **AI-driven hardware-creation
platform**. A maker describes an electronics idea; AI drafts the **schematic,
parts list and build steps**, which the maker refines in a suite of editor
modules (PCB, Code, 3D, Wiring, Preview, Brief), then **mints the design
on-chain (Utility NFT)** and shares/sells it via the community feed and
marketplace. The deepest module is an **EasyEDA-inspired schematic + PCB
editor** with a native (KiCad-less) Schematic→PCB pipeline. This is a **real
product, not a prototype** — every control must do real, verified work.

> **Next.js is modified here.** See `@AGENTS.md`: this is Next 16.x with breaking
> changes. Read `node_modules/next/dist/docs/` before writing any Next-specific
> code.

---

## Scope discipline
- Do exactly what was asked — nothing more. No unsolicited
  features, refactors, or "improvements" to nearby code.
- Keep diffs minimal; don't touch files unrelated to the task.
- No new dependencies without asking first.
- No comments unless the logic is non-obvious; no dead code,
  no leftover console.logs or debug flags.
- If the task is ambiguous or needs a structural change,
  ask before writing code.
  
## 0. Keeping this guide current (REQUIRED)

**§5 (Features done) is the living feature inventory — this file is the source
of truth for what exists.** Whenever you add, change, or remove a feature, update
this file **in the same change**, not later:

- **Feature added** → add a one-line entry under the right subsection of §5.
- **Feature changed** → revise its §5 entry so the description stays true.
- **Feature removed** → delete its §5 entry.
- Change touches a **convention or UI/UX pattern** → update §6 / §7.
- Change adds **persisted state or a `CanvasObject` field** → update §4.

Rules: keep entries short and accurate; **never list something that isn't
actually working and browser-verified** (that would be a stub-by-documentation).
This guide loads into every session — an out-of-date feature list is a defect,
same as broken code. Treat "update CLAUDE.md" as part of the definition of done.

---

## 1. Tech stack

- **Next.js 16.2.9** (App Router, modified — heed `AGENTS.md`), **React 19**, **TypeScript**.
- **Styling:** design tokens in `src/styles/tokens.css` + `reset.css`, a Tailwind preset (`tailwind-preset.ts`), and per-module CSS (`src/app/pcb/pcb-editor.css`).
- **Icons:** `@hugeicons/react` (via `DsIcon`) with a raw-SVG fallback dictionary.
- **3D:** `three` + `@react-three/fiber` / `drei` (PCB 3D view).
- **Code module:** `@monaco-editor/react`; **visual logic:** `blockly`.
- No backend — state persists to `localStorage`.

## 2. Running & verifying

```bash
npm run dev                       # next dev (http://localhost:3000)
npx tsc --noEmit -p tsconfig.json # MUST pass before considering work done
npm run lint                      # eslint
```

**Verification is mandatory, not optional.** Behaviour is proven by driving the
real app in **headless Chrome over CDP** (seed a project into `localStorage`,
navigate to `/project/<slug>/pcb`, dispatch real mouse/key events, read the DOM
and screenshot). A change is "done" only when `tsc` passes **and** the behaviour
is browser-verified. See past scripts under the session scratchpad for the CDP
harness pattern (WebSocket to `/json`, `Input.dispatchMouseEvent`,
`Page.captureScreenshot`).

## 3. App map (routes & navigation)

**Global shell** (`components/app-chrome`, `components/dashboard/sidebar`):
left sidebar nav — **Home · History · My projects · Parts & agile module ·
Explore marketplace · Innovations · Messages · Blog**; top bar — Search + **⌘K
command palette**, Upgrade to Pro, Tutorial / Tour guide / Help / Report,
profile dropdown, plan badge (Free/Pro).

**Platform routes:**
- `/` — **Dashboard home**: "What will you build today?" AI prompt (Generate with AI / Build manually) + Browse Project cards.
- `/projects` — **My projects** (filters: All · Public · Contributed · Private · Draft · Utility NFT).
- `/history` — **History**: Model Generations · Project/Product Generations.
- `/innovations`, `/innovations/[slug]` — **community feed** (Discover/Following, categories, minted badges).
- `/(create)/chat/[chatId]`, `/(create)/build/[jobId]` — **AI concept chat → build job**.

**Per-project editor** — `/project/[projectSlug]/[step]`; the left rail switches
modules: **PCB Design · Code · 3D Module · Product Preview · Wiring · Add Brief**.

**Monetization:** on-chain **minting** (Utility NFT) — "no wallet or KYC to
start, only when you sell"; Upgrade to Pro; marketplace.

## 4. Architecture (PCB module)

> Full annotated folder tree for the **whole app**: see **[STRUCTURE.md](STRUCTURE.md)** (keep it current too — §0). The map below is the PCB module in brief.

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

### State / store (`store.tsx`)

- One `PcbState` object; actions built with `useMemo`.
- **`merge(patch)`** — plain state update (view/UI, no undo).
  **`mergeWithHistory(patch)`** — model changes; snapshots `SNAP_KEYS` for undo/redo (diffed, so no-ops don't pollute history).
- **`stateRef.current`** — read latest state inside async/event actions.
- Actions may call `actions.<other>()` (safe — invoked on events, not during render).
- **Persistence:** the *document* (`objects, pcbBoard, twoD, threeD, gridSize, unit, snapEnabled`) auto-saves (debounced) to `localStorage` under `ideeza:pcb:doc:<projectId>`, scoped by `ideeza:manual:active`. UI flags (zoom, panels, menus, sheets) are session-only. `saveDoc()` force-writes.

### `CanvasObject` — the universal placed-object model

`kind, x, y, endX/endY` (wires), `text, rotation, color, layer, net, footprint,
comment, side, props` (typed-field bag), `scope` (`"schematic"|"pcb"`),
`sheetId` (multi-sheet), `sourceId` (cross-probe link), `points` (real polygon
rings for Combine results). Add a field here + handle it in `placed-objects.tsx`
+ (if persisted) the doc sanitizer.

---

## 5. Features done

> §5 is the living inventory (see §0). It spans the **platform** and every
> **editor module**; the PCB module is documented deepest because it's the
> largest surface.

### Platform & shell
- Global sidebar nav (Home · History · My projects · Parts & agile module · Explore marketplace · Innovations · Messages · Blog); top bar with search, profile dropdown, plan badge, Tutorial / Tour guide / Help / Report.
- **⌘K command palette** (`dashboard/command-palette`); light/dark theme (`theme-provider` + toggle).

### AI create & build flow (`components/create`, `dashboard/workspace-prompt`)
- Dashboard hero "What will you build today?" — **Generate with AI** vs **Build manually**; prompt box with attach + voice, **Enhance prompt**, example-idea chips.
- Concept chat → **build job** with live status (`build-shell`, `build-status`, `concept-chat`, `chat-thread`, `confirm-build-dialog`) → outputs **Schematic · Parts list · Build steps**.
- Image generation/editing turns (`image-turn`, `image-editor-modal`); background **video/render jobs** (`components/video-jobs`, global render indicator).
- Manual project creation + step navigation (`components/manual`).

### Projects, history & community
- **My projects** (`projects/my-projects`, `project-details`) with filters: All · Public · Contributed · Private · Draft · **Utility NFT**; pagination.
- **History** (`create/history-*`): Model Generations · Project/Product Generations.
- **Innovations** community feed (`components/newsfeed`): Discover/Following, category filters, project cards with **minted badge**, empty states; Explore marketplace.
- **On-chain minting** via the Brief module (idea → video → **mint** → success); "no wallet/KYC to start, only when you sell".

### PCB module — schematic editor
- Canvas pan/zoom/grid; selection = **mousedown is the sole authority** (click, shift/⌘-click multi-select, drag rubber-band). Delete/Esc/Ctrl+C/X/V/A/Z/Y, Hand tool (H / hold Space).
- **Left tool palette** (split-button flyouts): Select (Pointer/Lasso/Area/Hand) · Wire (Wire/Bus/Bus-entry) · **Shapes** (Rectangle/Line/Polyline/Circle/Ellipse/Arc/Bezier) · Net Label · Power · No Connect · Junction · Text · Eraser. Every option arms a real place/draft tool.
- Place tools (single-click) + draft tools (wire/line/polyline, click-click or press-drag).
- **Multi-sheet:** `schematicSheets` + `activeSheetId` + per-object `sheetId`; Previous/Next/Goto Page.
- New boards seed a demo RC circuit; "Load Sample Circuit".
- **Wire tool snaps** to symbol pins / wire endpoints (and grid when Snap is on) so wires land exactly on pins.

### Schematic connectivity, ERC, netlist & annotation (`nets.ts`)
- **Live netlist** — symbol kinds carry pin anchors (`SCHEM_PINS`); `computeNets()` union-finds pins + wire endpoints into nets, named from net-label / power / port symbols (same name merges) else auto `N1…`. Pure/derived — always reflects the drawing.
- **Auto-junction** — a wire ending on another wire's **interior (a T)** is electrically joined (on-segment union) and a **junction dot** is auto-dropped there on wire-finish.
- **Buses are bundles, not conductors** — a bus carries a `PREFIX[lo:hi]` name and **expands to member nets**: `computeNets` excludes buses from the electrical graph, so branch wires connect by member label (`BUS_D3` here = `BUS_D3` there, via same-name merge) and each member is its own net in the netlist. Bus membership (for ERC) is geometric (a pin/branch endpoint on the bus line).
- **Nets tab** (navigator) lists the live nets with object counts; clicking highlights the net (members via connectivity → `highlightedMembers`, since schematic objects have no stored `net`).
- **ERC** (`runErc` + `ERC_RULES` catalog) — a real rule engine over the live connectivity, emitting findings on the EasyEDA-Pro **5-level severity scale** (Note · Warning · Error · **Fatal**). Enforced rules: floating pins, free/dangling wire, single-connection net, label-not-connected, duplicate & unannotated & mis-formatted designators, empty Value, netflag/netport-needs-name, illegal net name (charset/length), illegal bus name, multiple-net-names-on-one-net, global-net short, port/flag/off-page name-vs-wire mismatch, unpaired differential pair, overlapping-unconnected pins (bare pin tips with no wire/junction join), **bus rules** (illegal bus name, bus-branch member naming `PREFIX[lo:hi]`, and netport/netflag/off-page ↔ bus name-match — a bus bundle legitimately carries many member names, so multiple-net-names is suppressed on it), and the **pin-conflict matrix** (Connection tab). Severities live in one catalog (`ERC_RULES`). The pin-conflict rule reads each pin's electrical type (`SCHEM_PIN_TYPES` / `POWER_PIN_TYPE` / `props.pinType`) and looks up the pair in `defaultPinMatrix()` — so two op-amp outputs = Error, Power↔Ground/OUT↔Power = Fatal, while normal passive nets stay clean (matrix default is Ignore; a No-Connect flag suppresses the net). Results show in the bottom **DRC/ERC tab** (Fatal/Errors/Warnings/Notes counts) via "Electrical Rule Check" / Design ▸ Run design check. **Config-driven** — `runErc(objects, cfg)` reads the **Design Rules dialog** config (`state.designRules`, persisted per-project in the doc): a disabled rule is skipped, a re-severitied rule reports at the tuned level, and the pin-conflict matrix + its master toggle come from the config. The dialog (Confirm → `setDesignRules`) is the real tuning surface, not a stub. *Bus rules validate names against `PREFIX[lo:hi]` and the netlist expands each member as its own net. Feature-blocked (not enforced): reuse-block rules (Net-reuse #1-3), unconnected-wire-name-visibility (#18), supplier-part match; library-guaranteed component rules are intentionally excluded.*
- **Netlist export** (`buildNetlist` + `exportNetlist`) — Project ▸ Export ▸ Netlist downloads a real `.net` (nets → component pins), computed across **all sheets** with global nets (power / global label / port) merged and local nets sheet-qualified.
- **Annotate / Reannotate Designators** — real auto-numbering by kind in reading order (R1, C1, U1…).

### PCB editor
- 2D board canvas + layers + grid; **3D view** (three.js). **Flip Board** (mirror the view to inspect the bottom).
- **Real 3D view of the PCB 2D** (`pcb-scene.ts` `derivePcbScene` + `pcb-meshes.tsx` `PcbSceneMeshes`) — the 3D tab mirrors the 2D layout 1:1: every physical object placed on the canvas becomes real 3D geometry — **board slab** (from `pcbBoard`, real thickness/colour), **copper tracks** (gold ribbons on top/bottom per `layer`), **vias** (copper barrel + plated hole), **footprint pads** (gold, offsets from `PAD_OFFSETS` so they can't drift), **component bodies** (per-glyph size, colour by designator R/C/L/D/IC) and **copper regions/pours**. All canvas-px coords map into one centred, board-size-normalized scene (longest side → 8 units) so camera framing is board-independent. Dedicated to the PCB 3D tab — the coarser `derivePcb3D` (board + boxes) still backs the Product Preview unchanged. Live-driven by the 3D Properties (Board Color/Thickness, Background). *(three.js needs a real/SwiftShader WebGL context — headless verification uses `--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`.)*
- **3D view-control toolbar** — the 3D mode is a read-only inspection view, so the top toolbar drops the 2D editing set and shows a dedicated view cluster (each drives the three.js camera/render for real, no stubs): **Fit** (frame board) · view presets **Top / Iso / Bottom** · **Perspective↔Orthographic** toggle · **Explode** (lifts the layer stack apart — top copper up, bottom copper down, bodies highest). State in `state.pcb3d` (session-only: `projection/explode/preset/fitNonce/presetNonce`), driven by `pcb3dFit/pcb3dPreset/pcb3dToggleProjection/pcb3dToggleExplode`; a `CameraRig` inside the Canvas applies preset snaps/fit off the nonces and the camera swaps `PerspectiveCamera`↔`OrthographicCamera`. The old stub "Floating Tools" panels over the 3D canvas are removed.
- **Left tool palette** (shared `ToolPalette`, same split-button flyout UI as the schematic) — PCB **modal-tool** set (all draw/place/route tools live here, not the top toolbar): Select · Route (Track/Diff-pair/Stretch/Routing-Corner/Length-Tuning) · Pad (Pad/Test-Point/Shaped-Pad) · Via (Via/Suture/Via-Fence) · Region (Copper/Fill/Slot/Prohibited/Board-outline/Constraint/FPC-Stiffener) · Line (Line/Polyline) · Dimension · Text · Eraser. Every option arms a real PCB tool.
- **Layer/entity colors are token-driven** (`tokens.css --color-pcb-*`, sourced from the base palette) — copper identity is locked (**Top = red, Bottom = blue**), other layers get distinct non-competing hues; canvas states use `--color-canvas-highlight` / `--color-canvas-select`. Per-layer color/transparency/visibility is editable in the Layer Manager (the swatch resolves a token `var()` → hex for the native picker).
- Pads, vias, tracks, copper-pour polygons, fill regions, slots, board outline, etc.
- **Selection Filter** (`boardSettings` + `isSelectable`) — "Only Track/Pad·Via/Copper" and schematic "Only Pin/Symbol/Wire&Bus/Pin-Pair/Net".

### Native Schematic → PCB (`schematic-to-pcb.ts`)
- Pin-level netlist from wire connectivity → real footprints → pad-to-pad **ratsnest** → BFS auto-placement (decoupling caps near their IC) → L-shaped **auto-route**. Auto-runs on the Schematic→PCB switch. Footprints store `sourceId` for **Cross Probe**.

### Native PCB DRC engine (`drc.ts`) — the PCB counterpart of the schematic ERC
- **Phase 1 — Safe-Spacing clearance (real geometry):** `runDrc(objects, cfg)` checks every pair of copper objects (track/pad/via/region/fill/slot/line) that can physically conflict — **different net** + **layer-aware** (vias/TH pads are through-layer) — and reports a violation when the real **edge-to-edge clearance** is closer than the type-pair rule. Geometry is exact: segment/capsule distance (tracks + round pads/vias as inflated centre-lines), polygon edge distance + point-in-polygon containment (rect pads, copper regions). The clearance thresholds come from the Design-Rule dialog's **Safe-Spacing matrix** (`defaultClearanceRows()`, mm) via the documented `PX_PER_MM` scale (px geometry ↔ mm rules; linear dims are mil). Findings render live in the bottom **DRC tab** (`state.pcbDrcResults`, severity dots + Fatal/Error/Warn/Info filter chips) — the old static demo rows are gone. Run via **Design ▸ Run design check (DRC)**, the Tools ▸ Check DRC menu, or the DRC tab's **Check DRC** button (`runDrcCheck`); the `pcbDrc` dialog stays the rule-tuning surface.
- **Phase 2 — Physics rules (`runPhysics`):** per-object **track width** (min/max), **via size** (outer + inner/hole diameter min/max), and per-net **net-length range** (min/max) — each flagged at Warning against the `defaultPcbPhysicsRules()` values (mm, transcribed in `design-rules-data.ts` so the dialog + engine can't drift). Reads track `width`/via `drill` (mil→mm) and sums track lengths per net (px→mm).
- **Phase 3 — Connectivity & free copper (`runConnectivity`):** copper that should carry a net (track/pad/via/region/fill) but is **unnetted** → "Free copper"; and same-net copper that doesn't all join geometrically (union-find over touching geometry, `TOUCH_TOL`) → "Disconnected net — N isolated sections". Both at Warning.
- **Phase 4 — Differential pairs + netlist mismatch (`runDiffPairs`/`runNetlist`):** per pair in `state.pcbDiffPairs` — **missing member** (one rail routed, the other not), **width** (track width vs the pair's target), and **length skew** (|len(netA)−len(netB)| vs `diffPairSkewMax`, default 0.5mm) — all at Warning; verified live against the default USB_D pair. **Netlist-mismatch** (`runNetlist`, Fatal for a schematic net absent on PCB, Warning for an extra PCB net) is implemented + unit-tested but **gated off live** in `runDrcCheck` — the Schematic→PCB convert renames nets to `N1…`, so a name comparison would flood every net as missing until the convert preserves net names.
- *Still not enforced: Board-Outline keep-inside clearance, the Hole matrix row, footprint-baked-pad expansion (converted boards expose pads inside the footprint glyph), text/image copper, diff-pair spacing, net-length tolerance/equal-length groups, and the live netlist-mismatch (pending convert net-name preservation).*

### Top toolbar — all tools real
undo/redo, zoom, **Fit All/Section/Area** (real content/selection fit), grid, snap, **align L/R/T/B**, **distribute H/V**, rotate, flip, bring-to-front/send-to-back, **Save** (real `localStorage` write), Flip Board, managers, export (Gerber/Pick&Place/PDF), DRC, annotate, convert. No `flashToast`-only stubs.
- **PCB/2D top toolbar = actions with no other home** (`PCB_ESSENTIAL`, mirrors the schematic's `SCHEM_ESSENTIAL`): Undo · Redo │ Fit-All · Grid · Snap │ Place-a-Part · Table │ Auto-Route · Gerber · Footprint-Manager │ Grid-size + Unit dropdowns — inline (Place-a-Part + Table pulled from the Insert menu as actions). The **"…" overflow is a vertical labelled menu** (icon + name rows, `renderMenuRow`, same style as the palette flyout) carrying only 6 genuinely-useful secondary actions: Fit-Section · Fit-Area · Flip-Board · Device Manager · Pick&Place · Export PDF. **One control, one home — the toolbar never duplicates another surface** (`HOMED_KEYS`, excluded from inline AND overflow): modal draw/place/route **tools** → left `ToolPalette` (bind `tool`, not `action`); **arrange/distribute/rotate/flip/z-order/boolean-combine** → right-sidebar Position/Combine panel; **DRC** → bottom bar; **Save/Save-All** → Ctrl+S + File menu; **2D/3D view** → mode tabs; **Open/Copy/Paste/Array/Find/Zoom/Settings** → menu bar + standard Ctrl-shortcuts (never repeated in the overflow, mirroring the schematic toolbar which has no overflow at all).
- **Top menu bar** (`menu-bar.tsx`) is **mode-aware**: schematic → `buildMenusSchematic`; PCB/2D → `buildMenus2D` (regrouped to Project · Edit · Insert · Design · Route · Arrange · View + a right-side ⚙ Setting / ? Help cluster); **3D view → `buildMenus3D` — only View · Export · Setting · Help** (EasyEDA-verified 3D spec: View has Full Screen/panels/Window-Arrangement[Tile H/V/All · Merge All]/Floating Tool; Export = 3D File · 3D Shell File · PNG only; Setting → **standalone card dialogs** (`settings-dialogs.tsx`); Help = Community · Tutorials · Contact · Online Chat · About · Video Capture · Performance Diagnostic). ⌘K palette flattens every menu command.
- **3D-view standalone Setting dialogs** (`settings-dialogs.tsx`, `Ideeza_PCB3D_Dialogs` spec) — each 3D `Setting > X` opens its own lightweight card modal (violet header + Reset-to-Default/Save footer), not the unified overlay. **Data-driven** (`SETTING_DIALOGS` spec → one `SettingDialog` renderer; field kinds sel/txt/tog/pills/note/preview/cache); values persist to `localStorage` (`ideeza:pcb:appSettings`) so Save/Reset are real (Measurement Unit also drives `setUnit`). Built (all 13 spec dialogs): field-based via `SETTING_DIALOGS` → System (General/Common/Common-Library) · Panel/Panel-Lib (General/Theme) · Common Font · Drawing · Property; custom-layout dialogs `HotkeyDialog` (search + menu-grouped keybindings) and `TopToolbarDialog` (two-column Available/Active customizer); the **Export 3D File / 3D Shell** modal (`Export3DModal`, modals.tsx) refreshed to the spec (segmented STL/STEP/OBJ format pills, Include-in-Export multi-pills, Auto-generate toggle, file-size note); and **Online Chat** (`OnlineChat`) — a floating support panel (agent header, message bubbles, input) rendered in the 3D view, opened **only from Help ▸ Online Chat** (`state.chatOpen` → `toggleChat`) and closing back to nothing. No persistent minimized bubble (it used to sit bottom-right and overlap the status bar).
- **3D-view Property tab** (`ThreeDProperties`, pcb-properties.tsx — `Ideeza_PCB3D_PropertyTab` spec) — Appearance: Board Material · Silkscreen Technology · Background Color · Board Color · **Pad Plating Color** (options `Gold`/HASL/ENIG/OSP — was the `Goldsmith` typo); Layer Stacking: **PCB Height from Bottom** · **Board Thickness** (read-only, computed as the layer-stack sum) · **Layer Expose (mm)**; Layer table uses EasyEDA row naming (Top Solder Mask · Top Layer · **Dielectric1** · Bottom Layer · Bottom Solder Mask). **Every field drives the real 3D view live** (`derivePcbScene` reads `state.threeD`): Board Color → slab colour · **Board Material** → slab finish (Aluminum = metallic, FR-4 = matte) · Background Color → canvas · **Pad Plating Color** → pad + via plating colour · **Silkscreen Technology** → per-part white silk outline (matte vs UV-glossy) · **Board Thickness/Layer thicknesses** → live slab thickness (layer-stack sum) · **PCB Height from Bottom** → board Y offset · **Layer Expose** → exposed-copper proudness. No cosmetic-only fields.
- **Right-panel Layer tab** (`LayerTab`, right-panel.tsx — `Ideeza_PCB3D_LayerTab` spec) — an **'All' master row** (one eye + lock toggling every layer at once) tops the placeable-layer groups (Top Side · Bottom Side · Inner[**Inner1/Inner2**] · Other, driven by `state.pcbLayers`). Below them, **display-only sections** (`EXTRA_LAYER_SECTIONS`) list the non-placeable layers per spec — **Component** (Shape/Marking/Pin-Soldering/Pin-Floating) · **3D Shell** (Outline/Top/Bottom) · **Dielectric** (Dielectric1/2) · **Documentation** (MultiLayer/Document Layer/3D Model) — each with its own eye/lock (persisted in `boardSettings` `lyr_<key>_vis`/`_lock`); kept out of `pcbLayers` so the object layer-pickers stay clean. In the **3D view, layer visibility is live** — hiding **Top Layer / Bottom Layer** drops that side's copper (tracks + pads) and **Top Silkscreen** drops the silk outlines from the 3D scene (`derivePcbScene` reads `state.pcbLayers`, in the viewer's memo deps).

### Right panel (Properties / Filter / Layer)
- Schema-driven **Inspector** (`inspector-schema.ts`) — mode-aware panels & typed fields.
- **Position panel:** 2×3 equal-box grid (align H/V groups · X/Y · rotation · transform) + a portalled "more align" dropdown (⌃⌥ shortcuts) + a **Combine** row (boolean ops) shown when 2+ shapes are selected.
- Real align / distribute / rotate / flip / z-order / group logic (centroid-correct, array reorder).

### Boolean / Combine geometry (`shape-boolean.ts`)
Union · Intersect · Difference · XOR on shapes/copper-regions — each shape → polygon, rasterised, combined per-op, traced with marching-squares → a real filled `points` polygon (holes via even-odd fill).

### Right-click context menus (`context-menu.tsx`)
Typed engine: **ACTION / TOGGLE (✓) / SUBMENU (▸) / DIALOG (…)**. Schematic (11) + PCB (7) spec sets, mode-aware, plus contextual per-object extras. Submenus **portal to `<body>` and clamp to the viewport** (never clipped/off-screen); menu anchors at the cursor. Includes Group, Move (**grab-move**), Goto Page, Filter, Cross Probe, Highlight/Unhighlight net, Snap.

### Left panel (`project-navigator.tsx`)
Real data-driven tabs with per-item right-click: **Sheets** (project → Schematic sheets + PCB; go-to/rename/add/delete) · **Nets** (from `o.net`, highlight/select/rename) · **Parts** (components by designator; select+zoom/properties/cross-probe/delete) · **Objects** (grouped by kind). Search filters; empty states teach. **Library** tab: Common Library grid + All Library marketplace.

### Bottom panel
Logs · Parts Audit · DRC · Find Result · Property List (functional tabs).

### PCB module — misc
Net highlight (amber glow), managers (Device / Footprint), DRC + export modals (Gerber / Pick&Place / PDF), Settings overlay.

### Other editor modules
- **Code** (`components/code`): Monaco `dev-editor` + **Blockly** visual editor, AI chat side-panel, code rail/menu, editor switch.
- **3D Module** (`components/3d`): `model-viewer`, **AI generate modal**, sketch mode, three.js canvas, floating tools + left panel + menu bar.
- **Product Preview** (`components/preview`): three.js product assembly — instances, **mate panel**, viewport, toolbar, its own right-click menu.
- **Wiring** (`components/wiring`): wiring canvas + component library + right panel + menu.
- **Add Brief** (`components/brief`): 4-step flow — **idea → video → mint → success** — with review + regenerate confirms.

---

## 6. Coding conventions

- **Workflow — use the superpowers skills for code work.** Start any coding task by invoking **`/using-superpowers`**; follow its process flow — **brainstorming** before building a feature, **writing-plans** for multi-step work, **test-driven-development** while implementing, **systematic-debugging** for any bug, and **verification-before-completion** before claiming done. Don't jump straight to editing.
- **Real logic, never stubs.** No button that only `flashToast`s or sets a dead flag. Implement the actual behaviour (correct math — group rotate/flip pivots on the selection centroid; z-order reorders the objects array), then **verify in a real browser**. Be upfront about anything still incomplete.
- **`tsc --noEmit` must pass.** `data.tsx` is `@ts-nocheck` (pure data builders) — everything else is type-checked.
- **Store discipline:** pick `merge` vs `mergeWithHistory` deliberately (model change → history). Read via `stateRef.current` in event/async actions. New persisted state → add to the doc type + sanitizer + save effect.
- **One model:** route new placed things through `CanvasObject` + `placed-objects.tsx` rather than bespoke rendering.
- **Match the surrounding code** — comment density, naming, idiom. Reference files as `path:line`.
- Prefer editing the existing builders (`data.tsx`, `inspector-schema.ts`) over parallel systems.

## 7. UI/UX guidelines

- **Workflow — use `/ui-ux-pro-max` and `/impeccable` for UI/UX work.** Plan and build any interface, visual, layout or design-system change through these skills (they enforce the register, tokens and craft rules below). Reach for them on new surfaces, redesigns, polish passes, and design critiques.
- **Tokens only** — never hardcode color/spacing/radius/shadow. Use `--color-*`, `--spacing-*`, `--radius-*`, `--font-size-*`, `--elevation-*`, `--border-width-*`. Both **light + dark** themes (`data-theme` + `prefers-color-scheme`).
- **Brand = violet** (`--color-violet-600`, #7c2db9). Accent is for **selection / active / primary only** — not decoration. Restrained palette (product register).
- **Shared classes** (`pcb-editor.css`): `.ix-tool` (icon button), `.ix-row` / `.ix-mi` (list/menu row), `.ix-menu` / `.ix-submenu`, `.ix-tab`, `.ix-pill`, `.ix-btn`, `.ix-seg`. Reuse them; don't reinvent hover/active states.
- **Icons:** `<DsIcon name={...} size strokeWidth />` — resolves a Hugeicon first, falls back to the SVG-string dictionary.
- **Menus & dropdowns must never clip.** The editor is full of scroll/overflow containers → any flyout **portals to `<body>` with `position: fixed`** and **clamps into the viewport** (flip left near the right edge, shift up near the bottom). Anchor context menus at the cursor.
- **Earned familiarity** — behave like Figma / EasyEDA / KiCad / Linear; the tool disappears into the task. No invented affordances for standard actions.
- **Contextual disable, not stubs** — grey a control when its precondition isn't met (Copy needs a selection, Cross Probe needs a PCB link); light it up when it is. **Empty states teach** ("No nets yet — convert to PCB to generate").
- Motion 150–250 ms, ease-out; state feedback only, no decorative choreography.
- The Position/arrange panel is the reference for dense control layout: equal-size boxes on an aligned grid, segmented icon groups with hairline dividers.

## 8. Scope / direction


Building a **real, shippable product** in phases (schematic → PCB → routing/DRC →
manufacturing/export). The Schematic→PCB engine is **native in-app** (KiCad
export exists via `kicad-export.ts`, but conversion/placement/routing are our
own). Communicate concisely; keep changes tightly scoped to what's asked.

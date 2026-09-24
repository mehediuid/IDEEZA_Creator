# 3D model review — design spec

The 3D tab of the build review, rebuilt to the Figma **Creator Panel — V3.0**
section *3D Module* (file `gb4w7Tq7nnqM6V72CWQWjO`, node `47167:21997`, read
2026-09-25). Decisions D1–D4 were answered by the user on 2026-09-25.

## The problem

- The 3D tab shows one `.glb` mesh (`ModelViewer` in `review-outputs.tsx`).
  With no `MESHY_API_KEY` the demo provider returns `/models/sample.glb`, so
  **every build's enclosure is the same rubber duck**, beside copy that says
  it is "sized to the board".
- The Figma design is a **part-level assembly viewer**. It has 142 named
  parts in 7 systems, per-part specs, explode, isolate, per-system
  visibility and a parts inventory. None of it can work on one
  unsegmented mesh: the data is missing, not the UI.
- The image-to-3D pipeline (Meshy, or the demo) can only ever return one
  mesh. No free provider returns a segmented CAD assembly.

## Decisions

- **D1 — The model is an assembly composed from the build's own data**
  (approach A). The parts are the build's BOM, placed with the spec sheet's
  real body dimensions on a real board, inside an enclosure sized by the
  spec. The concept mesh from Meshy replaces the procedural shell when there
  is one. Rejected:
  - B, a UI over the single mesh: one system row, and explode does nothing.
  - C, waiting for a segmented-CAD provider: none exists.
- **D2 — The Figma is followed as drawn**, including caps overlines on every
  rail section and 10 px caps hint lines. This is a deliberate exception to
  CLAUDE.md §7 ("10px is for a micro-label") for this surface. It is
  recorded in §7 when built. "As drawn" covers layout, style and wording. It
  does not cover a sentence that claims something the build lacks: those
  lines change (see *Copy*), because §0 forbids listing what doesn't exist.
- **D3 — The Figma tokens exist in the design system**, so they are synced
  into `tokens.css` from the Figma variables, with both themes. They are not
  mapped to near neighbours and not invented. See *Token sync*.
- **D4 — Built after the product spec sheet lands**
  (`docs/superpowers/plans/2026-09-25-product-spec-sheet.md`). The assembly
  reads that plan's `src/lib/spec/` body table, board and enclosure size. The
  sheet's plan also edits `review-outputs.tsx`, `deliverable-previews.tsx` and
  `history.tsx`; building after it avoids a conflict in the same hunks.

## Figma source

| Frame | Node | Rail |
|---|---|---|
| 3D-01 Assembled (default) | `47167:21998` | overview |
| 3D-02 Loading model | `47167:27321` | skeleton |
| 3D-03 Hover on part | `47167:27382` | overview |
| 3D-04 Part selected | `47167:27419` | part detail |
| 3D-05 Exploded 45% | `47167:27456` | overview |
| 3D-06 Exploded 100% (inventory) | `47167:27489` | overview |
| 3D-07 Part isolated | `47167:27523` | part detail |
| 3D-08 Systems filtered | `47167:27558` | overview, filtered |
| 3D-09 All systems hidden | `47167:27592` | overview, all off |
| 3D-11 Fullscreen viewer | `47167:27625` | floating overview |
| 3D-12 Model failed to load | `47167:27702` | overview |

Out of scope from these frames: the card shell around the panel. It shows
"BUILD READY / Review your deliverables", "All three pieces are ready" and
"Choose an outcome", which is an older review card. The live card (project
heading, Save Project, Open in editor) stays. Only `panel / 3D model` is
built.

## What the assembly holds

A pure module, `src/lib/three/assembly.ts`. It is derived every render from
the product's BOM and spec snapshot, so it cannot go stale.

```ts
type SystemId =
  | "enclosure" | "board" | "compute" | "sensing"
  | "motion" | "power" | "interface" | "passives";

type AssemblyPart = {
  id: string;                 // `${system}:${ref}:${n}` — stable across renders
  name: string;               // "ESP32-C6", "Enclosure base", "Main board"
  ref: string;                // U1 … from the BOM; MECH-01 … for enclosure parts
  system: SystemId;
  instance: { n: number; of: number };        // "1 of 4"
  description: string;        // the BOM part's role, or a sentence we can stand behind
  material?: string;          // only where known: enclosure (spec), board (FR-4 · 1.6 mm)
  massG?: number;             // only where computed: volume × density (enclosure, board)
  body: { l: number; w: number; h: number };  // mm, from the spec body table
  shape: "chip" | "ic" | "can" | "diode" | "connector" | "box"
       | "board" | "shell-base" | "shell-lid" | "mesh";
  at: [number, number, number];               // assembled position, mm
  explodeDir: [number, number, number];       // unit vector
  inventoryAt: [number, number, number];      // its place at 100 %
  source: "spec" | "estimate" | "concept-mesh";
};

type Assembly = {
  title: string;              // the product's name
  parts: AssemblyPart[];
  systems: { id: SystemId; label: string; count: number }[];  // non-empty only, fixed order
  size: { l: number; w: number; h: number };
};
```

The parts come from sources we already have, and nothing is invented:

| System | Label | Parts |
|---|---|---|
| enclosure | Enclosure | base (with four board bosses) and lid, sized to the spec's enclosure and material; the concept mesh replaces both when Meshy made one |
| board | Board | the PCB, at the spec's board size, 1.6 mm FR-4 |
| compute | Compute & radio | Microcontroller + Connectivity parts |
| sensing | Sensing | Sensor parts |
| motion | Motion | Actuator parts |
| power | Power | Power Management parts + the spec's battery |
| interface | Interface | Display & I/O + Connector & mech parts |
| passives | Passives | Passive parts, one instance per unit of quantity |

Other rules:

- **Placement.** Board-sitting parts are row-packed on the board top.
  Case parts (battery, motors) sit in the case the way the spec's winning
  packing puts them (stacked or side by side). Bodies reuse the PCB 3D
  view's `bodyShape` meshes (`pcb-meshes.tsx`), so a chip looks like a chip.
- **The demo sample is not a model.** A `modelGlbUrl` from the demo
  provider (`/models/sample.glb`) is treated as no mesh. This fixes the duck.
- **Honest rows.** Material and Mass appear only where they are known or
  computed; otherwise the row is left out, never guessed. A part matched only
  by its category default says *estimate* in its description.

## The panel

Measured from the frames. The layout is `panel / 3D model`, 1072 × 550 at
14 px padding, holding a viewer (748 × 522) and a rail (282 × 522) with a
14 px gap. Below `lg` the rail stacks under the viewer. At 400 px the
explode card's slider flexes to the width.

Controls on the viewer:

- **Toolbar** (top-left, `47185:62129`). A vertical group of five 40 × 36
  icon buttons on `bg/page`, with a 1 px `icon/on-brand` edge, `radius/lg`
  and Elevation/2:
  - **Home**: back to the 3/4 view, framed.
  - **Fit**: frame what is visible, or the selection.
  - **Zoom in** and **Zoom out**: ±20 % dolly.
  - **Fullscreen**.
- **Explode card** (bottom-centre, `47167:22019`). 422 × 56 on `bg/surface`
  with the `card/border` edge, `radius/xl` and Elevation/2. It holds the
  *Explode* label (Label/MD), an A11 Slider MD (280 px; its value bubble
  shows while dragging), a vertical divider and a 32 px secondary *Reset*
  icon button. Under it sits the hint line (Overline/SM, `text/tertiary`,
  centred).
- **Overlays**, positioned from each part's projected screen bounds:
  - a hover halo and ring;
  - on selection, a halo, a dashed outer ring and a solid ring;
  - an A19 tooltip (`bg/inverse`, Body/XS Medium) above the part, reading
    `<name> · <ref>`;
  - an A17 outline-brand badge *Isolated · 1 of N parts* while isolated.

The **rail** has two faces:

- **Overview** (`47167:30361`).
  - **Model** block: MODEL overline, the product name (Label/XL) and
    `N parts · M systems`.
  - **Systems**: the SYSTEMS overline with `N visible`, which turns into
    `K of N` in `text/brand` when filtered. Each row carries the label,
    its count (at 40 % while off) and an A10 Toggle SM.
  - **What ships**: A17 blue badges drawn from the spec. See *Copy*.
- **Part detail** (`47167:30317`).
  - The system as a brand overline, with a 32 px ghost close button.
  - The part name (Label/XL) and its description (Caption/SM).
  - Spec rows: Part reference · Quantity · Material · Mass · System.
  - **Isolate this part**: A01 primary SM, full width.
  - **Clear selection**: A03 link.
  - While isolated (`47167:27551`) the two become **Exit isolation**, an A01
    secondary that returns to the model with the part still selected, and
    **Show the whole model**, a link that exits and clears the selection.
  - OTHER PARTS IN THIS SYSTEM: each sibling is a button that selects it.

The states, with the hint line each one shows:

| State | Hint (Figma, verbatim unless noted) | Behaviour |
|---|---|---|
| Assembled | Click a part to inspect it | left-drag orbits, right-drag pans |
| Hover | Click a part to inspect it | ring and tooltip on the part under the pointer; suppressed while dragging |
| Selected | 1 part selected · Esc to clear | rail → part detail |
| Exploded 1–99 % | Drag to pan · Click a part to inspect | left-drag pans (the hint says so) |
| Inventory (100 %) | PARTS INVENTORY · N · Every part separated · hover to identify | every part flat on the ground plane, grouped by system |
| Isolated | Isolated view · Esc to return to the model | only that part; explode card hidden; badge |
| Filtered | K systems hidden · N parts visible | counts are live |
| All hidden | 0 of N parts visible | M48 *Nothing to show* · *Show all systems* |
| Fullscreen | Fullscreen · press Esc to exit | view presets 3/4 · Front · Side · Top (A15), exit ×, rail floats (258 wide) |
| Loading | This usually takes a few seconds | the state card over a skeleton rail; see *Copy* |
| Failed | — | M49 error card with *Try again* |

How the explode slider moves parts:

- **0–80 %:** each part moves along its `explodeDir`. The lid goes up and
  the base goes down; the offset scales with the assembly's size.
- **80–100 %:** parts blend from there to `inventoryAt`. The inventory is
  reached at exactly 100 %.
- **Reset** returns explode to 0 and the camera to Home.

Fullscreen uses the browser Fullscreen API on the panel. When the API is
refused (an iframe, or a policy), a fixed overlay takes the viewport
instead. Either way Esc exits.

Keyboard and screen readers:

- **Esc** acts in this order: isolated → selected → fullscreen.
- **Canvas.** The canvas is focusable (`role="application"`, named "3D model
  of `<product>`"). ←/→ step the hover through the visible parts, Enter
  selects, and the tooltip text is mirrored in a polite live region.
- **Rail.** Every rail control is a real control: toggles are
  `role="switch"`, siblings are buttons, and the slider is the native range.
- **Reduced motion.** Under `prefers-reduced-motion` the explode and camera
  changes land without tweening.

## Copy that changes (honesty)

| Figma | Built | Why |
|---|---|---|
| X4 Quadcopter · 142 parts · 7 systems | the product's name · real counts | sample data |
| Unpacking 142 parts from the STEP assembly | Assembling N parts from the build | there is no STEP file |
| The STEP assembly failed to load. Your PCB, firmware and wiring files are unaffected. | The 3D viewer couldn't start. Your PCB, firmware and wiring files are unaffected. | no STEP; the failure is the viewer's |
| STL + STEP files · PETG · 0.2 mm layer · PCB-sized mount points | `<L × W × H> mm` · `<material> · <wall> mm wall` · Mount points for the `<board>` board | this surface offers no file; the layer height isn't in the spec; the bosses are real |
| Brushless outrunner … (part description) | the BOM part's role | real data |

## Components

Reused from `components/ideeza`:

- `Slider`, which gains the optional value bubble.
- `Toggle`. Its sizes align to A10: SM 36 × 20, MD 44 × 24. There are 10
  call sites in the PCB settings and the 3D module; they are checked by
  screenshot.
- `IconButton`, `Button`, `Link`, `ButtonGroup` (A15), `Banner`.

New atoms, each built from its own Figma component:

- **A19 Tooltip**: `bg/inverse` bubble, arrow, Body/XS Medium.
- **A17 Badge**: the blue-filled and brand-outline variants this panel uses.
- **A20 Spinner**: brand ring, 32 px.
- **A22 Progress bar**: 8 px track, fill scaled with `scaleX` (§7).
- **A24 Divider**: horizontal and vertical.
- **M48 Empty state** and **M49 Error state**: one `StateCard` with a tone.

## Token sync (D3)

These are read from the Figma variables. Light-mode values are confirmed.
Dark-mode values are read from the variable collection's dark mode in the
first task, before anything uses them.

| Variable | Light | In `tokens.css` today |
|---|---|---|
| `color/card/border` | `#e2e8f0` | missing |
| `color/badge/blue-bg` | `#eff6ff` | missing |
| `color/badge/blue-text` | `#1d4ed8` | missing (`text-blue` is blue-600) |
| `color/focus/halo` | read from the A11 Slider's Focus variant (not in these frames) | missing |
| `letter/spacing/slight` | −0.25 px | missing |
| `letter/spacing/caps` | 1.5 px | **0.5 px** — used by 18 existing labels |
| `Elevation/1 — Card` | 0 1 3 #0F172A0F, 0 1 2 #0F172A0A | **different** (one shadow) — every card |
| `Elevation/2 — Dropdown` | 0 4 16 #0F172A1A, 0 2 6 #0F172A0F | **different** — every dropdown |
| A19 tooltip shadow | 0 4 6 rgba(0,0,0,.15) | no token — confirm which effect style it is |

The last three rows change values the whole app already uses. They are a
task of their own, with before/after screenshots of the main surfaces.

## Data flow and files

1. `bomFor(product)` and the product's spec snapshot go into
   `deriveAssembly()`, together with `job.modelGlbUrl` when Meshy made it.
   The result is an `Assembly`.
2. The `ModelPanel` owns the view state: explode, hidden systems, hover,
   selection, isolation, fullscreen and preset. This state lives for the
   session only.
3. `AssemblyViewer` renders the parts. It reports the hovered and selected
   parts' projected bounds up to the panel for the overlays.

| Path | Status | Role |
|---|---|---|
| `src/lib/three/assembly.ts` | new | the pure model: systems, placement, explode, inventory |
| `src/components/create/model-panel/model-panel.tsx` | new | panel, state, keyboard, fullscreen |
| `src/components/create/model-panel/model-rail.tsx` | new | overview and part detail |
| `src/components/create/model-panel/viewer-controls.tsx` | new | toolbar, explode card, presets, hint |
| `src/components/create/model-panel/assembly-viewer-impl.tsx` | new | r3f scene, dynamic-imported with `ssr:false` |
| `src/components/create/model-panel/model-states.tsx` | new | loading, empty and error |
| `src/components/ideeza/` (tooltip, badge, spinner, progress-bar, divider, state-card) | new | the atoms |
| `src/components/ideeza/slider.tsx`, `toggle.tsx` | changed | value bubble; A10 sizes |
| `src/styles/tokens.css`, `tailwind-preset.ts` | changed | the token sync |
| `src/components/create/review-outputs.tsx` | changed | the 3D tab renders `ModelPanel`, which brings its own rail in place of the aside |
| `src/components/create/use-build-model.ts` | changed | ignore the demo sample; expose the mesh's progress |
| `CLAUDE.md` §5 and §7, `STRUCTURE.md` | changed | inventory and the D2 exception |

Companions get their own assembly from their own BOM and spec. The concept
mesh stays the primary's; a companion's shell is always the sized one.

## Error handling

- **Concept mesh fails or times out.** The assembly still shows, with the
  sized shell. The shell's part detail says *The concept shape couldn't be
  made — showing the shell sized from the spec*, with the existing retry.
- **WebGL context or viewer throws.** An error boundary shows M49 with *Try
  again* (a remount).
- **A BOM with no spec snapshot** (a build booked before the spec sheet).
  The assembly uses the spec module's category defaults, and those parts
  say *estimate*.

## Out of scope

- A segmented CAD assembly.
- STEP files.
- STL or GLB download from this panel.
- Editing parts from the viewer.
- The older card shell drawn around the panel.
- A mesh for companions.

## Verification

- **Model tests** (`node:test` on `assembly.ts`, the scratchpad harness the
  spec sheet uses):
  - the system mapping and counts;
  - honest rows (no Material or Mass where unknown);
  - stable ids;
  - explode monotonic with inventory reached at 100;
  - the demo sample ignored.
- **Browser** (headless Chrome with SwiftShader). Every row of the states
  table, driven with real pointer and key events: hover shows the ring and
  tooltip; click opens part detail; isolate; Esc chain; toggle counts; all
  off → empty state; slider 45 and 100; fullscreen + presets + Esc; loading
  progress; forced viewer failure. A dev-only `window.__ideezaAssembly`
  exposes part screen positions for the harness, the way
  `__ideezaFailBuild` does.
- **Fidelity** (docs/agent-rules/50 rule 13). CDP screenshot beside the
  Figma screenshot for each frame at 1440, in both themes, with measured
  diffs. Also 1700 and 400 px.
- `tsc`, and lint on touched files.

## Plan outline

The detailed task-by-task plan is written with writing-plans once this spec
is approved and the spec sheet has landed. The shape:

1. **Token sync.** Read the dark values; add the missing tokens; the
   value-changing three get before/after screenshots.
2. **Atoms.** Tooltip, Badge, Spinner, Progress bar, Divider, StateCard;
   the Slider bubble; Toggle A10 sizes.
3. **`assembly.ts` + tests.** Systems, placement, explode, inventory, honest
   rows.
4. **`AssemblyViewer`.** Parts, pointer hover and pick, explode
   interpolation, isolate, visibility, camera rig, projected bounds.
5. **`ModelPanel`.** Toolbar, explode card, hints, rail (both faces),
   overlays, states, fullscreen, keyboard.
6. **Integration.** The 3D tab in `review-outputs`, per product;
   `use-build-model` changes.
7. **Verification and docs.** The browser matrix, the fidelity pairs,
   CLAUDE.md §5 and §7.

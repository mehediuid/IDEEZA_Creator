# PCB Sidebar Properties Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every PCB right-sidebar property field editable/clickable, make every object type placeable on canvas with the correct inspector + glyph, and make the left library place parts on the canvas — for both schematic and 2D.

**Architecture:** The inspector is schema-driven (`inspector-schema.ts`) and renders a field as an interactive control only when the field has a `bind` token, resolved in `right-panel.tsx`'s `FieldRow`. We add two generic bind mechanisms — a per-object `props` bag (`prop:<key>`) and a board-wide settings bag (`set:<key>`) — so any field becomes editable by adding a bind, without inventing dozens of typed store fields. Placement reuses the existing `setTool → canvas click → placeObject` flow; the library arms the same tools. Kind→inspector mapping and canvas glyphs are completed so every placed object resolves correctly.

**Tech Stack:** Next.js (App Router), React, TypeScript, Zustand-style context store (`store.tsx`), inline-styled components with CSS design tokens. No test runner is configured — verification is `npx tsc --noEmit` + `npm run lint` + behavioral check in the browser preview (`/pcb`).

## Global Constraints

- **PCB section only.** Touch only `src/lib/pcb/*` and `src/components/pcb/*`. No other module. (memory: user is strict on scope.)
- **No new dependencies.** No test framework, no new npm packages.
- **Source of truth:** `Sidebar Properties.xlsx` (SCHEMATIC + 2D sheets) and `Ideeza_EasyEDA_PCB2D_Sidebar_Properties_1.pdf`, both in `/Users/ideeza/Downloads/`. Reference behaviour = EasyEDA (pro.easyeda.com).
- **Follow existing patterns:** inline styles with `--color-*` / `--spacing-*` tokens; store mutations go through `merge` / `mergeWithHistory`; user-visible edits are undoable (use `mergeWithHistory`).
- **Verification per task:** `npx tsc --noEmit` shows no new errors; then drive `/pcb` in the browser preview and observe the described behaviour; then commit.
- Commit messages use the repo convention `feat(pcb): …` / `fix(pcb): …` and end with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.
- Work on a branch (not `main`).

---

## File map

- `src/lib/pcb/types.ts` — add `props?` to `CanvasObject`; add a `pin` entry to `PLACE_TOOLS`.
- `src/lib/pcb/store.tsx` — add `setObjectProp`, `boardSettings` state + `setBoardSetting`; `PcbActions` + `PcbState` types; `placeFromLibrary`.
- `src/components/pcb/right-panel.tsx` — extend `FieldRow` bind resolver with `prop:` and `set:`; make `CoordReadout` real.
- `src/lib/pcb/inspector-schema.ts` — add `bind` to currently-unbound fields; complete `KIND_TO_TYPE`.
- `src/components/pcb/placed-objects.tsx` — add missing `GLYPHS`.
- `src/components/pcb/canvas-area.tsx` — honour the selection filter in hit-testing.
- `src/components/pcb/toolbar.tsx` — add a schematic `Pin` place tool.
- `src/components/pcb/library-panel.tsx` — wire part rows to place on canvas.
- `src/lib/pcb/data.tsx` — (Pin tool) only if the toolbar item list lives here; otherwise none.
- Delete: `src/components/pcb/placed-properties.tsx` (dead code, imported nowhere).

---

## Task 1: Generic per-object `props` bag + `prop:` bind

**Files:**
- Modify: `src/lib/pcb/types.ts:114-139` (`CanvasObject`)
- Modify: `src/lib/pcb/store.tsx:46-140` (`PcbActions`), `:1000-1003` (near `setObjectField`)
- Modify: `src/components/pcb/right-panel.tsx:252-264` (`FieldRow` bind resolver)

**Interfaces:**
- Produces: `CanvasObject.props?: Record<string, unknown>`; store action `setObjectProp(id: string, key: string, value: unknown): void`; bind token `prop:<key>` readable/writable in `FieldRow`.

- [ ] **Step 1: Add the `props` field to `CanvasObject`**

In `src/lib/pcb/types.ts`, inside the `CanvasObject` interface (after `locked?: boolean;` at line 138):

```ts
  locked?: boolean;                   // movement lock
  // ── Generic property bag ─────────────────────────────────────────────
  // Holds every inspector field that has no dedicated typed column above
  // (Manufacturer, Pin Type, mask/thermal, font, etc.). Bound in the
  // inspector via `prop:<key>` and edited through actions.setObjectProp.
  props?: Record<string, unknown>;
```

- [ ] **Step 2: Declare `setObjectProp` in the `PcbActions` interface**

In `src/lib/pcb/store.tsx`, in the `PcbActions` interface right after the `setObjectField` line (around `:127`):

```ts
  setObjectField: (id: string, patch: Partial<CanvasObject>) => void;
  setObjectProp: (id: string, key: string, value: unknown) => void;
```

- [ ] **Step 3: Implement `setObjectProp` in the actions object**

In `src/lib/pcb/store.tsx`, immediately after the `setObjectField` implementation (after line `:1003`):

```ts
      setObjectProp: (id, key, value) =>
        mergeWithHistory((s) => ({
          objects: s.objects.map((o) =>
            o.id === id ? { ...o, props: { ...(o.props ?? {}), [key]: value } } : o,
          ),
        })),
```

- [ ] **Step 4: Resolve the `prop:` bind in `FieldRow`**

In `src/components/pcb/right-panel.tsx`, in the `if (b) { … }` block, add a branch after the `obj:` branch (after line `:257`):

```ts
    } else if (b.startsWith("prop:") && obj) {
      const key = b.slice(5);
      const props = (obj.props ?? {}) as Record<string, BindVal>;
      bound = { value: props[key], set: (v) => actions.setObjectProp(obj.id, key, v) };
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Behavioral check in preview**

Start the dev server (preview_start), open `/pcb`, switch to 2D, place a Pad (Place ▸ Pad then click canvas), select it. In the inspector the existing bound fields still edit. (No visible new behaviour yet — fields get bound in Task 2/3. This task only proves nothing broke.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/pcb/types.ts src/lib/pcb/store.tsx src/components/pcb/right-panel.tsx
git commit -m "feat(pcb): generic per-object props bag + prop: inspector bind"
```

---

## Task 2: Bind every unbound SCHEMATIC inspector field

**Files:**
- Modify: `src/lib/pcb/inspector-schema.ts:62-235` (the `SCHEMATIC` table)

**Interfaces:**
- Consumes: `prop:<key>` bind from Task 1.
- Produces: every per-object schematic field editable.

Add `bind: "prop:<key>"` to each field below (use the field's existing `key` as `<key>`). Leave fields that already have a `bind` (`doc:*`, `obj:*`, `wire:*`) unchanged. Leave `kind: "readonly"` ID/auto fields and `kind: "action"` fields as-is.

- **Component**: `id`→leave readonly; `uniqueId`,`devices`→leave readonly (auto); `manufacturer`,`manufacturerPart`,`supplier`,`supplierPart`→`prop:`; `addBom`→`prop:addBom`.
- **Pin** (currently zero binds): `pinName`→`prop:pinName`, `pinNumber`→`prop:pinNumber`, `pinType`→`prop:pinType`, `pinShape`→`prop:pinShape`, `noConnectFlag`→`prop:noConnectFlag`.
- **Nets**: `type`→`prop:type`; `relevance`,`device`→leave readonly.
- **Drawing Tools**: `lineStyle`→`prop:lineStyle`, `fillColor`→`prop:fillColor`, `fillColor2`→`prop:fillColor2`, `roundRadius`→`prop:roundRadius`, `rectWidth`→`prop:rectWidth`, `rectHeight`→`prop:rectHeight`, `circleRadius`→`prop:circleRadius`.
- **Text**: `font`→`prop:font`, `fontSize`→`prop:fontSize`, `style`→`prop:style`, `origin`→`prop:origin`.
- **Wire**: `globalNetName`→`prop:globalNetName`; `relevance`→leave readonly.

- [ ] **Step 1: Edit the SCHEMATIC table**

Example (Pin section — apply the same shape to every field listed above):

```ts
  Pin: {
    label: "Pin", icon: "pNetLabel",
    sections: [
      { title: "Basic Properties", fields: [
        { key: "pinName", label: "Pin Name", kind: "text", bind: "prop:pinName", display: "—" },
        { key: "pinNumber", label: "Pin Number", kind: "text", bind: "prop:pinNumber", display: "1" },
        { key: "id", label: "ID", kind: "readonly", display: "—" },
        { key: "pinType", label: "Pin Type", kind: "dropdown", options: PIN_TYPES, bind: "prop:pinType", display: "Undefined" },
        { key: "pinShape", label: "Pin Shape", kind: "dropdown", options: PIN_SHAPES, bind: "prop:pinShape", display: "Line" },
        { key: "noConnectFlag", label: "No Connect Flag", kind: "toggle", bind: "prop:noConnectFlag", display: "Off" },
      ] },
      { title: "More Properties", fields: [{ key: "addProperty", label: "Add Property", kind: "action", display: "+ Add" }] },
    ],
  },
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`, expected no new errors.

- [ ] **Step 3: Behavioral check** — In preview `/pcb`, switch to Schematic, place a Resistor, click its pin-ish body / place a component, select it, edit **Manufacturer** and **Value** in the inspector; the typed value stays after clicking away and re-selecting (persisted in `props`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/pcb/inspector-schema.ts
git commit -m "feat(pcb): make all schematic inspector fields editable via prop bind"
```

---

## Task 3: Bind every unbound 2D inspector field

**Files:**
- Modify: `src/lib/pcb/inspector-schema.ts:238-533` (the `TWOD` table)

**Interfaces:**
- Consumes: `prop:<key>` bind from Task 1.

Add `prop:<key>` binds to each unbound per-object field (leave existing `obj:*`/`doc:*` binds, `readonly` ID/length/auto fields, and `action` fields):

- **Component**: `addBom`→`prop:addBom`, `silkColor`→`prop:silkColor`, `model3d`→`prop:model3d`, `manufacturer`/`manufacturerPart`/`supplier`/`supplierPart`/`value`→`prop:*`.
- **Pad**: `number`→`prop:number`, `general`→`prop:sizeGeneral`, `cornerRadiusRatio`→`prop:cornerRadiusRatio`, `expMode`→`prop:expMode`, `expCustom`→`prop:expCustom`, `solderMaskExp`→`prop:solderMaskExp`, `pasteMaskExp`→`prop:pasteMaskExp`, `thermalGeneral`→`prop:thermalGeneral`, `thermalCustom`→`prop:thermalCustom`, `padConnection`→`prop:padConnection`, `pinLength`→`prop:pinLength`.
- **Vias**: `throughVia`→`prop:throughVia`, `blindBuried`→`prop:blindBuried`, `expMode`/`expCustom`/`solderMaskExp`/`pasteMaskExp`→`prop:*`.
- **Outline Object**: `type`→`prop:type`, `cornerRadius`→`prop:cornerRadius`.
- **Copper Fills**: `layer` already `obj:layer`; keep `parent` readonly; keep the four `action` buttons (`rebuild`, `sutureVias`, `convertFill`, `solderMaskRegion`) as actions.
- **Text**: `mirror`→`prop:mirror`, `fontFamily`→`prop:fontFamily`, `strokeWidth`→`prop:strokeWidth`, `inverted`→`prop:inverted`, `invertedExpansion`→`prop:invertedExpansion`, `origin`→`prop:origin`, `silkColor`→`prop:silkColor`.

- [ ] **Step 1: Edit the TWOD table** — apply the `bind: "prop:<key>"` additions above.

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`, no new errors.

- [ ] **Step 3: Behavioral check** — In preview 2D mode: place a Pad, select it, switch Solder/Paste Mask "General" dropdown to Custom and type a Solder Mask Expansion value; place a Via, edit its mask fields; the values persist across reselect.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pcb/inspector-schema.ts
git commit -m "feat(pcb): make all 2D inspector fields editable via prop bind"
```

---

## Task 4: Board-wide settings bag + editable Canvas/Document/Common fields

**Files:**
- Modify: `src/lib/pcb/store.tsx` — add `boardSettings: Record<string, unknown>` to `PcbState`, its initial value, and a `setBoardSetting(key, value)` action.
- Modify: `src/components/pcb/right-panel.tsx:252-264` — resolve a `set:<key>` bind.
- Modify: `src/lib/pcb/inspector-schema.ts` — bind the 2D Canvas `Document`, `Common Setting`, and `Selection Filter` fields (those not already `doc:*`) to `set:<key>`.

**Interfaces:**
- Produces: `PcbState.boardSettings`; `setBoardSetting(key: string, value: unknown): void`; bind token `set:<key>`.

- [ ] **Step 1: Add `boardSettings` state + initial value**

In `src/lib/pcb/store.tsx`, add to the `PcbState` interface (near the other UI-state fields):

```ts
  boardSettings: Record<string, unknown>;
```

and in the initial-state object (where the store's default state is constructed) add:

```ts
  boardSettings: {},
```

- [ ] **Step 2: Add the `setBoardSetting` action (interface + impl)**

In `PcbActions`:

```ts
  setBoardSetting: (key: string, value: unknown) => void;
```

In the actions object (next to `setObjectProp`):

```ts
      setBoardSetting: (key, value) =>
        merge((s) => ({ boardSettings: { ...s.boardSettings, [key]: value } })),
```

(Board settings are UI/config, not object edits — use `merge`, not history.)

- [ ] **Step 3: Resolve `set:` bind in `FieldRow`**

In `right-panel.tsx`, add after the `prop:` branch:

```ts
    } else if (b.startsWith("set:")) {
      const key = b.slice(4);
      const bag = (state.boardSettings ?? {}) as Record<string, BindVal>;
      bound = { value: bag[key], set: (v) => actions.setBoardSetting(key, v) };
```

- [ ] **Step 4: Bind the 2D Canvas fields**

In `inspector-schema.ts` `TWOD.Canvas`, add `bind: "set:<key>"` (key = existing field `key`) to every field that has no `doc:*` bind: all 11 Selection Filter toggles (`allOn`, `fComponents`, …), Document `gridType`/`boldGridType`/`boldGridRatio`/`snapSize`/`altSnapSize`/`highlight`, and all Common Setting fields (`startTrackWidth` … `minTrackCorners`). Keep `unit`/`gridSize`/`snap` on their existing `doc:*` binds.

- [ ] **Step 5: Typecheck** — `npx tsc --noEmit`, no new errors.

- [ ] **Step 6: Behavioral check** — In preview, select empty 2D canvas so the schema Canvas panel is reachable for an unmapped selection, or select an object that resolves to Canvas; toggle a Selection Filter checkbox and change a Common Setting number — values persist across reselect. (Actual selection filtering is Task 5.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/pcb/store.tsx src/components/pcb/right-panel.tsx src/lib/pcb/inspector-schema.ts
git commit -m "feat(pcb): board-settings bag + editable Canvas/Document/Common fields"
```

---

## Task 5: Make the Selection Filter actually filter canvas selection

**Files:**
- Modify: `src/components/pcb/canvas-area.tsx` — selection hit-testing (the click→`selectPlaced` path around `:327-350` and the rubber-band selection).
- Read: `src/lib/pcb/inspector-schema.ts` Selection Filter keys (`fComponents`, `fWires`, `fTexts`, …) and their mapping to object `kind`.

**Interfaces:**
- Consumes: `state.boardSettings` filter flags from Task 4 (`fComponents`, `fWires`, `fTexts`, `fDrawingObjects`, etc.; `allOn` master).

- [ ] **Step 1: Add a filter helper**

At the top of `canvas-area.tsx` (module scope), add a map from object `kind` → filter key and a predicate:

```ts
const FILTER_KEY_FOR_KIND: Record<string, string> = {
  component: "fComponents", resistor: "fComponents", capacitor: "fComponents",
  inductor: "fComponents", diode: "fComponents", ic: "fComponents",
  wire: "fWires", bus: "fBuses",
  netLabel: "fNetLabels", net: "fNetLabels", netFlag: "fNetLabels",
  port: "fPorts", text: "fTexts",
  polyline: "fDrawingObjects", arc: "fDrawingObjects", circle: "fDrawingObjects",
  rectangle: "fDrawingObjects", bezier: "fDrawingObjects", ellipse: "fDrawingObjects",
};

function isSelectable(kind: string, bag: Record<string, unknown>): boolean {
  if (bag.allOn === false) { /* master off → nothing selectable */ return false; }
  const key = FILTER_KEY_FOR_KIND[kind];
  if (!key) return true;               // unmapped kinds always selectable
  return bag[key] !== false;           // default true unless explicitly off
}
```

- [ ] **Step 2: Gate object selection**

Where an object click currently calls `actions.selectPlaced(obj.id, …)`, guard it:

```ts
if (isSelectable(obj.kind, state.boardSettings ?? {})) {
  actions.selectPlaced(obj.id, additive);
}
```

Apply the same guard when building the rubber-band selection set (filter the collected ids through `isSelectable`).

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit`, no new errors.

- [ ] **Step 4: Behavioral check** — In preview 2D: place a component + a text; in the Canvas Selection Filter turn **Texts** off; clicking the text no longer selects it, clicking the component still does; turn **All On** off → nothing selects.

- [ ] **Step 5: Commit**

```bash
git add src/components/pcb/canvas-area.tsx
git commit -m "feat(pcb): selection filter gates canvas selection"
```

---

## Task 6: Complete `KIND_TO_TYPE` mapping

**Files:**
- Modify: `src/lib/pcb/inspector-schema.ts:542-560` (`KIND_TO_TYPE`)

**Interfaces:**
- Consumes: existing schema type keys (`Component`, `Nets`, `Pad`, `Via`, `Text`, `Outline Object`, `Copper Fills`, `DrawingLike`).

- [ ] **Step 1: Add the missing kind mappings**

Append to `KIND_TO_TYPE`:

```ts
  // power / flags → Nets in schematic, treated as net markers
  gnd: "Nets", vcc5v: "Nets", agnd: "Nets", pgnd: "Nets",
  noConnect: "Nets", shortFlag: "Nets", port: "Nets", junction: "Nets",
  // pcb regions → Copper Fills (region-style inspector)
  prohibitedRegion: "Copper Fills", constraintRegion: "Copper Fills",
  // mechanical / misc
  mountingHole: "Via", image: "DrawingLike",
```

(These map each previously-unmapped kind to the closest existing inspector type so selecting it no longer falls back to Canvas. `resolveInspectorType` already turns `DrawingLike` into "Drawing Tools" (schematic) / "Outline Object" (2D) and `Via`→"Vias".)

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`, no new errors.

- [ ] **Step 3: Behavioral check** — In preview schematic: place GND / +5V / a Junction, select each → the inspector shows the Nets panel (not the generic Canvas panel). In 2D: place a Prohibited Region → inspector shows Copper Fills fields.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pcb/inspector-schema.ts
git commit -m "fix(pcb): map all placed kinds to a real inspector type"
```

---

## Task 7: Add canvas glyphs for kinds drawn as a generic dot

**Files:**
- Modify: `src/components/pcb/placed-objects.tsx:15-138` (`GLYPHS`)

**Interfaces:**
- Produces: `GLYPHS` entries for `net`, `gnd`, `junction`, `image`, `circle`, `rectangle`, `ellipse`, `arc`, `bezier`, `mountingHole`, `prohibitedRegion`, `constraintRegion`.

- [ ] **Step 1: Add glyphs**

Append these entries to the `GLYPHS` object (each is centered on 0,0, `stroke="currentColor"`):

```tsx
  gnd: (
    <g stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" fill="none">
      <path d="M0 -8v8" /><path d="M-10 0h20M-6 4h12M-2 8h4" />
    </g>
  ),
  net: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none">
      <path d="M-14 0h28" /><circle cx={0} cy={0} r={3} fill="currentColor" />
    </g>
  ),
  junction: (
    <g stroke="none" fill="currentColor"><circle cx={0} cy={0} r={4} /></g>
  ),
  circle: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><circle cx={0} cy={0} r={12} /></g>
  ),
  rectangle: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><rect x={-14} y={-10} width={28} height={20} /></g>
  ),
  ellipse: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><ellipse cx={0} cy={0} rx={14} ry={9} /></g>
  ),
  arc: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><path d="M-12 8a12 12 0 0 1 24 0" /></g>
  ),
  bezier: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><path d="M-14 8C-6 -12 6 -12 14 8" /></g>
  ),
  image: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none">
      <rect x={-13} y={-10} width={26} height={20} rx={2} /><circle cx={-5} cy={-3} r={2.5} /><path d="M-13 8l8-7 6 5 4-3 8 5" />
    </g>
  ),
  mountingHole: (
    <g stroke="currentColor" strokeWidth={1.7} fill="none"><circle cx={0} cy={0} r={11} /><circle cx={0} cy={0} r={5} /></g>
  ),
  prohibitedRegion: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeDasharray="4 3">
      <rect x={-14} y={-12} width={28} height={24} rx={2} /><path d="M-14 12L14 -12" />
    </g>
  ),
  constraintRegion: (
    <g stroke="currentColor" strokeWidth={1.6} fill="none" strokeDasharray="4 3">
      <rect x={-14} y={-12} width={28} height={24} rx={2} />
    </g>
  ),
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`, no new errors.

- [ ] **Step 3: Behavioral check** — In preview, place a Circle, Rectangle, Junction, Mounting Hole → each shows its own glyph, not a plain dot.

- [ ] **Step 4: Commit**

```bash
git add src/components/pcb/placed-objects.tsx
git commit -m "feat(pcb): add canvas glyphs for the 12 previously-dotted kinds"
```

---

## Task 8: Make the schematic Pin placeable

**Files:**
- Modify: `src/lib/pcb/types.ts:193-231` (`PLACE_TOOLS` — add `"pin"`)
- Modify: `src/components/pcb/placed-objects.tsx` (`GLYPHS` — add a `pin` glyph)
- Modify: `src/components/pcb/toolbar.tsx` (add a Pin tool button to the schematic `ITEMS` group)

**Interfaces:**
- Consumes: `PLACE_TOOLS` (drives `canvas-area` placement); `KIND_TO_TYPE.pin` already = "Pin".

- [ ] **Step 1: Add `pin` to `PLACE_TOOLS`**

In `types.ts`, add `"pin",` to the `PLACE_TOOLS` array (near the other schematic primitives).

- [ ] **Step 2: Add a `pin` glyph** in `placed-objects.tsx` `GLYPHS`:

```tsx
  pin: (
    <g stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" fill="none">
      <path d="M-16 0h20" /><circle cx={6} cy={0} r={3} fill="currentColor" />
    </g>
  ),
```

- [ ] **Step 3: Add the toolbar Pin button**

In `toolbar.tsx`, in the schematic components group of `ITEMS`, add an icon entry (match the surrounding shape):

```ts
    { kind: "icon", label: "Pin", key: "pNetLabel", tool: "pin", modes: ["schematic"] },
```

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit`, no new errors.

- [ ] **Step 5: Behavioral check** — In preview schematic: click the new Pin tool, click the canvas → a pin drops and is auto-selected; the inspector shows the Pin panel with editable Pin Name/Type/Shape (from Task 2).

- [ ] **Step 6: Commit**

```bash
git add src/lib/pcb/types.ts src/components/pcb/placed-objects.tsx src/components/pcb/toolbar.tsx
git commit -m "feat(pcb): schematic Pin is now placeable"
```

---

## Task 9: Library click-to-place

**Files:**
- Modify: `src/lib/pcb/store.tsx` — add `placeFromLibrary(kind: string)` action.
- Modify: `src/components/pcb/library-panel.tsx:28-84` (`COMMON_GROUPS`), `:246-254` (part row) — map a part to a kind and place on click.

**Interfaces:**
- Consumes: `placeObject` internals; `state.mode`.
- Produces: `placeFromLibrary(kind: string): void` — places at a cascading canvas offset and auto-selects.

**Design decision (open item C5 resolved):** click places immediately at a cascading offset in canvas space (visible + testable), reusing `placeObject`. Drag-drop is a later enhancement.

- [ ] **Step 1: Add `placeFromLibrary` action**

In `store.tsx` `PcbActions`:

```ts
  placeFromLibrary: (kind: string) => void;
```

Implementation (uses a module-level cascade counter next to `objIdCounter`):

```ts
      placeFromLibrary: (kind) => {
        const n = libPlaceCounter.current++;
        const x = 120 + (n % 8) * 28;
        const y = 120 + (n % 8) * 28;
        actionsRef.current.placeObject(kind, x, y); // reuse placement + auto-select
      },
```

If `actionsRef` does not already exist, instead inline the same body as `placeObject` with the computed `x`/`y`. Add near `objIdCounter`:

```ts
  const libPlaceCounter = React.useRef(0);
```

- [ ] **Step 2: Map library groups to kinds + wire the part row**

In `library-panel.tsx`, add a group-name→kind map at module scope:

```ts
const GROUP_KIND: Record<string, string> = {
  Resistors: "resistor", Capacitors: "capacitor", Connectors: "component", ICs: "component",
  "Footprints 0402": "component", "Footprints 0603": "component",
  Vias: "via", Pads: "pad",
  "Panel Frames": "boardOutline", Fiducials: "pad", "Tooling Holes": "mountingHole",
};
```

On the part row (`:247`), add `onClick`:

```tsx
                    <div
                      key={p.label}
                      className="ix-row"
                      onClick={() => actions.placeFromLibrary(GROUP_KIND[g.name] ?? "component")}
                      style={{ /* unchanged */ }}
                    >
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit`, no new errors.

- [ ] **Step 4: Behavioral check** — In preview schematic: open the left Library (Common), click "R_US 0603" → a resistor appears on the canvas, auto-selected, inspector shows the Component panel. Click a Capacitor entry → a capacitor appears offset from the first. Repeat in 2D with Vias/Pads.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pcb/store.tsx src/components/pcb/library-panel.tsx
git commit -m "feat(pcb): clicking a library part places it on the canvas"
```

---

## Task 10: Cleanup — remove dead code, real coordinate readout

**Files:**
- Delete: `src/components/pcb/placed-properties.tsx` (imported nowhere — confirm with grep).
- Modify: `src/components/pcb/right-panel.tsx:724` (`CoordReadout`).

- [ ] **Step 1: Confirm and delete dead file**

Run: `grep -rn "placed-properties" src/ ; grep -rn "PlacedProperties" src/`
Expected: only the definition file itself matches. Then:

```bash
git rm src/components/pcb/placed-properties.tsx
```

- [ ] **Step 2: Make `CoordReadout` show real values**

In `right-panel.tsx`, change `CoordReadout` to read the selected object's coordinates (X/Y) from the store instead of dummy constants:

```tsx
function CoordReadout() {
  const state = usePcbState();
  const sel = state.selectedIds[0] ? state.objects.find((o) => o.id === state.selectedIds[0]) : null;
  const x = sel?.x ?? 0;
  const y = sel?.y ?? 0;
  // …render S/G unchanged, but show X={x} Y={y} from `sel`…
}
```

(Keep the existing S/G grid/snap portions; only replace the hardcoded X/Y with the selected object's live coordinates.)

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit`, no new errors.

- [ ] **Step 4: Behavioral check** — In preview, select a placed object → the footer X/Y reflects its position and updates when you drag it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(pcb): remove dead placed-properties, wire real coord readout"
```

---

## Self-review notes (spec coverage)

- **C1 (every field editable):** Tasks 1–3 (per-object `prop:` binds), Task 4 (Canvas/Document/Common via `set:`).
- **C2 (canvas/board settings wired):** Task 4 (editable) + Task 5 (Selection Filter functional).
- **C3 (kind coverage + glyphs):** Task 6 (`KIND_TO_TYPE`) + Task 7 (glyphs).
- **C4 (placeable, both modes; Pin):** Task 8 (Pin) + verified in every task's behavioral check; existing `PLACE_TOOLS` covers the rest.
- **C5 (library click-to-place):** Task 9.
- **C6 (cleanup, real coord readout):** Task 10.

**Deferred (noted, not in this plan):** drag-drop from library (Task 9 uses click), per-object glyph colouring by layer, and the "Add Property" custom-field editor (stays a placeholder action). These are enhancements beyond the point-5 requirement and can be separate plans.

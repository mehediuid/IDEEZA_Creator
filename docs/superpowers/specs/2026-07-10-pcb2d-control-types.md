# PCB(2D) Sidebar — Doc-Exact Control Types

Source of truth: `Ideeza_EasyEDA_PCB2D_Sidebar_Properties_1.pdf` (§01–§09) + `Sidebar Properties.xlsx` (2D sheet).
Goal: every field in the 2D property inspector renders the **exact control type** the doc specifies — one comprehensive pass, no piecemeal.

## New `FieldKind` values to add (inspector-schema.ts) + render in right-panel.tsx `FieldRow`

| kind | doc phrase | control |
|---|---|---|
| `checkText` | "checkbox + text" | small checkbox (show-on-silk, `prop:<key>__show`, default on) + text input (`field.bind`) |
| `checkDropdown` | "checkbox + dropdown" | checkbox (`prop:<key>__show`) + Select |
| `dropdownGear` | "dropdown + gear" | Select + gear icon button (gear → `flashToast("settings — soon")`) |
| `slider` | "slider" | `<input type=range>` (0–100) bound to value |
| `radio` | "radio" (General/Custom, Through/Blind) | segmented 2–3 option control bound to value |
| `origin` | "anchor picker" | 3×3 anchor grid → value one of the 9 positions |
| `netRef` | "dropdown + jump icon" | net Select + jump icon button (jump → `flashToast`) |
| `textarea` | "auto-grow textarea" | growing `<textarea>` bound to value |

Existing kinds keep working: `text`, `number`, `dropdown`, `color` (swatch+hex), `toggle`, `coord`, `action`, `readonly`.
`checkText`/`checkDropdown` checkbox state persists at `prop:<key>__show` (boolean, default true); the value uses the field's existing `bind`.

## Per-field target kind — 2D schema types

### §02 Component
- Location: Layer `dropdown`; Center X/Center Y `coord`; Rotation `text`; **Locked `dropdown` (No/Yes)** (was toggle); Silk Screen Color `color`.
- Basic Properties: ID `readonly`; Name `checkText`; Unique ID `readonly` (auto, keep); Add into BOM `checkDropdown` (Yes/No); Designator `checkText`; Devices `readonly`; Footprint `checkText`; 3d Model Title `checkText`.
- Key Properties: Value `checkText`; Manufacturer/Manufacturer Part/Supplier/Supplier Part `text`.
- More Properties: Description `checkText`; Supplier Footprint `checkText`; Add Property `dropdownGear`.
- Combination / Reuse Block: Group `dropdown`; Reuse Block `dropdown`.

### §03 Designator / Silkscreen Text (new type "Designator" — see note)
- Property: Property Name `readonly`; Property Value `text`; Layer `dropdown`; Mirror `dropdown` (No/Yes).
- Font Type: Font Family `dropdown`; Stroke Width `text`; Height `text`; Inverted `dropdown` (No/Yes); Inverted Expansion `text`.
- Location: Center X/Y `coord`; Rotation `text`; Locked `dropdown`; Origin `origin`.
- Silk: Silk Screen Color `color`.
(Designator as a separate selectable child object is a bigger item — out of THIS pass; noted separately. This pass only covers control-types of existing types.)

### §04 Pad
- Property: Layer `dropdown`; Number `text`; Net `netRef`; Net Length `readonly`; ID `readonly`.
- Size: General/Custom `radio`; Shape `dropdown`; Width/Height `text`; Corner Radius Ratio `text`.
- Location: Center X/Y `coord`; Rotation `text`; Locked `dropdown`.
- Solder/Paste Mask Expansion: General/Custom `radio`; Solder Mask Expansion `text`; Paste Mask Expansion `text`.
- Thermal: General/Custom `radio`; Pad Connection `dropdown`.
- Pin Delay: Pin Length `text`.

### §05 Via
- Property: Through/Blind-Buried `radio`; Start Layer/End Layer `dropdown`; Net `netRef`; Net Length `readonly`; ID `readonly`.
- Via Diameter: Outside/Inside `text`.
- Location: Center X/Y `coord`; Locked `dropdown`.
- Solder/Paste Mask: General/Custom `radio`; Solder/Paste Mask Expansion `text`.
- Combination: Group `dropdown`.

### §06 Track
- Property: Layer `dropdown`; Line width `text`; Length `readonly`; Net `netRef`; Net Length `readonly`; Locked `dropdown`; ID `readonly`.
- Path: Start X/Y, End X/Y `coord`.
- Combination: Group `dropdown`.

### §07 Outline Object
- Property: Type `dropdown`; Layer `dropdown`; Line width `text`; Locked `dropdown`; ID `readonly`.
- Rectangle Outline: Start X/Y `coord`; Width/Height `text`; Corner Radius `text`; Rotation `text`.
- Combination: Group `dropdown`.

### §08 Copper Fills
- Property: Type `dropdown`; Name `text`; Layer `dropdown`; Net `netRef`; Locked `dropdown`; ID `readonly`; Convert to Fill Region/Add Solder Mask Region `action`.
- Fill Setup: Fill Style `dropdown`; Keep Island `dropdown`; Optimization `dropdown`; Minimum Optimized Width `text`; Rebuild/Suture Vias `action`.
- Rule Setting: By Network/Custom `radio`; Net Spacing Rule/Network Spacing `text`.
- Multi-layer Pad: Pad Connection `dropdown`; Spoke Spacing/Width `text`; Spoke Angles `text`; Track Connection `dropdown`.
- Rectangle Outline: Start X/Y `coord`; Width/Height `text`; Corner Radius `text`; Rotation `text`.
- Combination: Group `dropdown`.

### §09 Text
- Property: Content `textarea`; Layer `dropdown`; Mirror `dropdown`.
- Font Type: Font Family `dropdown`; Stroke Width `text`; Height `text`; Inverted `dropdown`; Inverted Expansion `text`.
- Location: Center X/Y `coord`; Rotation `text`; Locked `dropdown`; Origin `origin`.
- Combination: Group `dropdown`.
- Silk: Silk Screen Color `color`.

### §01 Canvas (PcbDefaultProperties — custom component, not schema)
- Document: Unit `dropdown`; Grid Type/Bold Grid Type `dropdown`; Bold Grid Ratio `number`; Grid Size/Snap Size/Alt Snap Size `dropdown`; Snap `checkbox + gear`; **Highlight `slider`**.
- Common Setting: track/via widths `dropdown`/`text` per doc; Remove Loop + subs `checkbox`; Hide Copper/Move Footprint `checkbox`; Routing Mode/Current Track Path Optimization/Rotation Objects `dropdown`; Minimum Track Corners `number`.
- Colorful Silkscreen: `color` swatches (already).

## Execution order
1. Add new kinds to `FieldKind` + implement in `FieldRow` (right-panel.tsx). Fallbacks safe.
2. Apply the doc-exact `kind` to every field in the 2D schema types (§02, §04–§09) in inspector-schema.ts.
3. Update PcbDefaultProperties (§01) control types (Highlight → slider, Snap → gear).
4. Verify each section live in PCB tab.

Schematic side keeps its own (SCHEMATIC-sheet) control types — not in this PCB(2D) pass.

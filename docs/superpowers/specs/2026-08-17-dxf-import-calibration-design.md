# Import DXF — layer mapping + stroke width (UIUX-62)

**Ticket:** UIUX-62 — the live prototype's Import DXF popup is a bare file
picker. The repo's dialog (`ImportDfxModal`) is already rebuilt — filename,
unit (with `$INSUNITS` note), DXF size, scale, import size, reference point and
a live preview drawn from the parsed geometry. Against the ticket's
required-fields table, two capabilities are genuinely missing, and one hidden
stub blocks one of them.

## Gaps being closed (Approach A — extend the existing dialog + engine)

1. **DXF Layer → Import Layer mapping.** `parseDxf` already records each
   entity's layer (group code 8); `dxfToObjects` drops it. The dialog gains a
   **Layers** section — one row per DXF layer: include checkbox · layer name ·
   entity count · (**board mode only**) target-layer dropdown from
   `state.pcbLayers` (default: the document layer). Schematic mode has no
   layers on the sheet, so there include/exclude *is* the mapping — no fake
   target column. Excluding a layer removes its geometry from the live preview
   and from the footer's "Places N entities" count — preview, count and commit
   all read the same filtered set.
2. **Stroke width.** An editable number (px, default 1.7) stamped as `width`
   on the imported line objects. Blocking stub fixed on the way: the wire
   overlay draws every `line`/`polyline` at a hard-coded 1.7px and never reads
   `o.width`, so the Properties panel's existing "Line Width" (`obj:width`)
   field was a dead write. The overlay now honours `o.width` for the drawing
   kinds (`line`, `polyline`) as the base stroke; selection/hover emphasis
   stacks on top unchanged. Track/bus/wire rendering is untouched.

## Engine changes (`dxf-import.ts`)

- `DxfPlaceOpts` += `layers?: Record<string, { include: boolean; target?: string }>`
  and `strokeWidth?: number`.
- `dxfToObjects` skips entities whose layer is mapped `include: false`, stamps
  `layer` (when a target is given) and `width` (when strokeWidth is set) on
  emitted objects. Parser untouched.
- Small exported helper `dxfLayers(doc)` → `{ name, count }[]` for the table.

## Out of scope

Blocks/INSERT, splines, dimensions, hatches stay reported-as-skipped (parser
scope, unchanged). No redesign of the dialog shell — it is already IDEEZA's
own two-pane layout, not an EasyEDA copy.

## Verification

`tsc` + CDP against a fixture DXF with three layers (OUTLINE rect · HOLES
circle · NOTES text): table rows + counts render; excluding a layer shrinks
the preview and the footer count; import in schematic mode places the included
objects only; import in board mode lands objects on the chosen target layer
(read back from the persisted doc); stroke width reaches the placed object and
its on-canvas stroke; dialog screenshots in light + dark.

# Schematic Sheet Export dialog — design

**Ticket:** UIUX-67 — the schematic Export ▸ PDF popup is EasyEDA's Export Document
dialog (and functionally wrong: it exports the *board* via `collectPcbModel`, not
the sheet). Redesign it as IDEEZA's own, exporting the schematic sheet.

## Decisions (user-approved)

1. **One dialog for PDF · PNG · SVG** — the schematic Export menu gets a single
   `Sheet (PDF · PNG · SVG)…` row; the one-click `PNG (this sheet)` / `SVG (this
   sheet)` rows and the now-unused `exportSheetImage` action are removed (one
   home per control).
2. **Frame & title block included**, behind a default-ON checkbox — the capture
   engine is extended to serialize the sheet frame.
3. **This sheet only** — multi-sheet PDF needs sheet-switching machinery; ships
   later. No Range row (a one-option radio is noise); the summary line names the
   sheet.

The board's Export ▸ PDF (`DocumentModal`) is untouched.

## Dialog — `SheetExportModal` (modal id `exportSheet`)

IDEEZA vocabulary, built from the existing modal primitives (Overlay / Card /
Header / Radio / Check / Button / Pill) so the component vocabulary stays
consistent with the board's export dialogs:

- **Format** — PDF · PNG · SVG (radio row)
- **Frame & title block** — checkbox, default ON
- **Ink** — *As drawn (editor colours)* · *Black on white (print)*
- **Detail** — 1× · 2× · 3× raster scale (default 2×); disabled for SVG with the
  reason visible (SVG is vector)
- **File name** — text input, default slug of the active sheet's name
- **Live summary line** — e.g. `Sheet 1 · A4 · 24 objects · frame included`,
  derived from the same state the export reads, so it can't lie
- Footer: Cancel · **Print** (PDF blob in a new tab) · **Export** (primary).
  Export/Print disabled with a teaching empty state when the sheet is empty.

## Engine (all real, no new dependencies)

- `captureSchematicSvg(opts?: { includeFrame?: boolean; ink?: "asDrawn" | "print" })`
  (`exporters.ts`) — the frame is serialized **from the live DOM** (the
  `SchematicCanvas` root gains `data-sheet-frame`): div backgrounds/borders →
  SVG rects/lines, spans → text. Same philosophy as the object capture — what
  you see is what you export, no second copy of the geometry. Frame ON → bounds
  = sheet rect; OFF → content crop (current behaviour). Print ink → strokes and
  fills forced to near-black, background white.
- `buildSheetPdf(svg, wPx, hPx, scale)` — rasterize the captured SVG to a canvas,
  embed as JPEG (DCTDecode XObject) in a hand-rolled single-page PDF, page sized
  to the sheet aspect. Vector SVG→PDF translation is deliberately out of scope
  (that's a whole renderer).

## Touched files

`exporters.ts` (capture extension + `buildSheetPdf`) · `schem-canvas.tsx`
(`data-sheet-frame`) · `types.ts` (modal id) · `data.tsx` (menu IA) ·
`store.tsx` (drop `exportSheetImage`) · `modals.tsx` (`SheetExportModal` + case)
· CLAUDE.md §5 (feature inventory).

## Verification

`tsc --noEmit` + headless Chrome CDP: open the dialog from the schematic menu,
export each format (assert PDF magic bytes / PNG dimensions / SVG root), compare
frame ON vs OFF captures, print-ink capture, empty-sheet state, screenshots in
light + dark.

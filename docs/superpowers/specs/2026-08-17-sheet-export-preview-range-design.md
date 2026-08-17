# Export Sheet — live preview + range (UIUX-65)

**Ticket:** UIUX-65 — Export ▸ PNG used to fire immediately with no popup.
Half of this closed with UIUX-67 (`abab35a`): PNG now goes through the Export
Sheet dialog. This change adds the ticket's two remaining demands to that
dialog: a **live preview** of the exported image and a **Range** control.

## Decisions (user-approved)

1. **Full scope now** — preview + Selection + All sheets, no deferral.
2. **"Manual Selection" = the editor's selection** — the rubber band / lasso
   *is* the region-drawing tool, and the board's Export Document already uses
   the same Range vocabulary. No dialog-driven region picker.

## Dialog changes (`SheetExportModal`)

- **Two-pane layout** like the DXF importer (940px card): options left, live
  preview right. The preview renders the same `captureSchematicSvg` output the
  export writes — re-captured whenever frame / ink / range change, so it cannot
  disagree with the file. In All-sheets range it previews the active sheet with
  a note (`Sheet 1 of 3 — every sheet exports`).
- **Range row** — *This sheet* · *Selection (N)* · *All sheets (N)*. Selection
  is disabled with the reason visible when nothing is selected (same wording
  as the board dialog). Export/Print disable when the chosen range is empty.

## Engine changes (`exporters.ts`)

- `captureSchematicSvg(opts + { onlyIds?: string[] })` — filters the captured
  `[data-object-id]` nodes to the given set (wire pick-bands carry the id, so
  wires filter correctly).
- **Multi-page PDF** — `buildSheetPdf` accepts a list of captured pages and
  writes one PDF with N pages (same DCTDecode raster-per-page approach, same
  byte-accurate xref machinery).
- **All-sheets capture** (modal-side runner) — snapshot `activeSheetId` +
  `selectedIds`, then for each sheet: `gotoSheet(id)` → wait two frames for the
  canvas to re-render → capture → next; restore the original sheet + selection
  (`selectMany`) afterwards. PDF = one multi-page file; PNG/SVG = one file per
  sheet, suffixed with the sheet slug. Empty sheets are skipped and the toast
  says so.

## Verification

`tsc` + CDP: preview pane updates on frame/ink/range toggles (compare rendered
innerHTML); Selection range exports only the selected objects (seed a
selection, assert exported SVG object count); All-sheets on a 2-sheet project
downloads 2 PNGs / one 2-page PDF (`/Count 2` in the PDF) and restores the
active sheet; empty-range disable; both themes screenshotted.

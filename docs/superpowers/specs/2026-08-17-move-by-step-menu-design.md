# Edit ▸ Move by step — schematic menu removal (UIUX-34)

**Ticket:** UIUX-34 — remove "Move by step…" from the schematic Edit menu,
keeping "Move" (M).

**Decision (user-approved):** ticket-literal. The row leaves the **schematic**
Edit menu only — on the sheet, grid + snap already handle placement, so an
exact-offset dialog is a spare control there. The **board's** 2D Edit menu
keeps its row: mil-precise nudges matter on copper, and that home keeps
`MoveStepModal` / `moveSelectedBy` alive (no dead code to strip). "Move" (M)
stays in both menus.

**Change:** delete one row in `buildMenusSchematic` (`data.tsx`); revise the
CLAUDE.md §5 Move entry.

**Verification:** `tsc` + CDP — schematic Edit menu no longer lists the row
("Move" still there); the board's Edit menu still opens the working dialog.

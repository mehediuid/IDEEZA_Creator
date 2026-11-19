// The pieces that come with a copy (D2, owner 2026-10-13): the PCB, the firmware and the wiring. A visitor sees
// their names and what a copy includes, never their files; whoever holds a Physical NFT (or the whole project)
// gets them (My projects › Purchased, owner 2026-11-19). One wording for both places.
//
// Pure. Relative imports only (node:test loads the compiled module).

export type LockedId = "pcb" | "code" | "wiring";

export const LOCKED: Record<LockedId, { title: string; name: string; includes: string[] }> = {
  pcb: {
    title: "PCB files come with a copy",
    name: "PCB files",
    includes: ["The schematic, converted into a board layout", "The board's bill of materials", "The fab profile it was laid out for"],
  },
  code: {
    title: "Firmware comes with a copy",
    name: "Firmware",
    includes: ["The source code, fully commented", "The library list, pinned to versions", "The map from the code to the board's pins"],
  },
  wiring: {
    title: "Wiring comes with a copy",
    name: "Wiring",
    includes: ["The netlist and a pin-to-pin table", "Wire colours, harness lengths and connector pinouts", "A continuity test checklist"],
  },
};

export const isLockedPiece = (t: string): t is LockedId => t === "pcb" || t === "code" || t === "wiring";

// The editors' single-key shortcuts, one table per editor. Each editor's
// keydown handler finds the pressed key here (`singleKeyOf`) and runs the
// action for its id, and Settings › Appearance & accessibility lists these
// same tables, so the list is always the keys the editors really answer.
// ⌘/Ctrl and named-key shortcuts (Escape, Delete, Space) stay in each
// handler. Pure, no imports (node:test loads this).

export interface SingleKeyShortcut<Id extends string = string> {
  id: Id;
  /** The key as the list shows it: "H", "0". */
  key: string;
  /** Only with Shift held; without it, Shift doesn't matter. */
  shift?: boolean;
  does: string;
}

export const PCB_KEYS = [
  { id: "hand", key: "H", does: "Hand tool (press again for Select)" },
  { id: "select", key: "V", does: "Select tool" },
  { id: "rotate", key: "R", does: "Rotate the selection 90°" },
  { id: "rotateBack", key: "R", shift: true, does: "Rotate the selection 90° the other way" },
] as const satisfies readonly SingleKeyShortcut[];

export const THREE_D_KEYS = [
  { id: "move", key: "G", does: "Move the selected part" },
  { id: "rotate", key: "R", does: "Rotate the selected part" },
  { id: "scale", key: "S", does: "Scale the selected part" },
  { id: "hide", key: "H", does: "Hide or show the selected part" },
  { id: "lock", key: "L", does: "Lock or unlock the selected part" },
  { id: "box", key: "B", does: "Add a box" },
  { id: "cylinder", key: "Y", does: "Add a cylinder" },
  { id: "resetView", key: "0", does: "Reset the view" },
] as const satisfies readonly SingleKeyShortcut[];

export const MAP_KEYS = [
  { id: "select", key: "V", does: "Select tool" },
  { id: "draw", key: "L", does: "Draw a link" },
] as const satisfies readonly SingleKeyShortcut[];

export type ShortcutId<T extends readonly SingleKeyShortcut[]> = T[number]["id"];

export const SHORTCUT_EDITORS: readonly { name: string; keys: readonly SingleKeyShortcut[] }[] = [
  { name: "PCB and schematic", keys: PCB_KEYS },
  { name: "3D", keys: THREE_D_KEYS },
  { name: "Connection map", keys: MAP_KEYS },
];

type KeyLike = Pick<KeyboardEvent, "key" | "shiftKey" | "ctrlKey" | "metaKey" | "altKey">;

/** The id of the shortcut `e` presses in `table`; null for a modified key or one the table lacks.
 *  A Shift entry is matched before the plain one for the same key. */
export function singleKeyOf<T extends readonly SingleKeyShortcut[]>(table: T, e: KeyLike): ShortcutId<T> | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return null;
  const k = e.key.toLowerCase();
  const hit =
    (e.shiftKey ? table.find((s) => s.shift && s.key.toLowerCase() === k) : undefined) ??
    table.find((s) => !s.shift && s.key.toLowerCase() === k);
  return (hit?.id as ShortcutId<T> | undefined) ?? null;
}

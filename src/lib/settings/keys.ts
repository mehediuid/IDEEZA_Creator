// Settings › Appearance & accessibility › Single-key shortcuts (WCAG 2.1.4).
// With the setting off, an editor ignores a key that types a character on
// its own — a letter, a digit, punctuation, with or without Shift — so speech
// input and stray keystrokes can't fire tools. ⌘/Ctrl/Alt shortcuts and the
// named keys (Escape, Delete, arrows, Space, Enter) keep working. Every
// editor's keydown handler asks `singleKeyShortcutsAllowed(e)` first.
// Relative imports only (node:test loads this).

import { readSettings } from "./prefs";

type KeyLike = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">;

/** A key that types one character, with no ⌘/Ctrl/Alt. Space is not one: it pans. */
export function isCharacterKey(e: KeyLike): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return e.key.length === 1 && e.key !== " ";
}

/** False when single-key shortcuts are off and `e` is one. */
export function singleKeyShortcutsAllowed(e: KeyLike, allowed = readSettings().appearance.singleKeyShortcuts): boolean {
  return allowed || !isCharacterKey(e);
}

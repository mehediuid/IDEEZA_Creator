// Whether the user ticked "I understand, don't show this again" on the
// generation gate (Part 4 spec §4.5). Kept out of the credits and history
// stores on purpose: it is a UI preference, not part of the ledger or the
// job record, and two surfaces read it — the dialog that offers the tick
// and the chat that decides whether to open the dialog at all.
//
// The spec is explicit that dismissal hides the dialog but never the
// price: the concept card's own "Cost: N credits" line carries that, and
// it is not conditional on this flag.

const GATE_DISMISSED_KEY = "ideeza:create:gate-dismissed";

export function readGateDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GATE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeGateDismissed(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (v) window.localStorage.setItem(GATE_DISMISSED_KEY, "1");
    else window.localStorage.removeItem(GATE_DISMISSED_KEY);
  } catch {}
}

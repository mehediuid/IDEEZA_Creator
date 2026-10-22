// Finding what a tour step points at. Steps name `data-tour` ids on real controls; a control can
// exist twice (the sidebar is drawn in the desktop aside and again in the phone drawer), so the
// first one actually on screen counts.

/** Below Tailwind's `md`, where the sidebar becomes a drawer behind the menu button. */
export const PHONE_QUERY = "(max-width: 767.98px)";

export const isPhone = (): boolean => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;

/** Laid out and not hidden: `display: none` anywhere above it leaves no client rects. */
export function isShown(el: Element): boolean {
  if (!el.isConnected || el.getClientRects().length === 0) return false;
  return getComputedStyle(el).visibility !== "hidden";
}

function first(id: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour~="${id}"]`)) if (isShown(el)) return el;
  return null;
}

/** The elements a step spotlights, or `null` while none of them is on screen. */
export function findTargets(target: string | string[]): HTMLElement[] | null {
  const ids = Array.isArray(target) ? target : [target];
  const found = ids.map(first).filter((el): el is HTMLElement => el !== null);
  return found.length ? found : null;
}

export type Box = { top: number; left: number; right: number; bottom: number; width: number; height: number };

/** One box around them all, in viewport pixels. */
export function unionBox(els: HTMLElement[]): Box {
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return { top, left, right, bottom, width: right - left, height: bottom - top };
}

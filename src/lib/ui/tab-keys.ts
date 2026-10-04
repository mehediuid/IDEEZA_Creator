// The keyboard and scroll rules every tablist in the app shares (spec COR-20,
// COR-21): one Tab stop, the arrows move the selection and focus with it, Home
// and End jump to the ends. Extracted from review-outputs.tsx, where the build
// review's product and deliverable tabs first got it; the project page's
// Products · Media · Network strip and the product page's deliverable tabs use
// the same one. Every tab used to be its own Tab stop and the arrows did nothing.

import type { KeyboardEvent } from "react";

/** Where `key` moves the selection among `count` tabs, from `at`; null for a
 *  key tabs don't take. Wraps at both ends. */
export function nextTabIndex(key: string, at: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === "ArrowRight" || key === "ArrowDown") return (at + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (((at - 1) % count) + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/** A tablist's onKeyDown. Each tab carries `data-tab={id}`; focus follows the
 *  selection on the next frame, once the new selection has rendered. */
export function moveTab<T extends string>(
  e: KeyboardEvent<HTMLElement>,
  ids: readonly T[],
  current: T,
  select: (id: T) => void,
): void {
  const next = nextTabIndex(e.key, ids.indexOf(current), ids.length);
  if (next === null) return;
  e.preventDefault();
  const list = e.currentTarget;
  const id = ids[next];
  select(id);
  requestAnimationFrame(() => list.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.focus());
}

/** How far to scroll a horizontal strip so `item` is wholly in view, `pad` px
 *  clear of the edge it crossed; 0 when it already is (COR-21). */
export function revealDelta(
  item: { left: number; right: number },
  view: { left: number; right: number },
  pad = 0,
): number {
  if (item.left < view.left + pad) return item.left - view.left - pad;
  if (item.right > view.right - pad) return item.right - view.right + pad;
  return 0;
}

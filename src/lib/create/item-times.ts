// When each build artifact started and finished, for History's build steps
// ("PCB · 42 seconds"). Stamped in one place, the build store's setter: every
// write compares each artifact with what it was, so no mutation has to
// remember to stamp. Pure; no imports (node:test loads it).
//
//   → building          startedAt = now, endedAt cleared (a retry starts over)
//   → ready | failed    endedAt = now
//   → pending           both cleared (requeued, or parked for credits)
//
// A build that is new in this write stamps only the artifacts it starts with
// building; storage is loaded around this, so hydrating stamps nothing.

export type TimedItem = {
  kind: string;
  status: string;
  startedAt?: number;
  endedAt?: number;
};

type TimedProduct = { id: string; items: TimedItem[] };

export type TimedBuild = {
  id: string;
  items: TimedItem[];
  companions?: TimedProduct[];
};

function stampItems<I extends TimedItem>(items: I[], before: TimedItem[] | undefined, now: number): I[] {
  let changed = false;
  const out = items.map((it) => {
    const was = before?.find((o) => o.kind === it.kind);
    if (was?.status === it.status) return it;
    let next: I = it;
    if (it.status === "building") next = { ...it, startedAt: now, endedAt: undefined };
    else if (it.status === "ready" || it.status === "failed") next = { ...it, endedAt: now };
    else if (it.status === "pending" && (it.startedAt !== undefined || it.endedAt !== undefined))
      next = { ...it, startedAt: undefined, endedAt: undefined };
    if (next !== it) changed = true;
    return next;
  });
  return changed ? out : items;
}

export function stampItemTimes<B extends TimedBuild>(prev: readonly B[], next: B[], now: number): B[] {
  if (next === prev) return next;
  const before = new Map(prev.map((b) => [b.id, b]));
  let changed = false;
  const out = next.map((b) => {
    const was = before.get(b.id);
    if (was === b) return b;
    const items = stampItems(b.items, was?.items ?? [], now);
    let companions = b.companions;
    if (b.companions?.length) {
      const prevById = new Map((was?.companions ?? []).map((c) => [c.id, c]));
      let moved = false;
      const stamped = b.companions.map((c) => {
        const s = stampItems(c.items, prevById.get(c.id)?.items ?? [], now);
        if (s === c.items) return c;
        moved = true;
        return { ...c, items: s };
      });
      if (moved) companions = stamped;
    }
    if (items === b.items && companions === b.companions) return b;
    changed = true;
    return { ...b, items, companions };
  });
  return changed ? out : next;
}

/** How long a finished artifact took; undefined while it runs, or for a
 *  build stored before the stamps. Falls back to the build's own start for
 *  an artifact stamped only on its way out. */
export function itemDuration(item: TimedItem, buildStartedAt?: number): number | undefined {
  if (item.status !== "ready" && item.status !== "failed") return undefined;
  const from = item.startedAt ?? buildStartedAt;
  if (item.endedAt === undefined || from === undefined) return undefined;
  const ms = item.endedAt - from;
  return ms >= 0 ? ms : undefined;
}

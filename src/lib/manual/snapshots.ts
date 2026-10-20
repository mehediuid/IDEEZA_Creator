// Product Preview's snapshots (the Assembly + Wiring plan F35): a picture of
// the assembled product, kept in the project's Media tab. Stored as a JPEG
// data URL in localStorage, newest first, at most MAX_SNAPSHOTS — the oldest
// goes first when the browser's storage is short. Pure apart from the
// injected storage; relative imports only (node:test).

export type Snapshot = { id: string; productId: string; productName: string; dataUrl: string; at: number };

export const MAX_SNAPSHOTS = 8;
export const snapshotsKey = (projectId: string) => `ideeza:project:snapshots:${projectId}`;

type Store = Pick<Storage, "getItem" | "setItem">;

const isSnapshot = (v: unknown): v is Snapshot => {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return typeof s.id === "string" && typeof s.productId === "string" && typeof s.productName === "string" && typeof s.dataUrl === "string" && s.dataUrl.startsWith("data:image/") && typeof s.at === "number";
};

export function readSnapshots(projectId: string, store: Pick<Storage, "getItem">): Snapshot[] {
  try {
    const v = JSON.parse(store.getItem(snapshotsKey(projectId)) ?? "[]");
    return Array.isArray(v) ? v.filter(isSnapshot) : [];
  } catch {
    return [];
  }
}

function write(projectId: string, list: Snapshot[], store: Store): boolean {
  try {
    store.setItem(snapshotsKey(projectId), JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Keeps `snap` first. When storage is short the oldest go until it fits;
 *  `kept` is false (and nothing changed) when even the new one alone won't. */
export function addSnapshot(projectId: string, snap: Snapshot, store: Store): { kept: boolean; dropped: number; list: Snapshot[] } {
  const before = readSnapshots(projectId, store);
  let list = [snap, ...before.filter((s) => s.id !== snap.id)].slice(0, MAX_SNAPSHOTS);
  let dropped = before.length + 1 - list.length;
  while (list.length > 0) {
    if (write(projectId, list, store)) return { kept: true, dropped, list };
    if (list.length === 1) break;
    list = list.slice(0, -1);
    dropped++;
  }
  write(projectId, before, store);
  return { kept: false, dropped: 0, list: before };
}

export function removeSnapshot(projectId: string, id: string, store: Store): Snapshot[] {
  const list = readSnapshots(projectId, store).filter((s) => s.id !== id);
  write(projectId, list, store);
  return list;
}

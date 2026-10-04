// The project page's window events (Phase 2 spec §3.1, §3.4, C26).
//
// `deleteProject` (T09) dispatches PROJECT_DELETED_EVENT once the record and
// its localStorage keys are gone. Each store built later purges its own
// records on it: MarketProvider (listings, bids, support), the journey store
// (activity blobs), the clip store and VideoJobsProvider (T11, T14). The
// provider can't import those stores, so the event is the one seam.

export const PROJECT_DELETED_EVENT = "ideeza:project-deleted";

/** The event's `detail`. */
export type ProjectDeletedDetail = { id: string };

/** Tells every store that project `id` was deleted. A no-op outside the browser. */
export function dispatchProjectDeleted(id: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProjectDeletedDetail>(PROJECT_DELETED_EVENT, { detail: { id } }));
}

/** Calls `listener` with the deleted project's id; returns the unsubscribe. A no-op outside the browser. */
export function onProjectDeleted(listener: (id: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handle = (e: Event) => {
    const id = (e as CustomEvent<Partial<ProjectDeletedDetail> | null>).detail?.id;
    if (typeof id === "string" && id) listener(id);
  };
  window.addEventListener(PROJECT_DELETED_EVENT, handle);
  return () => window.removeEventListener(PROJECT_DELETED_EVENT, handle);
}

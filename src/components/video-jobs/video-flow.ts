// One way to open any of a project's videos from anywhere (owner, 2026-11-18): "Next video" in a
// render view, a row in the Videos panel, a held listing's missing video. The request is published
// here and `VideoFlowHost` (video-flow-host.tsx, at the app's root) opens it: a product's Generate
// video dialog — its form, its storyboard, then its render — or the project's own dialog. Kept apart
// from the dialogs so they can import it without an import cycle.

export type VideoFlowRequest = { projectId: string; productId: string; review: string | null; from: string | null; n: number };

let current: VideoFlowRequest | null = null;
let count = 0;
const listeners = new Set<() => void>();

export function publishVideoFlow(next: VideoFlowRequest | null) {
  current = next;
  for (const l of listeners) l();
}

export function subscribeVideoFlow(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export const videoFlowNow = () => current;

/** Opens a product's video (or, with `PROJECT_VIDEO_KEY`, the project video) over the page.
 *  `opts.review` opens a finished take's Review; `opts.from` the form from a failed take. */
export function openVideoFlow(projectId: string, productId: string, opts: { review?: string | null; from?: string | null } = {}) {
  publishVideoFlow({ projectId, productId, review: opts.review ?? null, from: opts.from ?? null, n: ++count });
}

/** After the dialog that asked for it has closed: one frame later, so its focus return runs first. */
export function openVideoFlowSoon(projectId: string, productId: string) {
  requestAnimationFrame(() => openVideoFlow(projectId, productId));
}

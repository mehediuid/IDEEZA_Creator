// Opens the Videos panel (videos-dock.tsx) from anywhere: a held listing's "Review videos", the
// project header's waiting line. Kept apart so a page can import it without the dock.

let open = false;
let focusProject: string | null = null;
const listeners = new Set<() => void>();

export function subscribeVideosPanel(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export const videosPanelOpen = () => open;
export const videosPanelProject = () => focusProject;

export function setVideosPanel(next: boolean, projectId: string | null = null) {
  open = next;
  focusProject = next ? projectId : null;
  for (const l of listeners) l();
}

/** Opens the panel, scrolled to `projectId`'s videos when given. */
export function openVideosPanel(projectId: string | null = null) {
  setVideosPanel(true, projectId);
}

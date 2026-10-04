// A project's product videos, live (Phase 2 spec §3.4, §3.6.2; P2-VIDEO-1):
// `ideeza:video:<projectId>`, sanitized on every read, so the Media tabs, the
// readiness gate and the render worker always agree. The render worker
// (VideoJobsProvider, T14) isn't scoped to one project, so the plain
// read/write pair is exported beside the hook.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { sanitizeProjectVideos } from "./product-video";
import { VIDEOS_KEY, type ProjectVideos } from "./types";

/** A stored record, or null when it's absent or not a record. */
export function decodeProjectVideos(raw: string | null, projectId: string): ProjectVideos | null {
  const { value } = parseStored(raw);
  return value === undefined ? null : sanitizeProjectVideos(value, projectId);
}

export function readProjectVideos(projectId: string): ProjectVideos | null {
  return decodeProjectVideos(readStoredKey(VIDEOS_KEY(projectId)), projectId);
}

/** Writes under `projectId`'s key, whatever `next.projectId` says. */
export function writeProjectVideos(projectId: string, next: ProjectVideos): WriteResult {
  if (!projectId) return { ok: false };
  return writeStoredKey(VIDEOS_KEY(projectId), { ...next, projectId });
}

export function useProjectVideos(projectId: string | null | undefined): {
  hydrated: boolean;
  record: ProjectVideos | null;
  write: (next: ProjectVideos) => WriteResult;
} {
  const id = projectId || null;
  const { hydrated, raw } = useStoredKey(id ? VIDEOS_KEY(id) : null);
  const record = React.useMemo(() => (id ? decodeProjectVideos(raw, id) : null), [raw, id]);
  const write = React.useCallback((next: ProjectVideos) => writeProjectVideos(id ?? "", next), [id]);
  return { hydrated, record, write };
}

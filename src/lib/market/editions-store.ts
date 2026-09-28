// A project's Physical and Virtual NFT edition tracks, live (Phase 2 spec
// §3.4, §3.6.2; P2-TABS-24…27): `ideeza:project:editions:<projectId>`,
// normalized on every read (a malformed track is dropped, never repaired).
// What sold of each track is read from the sales, never stored here.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import { normalizeEditions } from "./editions";
import { EDITIONS_KEY, type EditionTrack } from "./types";

export function decodeEditions(raw: string | null): EditionTrack[] {
  return normalizeEditions(parseStored(raw).value);
}

export function readEditions(projectId: string): EditionTrack[] {
  return decodeEditions(readStoredKey(EDITIONS_KEY(projectId)));
}

export function writeEditions(projectId: string, next: EditionTrack[]): WriteResult {
  if (!projectId) return { ok: false };
  return writeStoredKey(EDITIONS_KEY(projectId), next);
}

export function useEditions(projectId: string | null | undefined): {
  hydrated: boolean;
  record: EditionTrack[];
  write: (next: EditionTrack[]) => WriteResult;
} {
  const id = projectId || null;
  const { hydrated, raw } = useStoredKey(id ? EDITIONS_KEY(id) : null);
  const record = React.useMemo(() => decodeEditions(raw), [raw]);
  const write = React.useCallback((next: EditionTrack[]) => writeEditions(id ?? "", next), [id]);
  return { hydrated, record, write };
}

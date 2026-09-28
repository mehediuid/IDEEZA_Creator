"use client";

// useStoreWrite — did a write to the projects store reach localStorage?
// `updateProject` changes the record at once; the store writes it to
// localStorage in its own effect, just after the render that shows it, and
// reports a refused write as `writeError` (COR-93). The inline editors wait
// SETTLE_MS after the record holds the new value — that is their "Saving…" —
// and only then close, so a full storage keeps the editor open with the text
// in it (CNT-5) instead of closing on a change this browser never kept.

import * as React from "react";
import { useManualProjects } from "@/lib/manual/projects";

const SETTLE_MS = 250;

export type StoreWrite = {
  /** From start() until the write settles or fails. */
  saving: boolean;
  /** The store refused a localStorage write after start(). Cleared by start() and reset(). */
  failed: boolean;
  /** Call right before `updateProject`. */
  start: () => void;
  reset: () => void;
};

/** `applied` is true once the record holds the value being saved. */
export function useStoreWrite(applied: boolean, onSaved: () => void): StoreWrite {
  const { writeError } = useManualProjects();
  const [since, setSince] = React.useState<number | null>(null);
  const [failed, setFailed] = React.useState(false);
  // A refused write after start() ends the save: stored from this render on,
  // so a later successful write elsewhere can't turn it back into "saved".
  if (since !== null && writeError !== null && writeError.at >= since) {
    setSince(null);
    setFailed(true);
  }
  const saving = since !== null;

  const saved = React.useRef(onSaved);
  React.useEffect(() => {
    saved.current = onSaved;
  });
  React.useEffect(() => {
    if (!saving || !applied) return;
    const t = window.setTimeout(() => {
      setSince(null);
      saved.current();
    }, SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [saving, applied]);

  return {
    saving,
    failed,
    start: () => {
      setFailed(false);
      setSince(Date.now());
    },
    reset: () => {
      setFailed(false);
      setSince(null);
    },
  };
}

// Your copy, and whether this browser keeps the original (Settings › AI &
// your data; the Settings home card reads the same):
//   - lastBackupAt / useLastBackup / markBackedUp: when Download last made a
//     zip here (`ideeza:data:last-backup`). A restore sets it to the backup's
//     own date, since this browser then holds exactly that copy.
//   - useStorageStatus: whether the browser has promised not to clear IDEEZA's
//     data on its own when space runs low (navigator.storage.persisted), how
//     much it holds and may hold (estimate), and `ask()` for that promise
//     (navigator.storage.persist; Chrome answers by itself from how much you
//     use the site, Firefox asks you).
// Relative imports only.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";

export const LAST_BACKUP_KEY = "ideeza:data:last-backup";

/** `{ v: 1, at }` stored; a bare number is read too. */
export function backupTimeIn(value: unknown): number | null {
  const at = typeof value === "number" ? value : typeof value === "object" && value !== null ? (value as { at?: unknown }).at : null;
  return typeof at === "number" && Number.isFinite(at) && at > 0 ? at : null;
}

/** When a download was last made in this browser; null when never. */
export function lastBackupAt(): number | null {
  return backupTimeIn(parseStored(readStoredKey(LAST_BACKUP_KEY)).value);
}

export function markBackedUp(at: number): WriteResult {
  return writeStoredKey(LAST_BACKUP_KEY, { v: 1, at });
}

/** The last download's time, live. `hydrated` is false until this browser's copy is read. */
export function useLastBackup(): { hydrated: boolean; at: number | null } {
  const { hydrated, raw } = useStoredKey(LAST_BACKUP_KEY);
  return React.useMemo(() => ({ hydrated, at: backupTimeIn(parseStored(raw).value) }), [hydrated, raw]);
}

export type StorageStatus = {
  /** False until the browser has answered. */
  ready: boolean;
  /** The browser has the Storage API at all. */
  supported: boolean;
  /** True: it won't clear IDEEZA's data on its own. Null: it can't say. */
  persisted: boolean | null;
  /** Bytes this site holds, and may hold, as the browser estimates them. */
  usage: number | null;
  quota: number | null;
};

const UNKNOWN: StorageStatus = { ready: false, supported: false, persisted: null, usage: null, quota: null };

async function readStatus(): Promise<StorageStatus> {
  const s = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!s) return { ...UNKNOWN, ready: true };
  const [persisted, estimate] = await Promise.all([
    s.persisted ? s.persisted().catch(() => null) : Promise.resolve(null),
    s.estimate ? s.estimate().catch(() => null) : Promise.resolve(null),
  ]);
  return { ready: true, supported: true, persisted, usage: estimate?.usage ?? null, quota: estimate?.quota ?? null };
}

/** The browser's storage promise and estimate, and `ask()` for the promise (true when given). */
export function useStorageStatus(): StorageStatus & { ask: () => Promise<boolean> } {
  const [status, setStatus] = React.useState<StorageStatus>(UNKNOWN);
  React.useEffect(() => {
    let live = true;
    const read = () => readStatus().then((s) => live && setStatus(s));
    read();
    window.addEventListener("focus", read);
    return () => {
      live = false;
      window.removeEventListener("focus", read);
    };
  }, []);
  const ask = React.useCallback(async () => {
    let granted = false;
    try {
      granted = (await navigator.storage?.persist?.()) ?? false;
    } catch {
      granted = false;
    }
    setStatus(await readStatus());
    return granted;
  }, []);
  return { ...status, ask };
}

/** "3.2 MB". */
export function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

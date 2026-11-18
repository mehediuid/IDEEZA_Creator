// One switch for every video (owner, 2026-11-18, D5): "Notify me on this browser" turned on in any
// render view or in the Videos panel covers every render, and the moment a held listing or share
// goes live. Kept per browser in `ideeza:video:notifyAll`.
//
// Relative imports only.

import { readStoredKey, useStoredKey, writeStoredKey } from "../key-store";

export const NOTIFY_ALL_KEY = "ideeza:video:notifyAll";

export function readNotifyAll(): boolean {
  return readStoredKey(NOTIFY_ALL_KEY) === "true";
}

/** Turns it on or off; turning it on asks the browser once. */
export function writeNotifyAll(on: boolean): void {
  if (on && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => undefined);
  }
  writeStoredKey(NOTIFY_ALL_KEY, on);
}

export function useNotifyAll(): boolean {
  const { raw } = useStoredKey(NOTIFY_ALL_KEY);
  return raw === "true";
}

/** A browser notification, only while this tab is hidden and the switch is on. */
export function notifyBrowser(title: string, body: string, force = false): void {
  if (typeof window === "undefined" || !("Notification" in window) || !document.hidden) return;
  if (!force && !readNotifyAll()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {}
}

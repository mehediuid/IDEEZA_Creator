"use client";

// The browser's own pop-ups (V5): its permission, live; asking for it from
// Settings or once when a build starts; and showing a notice outside a hidden
// tab. The rules are lib/notifications/popups.ts; this is the browser side.

import * as React from "react";
import { readStoredKey, writeStoredKey } from "@/lib/key-store";
import { ASKED_KEY, shouldAskAtBuild, type PopupPermission } from "@/lib/notifications/popups";
import type { Notice } from "@/lib/notifications/types";
import { readSettings } from "@/lib/settings/prefs";

const PERMISSION_EVENT = "ideeza:popup-permission";

export function popupPermission(): PopupPermission {
  if (typeof window === "undefined" || !("Notification" in window) || !window.isSecureContext) return "unsupported";
  return Notification.permission;
}

function subscribePermission(onChange: () => void): () => void {
  let status: PermissionStatus | null = null;
  let gone = false;
  navigator.permissions
    ?.query({ name: "notifications" })
    .then((s) => {
      if (gone) return;
      status = s;
      s.addEventListener("change", onChange);
    })
    .catch(() => {});
  window.addEventListener(PERMISSION_EVENT, onChange);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    gone = true;
    status?.removeEventListener("change", onChange);
    window.removeEventListener(PERMISSION_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/** The permission as it is now; null on the server and while hydrating, so nothing claims an answer early. */
export function usePopupPermission(): PopupPermission | null {
  return React.useSyncExternalStore(subscribePermission, popupPermission, () => null);
}

/** Asks the browser. It shows its own prompt only while the answer is "default". */
export async function requestPopups(): Promise<PopupPermission> {
  if (popupPermission() !== "default") return popupPermission();
  try {
    await Notification.requestPermission();
  } catch {
    // An older browser takes a callback instead; its answer still lands in Notification.permission.
  }
  window.dispatchEvent(new Event(PERMISSION_EVENT));
  return popupPermission();
}

/** At a build's start, inside the click that started it (browsers prompt only from a click): asks
 *  once, ever, and only while a finished build could pop up. */
export function askForPopupsAtBuild(): void {
  if (!shouldAskAtBuild(popupPermission(), readStoredKey(ASKED_KEY) !== null, readSettings())) return;
  writeStoredKey(ASKED_KEY, true);
  void requestPopups();
}

/** Shows `n` as the browser's pop-up; a click brings this tab forward and opens it. Its tag is the
 *  notice's id, so two open tabs show it once. */
export function showBrowserPopup(n: Notice, keep: boolean, onOpen: () => void): boolean {
  try {
    const popup = new Notification(n.title, {
      body: n.body ? `${n.tag}\n${n.body}` : n.tag,
      tag: n.id,
      icon: "/favicon.ico",
      requireInteraction: keep,
    });
    popup.onclick = () => {
      window.focus();
      onOpen();
      popup.close();
    };
    return true;
  } catch {
    // Android Chrome allows only service-worker pop-ups; the bell still has it.
    return false;
  }
}

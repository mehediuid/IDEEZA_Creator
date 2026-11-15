"use client";

// The Shared kit's permission pre-prompts (KIT-PM-01 camera, PM-02 photos,
// PM-03 microphone 10620:5078, PM-04 notifications 10620:5155): before the
// phone's own permission dialog, a Sheet says why, with Continue and Not now.
// Each comes once per phone (lib/account/phone.ts remembers it); Continue runs
// the action inside the tap, so the browser's own prompt may show.
//
//   const mic = usePrePrompt("microphone");
//   <button onClick={() => mic.ask(() => voice.start())}>…</button>
//   {mic.sheet}
//
//   const notify = useNotifyPrePrompt();   // once, after the first build starts
//   onBuildStarted(() => notify.offer());
//   {notify.sheet}
//
// Camera, photos and microphone ask again next time after Not now (the action
// needs them); notifications are offered once, and only while a finished
// build could pop up (the web's rule, lib/notifications/popups.ts).

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { askForPopupsAtBuild, popupPermission } from "@/components/notifications/browser-popups";
import { readPhone, updatePhone, type PhoneState } from "@/lib/account/phone";
import { readStoredKey } from "@/lib/key-store";
import { ASKED_KEY, shouldAskAtBuild } from "@/lib/notifications/popups";
import { readSettings } from "@/lib/settings/prefs";
import { T } from "../type";
import { Sheet } from "./sheet";

export type PermissionKind = "camera" | "photos" | "microphone" | "notifications";

const COPY: Record<PermissionKind, { title: string; body: string; flag: keyof PhoneState }> = {
  camera: { title: "Use your camera", body: "To record your product and take photos.", flag: "cameraAsked" },
  photos: {
    title: "Choose photos",
    body: "To add photos to your project, profile or messages. You pick which ones.",
    flag: "photosAsked",
  },
  microphone: {
    title: "Use your microphone",
    body: "To describe your device by voice and record sound with your video.",
    flag: "micAsked",
  },
  notifications: {
    title: "Know when your build is ready",
    body: "We’ll also tell you about messages and sales. Change it in Settings › Notifications.",
    flag: "notifyAsked",
  },
};

export function PermissionSheet({
  kind,
  open,
  body,
  onContinue,
  onNotNow,
}: {
  kind: PermissionKind;
  open: boolean;
  /** This screen's reason, in place of the kit's ("To take your profile photo and cover."). */
  body?: string;
  onContinue: () => void;
  onNotNow: () => void;
}) {
  const copy = COPY[kind];
  return (
    <Sheet
      open={open}
      onClose={onNotNow}
      title={copy.title}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={onContinue}>
            Continue
          </Button>
        </>
      }
    >
      <p className={T.body}>{body ?? copy.body}</p>
    </Sheet>
  );
}

/** Camera, photos or microphone: `ask(then)` runs `then` at once when this phone was asked before,
 *  else shows the pre-prompt first and runs it on Continue. */
export function usePrePrompt(kind: Exclude<PermissionKind, "notifications">, opts?: { body?: string }) {
  const [then, setThen] = React.useState<(() => void) | null>(null);
  const flag = COPY[kind].flag;
  const ask = React.useCallback(
    (action: () => void) => {
      if (readPhone()[flag]) action();
      else setThen(() => action);
    },
    [flag],
  );
  const sheet = (
    <PermissionSheet
      kind={kind}
      open={then !== null}
      body={opts?.body}
      onContinue={() => {
        updatePhone({ [flag]: true });
        const action = then;
        setThen(null);
        action?.();
      }}
      onNotNow={() => setThen(null)}
    />
  );
  return { ask, sheet };
}

/** PM-04: `offer()` once, right after the first build starts. Continue asks the browser (the web's
 *  ask-at-build, so the two never ask twice); Not now is remembered too. */
export function useNotifyPrePrompt() {
  const [open, setOpen] = React.useState(false);
  const offer = React.useCallback(() => {
    if (readPhone().notifyAsked) return;
    if (!shouldAskAtBuild(popupPermission(), readStoredKey(ASKED_KEY) !== null, readSettings())) return;
    setOpen(true);
  }, []);
  const done = (allow: boolean) => {
    updatePhone({ notifyAsked: true });
    setOpen(false);
    if (allow) askForPopupsAtBuild();
  };
  const sheet = <PermissionSheet kind="notifications" open={open} onContinue={() => done(true)} onNotNow={() => done(false)} />;
  return { offer, sheet };
}

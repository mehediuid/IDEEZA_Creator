"use client";

// Make videos — the one way to the products' videos from a step that asks for
// them (owner, 2026-10-12): the Earn ladder's "Make a video for each product"
// (StepFix's media fix, at every commit point) and the mint's Review step. It
// opens the ReadinessDialog for the videos alone, over the page the maker is
// on, instead of sending them off to the project's Media tab:
// - every product with its video's state (ready, rendering with progress,
//   failed, none);
// - Generate AI video / Try again on a row opens the Generate dialog on top,
//   the video flow's own steps, with ← Back to this list;
// - everything is live: a render that finishes turns its row ready, and once
//   every product has one, Continue closes it and the step is done.
//
// The dialog lives in one host at the app's root (`VideosDialogHost`, in
// app/layout.tsx), not beside the button: the button sits in the missing
// step's row, and that row goes the moment the last video lands — the dialog
// must stay until the maker presses Continue. The host reads the project
// page's own derivation (`useProjectPageData`), so a button needs only the
// project's id.

import * as React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ideeza";

// The dialog and the page derivation it reads load only when it first opens: the host sits in
// the root layout, and every page shouldn't carry them.
const VideosDialog = dynamic(() => import("./videos-dialog").then((m) => m.VideosDialog), { ssr: false });

export type VideosRequest = {
  projectId: string;
  /** The button that opened it: focus goes back there while it is still on the page. */
  opener: HTMLElement | null;
  announce?: (message: string) => void;
  onOpenChange?: (open: boolean) => void;
};

let current: VideosRequest | null = null;
const listeners = new Set<() => void>();
const publish = (next: VideosRequest | null) => {
  const was = current;
  current = next;
  was?.onOpenChange?.(false);
  next?.onOpenChange?.(true);
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function MakeVideosButton({
  projectId,
  label = "Make videos",
  className,
  describedBy,
  announce,
  onOpenChange,
}: {
  projectId: string;
  label?: string;
  /** Layout only. */
  className?: string;
  describedBy?: string;
  /** Says the outcome in the page's polite live region. */
  announce?: (message: string) => void;
  /** True while the dialog is open: a dialog under it hands it the keyboard. */
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Button
      type="button"
      hierarchy="secondary"
      size="md"
      className={className}
      aria-describedby={describedBy}
      aria-haspopup="dialog"
      onClick={(e) => {
        // Safari doesn't focus a clicked button; the dialog hands focus back to it.
        e.currentTarget.focus();
        publish({ projectId, opener: e.currentTarget, announce, onOpenChange });
      }}
    >
      {label}
    </Button>
  );
}

/** Mounted once, at the app's root. */
export function VideosDialogHost() {
  const request = React.useSyncExternalStore(subscribe, () => current, () => null);
  if (!request) return null;
  return (
    <React.Suspense fallback={null}>
      <VideosDialog key={request.projectId} request={request} onEnd={() => publish(null)} />
    </React.Suspense>
  );
}

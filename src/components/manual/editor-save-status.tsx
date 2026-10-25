"use client";

// EditorSaveStatus — the editors' one answer to "is my work saved?" (owner
// D3/D7, 2026-10-19), beside the product and project names in the top bar:
//
// - the project's status chip (Draft, Private, Listed…), the same word its
//   page shows;
// - the save state of every editor at once (lib/manual/save-status.ts):
//   "Saved 12:04", "Saving…" while the board's debounced write is pending,
//   "Saved" in green for a moment after Ctrl+S / File › Save, and
//   "Not saved · Retry" while any editor's last write was refused.
//
// The bar is short of room on smaller screens, and the names come first:
// below 1536 px the status chip and a calm state's words (Saved, Saving…)
// fold into the dot. They stay in the tooltip, for screen readers and in the
// panel. Not saved · Retry is always spelled out.
//
// Pressing it opens a small panel that says what that means — work saves as
// it goes; a Draft is seen only by you; Publish is on the project page — with
// Retry while something isn't saved, else View project. Esc and a click
// outside close it. Changes in state are announced politely.

import * as React from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ideeza";
import { StatusChip } from "@/components/projects/status-chip";
import { useStatusOf } from "@/components/projects/saved-dialog";
import { STATUS_WORD } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { getSaveSnapshot, retryFailedSaves, subscribeSaves, type SaveSnapshot } from "@/lib/manual/save-status";
import { usePcbState } from "@/lib/pcb/store";
import { cn } from "@/lib/utils";

/** How long "Saved" stays lit after saving on purpose. */
const FLASH_MS = 1600;

const SERVER: SaveSnapshot = { failed: [], at: null, savedNowAt: null };

type Shown = "failed" | "saving" | "flash" | "saved";

function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function EditorSaveStatus({ project }: { project: ManualProject }) {
  const snap = React.useSyncExternalStore(subscribeSaves, getSaveSnapshot, () => SERVER);
  const pcb = usePcbState();
  const status = useStatusOf(project);
  const draft = status === "draft";
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelId = React.useId();

  // "Saved" lights up after saving on purpose, then settles back to the time. A save made
  // before this mounted doesn't light it.
  const [seen, setSeen] = React.useState(snap.savedNowAt);
  const [flashing, setFlashing] = React.useState(false);
  if (snap.savedNowAt !== seen) {
    setSeen(snap.savedNowAt);
    setFlashing(snap.savedNowAt !== null);
  }
  React.useEffect(() => {
    if (!flashing) return;
    const t = window.setTimeout(() => setFlashing(false), FLASH_MS);
    return () => window.clearTimeout(t);
  }, [flashing, seen]);

  const shown: Shown =
    snap.failed.length > 0
      ? "failed"
      : pcb.saveState === "saving" || pcb.saveState === "dirty"
        ? "saving"
        : flashing
          ? "flash"
          : "saved";
  const label =
    shown === "failed"
      ? "Not saved"
      : shown === "saving"
        ? "Saving…"
        : shown === "flash" || snap.at === null
          ? "Saved"
          : `Saved ${clock(snap.at)}`;

  // Close on Esc and on a click outside.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // What a screen reader hears: a refused write, and a save on purpose.
  const spoken = shown === "failed" ? "Not saved. Your last change isn't kept." : shown === "flash" ? "Saved." : "";

  const href = `/projects/${encodeURIComponent(project.id)}`;
  return (
    <div ref={rootRef} data-tour="editor-saved" className="relative flex shrink-0 items-center gap-3">
      <span className="max-2xl:hidden">
        <StatusChip status={status} word={STATUS_WORD[status]} />
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`${STATUS_WORD[status]} · ${label}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(
          "inline-flex min-h-[32px] items-center gap-3 whitespace-nowrap rounded-md px-3 text-sm font-semibold outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
          shown === "failed" ? "text-text-error" : shown === "flash" ? "text-text-success" : "text-text-tertiary",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-[8px] shrink-0 rounded-full",
            shown === "failed" ? "bg-bg-error" : shown === "saving" ? "bg-bg-warning" : "bg-bg-success",
          )}
        />
        {/* The chip's word, for screen readers, while the chip is folded away. */}
        <span className="sr-only 2xl:hidden">{STATUS_WORD[status]}, </span>
        <span className={cn(shown !== "failed" && "max-2xl:sr-only")}>{label}</span>
        {shown === "failed" && <span className="underline underline-offset-2">Retry</span>}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {spoken}
      </span>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Save status"
          className="absolute left-0 top-[calc(100%+8px)] z-dropdown flex w-[320px] max-w-[80vw] flex-col gap-4 rounded-xl border border-solid border-border bg-bg-surface p-6 shadow-3"
        >
          <p className="text-md font-semibold text-text-primary">
            {shown === "failed" ? "Your last change isn’t saved" : shown === "saving" ? "Saving…" : "Everything is saved"}
          </p>
          <p className="text-sm text-text-secondary">
            {shown === "failed"
              ? "This browser’s storage is full or blocked. Free some space, then retry."
              : shown === "saving"
                ? "Your last change is being written now."
                : `Your work saves as you go${snap.at !== null ? `. Last saved ${clock(snap.at)}` : ""}.`}
          </p>
          {draft ? (
            <p className="text-sm text-text-secondary">
              {project.name} is a Draft: only you can see it. Publish it from the project page.
            </p>
          ) : (
            <p className="text-sm text-text-secondary">
              {project.name} is {STATUS_WORD[status].toLowerCase()}.
            </p>
          )}
          <div className="flex justify-end">
            {shown === "failed" ? (
              <Button type="button" hierarchy="primary" size="md" onClick={() => retryFailedSaves()}>
                Retry
              </Button>
            ) : (
              <Link href={href} className={buttonVariants({ hierarchy: "secondary", size: "md" })}>
                View project
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

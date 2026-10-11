"use client";

// ProjectDescription — the description under the project header (COR-8,
// ACT-9). Shown clamped to five lines, with Show more / Show less only when it
// runs longer. Editing it is the "Edit name and description" dialog's
// (edit-details.tsx), opened from the header's ⋯ menu; an empty description
// is one "Add a description" button that opens the same dialog, never
// placeholder prose.
//
// The coachmark (P2-TABS-22) renders beside the header, not inside the
// dialog, so the two meet here: the dialog registers how to open itself
// (`registerDescriptionEditor`) and publishes whether it is open.

import * as React from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";

// ─────────────── the coachmark's way in (P2-TABS-22) ───────────────

type EditorHandle = { open: (opts: { ai: boolean }) => void; focus: () => void };
const handles = new Map<string, EditorHandle>();
let openIds: readonly string[] = [];
const listeners = new Set<() => void>();

/** The edit dialog's registration; returns its removal. */
export function registerDescriptionEditor(projectId: string, handle: EditorHandle): () => void {
  handles.set(projectId, handle);
  return () => {
    if (handles.get(projectId) === handle) handles.delete(projectId);
  };
}

/** The edit dialog says whether it is open, so the coachmark can hide. */
export function publishDescriptionEditorOpen(projectId: string, open: boolean) {
  if (openIds.includes(projectId) === open) return;
  openIds = open ? [...openIds, projectId] : openIds.filter((id) => id !== projectId);
  for (const l of listeners) l();
}
function subscribeOpen(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Opens project `projectId`'s edit dialog — with a run of "Update with AI"
 *  started when `ai`. False when no editor for it is on the page. */
export function openDescriptionEditor(projectId: string, opts: { ai: boolean }): boolean {
  const h = handles.get(projectId);
  if (!h) return false;
  h.open(opts);
  return true;
}

/** Puts focus back by the description's controls (the header's ⋯). */
export function focusDescriptionEditor(projectId: string): void {
  handles.get(projectId)?.focus();
}

/** Whether project `projectId`'s edit dialog is open. */
export function useDescriptionEditorOpen(projectId: string): boolean {
  return React.useSyncExternalStore(
    subscribeOpen,
    () => openIds.includes(projectId),
    () => false,
  );
}

// ─────────────── the description ───────────────

export function ProjectDescription({
  project,
  onAdd,
}: {
  project: ManualProject;
  /** Opens the edit dialog — only when the viewer may edit (`project.editDescription`). */
  onAdd?: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const textRef = React.useRef<HTMLParagraphElement>(null);
  const textId = React.useId();
  const clamps = useClamps(textRef, !expanded, project.description);

  if (!project.description.trim()) {
    return onAdd ? (
      <div>
        <TextButton onClick={onAdd}>
          <Icon icon={Add01Icon} size={16} />
          Add a description
        </TextButton>
      </div>
    ) : null;
  }

  const toggles = clamps || expanded;
  return (
    <div className="flex max-w-prose flex-col gap-1">
      <p
        ref={textRef}
        id={textId}
        className={cn(
          "whitespace-pre-line break-words text-md leading-relaxed text-text-secondary",
          !expanded && "line-clamp-5",
        )}
      >
        {project.description}
      </p>
      {toggles && (
        <p>
          <TextButton aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show less" : "Show more"}
          </TextButton>
        </p>
      )}
    </div>
  );
}

/** A quiet text control: neutral, brightening on hover; 44 px tall at phone width. */
function TextButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded-sm text-md font-semibold text-text-secondary outline-none transition-colors duration-normal ease-decelerate hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@container(min-width:640px)]:min-h-[24px]",
        className,
      )}
      {...props}
    />
  );
}

/** Whether the clamped text runs past its five lines. Measured only while clamped. */
function useClamps(ref: React.RefObject<HTMLElement | null>, active: boolean, text: string): boolean {
  const [clamps, setClamps] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!active || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setClamps(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, active, text]);
  return clamps;
}

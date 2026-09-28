"use client";

// ProjectDescription — the description under the project header and its
// inline editor (COR-8, ACT-9, CNT-4, CNT-5).
//
// Shown clamped to five lines, with Show more / Show less only when it runs
// longer. "Edit description" opens a textarea that grows with its text:
// Save or Cmd/Ctrl + Enter saves; Cancel or Esc closes, first asking
// "Discard changes?" when the text changed. An empty description is an
// "Add a description" button, never placeholder prose. Up to 1,000
// characters after trimming, with a counter from 800; an older, longer
// description loads intact and is flagged only once it is edited.

import * as React from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Textarea } from "@/components/ideeza";
import {
  PROJECT_DESC_COUNTER_FROM,
  PROJECT_DESC_MAX,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
import { DESCRIPTION_SAVED, WRITE_FAILED, checkDescription } from "@/lib/manual/project-header";
import { cn } from "@/lib/utils";
import { useStoreWrite } from "./use-store-write";

/** 44 px targets below a 640 px header (phone width), the atom's own size above it. */
const TOUCH = "min-h-[44px] [@container(min-width:640px)]:min-h-0";

export function ProjectDescription({
  project,
  canEdit,
  announce,
}: {
  project: ManualProject;
  /** `can(viewer, "project.editDescription")` — false in Preview as buyer (PPL-6). */
  canEdit: boolean;
  announce: (text: string) => void;
}) {
  const { updateProject } = useManualProjects();
  const [editorOpen, setEditorOpen] = React.useState(false);
  // Entering Preview as buyer while the editor is open closes it with its button (PPL-6).
  const editing = editorOpen && canEdit;
  const [initial, setInitial] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [confirming, setConfirming] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const textRef = React.useRef<HTMLParagraphElement>(null);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const textId = React.useId();
  const areaId = React.useId();
  const counterId = React.useId();
  const messageId = React.useId();
  const askId = React.useId();
  const clamps = useClamps(textRef, !editing && !expanded, project.description);

  const dirty = draft !== initial;
  const check = checkDescription(draft, PROJECT_DESC_MAX, PROJECT_DESC_COUNTER_FROM);
  const flagged = dirty && check.tooLong;

  // Where focus goes once the next render is on screen (CNT-4): into the text
  // when the editor opens or the maker keeps editing, to Keep editing when the
  // question appears, back to the button that opened it when it closes.
  const focusNext = React.useRef<"field" | "keep" | "trigger" | null>(null);
  React.useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    if (target === "trigger") triggerRef.current?.focus();
    else if (target === "keep") keepRef.current?.focus();
    else {
      const el = areaRef.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  });

  const close = () => {
    focusNext.current = "trigger";
    setEditorOpen(false);
    setConfirming(false);
    setRefused(false);
    setPending(null);
  };
  const write = useStoreWrite(pending !== null && project.description === pending, () => {
    announce(DESCRIPTION_SAVED);
    close();
  });

  // It grows with its text, so a long description never scrolls inside the field.
  React.useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  const open = () => {
    write.reset();
    setInitial(project.description);
    setDraft(project.description);
    setConfirming(false);
    setRefused(false);
    focusNext.current = "field";
    setEditorOpen(true);
  };
  const save = () => {
    if (write.saving) return;
    if (!dirty && !write.failed) {
      close();
      return;
    }
    if (check.tooLong) {
      focusNext.current = "field";
      setRefused(true);
      return;
    }
    if (check.value === project.description && !write.failed) {
      close();
      return;
    }
    setPending(check.value);
    write.start();
    updateProject(project.id, { description: check.value });
  };
  const leave = () => {
    // After a refused write the record holds text this browser never kept: put the kept text back.
    if (write.failed) updateProject(project.id, { description: initial });
    write.reset();
    close();
  };
  const requestCancel = () => {
    if (write.saving) return;
    if (!dirty) {
      leave();
      return;
    }
    focusNext.current = "keep";
    setConfirming(true);
  };
  const keepEditing = () => {
    focusNext.current = "field";
    setConfirming(false);
  };

  if (editing) {
    return (
      <div className="flex max-w-prose flex-col gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate">
        <label htmlFor={areaId} className="sr-only">
          Project description
        </label>
        <Textarea
          ref={areaRef}
          id={areaId}
          value={draft}
          rows={4}
          onValueChange={setDraft}
          invalid={flagged}
          aria-invalid={flagged || undefined}
          aria-describedby={`${counterId} ${messageId}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              if (confirming) keepEditing();
              else requestCancel();
            }
          }}
          className="resize-none overflow-hidden"
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p id={counterId} className={cn("text-sm tabular-nums", flagged ? "text-text-error" : "text-text-secondary")}>
            {check.counter}
          </p>
          {confirming ? (
            <div
              role="group"
              aria-labelledby={askId}
              className="flex flex-wrap items-center gap-4"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  keepEditing();
                }
              }}
            >
              <p id={askId} className="text-md font-semibold text-text-primary">
                Discard changes?
              </p>
              <Button ref={keepRef} type="button" hierarchy="secondary" size="lg" onClick={keepEditing} className={TOUCH}>
                Keep editing
              </Button>
              <Button type="button" hierarchy="ghost" size="lg" onClick={leave} className={cn(TOUCH, "text-text-error")}>
                Discard
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <Button type="button" hierarchy="secondary" size="lg" onClick={save} disabled={write.saving} className={TOUCH}>
                {write.saving ? "Saving…" : "Save"}
              </Button>
              <Button type="button" hierarchy="ghost" size="lg" onClick={requestCancel} disabled={write.saving} className={TOUCH}>
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div id={messageId} aria-live="polite" className="text-sm text-text-error">
          {refused && check.error && <p>{check.error}</p>}
          {write.failed && <p>{WRITE_FAILED}</p>}
        </div>
      </div>
    );
  }

  if (!project.description.trim()) {
    return canEdit ? (
      <div>
        <TextButton ref={triggerRef} onClick={open}>
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
      {(toggles || canEdit) && (
        <p className="flex flex-wrap items-center gap-x-3">
          {toggles && (
            <TextButton aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show less" : "Show more"}
            </TextButton>
          )}
          {toggles && canEdit && (
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
          )}
          {canEdit && (
            <TextButton ref={triggerRef} onClick={open}>
              Edit description
            </TextButton>
          )}
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

"use client";

// ProjectTitle — the project page's h1 and its inline rename (COR-8, CNT-1…3).
//
// One line, truncated, with the full name on hover and on focus (ACT-7). The
// pencil beside it swaps the h1 for a one-line field: Enter or Save saves,
// Esc or Cancel puts the name back, and focus returns to the pencil. Clicking
// away neither saves nor discards. Only `name` changes — the slug never does,
// because the editor lives at /project/<slug> (CNT-3). No other surface
// edits the name.
//
// The h1 also carries the shell's own arrival focus (COR-7): `titleRef`
// comes from usePageArrival (shell.tsx) through the header slot, and is
// merged here with the ref useTruncated needs to measure the element.

import * as React from "react";
import { PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, IconButton, TextInput } from "@/components/ideeza";
import { PROJECT_NAME_MAX, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { WRITE_FAILED, checkProjectName, renamedMessage } from "@/lib/manual/project-header";
import { cn } from "@/lib/utils";
import { useStoreWrite } from "./use-store-write";

/** The h1's id — a stable hook for anything that wants to find it. Arrival
 *  focus itself goes through `titleRef` (a real ref), not this id. */
export const PROJECT_TITLE_ID = "project-title";

/** 44 px targets below a 640 px header (phone width), the atom's own size above it. */
const TOUCH = "min-h-[44px] [@container(min-width:640px)]:min-h-0";

export function ProjectTitle({
  project,
  canRename,
  announce,
  titleRef,
}: {
  project: ManualProject;
  /** `can(viewer, "project.rename")` — false in Preview as buyer (PPL-6). */
  canRename: boolean;
  announce: (text: string) => void;
  /** The shell's own ref (COR-7): focused on arrival and after a rename. */
  titleRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const { projects, updateProject } = useManualProjects();
  const [fieldOpen, setFieldOpen] = React.useState(false);
  // Entering Preview as buyer while the field is open closes it with the pencil (PPL-6).
  const editing = fieldOpen && canRename;
  const [draft, setDraft] = React.useState("");
  const [initial, setInitial] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);
  const h1Ref = React.useRef<HTMLHeadingElement>(null);
  const pencilRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();
  const messageId = React.useId();
  const truncated = useTruncated(h1Ref, project.name);

  // The h1 is both measured (truncation) and, from the shell, focused on
  // arrival — one callback ref keeps both current.
  const setH1 = React.useCallback(
    (el: HTMLHeadingElement | null) => {
      h1Ref.current = el;
      if (titleRef) titleRef.current = el;
    },
    [titleRef],
  );

  const others = React.useMemo(
    () => projects.filter((p) => p.id !== project.id).map((p) => p.name),
    [projects, project.id],
  );
  const check = checkProjectName(draft, others, PROJECT_NAME_MAX);

  // Where focus goes once the next render is on screen: the field when it
  // opens, the pencil when it closes (CNT-1). An effect, so the element exists.
  const focusNext = React.useRef<"field" | "pencil" | null>(null);
  React.useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    if (target === "pencil") {
      pencilRef.current?.focus();
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  });

  const close = () => {
    focusNext.current = "pencil";
    setFieldOpen(false);
    setPending(null);
  };
  const write = useStoreWrite(pending !== null && project.name === pending, () => {
    if (pending !== null) announce(renamedMessage(pending));
    close();
  });

  const open = () => {
    write.reset();
    setInitial(project.name);
    setDraft(project.name);
    focusNext.current = "field";
    setFieldOpen(true);
  };
  const cancel = () => {
    if (write.saving) return;
    // After a refused write the record holds a name this browser never kept: put the kept one back.
    if (write.failed) updateProject(project.id, { name: initial });
    write.reset();
    close();
  };
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (write.saving) return;
    if (check.error) {
      inputRef.current?.focus();
      return;
    }
    if (check.value === project.name && !write.failed) {
      close();
      return;
    }
    setPending(check.value);
    write.start();
    updateProject(project.id, { name: check.value });
  };

  return (
    <div className="group relative flex min-w-0 items-center gap-2">
      {/* Kept while the field is open, visually hidden, so the page still has its one h1. */}
      <h1
        ref={setH1}
        id={PROJECT_TITLE_ID}
        tabIndex={-1}
        className={cn(
          "min-w-0 truncate text-3xl font-bold tracking-tight text-text-primary outline-none",
          editing && "sr-only",
        )}
      >
        {project.name}
      </h1>

      {editing ? (
        <form
          onSubmit={save}
          noValidate
          className="flex min-w-0 flex-1 flex-col gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate"
        >
          <label htmlFor={inputId} className="sr-only">
            Project name
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <TextInput
              ref={inputRef}
              id={inputId}
              size="xl"
              value={draft}
              onValueChange={setDraft}
              invalid={check.error !== null}
              aria-invalid={check.error !== null || undefined}
              aria-describedby={messageId}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              containerClassName="min-w-0 flex-1 basis-64"
            />
            <Button type="submit" hierarchy="secondary" size="lg" disabled={write.saving} className={TOUCH}>
              {write.saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" hierarchy="ghost" size="lg" disabled={write.saving} onClick={cancel} className={TOUCH}>
              Cancel
            </Button>
          </div>
          <div id={messageId} aria-live="polite" className="text-sm">
            {check.error ? (
              <p className="text-text-error">
                {check.counter ? `${check.counter} · ` : ""}
                {check.error}
              </p>
            ) : check.note ? (
              <p className="text-text-secondary">{check.note}</p>
            ) : null}
            {write.failed && <p className="text-text-error">{WRITE_FAILED}</p>}
          </div>
        </form>
      ) : canRename ? (
        <IconButton
          ref={pencilRef}
          hierarchy="ghost"
          size="sm"
          aria-label="Rename project"
          icon={<Icon icon={PencilEdit01Icon} size={16} />}
          onClick={open}
          className="size-[44px] [@container(min-width:640px)]:size-[32px]"
        />
      ) : null}

      {/* The full name when the h1 is cut short: on hover, and while the h1 or
          the pencil has focus. The h1 itself already carries it for a screen reader. */}
      {truncated && !editing && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-full left-0 z-popover mb-2 hidden max-w-full whitespace-normal break-words rounded-lg bg-bg-inverse px-6 py-4 text-sm font-medium leading-sm text-text-inverse shadow-2 group-focus-within:block group-hover:block"
        >
          {project.name}
        </span>
      )}
    </div>
  );
}

/** Whether the element's one line is cut short. Measured whenever it resizes or its text changes. */
function useTruncated(ref: React.RefObject<HTMLElement | null>, text: string): boolean {
  const [truncated, setTruncated] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setTruncated(el.scrollWidth > el.clientWidth + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, text]);
  return truncated;
}

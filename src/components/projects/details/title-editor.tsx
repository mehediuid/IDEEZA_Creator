"use client";

// ProjectTitle — the project page's h1 (COR-8). One line, truncated, with the
// full name on hover and on focus (ACT-7). Renaming is the "Edit name and
// description" dialog's (edit-details.tsx), opened from the header's ⋯ menu:
// one editor for both, not a pencil here and a text button under the
// description (owner, 2026-10-11).
//
// The h1 also carries the shell's own arrival focus (COR-7): `titleRef`
// comes from usePageArrival (shell.tsx) through the header slot, and is
// merged here with the ref useTruncated needs to measure the element.

import * as React from "react";
import type { ManualProject } from "@/lib/manual/projects";

/** The h1's id — a stable hook for anything that wants to find it. Arrival
 *  focus itself goes through `titleRef` (a real ref), not this id. */
export const PROJECT_TITLE_ID = "project-title";

export function ProjectTitle({
  project,
  titleRef,
}: {
  project: ManualProject;
  /** The shell's own ref (COR-7): focused on arrival and after a rename. */
  titleRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const h1Ref = React.useRef<HTMLHeadingElement>(null);
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

  return (
    <div className="group relative min-w-0">
      <h1
        ref={setH1}
        id={PROJECT_TITLE_ID}
        tabIndex={-1}
        className="min-w-0 truncate text-3xl font-bold leading-3xl tracking-tight text-text-primary outline-none"
      >
        {project.name}
      </h1>
      {/* The full name when the h1 is cut short: on hover and on focus. The h1 itself already carries it for a screen reader. */}
      {truncated && (
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

"use client";

// DescriptionCoachmark — the multi-product coachmark under the project's
// description (P2-TABS-22, Figma 41505:136211 "Multiple Product Need to update
// project description"). The header renders it after the description
// (`headerParts.afterDescription`).
//
// Who sees it: the owner (`project.editDescription`, so never in a preview and
// never on a locked project), on a project whose products number two or more
// and have descriptions to bring together, while the description editor is
// closed.
// - "Update description" opens the editor with "Update with AI" already
//   running (description-editor.tsx's `openDescriptionEditor`).
// - "Not now" writes `descriptionHint = { dismissedAt, productCount }`. It
//   comes back only once the project has more products than it had then. A
//   description saved after a run of Update with AI dismisses it too.
//
// Both buttons are quiet: the page's one violet is the header's action pair.

import * as React from "react";
import { AiMagicIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza";
import { coachmarkDueOf } from "@/lib/manual/describe";
import { can } from "@/lib/manual/permissions";
import { productRowsOf } from "@/lib/manual/project-read";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { focusDescriptionEditor, openDescriptionEditor, useDescriptionEditorOpen } from "./description-editor";
import type { SlotProps } from "./slots";

/** 44 px targets below a 640 px header (phone width), the atom's own size above it. */
const TOUCH = "min-h-[44px] [@container(min-width:640px)]:min-h-0";

export const COACHMARK_TEXT =
  "Update your project description with AI to bring every product's description into one overview.";

/** Whether the coachmark is due on `project` (describe.ts's rule, on its rows). */
export function coachmarkDue(project: ManualProject): boolean {
  return coachmarkDueOf(productRowsOf(project), project.descriptionHint);
}

export function DescriptionCoachmark({ project, view, viewer }: SlotProps) {
  const { setDescriptionHint } = useManualProjects();
  const editing = useDescriptionEditorOpen(project.id);
  const textId = React.useId();
  const canEdit = can(viewer, "project.editDescription", view.canCtx);

  if (!canEdit || editing || !coachmarkDue(project)) return null;

  const notNow = () => {
    setDescriptionHint(project.id, { dismissedAt: Date.now(), productCount: productRowsOf(project).length });
    // The coachmark goes; the maker stays by the description.
    window.requestAnimationFrame(() => focusDescriptionEditor(project.id));
  };

  return (
    <div
      role="group"
      aria-labelledby={textId}
      className={cn(
        "flex max-w-prose flex-col gap-4 rounded-lg border border-solid border-border bg-bg-subtle px-6 py-5",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate",
      )}
    >
      <p id={textId} className="flex items-start gap-3 text-md leading-relaxed text-text-primary">
        <Icon icon={AiMagicIcon} size={18} className="mt-[3px] shrink-0 text-text-secondary" />
        <span>{COACHMARK_TEXT}</span>
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          hierarchy="secondary"
          size="md"
          onClick={() => openDescriptionEditor(project.id, { ai: true })}
          className={TOUCH}
        >
          Update description
        </Button>
        <Button type="button" hierarchy="ghost" size="md" onClick={notNow} className={TOUCH}>
          Not now
        </Button>
      </div>
    </div>
  );
}

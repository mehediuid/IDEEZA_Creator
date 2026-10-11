"use client";

// The rail's Showcase block (Build and Earn P0): Showcase is a flag on the
// project, not a sale — it needs no wallet — so it stays on the engineering
// page as its own block when the Outcome block moved to Earn. Its row and its
// control are the Outcome block's Showcase row, lifted out unchanged (COM-12,
// COM-55, owner decision O5): the same words (`outcomeView(…).minted.showcase`,
// rail-copy.ts), the same toggle, and P2-VIDEO-15's readiness gate, opening
// T14's `ReadinessDialog` when a current product still needs a video.
//
// Owner-only, as the row was (PPL-7), and only once the project is minted —
// the row had no place on a Draft's Outcome block, where the Brief's minted
// rule decides first. What Showcase changes is said in the page's one live
// region (COR-101). This row is the control's only home on the page.

import * as React from "react";
import { EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Link } from "@/components/ideeza";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { can } from "@/lib/manual/permissions";
import type { Readiness } from "@/lib/manual/p2-types";
import type { ProjectView } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { outcomeView } from "@/lib/manual/rail-copy";
import { showcaseAnnouncement, type ShowcaseRowCopy } from "@/lib/manual/showcase-copy";
import { cn } from "@/lib/utils";
import { RailBlock, RailFact, RailFacts, RailValue, useRailStacked } from "./rail-block";
import { ReadinessDialog } from "./readiness-dialog";
import type { SlotProps } from "./slots";

export function RailShowcase({ view, viewer, announce }: SlotProps) {
  if (!can(viewer, "facts.seeOwnerOnly")) return null;
  const readiness = view.videos.readiness.showcase;
  const copy = outcomeView(view.commerce, view.summary, readiness).minted?.showcase ?? null;
  if (!copy) return null;
  return (
    <RailBlock title="Showcase" meta={copy.on ? "Showcased" : "Not showcased"}>
      <RailFacts>
        <ShowcaseFact
          copy={copy}
          projectId={view.summary.id}
          name={view.summary.name}
          allowed={can(viewer, "project.showcase", view.canCtx)}
          readiness={readiness}
          view={view}
          announce={announce}
        />
      </RailFacts>
    </RailBlock>
  );
}

/** The Showcase row's note (COM-12), with P2-VIDEO-15's one-product link spliced in. */
function ShowcaseNote({ note, link }: { note: string; link?: { text: string; href: string } }) {
  const i = link ? note.indexOf(link.text) : -1;
  if (!link || i < 0) return <>{note}</>;
  return (
    <>
      {note.slice(0, i)}
      <Link href={link.href} color="brand" size="sm" className="font-medium">
        {link.text}
      </Link>
      {note.slice(i + link.text.length)}
    </>
  );
}

/** COM-12's row with COM-55's control. The button stays the same element as its label flips,
 *  so focus stays on it; the change is said politely in the page's one live region.
 *
 *  P2-VIDEO-15: "Showcase project" first runs `readinessOf(…, "showcase")` (`readiness`, the
 *  page's own `view.videos.readiness.showcase`). Ready, it flips at once, as v1 did. Blocked,
 *  it opens T14's `ReadinessDialog` — this is that dialog's first caller (P2-VIDEO-14) — and
 *  closing it by any means returns focus to this button. "Stop showcasing" is never gated. */
function ShowcaseFact({
  copy,
  projectId,
  name,
  allowed,
  readiness,
  view,
  announce,
}: {
  copy: ShowcaseRowCopy;
  projectId: string;
  name: string;
  allowed: boolean;
  readiness: Readiness;
  view: ProjectView;
  announce: (message: string) => void;
}) {
  const { projects, setShowcase } = useManualProjects();
  const brief = useProjectBrief(projectId);
  const stacked = useRailStacked();
  const noteId = React.useId();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [gateOpen, setGateOpen] = React.useState(false);
  const project = projects.find((p) => p.id === projectId) ?? null;

  const doShowcase = () => {
    setShowcase(projectId, true);
    announce(showcaseAnnouncement(true, name));
  };

  const press = () => {
    if (copy.on) {
      setShowcase(projectId, false);
      announce(showcaseAnnouncement(false, name));
      return;
    }
    if (readiness.ok || !project) {
      doShowcase();
      return;
    }
    setGateOpen(true);
  };

  return (
    <RailFact label={copy.label} icon={EyeIcon}>
      <span className="block">
        <RailValue parts={copy.value} />
      </span>
      <span id={noteId} className="mt-1 block text-sm font-regular text-text-secondary">
        <ShowcaseNote note={copy.note} link={copy.noteLink} />
      </span>
      {allowed && (
        <button
          ref={buttonRef}
          type="button"
          onClick={press}
          aria-describedby={noteId}
          className={cn(
            "mt-4 inline-flex items-center gap-4 rounded-lg border border-solid border-border bg-bg-surface px-8 text-md font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
            stacked ? "min-h-[44px]" : "min-h-[40px]",
          )}
        >
          <Icon icon={copy.on ? EyeOffIcon : EyeIcon} size={18} />
          {copy.action}
        </button>
      )}
      {allowed && gateOpen && project && (
        <ReadinessDialog
          purpose="showcase"
          project={project}
          view={view}
          brief={brief ?? null}
          onPass={() => {
            doShowcase();
            setGateOpen(false);
          }}
          onClose={() => {
            setGateOpen(false);
            buttonRef.current?.focus();
          }}
        />
      )}
    </RailFact>
  );
}

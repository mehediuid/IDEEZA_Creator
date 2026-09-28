"use client";

// The rail's Outcome block (COM-3…22, COM-55): what the Brief made of this
// project, read-only, first in the rail. It has no chip of its own and no
// Brief control — the outcome, its terms and the mint are chosen only in the
// Brief, whose one door on this page is the header (COM-18). Its one control
// is Showcase, a flag on the project rather than a Brief term (owner
// decision O5), and this row is that control's only home on the page.
// Owner-only: a buyer's preview drops the whole block (PPL-7). The page shows
// its skeleton until the Brief draft is read, so this block never waits.
// What Showcase changes is said in the page's one live region (COR-101).

import * as React from "react";
import { ArrowDown01Icon, EyeIcon, EyeOffIcon, HexagonIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { ProjectCommerce } from "@/lib/brief/project-brief";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { ProjectSummary } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { outcomeView, type OutcomeRow, type OutcomeView } from "@/lib/manual/rail-copy";
import { showcaseAnnouncement, type ShowcaseRowCopy } from "@/lib/manual/showcase-copy";
import { cn } from "@/lib/utils";
import { RailBlock, RailFact, RailFacts, RailValue, useRailStacked } from "./rail-block";

export function RailOutcome({
  summary,
  commerce,
  viewer,
  announce,
}: {
  summary: ProjectSummary;
  commerce: ProjectCommerce;
  viewer: Viewer;
  /** The shell's one polite live region (SlotProps.announce). */
  announce: (message: string) => void;
}) {
  if (!can(viewer, "facts.seeOwnerOnly")) return null;
  const view = outcomeView(commerce, summary);
  return (
    <RailBlock title="Outcome" meta={view.meta}>
      <OutcomeBody
        view={view}
        projectId={summary.id}
        name={summary.name}
        canShowcase={can(viewer, "project.showcase", { status: summary.status })}
        announce={announce}
      />
    </RailBlock>
  );
}

function OutcomeBody({
  view,
  projectId,
  name,
  canShowcase,
  announce,
}: {
  view: OutcomeView;
  projectId: string;
  name: string;
  canShowcase: boolean;
  announce: (message: string) => void;
}) {
  const stacked = useRailStacked();
  const minted = view.minted;
  const facts = minted ? (
    <RailFacts>
      {minted.rows.map((row) => (
        <OutcomeFact key={row.key} row={row} />
      ))}
      <ShowcaseFact copy={minted.showcase} projectId={projectId} name={name} allowed={canShowcase} announce={announce} />
    </RailFacts>
  ) : null;
  return (
    <>
      <p className="m-0 text-md leading-relaxed text-text-secondary">{view.subline}</p>
      {view.clipLine && <p className="m-0 text-sm leading-relaxed text-text-secondary">{view.clipLine}</p>}
      {facts &&
        (stacked ? (
          <details className="group">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-4 rounded-md text-md font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus [&::-webkit-details-marker]:hidden">
              Minted details
              <span
                aria-hidden
                className="inline-flex text-text-tertiary transition-transform duration-normal ease-decelerate group-open:rotate-180 motion-reduce:transition-none"
              >
                <Icon icon={ArrowDown01Icon} size={16} />
              </span>
            </summary>
            <div className="pt-4">{facts}</div>
          </details>
        ) : (
          facts
        ))}
      {minted && <p className="m-0 text-sm leading-relaxed text-text-tertiary">{minted.footnote}</p>}
    </>
  );
}

function OutcomeFact({ row }: { row: OutcomeRow }) {
  const isMint = row.key === "mint";
  return (
    <RailFact label={row.label} icon={isMint ? HexagonIcon : undefined} tone={isMint ? "success" : "neutral"}>
      <span className="block">
        <RailValue parts={row.value} />
      </span>
      {row.note && <span className="mt-1 block text-sm font-regular text-text-secondary">{row.note}</span>}
    </RailFact>
  );
}

/** COM-12's row with COM-55's control. The button stays the same element as its label flips,
 *  so focus stays on it; the change is said politely in the page's one live region. */
function ShowcaseFact({
  copy,
  projectId,
  name,
  allowed,
  announce,
}: {
  copy: ShowcaseRowCopy;
  projectId: string;
  name: string;
  allowed: boolean;
  announce: (message: string) => void;
}) {
  const { setShowcase } = useManualProjects();
  const stacked = useRailStacked();
  const noteId = React.useId();
  const press = () => {
    const next = !copy.on;
    setShowcase(projectId, next);
    announce(showcaseAnnouncement(next, name));
  };
  return (
    <RailFact label={copy.label} icon={EyeIcon}>
      <span className="block">
        <RailValue parts={copy.value} />
      </span>
      <span id={noteId} className="mt-1 block text-sm font-regular text-text-secondary">
        {copy.note}
      </span>
      {allowed && (
        <button
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
    </RailFact>
  );
}

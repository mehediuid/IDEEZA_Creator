"use client";

// The rail's Details block (COR-55): where the project came from, the day it
// was made when that isn't the meta line's date, and where it is kept. The
// build's chat isn't here: each lineage's chat heads its group in the
// Versions block (owner decision O9), so the chat has one home on the page.
// A buyer's preview keeps Source and Created and drops Stored (PPL-7).
//
// P2-CONTRIB-9 adds the first row: [Ownership | Your role], from
// `view.ownership` and the viewer — `detailsRows` (rail-copy.ts, T10) already
// builds it through `ownershipRow` (ownership.ts, T05); this file only wires
// `ownership`/`viewer` in and draws the row's quiet "See contributors" link,
// which selects the Contributors tab and brings it into view. Nothing here
// derives ownership itself (COR-74).

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { can, type Viewer } from "@/lib/manual/permissions";
import { withTab } from "@/lib/manual/project-route";
import type { ProjectSummary } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { detailsRows } from "@/lib/manual/rail-copy";
import { RailBlock, RailFact, RailFacts, RailValue } from "./rail-block";

/** Selects the Contributors tab (the same pushState the tab strip and the
 *  previews use, so `useSearchParams` picks it up with no server round
 *  trip) and scrolls its tab button into view once the panel below it has
 *  switched. */
function useGoToContributors(): () => void {
  const pathname = usePathname();
  const search = useSearchParams();
  return React.useCallback(() => {
    const qs = withTab(search.toString(), "contributors");
    window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      document.getElementById("tab-contributors")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    });
  }, [pathname, search]);
}

export function RailDetails({
  project,
  summary,
  viewer,
}: {
  project: ManualProject;
  summary: ProjectSummary;
  viewer: Viewer;
}) {
  const goToContributors = useGoToContributors();
  const rows = detailsRows({
    source: summary.source,
    when: summary.when,
    createdAt: project.createdAt,
    ownerFacts: can(viewer, "facts.seeOwnerOnly"),
    ownership: summary.ownership,
    viewer,
  });
  return (
    <RailBlock title="Details">
      <RailFacts>
        {rows.map((r) => (
          <RailFact key={r.key} label={r.label}>
            <span className="block">
              <RailValue parts={r.value} />
            </span>
            {r.note && <span className="mt-1 block text-sm font-regular text-text-secondary">{r.note}</span>}
            {r.link && (
              <button
                type="button"
                onClick={goToContributors}
                className="mt-1 block text-sm font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {r.link.label}
              </button>
            )}
          </RailFact>
        ))}
      </RailFacts>
    </RailBlock>
  );
}

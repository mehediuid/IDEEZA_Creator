"use client";

// The rail's Details block (COR-55): where the project came from, the day it
// was made when that isn't the meta line's date, and where it is kept. The
// build's chat isn't here: each lineage's chat heads its group in the
// Versions block (owner decision O9), so the chat has one home on the page.
// A buyer's preview keeps Source and Created and drops Stored (PPL-7).

import { can, type Viewer } from "@/lib/manual/permissions";
import type { ProjectSummary } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { detailsRows } from "@/lib/manual/rail-copy";
import { RailBlock, RailFact, RailFacts, RailValue } from "./rail-block";

export function RailDetails({
  project,
  summary,
  viewer,
}: {
  project: ManualProject;
  summary: ProjectSummary;
  viewer: Viewer;
}) {
  const rows = detailsRows({
    source: summary.source,
    when: summary.when,
    createdAt: project.createdAt,
    ownerFacts: can(viewer, "facts.seeOwnerOnly"),
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
          </RailFact>
        ))}
      </RailFacts>
    </RailBlock>
  );
}

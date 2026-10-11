"use client";

// The rail's About block (COR-55; "Details" until 2026-10-11).
//
// The owner reads what the header doesn't already say (`aboutRowsOf`, owner
// 2026-10-11: "show the data that's actually needed"): Created, Parts (over
// the built products the page shows), Network (its type and links, or Not
// added), Team (Just you, or You and n others) and Stored (this browser
// only). No row is a link: each is a fact, and its tab is one press away.
//
// A buyer's preview and Explore marketplace keep v1's rows (`detailsRows`):
// Source, and Created when it isn't the meta line's date — never Stored, the
// team or the network (PPL-7). Nothing here derives project state itself
// (COR-74): the parts come from the page's products, the network from its store.

import * as React from "react";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { ProjectProduct } from "@/lib/manual/project-read";
import type { ProjectSummary } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { aboutRowsOf, detailsRows, type DetailRow } from "@/lib/manual/rail-copy";
import { PROTOCOLS } from "@/lib/network/catalog";
import { useProjectNetwork } from "@/lib/network/store";
import { RailBlock, RailFact, RailFacts, RailValue } from "./rail-block";

export function RailDetails({
  project,
  summary,
  products,
  viewer,
}: {
  project: ManualProject;
  summary: ProjectSummary;
  products: ProjectProduct[];
  viewer: Viewer;
}) {
  const owner = can(viewer, "facts.seeOwnerOnly");
  const { network } = useProjectNetwork(owner ? project.id : null);

  const rows: DetailRow[] = React.useMemo(() => {
    if (!owner) {
      return detailsRows({ source: summary.source, when: summary.when, createdAt: project.createdAt, ownerFacts: false });
    }
    // The parts of the products the page shows as they are now: built, and in their lineage's current version.
    const built = products.filter((p) => p.built && !p.dropped);
    const protocol = network ? (PROTOCOLS.find((x) => x.key === network.protocol) ?? null) : null;
    return aboutRowsOf({
      createdAt: project.createdAt,
      parts: built.length ? built.reduce((n, p) => n + (p.built?.product.parts.length ?? 0), 0) : null,
      network: network ? { protocol: protocol?.radioLabel ?? protocol?.name ?? "Custom", links: network.links.length } : null,
      team: (project.contributors ?? []).length,
    });
  }, [owner, summary.source, summary.when, project.createdAt, project.contributors, products, network]);

  if (rows.length === 0) return null;
  return (
    <RailBlock title="About">
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

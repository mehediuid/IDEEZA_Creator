"use client";

// network-tab.tsx — the Network tab's panel (§5.9, owner decision O3:
// "Network is its own tab"). The owner gets the shipped NetworkSection
// unchanged (COR-45): Create Network (quiet, COR-46) or View Network, the
// summary, connections and role chips — no kebab, no second entry (D10).
// A buyer (`?view=buyer`) gets a read-only summary with no Create/View
// Network control (PPL-6), or nothing at all when there's no network to
// read (COR-49) — an empty state never earns a call to action (PPL-8).
//
// Amendment (task-C1.md Hand-off): the shell draws the panel element
// (`id="panel-network"`, `role="tabpanel"`, `aria-labelledby="tab-network"`)
// around whatever this slot returns, so neither branch here renders one of
// its own.

import * as React from "react";
import type { ManualProject } from "@/lib/manual/projects";
import type { Viewer } from "@/lib/manual/permissions";
import type { BuildRef } from "@/lib/manual/project-read";
import { isBuyerPreview, networkTabVisible } from "@/lib/manual/buyer-preview";
import { NetworkSection, NetworkSummary } from "@/components/network/network-section";
import { networkProducts } from "@/lib/network/products";
import { useProjectNetwork } from "@/lib/network/store";

/** Whether the tab-strip should offer "Network" at all: always for the
 *  owner (Create Network is its empty state); for a buyer, only once
 *  there's a network to read (COR-49). `hydrated` is the network store's
 *  own read, which the page's skeleton waits for. */
export function useNetworkTabVisible(projectId: string, viewer: Viewer): { hydrated: boolean; shown: boolean } {
  const { hydrated, network } = useProjectNetwork(projectId);
  return { hydrated, shown: networkTabVisible(viewer, hydrated, network !== null) };
}

export function NetworkTab({
  project,
  refs,
  viewer,
}: {
  project: ManualProject;
  /** Every build the project holds (`view.refs`, COR-48). */
  refs: BuildRef[];
  viewer: Viewer;
}) {
  if (isBuyerPreview(viewer)) {
    return <NetworkTabPreview project={project} refs={refs} />;
  }
  return <NetworkSection project={project} refs={refs} />;
}

function NetworkTabPreview({ project, refs }: { project: ManualProject; refs: BuildRef[] }) {
  const { hydrated, network } = useProjectNetwork(project.id);
  const products = React.useMemo(() => networkProducts(project, refs), [project, refs]);

  // COR-49 "absent" branch: nothing to preview yet, so nothing renders —
  // not even a heading (PPL-8: no empty state earns a call to action).
  if (!hydrated || !network) return null;

  return (
    <>
      <h2 id="network-heading" className="text-lg font-bold text-text-primary">
        Network
      </h2>
      <NetworkSummary project={project} network={network} products={products} readOnly />
    </>
  );
}

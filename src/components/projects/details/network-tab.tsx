"use client";

// network-tab.tsx — the Network tab's panel (§5.9, owner decision O3:
// "Network is its own tab"). Whoever may manage the network — the owner of a
// project that isn't sold in full (`can(viewer, "network.manage", canCtx)`,
// §3.8.5) — gets the shipped NetworkSection unchanged (COR-45): Create
// Network (quiet, COR-46) or View Network, the summary, connections and role
// chips — no kebab, no second entry (D10). Everyone else — a buyer or
// contributor preview, a demo buyer, the owner of a locked project — gets a
// read-only summary with no Create/View Network control (PPL-6). A visitor
// only reaches the tab once there is a network to read (`projectTabsFor`,
// COR-49); anyone else who has none reads one plain line, never a call to
// action (PPL-8).
//
// The shell draws the panel element (`id="panel-network"`, `role="tabpanel"`)
// around whatever this slot returns, so neither branch renders one of its own.

import * as React from "react";
import type { ManualProject } from "@/lib/manual/projects";
import { can, type CanContext, type Viewer } from "@/lib/manual/permissions";
import type { BuildRef } from "@/lib/manual/project-read";
import { NetworkSection, NetworkSummary } from "@/components/network/network-section";
import { networkProducts } from "@/lib/network/products";
import { useProjectNetwork } from "@/lib/network/store";

export function NetworkTab({
  project,
  refs,
  viewer,
  canCtx,
}: {
  project: ManualProject;
  /** Every build the project holds (`view.refs`, COR-48). */
  refs: BuildRef[];
  viewer: Viewer;
  /** `view.canCtx`: the lock refuses network.manage (§3.8.5). */
  canCtx: CanContext;
}) {
  if (!can(viewer, "network.manage", canCtx)) {
    return <NetworkReadOnly project={project} refs={refs} />;
  }
  return <NetworkSection project={project} refs={refs} />;
}

function NetworkReadOnly({ project, refs }: { project: ManualProject; refs: BuildRef[] }) {
  const { hydrated, network } = useProjectNetwork(project.id);
  const products = React.useMemo(() => networkProducts(project, refs), [project, refs]);

  // The page's skeleton waits for the network store, so this is a frame at most.
  if (!hydrated) return null;

  return (
    <>
      <h2 id="network-heading" className="text-lg font-bold text-text-primary">
        Network
      </h2>
      {network ? (
        <NetworkSummary project={project} network={network} products={products} readOnly />
      ) : (
        <p className="mt-4 text-md text-text-secondary">This project has no network.</p>
      )}
    </>
  );
}

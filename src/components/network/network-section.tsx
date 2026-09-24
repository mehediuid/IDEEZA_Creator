"use client";

// NetworkSection — the project page's Network (Figma 01 / 10), in the
// project page's own section style. No network: what one is and the one way
// to make it (spec D10 — this is Create Network's home). A network: its
// summary, its connections, its products and their roles, and the way to
// the Connection Map.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, ConnectIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import type { BuildJob } from "@/lib/create/history";
import type { ManualProject } from "@/lib/manual/projects";
import { protocolInfo } from "@/lib/network/catalog";
import { linkTitle, nodeName, rolesOf } from "@/lib/network/derive";
import { networkProducts } from "@/lib/network/products";
import { useProjectNetwork } from "@/lib/network/store";
import { useRouter } from "next/navigation";
import { AddNetworkDialog } from "./add-network-dialog";
import { networkMeta } from "./summary";
import { RoleChip, SectionTitle, btn } from "./ui";

export const networkHref = (projectId: string) => `/projects/${projectId}/network`;

export function NetworkSection({ project, build }: { project: ManualProject; build: BuildJob | null }) {
  const router = useRouter();
  const { hydrated, network } = useProjectNetwork(project.id);
  const [open, setOpen] = React.useState(false);
  const products = React.useMemo(() => networkProducts(project, build), [project, build]);

  return (
    <section aria-labelledby="network-heading" className="mt-16">
      <h2 id="network-heading" className="text-lg font-bold text-text-primary">
        Network
      </h2>
      {!hydrated ? null : !network ? (
        <div className="mt-7 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-bg-surface px-10 py-16 text-center">
          <span aria-hidden className="text-text-tertiary">
            <Icon icon={ConnectIcon} size={24} />
          </span>
          <p className="text-md font-semibold text-text-primary">No network yet</p>
          <p className="max-w-[56ch] text-sm text-text-secondary">
            A network records which products in this project talk to each other, over which protocol, and what each one does.
          </p>
          <button type="button" className={cn(btn.primary, "mt-2")} onClick={() => setOpen(true)}>
            Create Network
          </button>
        </div>
      ) : (
        <NetworkSummary project={project} network={network} products={products} />
      )}
      {open && (
        <AddNetworkDialog
          project={project}
          build={build}
          onClose={() => setOpen(false)}
          onViewNetwork={() => router.push(networkHref(project.id))}
        />
      )}
    </section>
  );
}

function NetworkSummary({
  project,
  network,
  products,
}: {
  project: ManualProject;
  network: NonNullable<ReturnType<typeof useProjectNetwork>["network"]>;
  products: ReturnType<typeof networkProducts>;
}) {
  const members = products.filter((p) => network.productIds.includes(p.id));
  const roles = rolesOf(network.productIds, network.links, network.masterId);
  const name = (id: string) => nodeName(id, products, network.cloudType);
  const row = "flex items-center gap-6 border-b border-solid border-border px-7 py-5 last:border-b-0";
  return (
    <div className="mt-7 flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="truncate text-md font-semibold text-text-primary">{network.name || "Unnamed Network"}</p>
          <p className="mt-1 text-sm text-text-secondary">{networkMeta(network)}</p>
        </div>
        <Link href={networkHref(project.id)} className={cn(btn.quiet, "no-underline")}>
          View Network
          <Icon icon={ArrowRight01Icon} size={16} />
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <SectionTitle>Connections</SectionTitle>
        <ul role="list" className="overflow-hidden rounded-lg border border-solid border-border bg-bg-surface">
          {network.links.map((l) => (
            <li key={l.id} className={row}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{linkTitle(l, name)}</p>
                <p className="truncate text-xs text-text-secondary">{l.label}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-text-brand">
                {l.from === "app" || l.to === "app" ? "Cloud" : protocolInfo(l.protocol).name}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-4">
        <SectionTitle>Products</SectionTitle>
        <ul role="list" className="overflow-hidden rounded-lg border border-solid border-border bg-bg-surface">
          {members.map((p) => (
            <li key={p.id} className={row}>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{p.name}</span>
              <RoleChip role={roles[p.id] ?? "Standby"} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

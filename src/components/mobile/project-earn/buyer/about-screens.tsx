"use client";

// BUY-9 · who built it and how its products talk, as a buyer reads them (the web's shop page has a Team tab when
// there are contributors and a Network tab when there is a network, CL-018; `projectTabsFor`): About on the
// buyer's screens — the shop (market-screen.tsx) and Preview as others see it (preview-screen.tsx) — carries a Team
// row and a Network row, each pushing a read-only screen of its own (the owner's 06 Team and 06b Network without
// their controls):
// · Team `…/market/team` (`…/preview/team?view=buyer`): the creator first, as a buyer knows them (the product
//   page's Contributors tab, 10z), then each contributor with their role (the web's `teamOf`); no shares, no
//   Message, no Splits. With no contributors there is no Team, so its address goes back;
// · Network `…/market/network` (`…/preview/network?view=buyer`): the network's name and line, its summary, the
//   connections and each product's role in plain words — no Create or Edit (the web's read-only NetworkSummary).
// The shop's own rules hold here too: a listing that isn't on the marketplace, or is paused, says so (BUY-4).

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShareKnowledgeIcon } from "@hugeicons/core-free-icons";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useCreatorName } from "@/components/marketplace/use-creator-name";
import { networkMeta, networkSummaryRows } from "@/components/network/summary";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { AS_PARAM, VIEW_PARAM } from "@/lib/manual/buyer-preview";
import { initialsOf, teamOf } from "@/lib/manual/contributors";
import { phoneMarketHref } from "@/lib/manual/phone-earn";
import { offMarketNow, PHONE_ROLE_LABEL, phoneProjectPath } from "@/lib/manual/phone-project";
import { projectTabsFor } from "@/lib/manual/project-route";
import type { ManualProject } from "@/lib/manual/projects";
import { aboutRowsOf } from "@/lib/manual/rail-copy";
import { PROTOCOLS, protocolInfo } from "@/lib/network/catalog";
import { linkTitle, nodeName, rolesOf } from "@/lib/network/derive";
import { networkProducts } from "@/lib/network/products";
import { useProjectNetwork } from "@/lib/network/store";
import type { Network } from "@/lib/network/types";
import { cn } from "@/lib/utils";
import { LIST_ROW, ListCard } from "../../kit/list";
import { EmptyState } from "../../kit/state";
import { OffMarket } from "../../product/states";
import type { Ready } from "../../project/context";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";
import { T } from "../../type";
import type { AboutLink } from "./parts";

export type BuyerContext = "market" | "preview";
export type AboutScreen = "team" | "network";

/** `?view=buyer` (and `as=`) of a preview, without the "?"; "" when none. */
export function previewQueryOf(params: Pick<URLSearchParams, "get">): string {
  const q = new URLSearchParams();
  const v = params.get(VIEW_PARAM);
  const as = params.get(AS_PARAM);
  if (v) q.set(VIEW_PARAM, v);
  if (as) q.set(AS_PARAM, as);
  return q.toString();
}

/** A buyer's Team or Network screen: under the shop, or under the preview with its query. */
export function buyerAboutHref(projectId: string, context: BuyerContext, screen: AboutScreen, query = ""): string {
  if (context === "market") return `${phoneMarketHref(projectId)}/${screen}`;
  return `${phoneProjectPath(projectId, `preview/${screen}`)}${query ? `?${query}` : ""}`;
}

/** "1 person", "3 people". */
const peopleOf = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

/** The network's protocol as About names it (the owner's About and the contributor preview read it so). */
function protocolLabelOf(network: Network): string {
  const p = PROTOCOLS.find((x) => x.key === network.protocol) ?? null;
  return p?.radioLabel ?? p?.name ?? "Custom";
}

/** About's Team and Network rows for a buyer: Team once there are contributors, Network once there is one — the
 *  web's tabs for the same viewer (`projectTabsFor`). Each pushes its read-only screen. */
export function useBuyerAboutLinks(data: Ready, context: BuyerContext, query = ""): AboutLink[] {
  const { project, viewer } = data;
  const { network } = useProjectNetwork(project.id);
  const contributors = (project.contributors ?? []).length;
  const tabs = projectTabsFor(viewer, { networkReadable: network !== null, contributors });
  const links: AboutLink[] = [];
  if (tabs.includes("team") && contributors > 0) {
    // The creator and everyone who worked on it, as the Team screen lists them.
    links.push({ label: "Team", value: peopleOf(contributors + 1), href: buyerAboutHref(project.id, context, "team", query) });
  }
  if (network && tabs.includes("network")) {
    const row = aboutRowsOf({ createdAt: project.createdAt, parts: null, network: { protocol: protocolLabelOf(network), links: network.links.length }, team: 0 }).find(
      (r) => r.key === "network",
    );
    const value = row ? row.value.map((m) => (m.kind === "text" ? m.text : "")).join("") : network.name;
    links.push({ label: "Network", value, href: buyerAboutHref(project.id, context, "network", query) });
  }
  return links;
}

// ─────────────────────────── the screens ───────────────────────────

/** Reads the project as the buyer of this context does, and holds the shop's own states. */
function useBuyerRead(id: string, context: BuyerContext, screen: AboutScreen): { node: React.ReactNode } | { data: Ready; back: string; query: string } {
  const data = useProjectPageData(id, context === "market" ? "market" : "project");
  const params = useSearchParams();
  const router = useRouter();
  const query = previewQueryOf(params);
  const owner = context === "preview" && data.state === "ready" && data.viewer.kind === "local-owner";
  // A preview address with no preview in it is the owner's own screen.
  React.useEffect(() => {
    if (owner) router.replace(phoneProjectPath(id, screen));
  }, [owner, router, id, screen]);
  if (data.state === "loading" || owner) return { node: <AboutLoading /> };
  if (data.state === "missing") return { node: <OffMarket paused={false} /> };
  if (context === "market") {
    const shopper = data.viewer.kind === "demo-buyer" ? data.viewer.buyerId : null;
    if (offMarketNow({ listing: data.view.listing.kind, projectId: data.project.id, sales: data.view.sales, buyerId: shopper })) return { node: <OffMarket paused /> };
  }
  const back = context === "market" ? phoneMarketHref(data.project.id) : `${phoneProjectPath(data.project.id, "preview")}${query ? `?${query}` : ""}`;
  return { data, back, query };
}

function ReplaceWith({ href }: { href: string }) {
  const router = useRouter();
  React.useEffect(() => router.replace(href), [router, href]);
  return null;
}

function AboutLoading() {
  return (
    <Screen top={<TopBar back />}>
      <div role="status" aria-label="Loading" className="flex flex-col gap-6 px-8 pb-8">
        <Skeleton shape="text" size="md" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} shape="block" className="h-[64px] w-full" />
        ))}
      </div>
    </Screen>
  );
}

/** 06 for a buyer: the creator, then each contributor with their role. */
export function BuyerTeamScreen({ id, context }: { id: string; context: BuyerContext }) {
  const read = useBuyerRead(id, context, "team");
  const creator = useCreatorName();
  if ("node" in read) return read.node;
  const { data, back } = read;
  const team = teamOf(data.project.contributors ?? []);
  const rows = [{ id: "creator", name: creator, role: "Creator" }, ...team];
  return (
    <Screen top={<TopBar back={back} title="Team" />} className="px-8 pb-12">
      <div className="flex flex-col gap-8">
        <p className={cn(T.meta, "min-w-0 truncate")}>{data.project.name}</p>
        {team.length === 0 ? (
          // A buyer has no Team without contributors (the web shows no tab): back to where it was linked from.
          <ReplaceWith href={back} />
        ) : (
          <ListCard label="Team">
            {rows.map((t) => (
              <li key={t.id} className={cn(LIST_ROW, "hover:bg-transparent")}>
                <Avatar phone size="lg" initials={initialsOf(t.name)} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={cn(T.name, "truncate")}>{t.name}</span>
                  <span className={T.meta}>{t.role}</span>
                </span>
              </li>
            ))}
          </ListCard>
        )}
      </div>
    </Screen>
  );
}

/** 06b for a buyer: the network, read-only. */
export function BuyerNetworkScreen({ id, context }: { id: string; context: BuyerContext }) {
  const read = useBuyerRead(id, context, "network");
  const ready = "data" in read ? read.data : null;
  const { hydrated, network } = useProjectNetwork(ready?.project.id ?? null);
  if ("node" in read) return read.node;
  if (!hydrated) return <AboutLoading />;
  const { data, back } = read;
  return (
    <Screen top={<TopBar back={back} title="Network" />} className="px-8 pb-12">
      <div className="flex flex-col gap-8">
        <p className={cn(T.meta, "min-w-0 truncate")}>{data.project.name}</p>
        {network ? (
          <NetworkRead project={data.project} refs={data.view.refs} network={network} />
        ) : (
          // The web's read-only tab with none: one plain line, never a call to action.
          <EmptyState icon={ShareKnowledgeIcon} title="This project has no network." />
        )}
      </div>
    </Screen>
  );
}

function NetworkRead({ project, refs, network }: { project: ManualProject; refs: Ready["view"]["refs"]; network: Network }) {
  const products = networkProducts(project, refs);
  const members = products.filter((p) => network.productIds.includes(p.id));
  const roles = rolesOf(network.productIds, network.links, network.masterId);
  const name = (id: string) => nodeName(id, products, network.cloudType);
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className={T.section}>{network.name || "Unnamed Network"}</h1>
        <p className={T.meta}>{networkMeta(network)}</p>
      </div>
      <ListCard label="Summary">
        {networkSummaryRows(network, products).map((r) => (
          <li key={r.label} className={cn(LIST_ROW, "min-h-[44px] hover:bg-transparent")}>
            <span className={cn(T.body, "shrink-0")}>{r.label}</span>
            <span className={cn(T.body, "min-w-0 flex-1 truncate text-right text-text-primary")}>{r.value}</span>
          </li>
        ))}
      </ListCard>
      {network.links.length > 0 && (
        <section aria-labelledby="bn-links" className="flex flex-col gap-4">
          <h2 id="bn-links" className={T.section}>
            Connections
          </h2>
          <ListCard label="Connections">
            {network.links.map((l) => (
              <li key={l.id} className={cn(LIST_ROW, "hover:bg-transparent")}>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={cn(T.rowTitle, "truncate")}>{linkTitle(l, name)}</span>
                  <span className={cn(T.meta, "truncate")}>{l.label}</span>
                </span>
                <Badge tone="neutral">{l.from === "app" || l.to === "app" ? "Cloud" : protocolInfo(l.protocol).name}</Badge>
              </li>
            ))}
          </ListCard>
        </section>
      )}
      {members.length > 0 && (
        <section aria-labelledby="bn-products" className="flex flex-col gap-4">
          <h2 id="bn-products" className={T.section}>
            Products
          </h2>
          <ListCard label="Products">
            {members.map((p) => (
              <li key={p.id} className={cn(LIST_ROW, "hover:bg-transparent")}>
                <span className={cn(T.rowTitle, "min-w-0 flex-1 truncate")}>{p.name}</span>
                <Badge tone="brand">{PHONE_ROLE_LABEL[roles[p.id] ?? "Standby"]}</Badge>
              </li>
            ))}
          </ListCard>
        </section>
      )}
    </>
  );
}

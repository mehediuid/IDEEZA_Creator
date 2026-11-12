"use client";

// 01 · Overview (owner decisions M2, M3, M5, M6): what the web's rail and
// Products tab say, in one column —
// · Activity: the current entry (the web's `view.current`) and + Add; the full
//   timeline is the Activity tab;
// · Products: the count and pieces line, the Build check, the first 3 rows,
//   See all → the Products tab;
// · Versions: the current version, See all → the Versions screen (05);
// · About: Created, Parts, Team ›, Network ›, Stored (`aboutRowsOf`; Team and
//   Network open their own screens, 06);
// · Recent (20b): the web's rail log, once the project has gone out.

import * as React from "react";
import Link from "next/link";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza/button";
import { Badge } from "@/components/ideeza/badge";
import { can } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { shortOf } from "@/lib/manual/journey";
import { aboutRowsOf } from "@/lib/manual/rail-copy";
import { LOG_SHOWN, logLinesOf, versionGroupsOf } from "@/lib/manual/rail-rows";
import { phoneProjectHref, phoneProjectPath, phoneWords } from "@/lib/manual/phone-project";
import { PROTOCOLS } from "@/lib/network/catalog";
import { useProjectNetwork } from "@/lib/network/store";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useProject } from "./context";
import { BuildCheckLine, useProductRows } from "./product-rows";
import { Chevron, InfoRow, LINK_MD, LIST_CARD, ListCard, ProductRow, SectionHeading, SubLine } from "./parts";

export function OverviewTab() {
  const { project, view, viewer } = useProject();
  const owner = can(viewer, "facts.seeOwnerOnly");
  return (
    <div className="flex flex-col gap-12">
      <ActivitySection />
      <ProductsSection />
      <VersionsSection />
      <AboutSection />
      {owner && view.summary.status !== "draft" && <RecentSection key={project.id} />}
    </div>
  );
}

function ActivitySection() {
  const { project, view, viewer } = useProject();
  const now = view.current;
  const canAdd = can(viewer, "activity.write", view.canCtx);
  return (
    <section aria-labelledby="ov-activity" className="flex flex-col gap-4">
      <SectionHeading
        id="ov-activity"
        title="Activity"
        action={
          canAdd ? (
            <Link
              href={phoneProjectPath(project.id, "activity/new")}
              aria-label="Add activity"
              className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}
            >
              <Icon icon={Add01Icon} size={20} />
              Add
            </Link>
          ) : undefined
        }
      />
      <Link
        href={phoneProjectHref(project.id, "activity")}
        className={cn(LIST_CARD, "gap-3 px-8 py-6 outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle")}
      >
        <span className="flex items-center gap-4">
          <Badge tone="brand-outline">{shortOf(now)}</Badge>
          <span className={T.body}>{formatDate(now.createdAt)}</span>
        </span>
        <span className={cn(T.body, "line-clamp-2 text-text-primary")}>{now.description || "Project created."}</span>
      </Link>
    </section>
  );
}

function ProductsSection() {
  const { project } = useProject();
  const { rows, line, headline } = useProductRows();
  return (
    <section aria-labelledby="ov-products" className="flex flex-col gap-4">
      <SectionHeading
        id="ov-products"
        title="Products"
        link={rows.length ? { href: phoneProjectHref(project.id, "products"), label: "See all", aria: "See all products" } : undefined}
      />
      <SubLine>{line}</SubLine>
      <BuildCheckLine headline={headline} />
      {rows.length > 0 ? (
        <ListCard label="Products">
          {rows.slice(0, 3).map((r) => (
            <ProductRow key={r.id} href={r.href} thumb={r.thumb} name={r.name} stage={r.stage} meta={r.meta} facts={r.facts} />
          ))}
        </ListCard>
      ) : (
        <SubLine>No products yet. Add one on the Products tab.</SubLine>
      )}
    </section>
  );
}

function VersionsSection() {
  const { project, view } = useProject();
  const groups = React.useMemo(() => versionGroupsOf(view.versions, view.lineages, project.id), [view.versions, view.lineages, project.id]);
  const group = groups.find((g) => g.rows.some((r) => r.title.endsWith("current"))) ?? groups[0];
  const row = group?.rows.find((r) => r.title.endsWith("current")) ?? group?.rows[0];
  if (!group || !row) return null;
  const saved = row.saved?.map((m) => (m.kind === "time" ? m.time.text : m.text)).join("") ?? null;
  const href = phoneProjectPath(project.id, "versions");
  return (
    <section aria-labelledby="ov-versions" className="flex flex-col gap-4">
      <SectionHeading id="ov-versions" title="Versions" link={{ href, label: "See all", aria: "See all versions" }} />
      <Link
        href={href}
        className={cn(LIST_CARD, "flex-row items-center gap-6 p-6 outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle")}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={T.name}>{row.title}</span>
          <span className={T.meta}>{[saved, row.pieces].filter(Boolean).join(" · ")}</span>
          <span className={cn(T.meta, "truncate")}>{group.heading}</span>
        </span>
        <Chevron />
      </Link>
    </section>
  );
}

function AboutSection() {
  const { project, view, viewer } = useProject();
  const owner = can(viewer, "facts.seeOwnerOnly");
  const { network } = useProjectNetwork(owner ? project.id : null);
  const rows = React.useMemo(() => {
    const built = view.products.filter((p) => p.built && !p.dropped);
    const protocol = network ? (PROTOCOLS.find((x) => x.key === network.protocol) ?? null) : null;
    const all = aboutRowsOf({
      createdAt: project.createdAt,
      parts: built.length ? built.reduce((n, p) => n + (p.built?.product.parts.length ?? 0), 0) : null,
      network: network ? { protocol: protocol?.radioLabel ?? protocol?.name ?? "Custom", links: network.links.length } : null,
      team: (project.contributors ?? []).length,
    });
    // The phone's order (Figma 01): Created, Parts, Team, Network, Stored.
    const order = ["created", "parts", "team", "network", "stored"];
    return [...all].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }, [project, view.products, network]);
  const hrefOf: Record<string, string> = {
    team: phoneProjectPath(project.id, "team"),
    network: phoneProjectPath(project.id, "network"),
  };
  return (
    <section aria-labelledby="ov-about" className="flex flex-col gap-4">
      <SectionHeading id="ov-about" title="About" />
      <ListCard label="About">
        {rows.map((r) => (
          <InfoRow
            key={r.key}
            label={r.label}
            value={r.value.map((m) => (m.kind === "time" ? m.time.text : m.text)).join("")}
            href={owner ? hrefOf[r.key] : undefined}
          />
        ))}
      </ListCard>
    </section>
  );
}

function RecentSection() {
  const { view } = useProject();
  const lines = React.useMemo(() => logLinesOf(view.log, { network: true, products: view.products }), [view.log, view.products]);
  const [all, setAll] = React.useState(false);
  if (lines.length === 0) return null;
  const shown = all ? lines : lines.slice(0, LOG_SHOWN);
  return (
    <section aria-labelledby="ov-recent" className="flex flex-col gap-4">
      <SectionHeading id="ov-recent" title="Recent" />
      <ul className="flex flex-col gap-6">
        {shown.map((l) => (
          <li key={l.key} className="flex flex-col gap-1">
            {/* The phone has no Innovations: the web's "Shared to Innovations" reads "Shared to Feed". */}
            <span className={T.rowTitle}>{phoneWords(l.title)}</span>
            {l.note && <span className={T.meta}>{phoneWords(l.note)}</span>}
            <span className={cn(T.meta, "text-text-tertiary")}>{l.when.map((m) => (m.kind === "time" ? m.time.text : m.text)).join("")}</span>
          </li>
        ))}
      </ul>
      {lines.length > LOG_SHOWN && (
        <div>
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className={cn(LINK_MD, "-my-6 inline-flex min-h-[44px] items-center")}
          >
            {all ? "Show less" : `Show all (${lines.length})`}
          </button>
        </div>
      )}
    </section>
  );
}

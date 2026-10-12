"use client";

// The owner's Activity card (owner, 2026-10-13: "Activity went inside the ⋯ —
// it has to stand out, and I couldn't find the NFTs' activity"): Activity's
// one home on the owner's side. The rail's lead block on the project page
// (above the tab strip below a 1024 px page), the first block of a product
// page's rail. One row per target, each with its current activity:
// - the project page: the project, each current product, the Main NFT once
//   minted, and each Physical / Virtual scope once it has a track;
// - a product page: that product and its own Physical / Virtual scopes.
// A row opens that target's Activity History, where + Add lives.

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza";
import {
  WHOLE_PROJECT_SCOPE,
  currentOf,
  labelOf,
  shortOf,
  targetKey,
  targetNameOf,
  type ActivityTarget,
} from "@/lib/manual/journey";
import { productAddedAt } from "@/lib/manual/journey-dates";
import { useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { formatDate } from "@/lib/manual/project-summary";
import { RailBlock } from "../rail-block";
import type { SlotProps } from "../slots";
import { ActivityDrawer } from "./drawer";

type Row = { key: string; target: ActivityTarget; name: string; defaultAt?: number };

const KINDS = ["physical", "virtual"] as const;

const ROW =
  "flex min-h-[var(--touch-min)] w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus";

/** The targets the card lists, in order; `productId` scopes it to a product page. */
function rowsOf({ project, view }: Pick<SlotProps, "project" | "view">, productId?: string): Row[] {
  const nameOf = (id: string) => displayProductName(view.products.find((p) => p.id === id)?.name ?? "A product");
  const names = { project: project.name.trim() || "Untitled project", productName: nameOf };
  const row = (target: ActivityTarget, defaultAt?: number): Row => ({
    key: targetKey(target),
    target,
    name: targetNameOf(target, names),
    defaultAt,
  });
  const products = view.products.filter((p) => p.dropped === null && (productId === undefined || p.id === productId));
  const copies = (scope: string) =>
    KINDS.filter((kind) => view.editions.some((t) => t.productId === scope && t.kind === kind)).map((kind) => row({ kind, scope }));

  if (productId !== undefined) {
    return products.flatMap((p) => [
      row({ kind: "product", productId: p.id }, productAddedAt(project, view.refs, p)),
      ...copies(p.id),
    ]);
  }
  const minted = view.summary.status !== "draft" && view.mint.status !== "notMinted";
  return [
    row({ kind: "project" }, project.createdAt),
    ...products.map((p) => row({ kind: "product", productId: p.id }, productAddedAt(project, view.refs, p))),
    ...(minted ? [row({ kind: "main" })] : []),
    ...copies(WHOLE_PROJECT_SCOPE),
    ...products.flatMap((p) => copies(p.id)),
  ];
}

export function ActivityCard({
  project,
  view,
  viewer,
  now,
  announce,
  productId,
}: Pick<SlotProps, "project" | "view" | "viewer" | "now" | "announce"> & { productId?: string }) {
  const { hydrated, record } = useJourney(project.id);
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const rows = React.useMemo(() => rowsOf({ project, view }, productId), [project, view, productId]);
  const products = React.useMemo(() => view.products.map((p) => ({ id: p.id, name: p.name })), [view.products]);
  if (!hydrated || rows.length === 0) return null;

  const canWrite = can(viewer, "activity.write", view.canCtx);
  const open = rows.find((r) => r.key === openKey) ?? null;
  const lead = currentOf(record, project.id, rows[0].target, rows[0].defaultAt);

  return (
    <RailBlock title="Activity" meta={lead ? `Now: ${labelOf(lead)}` : undefined} collapsible={false}>
      <p className="-mt-2 text-sm text-text-secondary">What buyers see as each one&apos;s journey. Open one to add to it.</p>
      <ul role="list" className="m-0 flex list-none flex-col overflow-hidden rounded-xl border border-solid border-border p-0">
        {rows.map((r) => {
          const current = currentOf(record, project.id, r.target, r.defaultAt);
          return (
            <li key={r.key} className="border-t border-solid border-border first:border-t-0">
              <button type="button" data-activity-row={r.key} onClick={() => setOpenKey(r.key)} className={ROW}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-text-primary">{r.name}</span>
                  <span className="text-xs text-text-tertiary">
                    {current ? formatDate(current.createdAt) : canWrite ? "No activity yet" : "None yet"}
                  </span>
                </span>
                {current ? (
                  <Badge tone="brand-outline">
                    <span aria-hidden>{shortOf(current)}</span>
                    <span className="sr-only">Now: {labelOf(current)}</span>
                  </Badge>
                ) : (
                  canWrite && <span className="text-sm font-medium text-text-brand">+ Add</span>
                )}
                <Icon icon={ArrowRight01Icon} size={14} className="shrink-0 text-text-tertiary" />
              </button>
            </li>
          );
        })}
      </ul>
      <ActivityDrawer
        open={open !== null}
        onClose={() => {
          const key = openKey;
          setOpenKey(null);
          requestAnimationFrame(() => {
            if (key) document.querySelector<HTMLElement>(`[data-activity-row="${CSS.escape(key)}"]`)?.focus();
          });
        }}
        projectId={project.id}
        target={open?.target ?? rows[0].target}
        targetName={open?.name ?? rows[0].name}
        defaultAt={open ? open.defaultAt : rows[0].defaultAt}
        products={products}
        canWrite={canWrite}
        isPreview={false}
        announce={announce}
        now={now}
      />
    </RailBlock>
  );
}

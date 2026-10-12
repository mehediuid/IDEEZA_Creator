"use client";

// The owner's Activity, at the top of the rail (owner, 2026-10-13: "Activity
// went inside the ⋯", then "the project's and its products' activity in one
// place confuses — and where are the NFTs'?"). Two blocks, one page's own:
// - Activity: this page's journey only — the project's on the project page,
//   the product's on a product page — read as a buyer reads it (Now, Earlier),
//   with + Add activity and, once there are entries, Edit history.
// - NFT activity: a tab per NFT this page can sell — Main, Physical and
//   Virtual on the project page (the whole project's copies); Physical and
//   Virtual on a product page (its own). A tab is always there: before the
//   NFT exists it says so and links to Earn › Sell, where it is made.
// Each opens the Activity History drawer of its own target. This is
// Activity's one home on the owner's side: neither ⋯ menu nor Earn › Sell has it.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza";
import { earnHref } from "@/lib/manual/earn-route";
import {
  WHOLE_PROJECT_SCOPE,
  activitiesOf,
  currentOf,
  targetKey,
  type ActivityTarget,
} from "@/lib/manual/journey";
import { productAddedAt } from "@/lib/manual/journey-dates";
import { useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { cn } from "@/lib/utils";
import { RailBlock } from "../rail-block";
import type { SlotProps } from "../slots";
import { ActivityDrawer } from "./drawer";
import { ActivityNow } from "./now-block";

type Props = Pick<SlotProps, "project" | "view" | "viewer" | "now" | "announce">;

type NftTab = {
  key: string;
  label: string;
  target: ActivityTarget;
  /** The drawer's subtitle. */
  name: string;
  /** Null once the NFT exists; else what the tab says, and where it is made. */
  missing: { line: string; href: string } | null;
};

const QUIET_LINK =
  "inline-flex min-h-[32px] items-center gap-1 self-start rounded-sm text-sm font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";

export function ActivityCard({ project, view, viewer, now, announce, productId }: Props & { productId?: string }) {
  const product = productId ? (view.products.find((p) => p.id === productId) ?? null) : null;
  if (productId && !product) return null;
  const pageName = product ? displayProductName(product.name) : project.name.trim() || "Untitled project";
  const target: ActivityTarget = product ? { kind: "product", productId: product.id } : { kind: "project" };
  const defaultAt = product ? productAddedAt(project, view.refs, product) : project.createdAt;

  const minted = view.summary.status !== "draft" && view.mint.status !== "notMinted";
  const scope = product ? product.id : WHOLE_PROJECT_SCOPE;
  const owner = product ? pageName : "Whole project";
  const sell = earnHref(project.id, product ? "copies" : "sell");
  const copy = (kind: "physical" | "virtual"): NftTab => {
    const label = kind === "physical" ? "Physical NFT" : "Virtual NFT";
    const exists = view.editions.some((t) => t.productId === scope && t.kind === kind);
    return {
      key: kind,
      label,
      target: { kind, scope },
      name: `${owner} · ${label}`,
      missing: exists ? null : { line: `No ${label} yet — sell ${kind} copies first.`, href: sell },
    };
  };
  const tabs: NftTab[] = [
    ...(product
      ? []
      : [
          {
            key: "main",
            label: "Main NFT",
            target: { kind: "main" } as const,
            name: "Main NFT",
            missing: minted ? null : { line: "No Main NFT yet — mint the project first.", href: earnHref(project.id, "sell") },
          },
        ]),
    copy("physical"),
    copy("virtual"),
  ];

  const shared = { projectId: project.id, view, viewer, now, announce };
  return (
    <div className="divide-y divide-border">
      <RailBlock title="Activity" collapsible={false}>
        <TargetActivity {...shared} target={target} name={pageName} defaultAt={defaultAt} />
      </RailBlock>
      <RailBlock title="NFT activity" collapsible={false}>
        <NftActivity {...shared} tabs={tabs} />
      </RailBlock>
    </div>
  );
}

/** One target's journey as a buyer reads it, with the owner's two doors into its drawer. */
function TargetActivity({
  projectId,
  view,
  viewer,
  now,
  announce,
  target,
  name,
  defaultAt,
  compact = false,
}: Omit<Props, "project"> & { projectId: string; target: ActivityTarget; name: string; defaultAt?: number; compact?: boolean }) {
  const { hydrated, record } = useJourney(projectId);
  const [drawer, setDrawer] = React.useState<"list" | "add" | null>(null);
  const products = React.useMemo(() => view.products.map((p) => ({ id: p.id, name: p.name })), [view.products]);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const historyRef = React.useRef<HTMLButtonElement>(null);
  if (!hydrated) return null;
  const canWrite = can(viewer, "activity.write", view.canCtx);
  const stored = activitiesOf(record, target).length;
  const current = currentOf(record, projectId, target, defaultAt);

  return (
    <div className="flex flex-col gap-4">
      {current ? (
        <ActivityNow projectId={projectId} target={target} defaultAt={defaultAt} compact={compact} />
      ) : (
        <p className="m-0 text-sm text-text-secondary">No activity yet. Buyers see each one you add here.</p>
      )}
      {(canWrite || stored > 0) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {canWrite && (
            <Button
              ref={addRef}
              type="button"
              hierarchy="secondary"
              size="sm"
              onClick={() => setDrawer("add")}
              className="max-md:min-h-[var(--touch-min)]"
            >
              + Add activity
            </Button>
          )}
          {stored > 0 && (
            <button ref={historyRef} type="button" onClick={() => setDrawer("list")} className={QUIET_LINK}>
              {canWrite ? "Edit history" : "See history"}
              <Icon icon={ArrowRight01Icon} size={14} />
            </button>
          )}
        </div>
      )}
      <ActivityDrawer
        open={drawer !== null}
        startWith={drawer ?? "list"}
        onClose={() => {
          const from = drawer;
          setDrawer(null);
          requestAnimationFrame(() => (from === "add" ? addRef : historyRef).current?.focus());
        }}
        projectId={projectId}
        target={target}
        targetName={name}
        defaultAt={defaultAt}
        products={products}
        canWrite={canWrite}
        isPreview={false}
        announce={announce}
        now={now}
      />
    </div>
  );
}

/** The NFT tabs (a WAI-ARIA tablist: arrows move, Home / End jump) over one NFT's activity. */
function NftActivity({ tabs, ...props }: Omit<Props, "project"> & { projectId: string; tabs: NftTab[] }) {
  const [active, setActive] = React.useState(tabs[0].key);
  const base = React.useId();
  const listRef = React.useRef<HTMLDivElement>(null);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.key === tab.key);
    const next =
      e.key === "ArrowRight" ? (i + 1) % tabs.length
      : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? tabs.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(tabs[next].key);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={listRef}
        role="tablist"
        aria-label="NFT"
        onKeyDown={onKey}
        className="grid w-full overflow-hidden rounded-lg border border-solid border-border"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((t, i) => {
          const selected = t.key === tab.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`${base}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.key)}
              className={cn(
                "min-h-[var(--touch-min)] min-w-0 truncate px-2 text-sm font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
                i > 0 && "border-l border-solid border-border",
                selected ? "bg-bg-brand-subtle text-text-brand" : "bg-bg-surface text-text-secondary hover:bg-bg-subtle",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${tab.key}`}>
        {tab.missing ? (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border-strong p-4">
            <p className="m-0 text-sm text-text-secondary">{tab.missing.line}</p>
            <Link href={tab.missing.href} className={QUIET_LINK}>
              Go to Sell
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          </div>
        ) : (
          <TargetActivity key={targetKey(tab.target)} {...props} target={tab.target} name={tab.name} compact />
        )}
      </div>
    </div>
  );
}

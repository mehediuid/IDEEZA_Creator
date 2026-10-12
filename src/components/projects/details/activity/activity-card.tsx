"use client";

// The owner's Activity, at the top of the rail (owner, 2026-10-13; UX study
// https://claude.ai/artifact/SwMDKAjNaGyP7q42qHEuEt): this page's own journey
// only — the project's on the project page, the product's on a product page —
// read as a buyer reads it (Now, Earlier), with + Add activity and, once there
// are entries, Edit history. NFT activity is commerce, so it lives with each NFT
// in Earn › Sell (the Build / Earn split); once this page has an NFT, one plain
// link says so. It is a link, never a second place to add.

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
  type ActivityTarget,
} from "@/lib/manual/journey";
import { productAddedAt } from "@/lib/manual/journey-dates";
import { useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { RailBlock } from "../rail-block";
import type { SlotProps } from "../slots";
import { ActivityDrawer } from "./drawer";
import { ActivityNow } from "./now-block";

type Props = Pick<SlotProps, "project" | "view" | "viewer" | "now" | "announce">;


const QUIET_LINK =
  "inline-flex min-h-[32px] items-center gap-1 self-start rounded-sm text-sm font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";

export function ActivityCard({ project, view, viewer, now, announce, productId }: Props & { productId?: string }) {
  const product = productId ? (view.products.find((p) => p.id === productId) ?? null) : null;
  if (productId && !product) return null;
  const pageName = product ? displayProductName(product.name) : project.name.trim() || "Untitled project";
  const target: ActivityTarget = product ? { kind: "product", productId: product.id } : { kind: "project" };
  const defaultAt = product ? productAddedAt(project, view.refs, product) : project.createdAt;
  const minted = view.summary.status !== "draft" && view.mint.status !== "notMinted";
  const hasNft = product
    ? view.editions.some((t) => t.productId === product.id)
    : minted || view.editions.some((t) => t.productId === WHOLE_PROJECT_SCOPE);

  return (
    <RailBlock title="Activity" collapsible={false}>
      <TargetActivity projectId={project.id} view={view} viewer={viewer} now={now} announce={announce} target={target} name={pageName} defaultAt={defaultAt} />
      {hasNft && (
        <Link href={earnHref(project.id, product ? "copies" : "sell")} className={QUIET_LINK}>
          Activity for {product ? "this product's" : "your"} NFTs is in Earn › Sell
          <Icon icon={ArrowRight01Icon} size={14} />
        </Link>
      )}
    </RailBlock>
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

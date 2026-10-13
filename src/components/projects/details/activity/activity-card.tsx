"use client";

// The owner's Activity, at the top of the rail (owner, 2026-10-13; UX study
// https://claude.ai/artifact/SwMDKAjNaGyP7q42qHEuEt; visual pass the same day:
// "+ Add beside Activity, no wasted space"). This page's own journey only — the
// project's on the project page, the product's on a product page:
// - the heading, with + Add beside it;
// - the newest entry, unframed: type and age, 2 lines of description, small
//   proof tiles;
// - one footer line: History (n), the drawer where entries are edited, and —
//   once this page has an NFT — where the NFTs' activity lives (Earn › Sell).
//   That is a link, never a second place to add.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza";
import { earnHref } from "@/lib/manual/earn-route";
import { WHOLE_PROJECT_SCOPE, activitiesOf, type ActivityTarget } from "@/lib/manual/journey";
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
  "inline-flex min-h-[36px] items-center gap-1 rounded-sm text-md font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";

export function ActivityCard({ project, view, viewer, now, announce, productId }: Props & { productId?: string }) {
  const { hydrated, record } = useJourney(project.id);
  const [drawer, setDrawer] = React.useState<"list" | "add" | null>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const historyRef = React.useRef<HTMLButtonElement>(null);
  const products = React.useMemo(() => view.products.map((p) => ({ id: p.id, name: p.name })), [view.products]);
  const product = productId ? (view.products.find((p) => p.id === productId) ?? null) : null;
  if (!hydrated || (productId && !product)) return null;

  const pageName = product ? displayProductName(product.name) : project.name.trim() || "Untitled project";
  const target: ActivityTarget = product ? { kind: "product", productId: product.id } : { kind: "project" };
  const defaultAt = product ? productAddedAt(project, view.refs, product) : project.createdAt;
  const canWrite = can(viewer, "activity.write", view.canCtx);
  const stored = activitiesOf(record, target).length;
  const minted = view.summary.status !== "draft" && view.mint.status !== "notMinted";
  const hasNft = product
    ? view.editions.some((t) => t.productId === product.id)
    : minted || view.editions.some((t) => t.productId === WHOLE_PROJECT_SCOPE);

  return (
    <RailBlock
      title="Activity"
      collapsible={false}
      action={
        canWrite ? (
          <Button
            ref={addRef}
            type="button"
            hierarchy="secondary"
            size="md"
            onClick={() => setDrawer("add")}
            aria-label={`Add activity for ${pageName}`}
            className="text-[length:var(--font-size-md)] max-md:min-h-[var(--touch-min)]"
          >
            + Add
          </Button>
        ) : undefined
      }
    >
      <ActivityNow projectId={project.id} target={target} defaultAt={defaultAt} mode="none" bare earlier={false} />
      {(stored > 0 || hasNft) && (
        <div className="-mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {stored > 0 ? (
            <button ref={historyRef} type="button" onClick={() => setDrawer("list")} className={QUIET_LINK}>
              History ({stored + 1})
              <Icon icon={ArrowRight01Icon} size={14} />
            </button>
          ) : (
            <span />
          )}
          {hasNft && (
            <Link href={earnHref(project.id, product ? "copies" : "sell")} className={QUIET_LINK}>
              NFT activity: Earn › Sell
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
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
        projectId={project.id}
        target={target}
        targetName={pageName}
        defaultAt={defaultAt}
        products={products}
        canWrite={canWrite}
        isPreview={false}
        announce={announce}
        now={now}
      />
    </RailBlock>
  );
}

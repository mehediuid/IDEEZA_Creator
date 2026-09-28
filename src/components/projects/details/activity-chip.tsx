"use client";

// The Activity chip (P2-TABS-5), on both the project page and the product
// page — a quiet pill with a count badge and "›" that opens the Activity
// History drawer (activity/drawer.tsx), plus a separate "?" that explains
// what Activity is. It replaces v1's "Activity ┆NEXT┆" slot.
//
// `ProjectActivityChip` and `ProductActivityChip` are the two slot-shaped
// components the merge points mount: the first matches `SlotProps`
// (project-page.tsx's `headerParts.titleRow`), the second `ProductSlotProps`
// (product-slots.tsx's). Both read the same journey (T11's `useJourney`) and
// own the drawer's open state — the chip is a self-contained widget, not
// something the page has to wire state for.

import * as React from "react";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Tooltip } from "@/components/ideeza";
import { activitiesFor } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { isPreview } from "@/lib/manual/buyer-preview";
import { lockOf } from "@/lib/manual/edit-gate";
import { ownershipOf } from "@/lib/manual/ownership";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { ManualProject } from "@/lib/manual/projects";
import { useMarket } from "@/lib/market/market-store";
import { mainSalesOf } from "@/lib/market/sales";
import { cn } from "@/lib/utils";
import { ActivityDrawer } from "./activity/drawer";
import type { ProductSlotProps } from "../product/product-slots";
import type { SlotProps } from "./slots";

const PROJECT_TOOLTIP = "Check and add the current phase and status of this project.";
const PRODUCT_TOOLTIP = "Check and add the current phase and status of this product.";

// ─────────────────────────── the lock (decision 12) ───────────────────────────

/**
 * Whether `activity.write` is refused because the project is locked (sold in
 * full). A minimal, local read of the same facts T10's `canCtxOf(view)` will
 * eventually derive once it lands (§3.5.10) — `ownershipOf` + `lockOf` (T05,
 * T08), already in this base. `listedPercent: 0` is safe here: the lock only
 * reads `split.maker`, which a live listing's reserved share never changes.
 */
function useActivityLocked(project: ManualProject): boolean {
  const { data } = useMarket();
  return React.useMemo(() => {
    const sales = mainSalesOf(project.id, data.sales);
    const split = ownershipOf({
      createdAt: project.createdAt,
      contributors: project.contributors ?? [],
      sales,
      listedPercent: 0,
    });
    return lockOf(split, sales) !== null;
  }, [project.id, project.createdAt, project.contributors, data.sales]);
}

// ─────────────────────────── "?" — opens on hover, focus and tap ───────────────────────────

function InfoButton({ label, text }: { label: string; text: string }) {
  const [show, setShow] = React.useState(false);
  const tipId = React.useId();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={show ? tipId : undefined}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setShow(false);
        }}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
      >
        <Icon icon={HelpCircleIcon} size={16} />
      </button>
      {show && (
        <span
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-popover mt-2 w-max max-w-[260px] -translate-x-1/2"
        >
          <Tooltip label={text} />
        </span>
      )}
    </span>
  );
}

// ─────────────────────────── the pill itself ───────────────────────────

function ActivityChipButton({
  count,
  onOpen,
  triggerRef,
}: {
  count: number;
  onOpen: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onOpen}
      aria-label={`Activity, ${count} entries — open the activity history`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-solid border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary outline-none transition-colors duration-fast",
        "hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus",
        "max-md:min-h-[var(--touch-min)]",
      )}
    >
      <span aria-hidden>Activity</span>
      {/* The button's own aria-label already carries the count; this is decoration. */}
      <Badge tone="neutral" className="pointer-events-none">
        {count}
      </Badge>
      <span aria-hidden className="text-text-tertiary">
        ›
      </span>
    </button>
  );
}

// ─────────────────────────── the shared widget ───────────────────────────

function ActivityChipWidget({
  project,
  productId,
  productName,
  products,
  viewer,
  announce,
  tooltip,
  now,
}: {
  project: ManualProject;
  productId?: string;
  productName?: string;
  products: { id: string; name: string }[];
  viewer: Viewer;
  announce: (message: string) => void;
  tooltip: string;
  now: number;
}) {
  const { record } = useJourney(project.id);
  const locked = useActivityLocked(project);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const count = activitiesFor(record, { productId }).length;
  const canWrite = can(viewer, "activity.write", { locked });

  return (
    <div className="flex items-center gap-1">
      <ActivityChipButton count={count} onOpen={() => setOpen(true)} triggerRef={triggerRef} />
      <InfoButton label="What is Activity?" text={tooltip} />
      <ActivityDrawer
        open={open}
        onClose={() => setOpen(false)}
        projectId={project.id}
        scope={productId && productName ? { productId, productName } : undefined}
        products={products}
        canWrite={canWrite}
        isPreview={isPreview(viewer)}
        announce={announce}
        now={now}
      />
    </div>
  );
}

// ─────────────────────────── project-page slot ───────────────────────────

export function ProjectActivityChip({ project, view, viewer, announce, now }: SlotProps) {
  const products = React.useMemo(() => view.products.map((p) => ({ id: p.id, name: p.name })), [view.products]);
  return (
    <ActivityChipWidget
      project={project}
      products={products}
      viewer={viewer}
      announce={announce}
      tooltip={PROJECT_TOOLTIP}
      now={now}
    />
  );
}

// ─────────────────────────── product-page slot ───────────────────────────

export function ProductActivityChip({ project, view, product, viewer, announce, now }: ProductSlotProps) {
  const products = React.useMemo(() => view.products.map((p) => ({ id: p.id, name: p.name })), [view.products]);
  return (
    <ActivityChipWidget
      project={project}
      productId={product.id}
      productName={product.name}
      products={products}
      viewer={viewer}
      announce={announce}
      tooltip={PRODUCT_TOOLTIP}
      now={now}
    />
  );
}

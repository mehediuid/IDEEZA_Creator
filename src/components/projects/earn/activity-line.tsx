"use client";

// Earn › Sell's Activity line (spec §6.1): under a Main, Physical or Virtual
// row, "Activity · {type} · {date} ›" — or "Activity · Add the first one ›"
// before any — opening that NFT's own Activity History. It sits under the row,
// not inside Manage: the Main row has no Manage before it is listed.

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { currentOf, labelOf, targetNameOf, type ActivityTarget } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { isPreview } from "@/lib/manual/buyer-preview";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { formatDate } from "@/lib/manual/project-summary";
import { ActivityDrawer } from "../details/activity/drawer";
import type { SlotProps } from "../details/slots";

const LINE =
  "inline-flex min-h-[32px] items-center gap-2 self-start rounded-lg text-sm text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";

export function ActivityLine({ project, view, viewer, announce, now, target }: SlotProps & { target: ActivityTarget }) {
  const { hydrated, record } = useJourney(project.id);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const canWrite = can(viewer, "activity.write", view.canCtx);
  const current = currentOf(record, project.id, target);
  const products = React.useMemo(() => view.products.map((p) => ({ id: p.id, name: p.name })), [view.products]);
  if (!hydrated || (!current && !canWrite)) return null;
  const name = targetNameOf(target, {
    project: project.name.trim() || "Untitled project",
    productName: (id) => displayProductName(view.products.find((p) => p.id === id)?.name ?? "A product"),
  });

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={LINE}>
        <span>
          Activity · {current ? `${labelOf(current)} · ${formatDate(current.createdAt)}` : "Add the first one"}
        </span>
        <Icon icon={ArrowRight01Icon} size={14} />
      </button>
      <ActivityDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          requestAnimationFrame(() => triggerRef.current?.focus());
        }}
        projectId={project.id}
        target={target}
        targetName={name}
        products={products}
        canWrite={canWrite}
        isPreview={isPreview(viewer)}
        announce={announce}
        now={now}
      />
    </>
  );
}

"use client";

// Earn's Money group, each section a moved panel or block, unchanged:
// - Splits: the Details rail's old Ownership row (`ownershipRow`: "You · 70%"
//   and who holds the rest), then the old Contributors tab — the roster with
//   each share, the over-100 % warning, Add contributor and its add/edit
//   dialog, removal, and Preview as a contributor, which opens the project
//   page as that contributor (the Earn area is the owner's alone). The row's
//   "See contributors" link stays behind: the roster is right under it.
// - Customers: the Customers panel, project scope; it reads `?sale=` once on
//   arrival and opens that sale, so the deep links keep working.
// - Rights: the Legal information block (patent, copyright, trademark, its
//   inline edit) and, for a project given under a license, the license line.
// Every write asks `can(viewer, …, view.canCtx)` inside the moved component,
// so a project sold in full reads them all without a write.

import * as React from "react";
import { withView } from "@/lib/manual/buyer-preview";
import { can } from "@/lib/manual/permissions";
import { ownershipRow } from "@/lib/manual/ownership";
import { CustomersPanel } from "../details/customers-tab";
import { ContributorsTab } from "../details/contributors-tab";
import { RailBlock, RailFact, RailFacts } from "../details/rail-block";
import { legalRows, RailLegal } from "../details/rail-legal";
import type { SlotProps } from "../details/slots";
import { EARN_SURFACE } from "./surface";

export function EarnSplits(props: SlotProps) {
  const { project, view, viewer } = props;
  const own = ownershipRow(view.ownership, viewer);
  return (
    <div className="flex flex-col gap-12">
      {own && (
        <dl className="m-0 flex flex-col gap-1 rounded-2xl border border-solid border-border bg-bg-surface p-8">
          <dt className="text-sm font-medium text-text-secondary">{own.label}</dt>
          <dd className="m-0 text-lg font-semibold text-text-primary">{own.value}</dd>
          {own.note && <dd className="m-0 text-sm text-text-secondary">{own.note}</dd>}
        </dl>
      )}
      <ContributorsTab
        {...props}
        previewHref={(id) => `/projects/${project.id}?${withView("", { contributor: id })}`}
      />
    </div>
  );
}

export function EarnCustomers({ project, view, viewer, now, announce }: SlotProps) {
  if (!can(viewer, "customers.see")) return null;
  return (
    <CustomersPanel
      customers={view.customers}
      scope={{ kind: "project" }}
      projectId={project.id}
      projectName={project.name}
      status={view.summary.status}
      unreadable={view.marketUnreadable}
      now={now}
      announce={announce}
    />
  );
}

export function EarnRights(props: SlotProps) {
  const { project, view, viewer } = props;
  const license = view.commerce.license;
  // The Legal block is absent while it holds nothing and can't be edited (sold in full).
  const legal = can(viewer, "legal.edit", view.canCtx) || legalRows(project.legal).length > 0;
  if (!legal && !license) {
    return <p className="m-0 max-w-[62ch] text-md leading-relaxed text-text-secondary">No legal details were added before it sold in full.</p>;
  }
  return (
    <div className={EARN_SURFACE}>
      <RailLegal {...props} />
      {license && (
        <RailBlock title="License" collapsible={false}>
          <RailFacts>
            <RailFact label="License">
              <span className="block">{license.label}</span>
              <span className="mt-1 block text-sm font-regular text-text-secondary">{license.info}</span>
            </RailFact>
          </RailFacts>
        </RailBlock>
      )}
    </div>
  );
}

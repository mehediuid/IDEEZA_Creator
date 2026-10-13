"use client";

// Earn › Money (owner, 2026-10-11): three sections under one heading scale,
// each addressed by its id, each a moved panel or block with its behaviour
// unchanged, and each empty state one line and one action, left-aligned:
// - Splits (`#splits`): who holds what (`ownershipRow`: "You · 70%" and who
//   holds the rest), then the roster with each share, the over-100 %
//   warning, Add contributor and its add/edit dialog, removal, and Preview as
//   a contributor, which opens the project page as that contributor (the
//   Earn area is the owner's alone).
// - Customers (`#customers`): once the project has a sale, Payouts and its
//   "Request payout (demo)" (Build and Earn P1-4, gated at the ladder's L4),
//   then the Customers panel, project scope; it reads `?sale=` once on
//   arrival and opens that sale, so the deep links keep working.
// - Rights (`#rights`): the legal block's body (patent, copyright,
//   trademark, its inline edit) and, for a project given under a license,
//   the license.
// Every write asks `can(viewer, …, view.canCtx)` inside the moved component,
// so a project sold in full reads them all without a write.

import * as React from "react";
import Link from "next/link";
import { TestnetDemoBadge, buttonVariants } from "@/components/ideeza";
import { withView } from "@/lib/manual/buyer-preview";
import { earnHref } from "@/lib/manual/earn-route";
import { can } from "@/lib/manual/permissions";
import { ownershipRow } from "@/lib/manual/ownership";
import { cn } from "@/lib/utils";
import { CustomersPanel } from "../details/customers-tab";
import { ContributorsTab } from "../details/contributors-tab";
import { RailFact, RailFacts, RailStackScope } from "../details/rail-block";
import { LegalBody, legalRows } from "../details/rail-legal";
import type { SlotProps } from "../details/slots";
import { RequestPayout } from "./ladder/request-payout";
import { EARN_LEAD, EARN_STACK, EarnBlock, TAP } from "./surface";

/** The sections after the first sit under a hairline. */
const NEXT = "border-t border-solid border-border pt-12";

export function EarnMoney(props: SlotProps) {
  return (
    <div className={EARN_STACK}>
      <EarnSplits {...props} />
      <EarnCustomers {...props} />
      <EarnRights {...props} />
    </div>
  );
}

function EarnSplits(props: SlotProps) {
  const { project, view, viewer } = props;
  const own = ownershipRow(view.ownership, viewer);
  return (
    <EarnBlock id="splits" title="Splits" lead="Who owns what share of the project. Co-owners get their share of every sale.">
      {own && (
        <dl className="m-0 flex flex-col gap-1">
          <dt className="text-sm font-medium leading-sm text-text-secondary">{own.label}</dt>
          <dd className="m-0 text-lg font-semibold leading-lg text-text-primary">{own.value}</dd>
          {own.note && <dd className="m-0 text-sm leading-sm text-text-secondary">{own.note}</dd>}
        </dl>
      )}
      <ContributorsTab
        {...props}
        previewHref={(id) => `/projects/${project.id}?${withView("", { contributor: id })}`}
      />
    </EarnBlock>
  );
}

function EarnCustomers({ project, view, viewer, brief, now, announce }: SlotProps) {
  if (!can(viewer, "customers.see")) return null;
  const status = view.summary.status;
  const empty = view.customers.rows.length === 0;
  // Nothing to buy yet: the empty line's one action is where the listing starts.
  const toSell = empty && !view.marketUnreadable && (status === "draft" || status === "private");
  return (
    <EarnBlock
      id="customers"
      title="Sales"
      lead="Everyone who bought the project or a copy of it, and what the sales paid you."
      aside={<TestnetDemoBadge />}
      className={NEXT}
    >
      {view.sales.length > 0 && <RequestPayout project={project} view={view} brief={brief} now={now} announce={announce} />}
      <CustomersPanel
        customers={view.customers}
        scope={{ kind: "project" }}
        projectId={project.id}
        projectName={project.name}
        status={status}
        unreadable={view.marketUnreadable}
        now={now}
        announce={announce}
        embedded
      />
      {toSell && (
        <Link
          href={earnHref(project.id, "sell")}
          // The reset colours every a:hover as a link; the button keeps its own text colour.
          className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "self-start hover:text-[color:var(--color-button-secondary-text)]", TAP)}
        >
          Go to Sell
        </Link>
      )}
    </EarnBlock>
  );
}

function EarnRights(props: SlotProps) {
  const { project, view, viewer, announce } = props;
  const license = view.commerce.license;
  const editable = can(viewer, "legal.edit", view.canCtx);
  const rows = legalRows(project.legal);
  return (
    <EarnBlock id="rights" title="Rights" lead="The patent, copyright and trademark details anyone buying it should know, as you state them." className={NEXT}>
      {/* The legal details are absent while they hold nothing and can't be edited (sold in full). */}
      {editable || rows.length > 0 ? (
        <RailStackScope className="flex flex-col gap-6">
          <LegalBody project={project} editable={editable} rows={rows} announce={announce} />
        </RailStackScope>
      ) : (
        !license && <p className={EARN_LEAD}>No legal details were added before it sold in full.</p>
      )}
      {license && (
        <RailStackScope>
          <RailFacts>
            <RailFact label="License">
              <span className="block">{license.label}</span>
              <span className="mt-1 block text-sm font-regular text-text-secondary">{license.info}</span>
            </RailFact>
          </RailFacts>
        </RailStackScope>
      )}
    </EarnBlock>
  );
}

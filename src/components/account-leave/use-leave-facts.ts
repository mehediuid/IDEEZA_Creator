"use client";

// What Deactivate account and Delete account show, read once for the website
// (Settings › Account) and the phone (Settings › Sign-in & security): this
// account's projects, what it has on sale (Main listings and copy listings),
// its plan, credits and money, and what has to settle first — an auction
// someone bid on (blocks both), a payout still moving (blocks Delete only).
// The words are lib/account/closing.ts's.

import * as React from "react";
import { useMakerIdz } from "@/components/balance/use-maker-idz";
import { useGetPaidData } from "@/components/settings/get-paid/parts";
import { creditTotals } from "@/lib/account/summary";
import { balanceOf, formatUsd } from "@/lib/account/payout";
import { usePayout } from "@/lib/account/use-payout";
import type { LeaveFacts } from "@/lib/account/closing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import type { Listing } from "@/lib/market/types";
import { useManualProjects } from "@/lib/manual/projects";
import { compareAmounts } from "@/lib/wallet/money";

const OPEN = new Set<Listing["status"]>(["live", "paused"]);

/** Something that has to settle first: what it is, and where it gets settled. */
export type LeaveBlock = { id: string; label: string; value: string; href: { web: string; phone: string } };

export function useLeaveFacts(): {
  ready: boolean;
  facts: LeaveFacts;
  /** Auctions with bids, not closed yet: block Deactivate and Delete. */
  bids: LeaveBlock[];
  /** Payouts not complete yet: block Delete. */
  payouts: LeaveBlock[];
} {
  const { hydrated: projectsRead, projects } = useManualProjects();
  const { hydrated: marketRead, data } = useMarket();
  const { hydrated: planRead, plan, sub } = useCreatePlan();
  const { hydrated: creditsRead, ledger } = useCredits();
  const payout = usePayout();
  const paid = useGetPaidData();
  const idz = useMakerIdz();
  const ids = React.useMemo(() => projects.map((p) => p.id), [projects]);
  const editions = useProjectsEditions(ids);
  return React.useMemo(() => {
    const mine = new Map(projects.map((p) => [p.id, p]));
    const listings = data.listings.filter((l) => mine.has(l.projectId) && OPEN.has(l.status));
    const copies = editions.record.filter((t) => t.listing !== null && mine.has(t.projectId));
    const nameOf = (id: string) => mine.get(id)?.name.trim() || "Untitled project";
    const bids = listings
      .filter((l) => l.type === "auction" && data.bids.some((b) => b.listingId === l.id))
      .map((l) => ({
        id: l.id,
        label: "Auction with bids",
        value: nameOf(l.projectId),
        href: { web: `/projects/${l.projectId}/earn/sell`, phone: `/m/projects/${l.projectId}/earn` },
      }));
    const payouts = (payout?.withdrawals ?? [])
      .filter((w) => w.status !== "complete")
      .map((w) => ({
        id: w.id,
        label: "Pending payout",
        value: `${Number(w.amount).toLocaleString("en-US")} ${w.token}`,
        href: { web: "/settings/get-paid#history", phone: "/m/settings/idz-pay/history" },
      }));
    const balance = payout && paid.ready ? balanceOf(paid.earnings, payout.withdrawals).available : "0";
    const renewing = sub.tier !== "free" && sub.autoRenew && sub.renewsAt !== null;
    const facts: LeaveFacts = {
      projects: projects.length,
      shared: projects.filter((p) => typeof p.showcasedAt === "number").length,
      minted: projects.filter((p) => p.mint).length,
      onSale: listings.length + copies.length,
      plan: renewing && sub.renewsAt !== null ? { name: plan.name, endsAt: sub.renewsAt } : null,
      credits: creditTotals(ledger).remaining,
      available: compareAmounts(balance, "0") > 0 ? formatUsd(balance) : null,
      idz: idz.connected && idz.idz !== null && Number(idz.idz) > 0 ? `${Number(idz.idz).toLocaleString("en-US")} IDZ` : null,
    };
    return {
      ready: projectsRead && marketRead && planRead && creditsRead && editions.hydrated && payout !== undefined && paid.ready && idz.read,
      facts,
      bids,
      payouts,
    };
  }, [projects, data, editions, sub, plan.name, ledger, payout, paid, idz, projectsRead, marketRead, planRead, creditsRead]);
}

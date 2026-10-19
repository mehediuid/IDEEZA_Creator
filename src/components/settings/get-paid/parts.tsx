"use client";

// The small pieces Settings › Get paid's cards and dialogs share: the date
// words, the country list, the read of your earnings and of whether anything
// of yours is listed or sold, the maker's demo wallet, the network names,
// and the way back to a project.

import * as React from "react";
import Link from "next/link";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { COUNTRIES } from "@/lib/account/countries";
import {
  earnedByProject,
  earningsOf,
  getPaidStageOf,
  salesTotalUsdOf,
  type Earning,
  type GetPaidStage,
  type PayoutStore,
  type ProjectEarned,
} from "@/lib/account/payout";
import { returnPathOf, returnProjectIdOf } from "@/lib/account/return-to";
import type { Network } from "@/lib/brief/types";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import { useManualProjects } from "@/lib/manual/projects";
import { formatDate, formatDateTime } from "@/lib/settings/dates";
import { readSettings } from "@/lib/settings/prefs";
import { cn } from "@/lib/utils";
import { demoAddress, makerId } from "@/lib/wallet/demo-wallet";
import { identityLabelOf, networkLabelOf } from "@/lib/wallet/request-view";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";

export const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
export const FIELD_LABEL = "text-sm font-medium leading-sm text-text-primary";
export const FIELD_ERROR = "m-0 text-sm leading-sm text-text-error";
export const FIELD_HELP = "m-0 text-sm leading-sm text-text-tertiary";

// ───────────────────────── words ─────────────────────────

/** A date and time in your Date & Time Formatting choice (Settings › Language & region). */
export function formatWhen(ts: number): string {
  return formatDateTime(ts, readSettings().language.dateLocale, { style: "medium" });
}

/** A date in your Date & Time Formatting choice. */
export function formatDay(ts: number): string {
  return formatDate(ts, readSettings().language.dateLocale);
}

/** "Base Sepolia (Testnet)" */
export const networkName = (n: Network): string => networkLabelOf(n);

/** Every country as select options (the one list, lib/account/countries.ts, built from `Intl`). */
export function countryOptions(): { value: string; label: string }[] {
  return COUNTRIES.map((c) => ({ value: c.code, label: c.name }));
}

// ───────────────────────── your earnings ─────────────────────────

export type GetPaidData = {
  /** False until the projects, the market and the copies have been read. */
  ready: boolean;
  earnings: Earning[];
  byProject: ProjectEarned[];
  /** The full price of every sale of your projects, in dollars at the demo rates. */
  salesUsd: number;
  stageOf: (store: PayoutStore) => GetPaidStage;
};

/** Your earnings from every project, split by project, and whether anything of yours is listed or sold. */
export function useGetPaidData(): GetPaidData {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: marketReady, data } = useMarket();
  const projectIds = React.useMemo(() => projects.map((p) => p.id), [projects]);
  const editions = useProjectsEditions(projectIds);
  return React.useMemo(() => {
    const share = projects.map((p) => ({ id: p.id, name: p.name.trim() || "Untitled project", contributors: p.contributors ?? [] }));
    const earnings = earningsOf(data.sales, share);
    return {
      ready: projectsReady && marketReady && editions.hydrated,
      earnings,
      byProject: earnedByProject(earnings),
      salesUsd: Number(salesTotalUsdOf(data.sales, projectIds)),
      stageOf: (store: PayoutStore) =>
        getPaidStageOf({ projectIds, listings: data.listings, tracks: editions.record, sales: data.sales, store }),
    };
  }, [projects, projectIds, data.sales, data.listings, editions.record, editions.hydrated, projectsReady, marketReady]);
}

// ───────────────────────── the demo wallet ─────────────────────────

/** The maker's current demo account: its name, address and network, and whether it's connected. */
export function useMakerWallet(): { ready: boolean; connected: boolean; label: string; address: string; network: Network } {
  const wallet = useDemoWallet();
  const id = makerId(wallet?.account ?? 1);
  const state = wallet?.identities[id];
  return {
    ready: wallet !== undefined,
    connected: state?.connected === true,
    label: identityLabelOf(id),
    address: demoAddress(id),
    network: state?.network ?? "baseSepolia",
  };
}

// ───────────────────────── the way back ─────────────────────────

/** "Back to {project}", when Get paid was opened from a project's Earn (the ladder's Verify identity, Withdraw). */
export function ReturnLink({ from }: { from: string | null }) {
  const { projects } = useManualProjects();
  const path = returnPathOf(from);
  if (!path) return null;
  const id = returnProjectIdOf(path);
  const name = projects.find((p) => p.id === id)?.name;
  return (
    <Link href={path} className={buttonVariants({ hierarchy: "secondary", size: "md", className: TAP })}>
      <Icon icon={ArrowLeft01Icon} size={16} />
      {name ? `Back to ${name}` : "Back to your project"}
    </Link>
  );
}

/** A wallet address in full, in mono, wrapping anywhere: what is about to be signed is read whole. */
export function FullAddress({ address, className }: { address: string; className?: string }) {
  return <span className={cn("font-mono [overflow-wrap:anywhere]", className)}>{address}</span>;
}

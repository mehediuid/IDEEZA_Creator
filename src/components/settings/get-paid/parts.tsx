"use client";

// The small pieces Settings › KYC Verification and Get Paid share: the date
// words (one local helper until lib/settings/dates.ts lands), the country
// list, the earnings read, the way back to a project, and Get Paid's
// sub-view header and value rows.

import * as React from "react";
import Link from "next/link";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { earningsOf, salesTotalUsdOf, type Earning } from "@/lib/account/payout";
import { returnPathOf, returnProjectIdOf } from "@/lib/account/return-to";
import { useMarket } from "@/lib/market/market-store";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { demoAddress, makerId } from "@/lib/wallet/demo-wallet";
import { identityLabelOf } from "@/lib/wallet/request-view";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { COUNTRIES, countryNameOf } from "@/lib/account/countries";
import { formatDate, formatDateTime } from "@/lib/settings/dates";
import { readSettings } from "@/lib/settings/prefs";

export const GET_PAID = "/settings/get-paid";
export const GET_PAID_BALANCE = "/settings/get-paid/balance";
export const GET_PAID_HISTORY = "/settings/get-paid/history";
export const GET_PAID_RESIDENCE = "/settings/get-paid/tax-residence";
export const GET_PAID_IDENTIFICATION = "/settings/get-paid/tax-identification";
export const KYC_HREF = "/settings/kyc";

// ───────────────────────── dates ─────────────────────────

/** A date and time in your Date & Time Formatting choice (Settings › Language). */
export function formatWhen(ts: number): string {
  return formatDateTime(ts, readSettings().language.dateLocale, { style: "medium" });
}

/** A date in your Date & Time Formatting choice ("Active Dec 6, 2025"). */
export function formatDay(ts: number): string {
  return formatDate(ts, readSettings().language.dateLocale);
}

// ───────────────────────── countries ─────────────────────────

/** Every country as select options (the one list, lib/account/countries.ts). */
export function countryOptions(): { value: string; label: string }[] {
  return COUNTRIES.map((c) => ({ value: c.code, label: c.name }));
}

export function countryName(code: string): string {
  return countryNameOf(code) || code;
}

// ───────────────────────── earnings ─────────────────────────

/** Your earnings from every project, and the dollars of all their sales; `ready` once both stores are read. */
export function useEarnings(): { ready: boolean; earnings: Earning[]; salesUsd: number; projects: number } {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: marketReady, data } = useMarket();
  return React.useMemo(() => {
    const share = projects.map((p) => ({ id: p.id, name: p.name, contributors: p.contributors ?? [] }));
    const earnings = earningsOf(data.sales, share);
    return {
      ready: projectsReady && marketReady,
      earnings,
      salesUsd: Number(salesTotalUsdOf(data.sales, share.map((p) => p.id))),
      projects: new Set(earnings.map((e) => e.projectId)).size,
    };
  }, [projects, data.sales, projectsReady, marketReady]);
}

// ───────────────────────── the demo wallet ─────────────────────────

/** The maker's current demo account: its name and address, and whether it's connected. */
export function useMakerWallet(): { ready: boolean; connected: boolean; label: string; address: string } {
  const wallet = useDemoWallet();
  const id = makerId(wallet?.account ?? 1);
  return {
    ready: wallet !== undefined,
    connected: wallet?.identities[id]?.connected === true,
    label: identityLabelOf(id),
    address: demoAddress(id),
  };
}

// ───────────────────────── the way back ─────────────────────────

/** "Back to {project}", when Settings was opened from a project's Earn ladder. */
export function ReturnLink({ from }: { from: string | null }) {
  const { projects } = useManualProjects();
  const path = returnPathOf(from);
  if (!path) return null;
  const id = returnProjectIdOf(path);
  const name = projects.find((p) => p.id === id)?.name;
  return (
    <Link href={path} className={buttonVariants({ hierarchy: "secondary", size: "md", className: "max-md:min-h-[var(--touch-min)]" })}>
      <Icon icon={ArrowLeft01Icon} size={16} />
      {name ? `Back to ${name}` : "Back to your project"}
    </Link>
  );
}

// ───────────────────────── Get Paid's sub-views ─────────────────────────

/** Figma's "View Withdrawal History", beside the title. */
export function HistoryLink() {
  return (
    <Link href={GET_PAID_HISTORY} className={buttonVariants({ hierarchy: "tonal", size: "md", className: "max-md:min-h-[var(--touch-min)]" })}>
      View Withdrawal History
    </Link>
  );
}

/** A sub-view's way back to the Get Paid hub, then its own heading (when the cards don't name it). */
export function SubViewHeading({ title, id }: { title?: string; id?: string }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <Link
        href={GET_PAID}
        className="inline-flex w-fit items-center gap-[6px] rounded-md text-md font-medium leading-md text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
        Get Paid
      </Link>
      {title && (
        <h2 id={id} className="m-0 text-2xl font-semibold leading-2xl text-text-primary">
          {title}
        </h2>
      )}
    </div>
  );
}

/** A settings row that is one link, with a value before its chevron (Figma's "Balance … $100 ›"). */
export function ValueLinkRow({ id, href, label, help, value }: { id: string; href: string; label: string; help: string; value?: React.ReactNode }) {
  return (
    <Link
      id={id}
      href={href}
      className={cn(
        "-mx-[8px] flex items-center justify-between gap-[16px] rounded-lg border-b border-solid border-border px-[8px] py-[14px] outline-none transition-colors duration-fast last:border-b-0 hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
        "scroll-mt-24 data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-md font-medium leading-md text-text-primary">{label}</span>
        <span className="text-sm leading-sm text-text-tertiary">{help}</span>
      </span>
      {value != null && <span className="shrink-0 text-xl font-semibold leading-xl tabular-nums text-text-primary">{value}</span>}
      <span aria-hidden className="shrink-0 text-text-tertiary">
        <Icon icon={ArrowRight01Icon} size={20} />
      </span>
    </Link>
  );
}

"use client";

// Earn Coin's shared parts (mobile Figma "Design - Light Mode (Current)":
// Wallet Balance, Buy IDEEZA Coin, Stacking, Refer & Earn). Layout from the
// Figma as a 2026 phone lays it out (UX pass 2026-11-15), data and words
// from the web's Balance (components/balance, lib/wallet): the balance hero
// (Current Balance, the Available figure, its dollars at the one IDZ price,
// Available · Staked · Ready to claim · Pending as facts, the claim line),
// a tab's compact balance strip, the filter chips (each a kit pick-one
// sheet), the record sheets' detail rows and "All details", ⓘ and its sheet,
// the one testnet line, the Buy $IDZ · Stake · Refer & Earn tabs (M14), the
// copy chips, the network chip, the token address and the wallet tiles, and
// the sheets every screen shares: Connect your wallet, the Demo wallet,
// Import IDZ token. Text takes its role from the one type scale (T.*); the
// mono face on an InfoRow label is the Figma's. Empty and not-found states
// are the kit's (kit/state.tsx). FilterButton stays for Plans' payout
// history, which shares it.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDown01Icon,
  Copy01Icon,
  Download04Icon,
  InformationCircleIcon,
  MoneyBag01Icon,
  ShoppingBasket02Icon,
  TestTube01Icon,
  Tick02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { IdzCoin } from "@/components/balance/idz-coin";
import { useSecondClock } from "@/components/balance/use-second-clock";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { useMarket } from "@/lib/market/market-store";
import { cn } from "@/lib/utils";
import { demoAddress, makerId, readWallet, shortAddress, walletConnect, walletDisconnect, walletSwitchAccount, walletSwitchNetwork } from "@/lib/wallet/demo-wallet";
import { DEMO_ACCOUNTS } from "@/lib/wallet/identities";
import { IDZ_TOKEN, idzContractOf, idzHoldingsOf, idzUsdOf, type IdzHoldings } from "@/lib/wallet/idz";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import { TIMING } from "@/lib/wallet/request";
import { balanceLineOf, networkLabelOf } from "@/lib/wallet/request-view";
import type { AccountIndex } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { PRESSED } from "../kit/press";
import { Sheet } from "../kit/sheet";
import { MobileTabs } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { T } from "../type";

/** A card that isn't a list: the kit's surface, border/default edge and radius/xl (kit/list.tsx LIST_CARD). */
export const CARD = "rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface";

/** "Base Sepolia": a network's name without its "(Testnet)" tail, for a chip or a card title. */
export function shortNetworkOf(n: Network): string {
  return networkLabelOf(n).replace(/\s*\(.*\)$/, "");
}

/** The current demo account, its wallet, and its IDZ, live to the second. */
export function useEarnState() {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useSecondClock();
  const id = wallet ? makerId(wallet.account) : null;
  const state = wallet && id ? wallet.identities[id] : undefined;
  const connected = !!state?.connected;
  const network: Network = state?.network ?? "baseSepolia";
  const holdings: IdzHoldings | null = wallet && id && connected ? idzHoldingsOf(wallet, id, { wallet, market, now }) : null;
  return { wallet, market, now, id, connected, network, holdings };
}

/** The older way to copy, for a browser that refuses the Clipboard API. */
function copyByCommand(value: string): boolean {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.className = "fixed left-0 top-0 opacity-0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Copies `value` and says so in a toast. */
export function useCopy() {
  const toast = useToast();
  return React.useCallback(
    async (value: string, done: string) => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(value);
        ok = true;
      } catch {
        ok = copyByCommand(value);
      }
      toast(ok ? { title: done } : { title: "Couldn’t copy. Select it and copy instead.", lead: "error" });
    },
    [toast],
  );
}

/** "02:10:00": hours, minutes and seconds of `ms`, never below zero. */
export function clockOf(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

/** "13 Aug 2024 • 2:08 PM" (the Figma's date row). */
export function whenOf(at: number): string {
  const d = new Date(at);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} • ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

// ── M14 Tabs: Buy $IDZ · Stake · Refer & Earn ───────────────────────────
// One screen holds the three tabs (earn-tabs-screen.tsx), so a tap never
// navigates: the tab is client state, and the address follows by
// history.replaceState (/m/earn/buy · /stake · /refer), which Next keeps in
// step with usePathname. No fetch, no history entry, works offline; a reload
// or a link to any of the three addresses opens that tab.

export type EarnTab = "buy" | "stake" | "refer";

const EARN_TABS: readonly { value: EarnTab; label: string; href: string }[] = [
  { value: "buy", label: "Buy $IDZ", href: "/m/earn/buy" },
  { value: "stake", label: "Stake", href: "/m/earn/stake" },
  { value: "refer", label: "Refer & Earn", href: "/m/earn/refer" },
];

/** The tab the address names, and its setter (the tab changes at once; the address follows). */
export function useEarnTab(): [EarnTab, (tab: EarnTab) => void] {
  const pathname = usePathname();
  const parsed = EARN_TABS.find((t) => t.href === pathname)?.value ?? "buy";
  // Shown at once; dropped as soon as the address (or Back) says otherwise.
  const [picked, setPicked] = React.useState<EarnTab | null>(null);
  const [seen, setSeen] = React.useState(pathname);
  if (pathname !== seen) {
    setSeen(pathname);
    setPicked(null);
  }
  const set = React.useCallback((tab: EarnTab) => {
    setPicked(tab);
    const href = EARN_TABS.find((t) => t.value === tab)?.href;
    if (href && window.location.pathname !== href) window.history.replaceState(null, "", href);
  }, []);
  return [picked ?? parsed, set];
}

export const EarnTabContext = React.createContext<{ tab: EarnTab; setTab: (tab: EarnTab) => void } | null>(null);

export const EARN_TABS_ID = "earn";

/** The strip; the screen that holds the three tabs provides the state. */
export function EarnTabs() {
  const ctx = React.useContext(EarnTabContext);
  if (!ctx) return null;
  return <MobileTabs label="Earn Coin" idBase={EARN_TABS_ID} tabs={EARN_TABS} value={ctx.tab} onChange={ctx.setTab} />;
}

// ── small pieces ────────────────────────────────────────────────────────

/** A purple chip with the short form of `value` and a copy button (Txn ID, Wallet Address, Contract). */
export function CopyChip({ value, what, tone = "brand", lead }: { value: string; what: string; tone?: "brand" | "error" | "warning"; lead?: React.ReactNode }) {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value, `${what} copied`)}
      aria-label={`Copy ${what.toLowerCase()} ${value}`}
      className={cn(
        T.caption,
        "inline-flex h-[24px] max-w-full items-center gap-2 rounded-full px-4 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        tone === "brand" && "bg-bg-brand-subtle text-text-brand",
        tone === "error" && "bg-bg-error-subtle text-text-error",
        tone === "warning" && "bg-badge-warning-bg text-badge-warning-text",
      )}
    >
      {lead}
      <span className="truncate">{shortAddress(value)}</span>
      <Icon icon={Copy01Icon} size={14} />
    </button>
  );
}

/** One "label … value" row of a card, the label in the Figma's mono face. */
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[24px] items-center justify-between gap-6">
      <dt className={cn(T.meta, "shrink-0 font-mono")}>{label}</dt>
      <dd className={cn(T.body, "flex min-w-0 flex-wrap items-center justify-end gap-2 text-right text-text-primary")}>{children}</dd>
    </div>
  );
}

/** "● Amoy Testnet (Polygon)": a card's chain. */
export function ChainTitle({ network, tone = "brand" }: { network: Network | null; tone?: "brand" | "error" }) {
  return (
    <p className={cn(T.name, "flex min-w-0 items-center gap-3")}>
      <span aria-hidden className={cn("size-[8px] shrink-0 rounded-full", tone === "brand" ? "bg-bg-brand" : "bg-bg-error")} />
      {network ? (
        <>
          <span aria-hidden className="truncate">
            {shortNetworkOf(network)}
          </span>
          <span className="sr-only">{networkLabelOf(network)}</span>
        </>
      ) : (
        <span className="truncate">Every network</span>
      )}
    </p>
  );
}

/** "100 IDZ" with the coin: a card's amount. */
export function IdzFigure({ amount, sign = "" }: { amount: string; sign?: string }) {
  return (
    <span className={cn(T.section, "inline-flex shrink-0 items-center gap-2 tabular-nums")}>
      <IdzCoin height={20} />
      {sign}
      {formatAmount(amount, "IDZ").replace(/ IDZ$/, "")}
      <span className={cn(T.meta, "text-text-brand")}>IDZ</span>
    </span>
  );
}

export type FilterOption = { value: string; label: string };

/** The Figma's white filter button ("Chain Type ⌄"): its list is the kit's pick-one sheet. */
export function FilterButton({ label, value, options, onChange }: { label: string; value: string; options: FilterOption[]; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const picked = options.find((o) => o.value === value);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={picked ? `${label}: ${picked.label}` : label}
        onClick={() => setOpen(true)}
        className={cn(
          T.name,
          "flex h-[40px] min-w-0 flex-1 items-center justify-center gap-3 rounded-xl bg-bg-surface px-6 outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        )}
      >
        <span className="truncate">{picked && picked.value !== "all" ? picked.label : label}</span>
        <Icon icon={ArrowDown01Icon} size={16} />
      </button>
      <PickSheet open={open} onClose={() => setOpen(false)} title={label} options={options} value={value} onPick={onChange} />
    </>
  );
}

export const MONTH_OPTIONS: FilterOption[] = [
  { value: "all", label: "Every month" },
  ...["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => ({
    value: String(i),
    label: m,
  })),
];

// ── the network chip and the balance card ───────────────────────────────

/** The Figma's "Ethereum ⌄" chip: the demo wallet's own network, so choosing one switches the wallet. */
export function NetworkChip({ network }: { network: Network }) {
  const [open, setOpen] = React.useState(false);
  const toast = useToast();
  const pick = (n: Network) => {
    setOpen(false);
    if (n === network) return;
    const w = readWallet();
    if (persistWallet(walletSwitchNetwork(w, makerId(w.account), n))) toast({ title: `Wallet on ${networkLabelOf(n)}` });
    else toast({ title: "This browser couldn’t save it — storage is full or blocked.", lead: "error" });
  };
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Network: ${networkLabelOf(network)}, change`}
        onClick={() => setOpen(true)}
        className={cn(T.body, "-my-2 inline-flex h-[40px] min-w-0 items-center gap-3 rounded-lg bg-bg-subtle px-5 text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus", PRESSED)}
      >
        <span className="truncate font-mono">{shortNetworkOf(network)}</span>
        <Icon icon={ArrowDown01Icon} size={16} />
      </button>
      <PickSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Network"
        description="Your demo wallet switches to it."
        options={NETWORKS.map((n) => ({ value: n.value, label: n.label }))}
        value={network}
        onPick={pick}
      />
    </>
  );
}

/** The token address box with its copy button: the demo IDZ contract on the wallet's network. */
export function TokenAddress({ network }: { network: Network }) {
  const copy = useCopy();
  const contract = idzContractOf(network);
  return (
    <div className="flex h-[32px] w-full items-center justify-between gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid border-border px-5">
      <span className={cn(T.meta, "min-w-0 truncate text-text-primary")}>
        Token Address: <span aria-hidden>{shortAddress(contract)}</span>
        <span className="sr-only">{contract}</span>
      </span>
      <button
        type="button"
        aria-label="Copy token address"
        onClick={() => copy(contract, "Token address copied")}
        className="inline-flex size-[24px] shrink-0 items-center justify-center rounded-sm text-[color:var(--color-icon-default)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Copy01Icon} size={16} />
      </button>
    </div>
  );
}

/** "2,875.8 IDZ": the balance figure to 2 decimals, cut never rounded up, so it fits a phone;
 *  the exact amount is the Available fact under it. */
function figureOf(amount: string): string {
  const [whole, fraction = ""] = amount.split(".");
  return formatAmount(fraction.length > 2 ? `${whole}.${fraction.slice(0, 2)}` : amount, "IDZ");
}

/** The wallet screen's three tiles (Figma 247010): Buy IDZ · Stake IDZ · Import IDZ. */
export function ActionTiles({ onImport }: { onImport: () => void }) {
  const router = useRouter();
  const tile = (label: string, icon: IconValue, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        T.body,
        "flex h-[72px] min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-subtle text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        PRESSED,
      )}
    >
      <span aria-hidden className="text-[color:var(--color-icon-brand)]">
        <Icon icon={icon} size={20} />
      </span>
      {label}
    </button>
  );
  return (
    <div className="flex w-full gap-6">
      {tile("Buy IDZ", ShoppingBasket02Icon, () => router.push("/m/earn/presale"))}
      {tile("Stake IDZ", MoneyBag01Icon, () => router.push("/m/earn/stake/contracts"))}
      {tile("Import IDZ", Download04Icon, onImport)}
    </div>
  );
}

// ── the sheets every screen shares ──────────────────────────────────────

// ── the mobile layout pieces (UX pass 2026-11-15) ───────────────────────
// A wallet tab of 2026 leads with the balance and what's claimable, then
// rows with live values; a long explanation sits behind ⓘ, a record's full
// table behind a tap. These are the pieces every Earn Coin screen builds on.

/** ⓘ beside a heading (lens 1): opens the kit Sheet with the words that don't fit inline. 44 px target. */
export function InfoButton({ title, label, children }: { title: string; label?: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={label ?? `About ${title.charAt(0).toLowerCase()}${title.slice(1)}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(
          "-my-6 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
          PRESSED,
        )}
      >
        <Icon icon={InformationCircleIcon} size={20} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className={cn(T.body, "flex flex-col gap-6 pb-4")}>{children}</div>
      </Sheet>
    </>
  );
}

/** A section's heading (T.section), its optional ⓘ right after the words, and an end slot. */
export function SectionHead({ id, children, info, infoTitle, end }: { id?: string; children: React.ReactNode; info?: React.ReactNode; infoTitle?: string; end?: React.ReactNode }) {
  return (
    <div className="flex min-h-[28px] items-center justify-between gap-4">
      <span className="flex min-w-0 items-center gap-1">
        <h2 id={id} tabIndex={id ? -1 : undefined} className={cn(T.section, "outline-none")}>
          {children}
        </h2>
        {info && <InfoButton title={infoTitle ?? (typeof children === "string" ? children : "More about this")}>{info}</InfoButton>}
      </span>
      {end}
    </div>
  );
}

export type Fact = { label: string; value: React.ReactNode; tone?: "success" };

/** Facts in a grid: a small label over its value (the buyer page's BuyBox facts). */
export function FactGrid({ facts, cols = 3 }: { facts: readonly Fact[]; cols?: 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-6", cols === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {facts.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-1">
          <dt className={T.micro}>{f.label}</dt>
          <dd className={cn(T.rowTitle, "break-words tabular-nums", f.tone === "success" && "text-text-success")}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "2,000 IDZ" with the coin, at the money screen's one big size. */
function HeroFigure({ amount }: { amount: string }) {
  return (
    <p className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
      <IdzCoin height={28} />
      <span className={cn(T.amountHero, "max-w-full break-words text-text-brand")}>
        <span aria-hidden>{figureOf(amount)}</span>
        <span className="sr-only">{formatAmount(amount, "IDZ")} available</span>
      </span>
    </p>
  );
}

/** The balance a money tab leads with (lens 14): "Current Balance", the Available figure with its
 *  dollars and the screen's one Testnet demo mark, the other holdings as facts, then what the
 *  screen adds (the claim line, the token address, the tiles) and its foot row. */
export function BalanceHero({
  holdings,
  aside,
  children,
  foot,
}: {
  holdings: IdzHoldings;
  /** Beside the label: the network chip. */
  aside?: React.ReactNode;
  children?: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <section aria-label="Current Balance" className={cn(LIST_CARD)}>
      <div className="flex flex-col gap-6 p-8">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-h-[32px] items-center justify-between gap-4">
            <p className={T.body}>Current Balance</p>
            {aside}
          </div>
          <HeroFigure amount={holdings.available} />
          <p className={cn(T.meta, "flex flex-wrap items-center gap-x-4 gap-y-2 tabular-nums")}>
            = {idzUsdOf(holdings.available)}
            <TestnetDemoBadge />
          </p>
        </div>
        <FactGrid
          cols={2}
          facts={[
            { label: "Available", value: formatAmount(holdings.available, "IDZ") },
            { label: "Staked", value: formatAmount(holdings.staked, "IDZ") },
            { label: "Ready to claim", value: formatAmount(holdings.claimable, "IDZ"), tone: compareAmounts(holdings.claimable, "0") > 0 ? "success" : undefined },
            { label: "Pending", value: formatAmount(holdings.pending, "IDZ") },
          ]}
        />
        {children}
      </div>
      {foot}
    </section>
  );
}

/** "500 IDZ from the presale is ready to claim." with Claim (web N2): one slim line, inside the hero. */
export function ClaimLine({ amount, href = "/m/earn/buy" }: { amount: string; href?: string }) {
  if (compareAmounts(amount, "0") <= 0) return null;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-bg-success-subtle py-2 pl-6 pr-2">
      <p className={cn(T.rowTitle, "min-w-0 flex-1 text-text-success")}>{formatAmount(amount, "IDZ")} from the presale is ready to claim.</p>
      <Link href={href} className={cn(buttonVariants({ hierarchy: "primary", size: "sm" }), "shrink-0 border-solid")}>
        Go to claim
      </Link>
    </div>
  );
}

/** A hero's foot: one row to the next screen ("Wallet balance ›"), ruled off from the card. */
export function HeroFootRow({ href, title, meta }: { href: string; title: string; meta?: string }) {
  return (
    <Link href={href} className={cn(LIST_ROW, "border-t-[length:var(--border-width-1)] border-solid border-border")}>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.rowTitle)}>{title}</span>
        {meta && <span className={T.meta}>{meta}</span>}
      </span>
      <Chevron />
    </Link>
  );
}

/** A tab's compact balance (lens 8, 14): the two or three figures this tab is about, as one row
 *  that opens Wallet balance (where the full card, the network and the token address are). */
export function BalanceStrip({ facts }: { facts: readonly Fact[] }) {
  return (
    <Link href="/m/earn/wallet" aria-label="Wallet balance" className={cn(LIST_CARD, PRESSED, "flex-row items-center gap-6 p-8 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
      <span className="min-w-0 flex-1">
        <FactGrid facts={facts} cols={facts.length === 2 ? 2 : 3} />
      </span>
      <Chevron />
    </Link>
  );
}

export type FilterChip = { label: string; value: string; options: FilterOption[]; onChange: (v: string) => void };

/** The list's filters as one row of chips (lens 3: no 2 × 2 grid of white buttons over the list). Each
 *  chip opens the kit pick-one sheet; a picked chip shows its value in the brand tint; Clear resets all.
 *  The row scrolls sideways when the chips don't fit (it's a filter row, not navigation). */
export function FilterChips({ label, chips, onClear }: { label: string; chips: readonly FilterChip[]; onClear?: () => void }) {
  const [open, setOpen] = React.useState<string | null>(null);
  const active = chips.some((c) => c.value !== "all");
  const current = chips.find((c) => c.label === open);
  return (
    <div role="group" aria-label={label} className="-mx-8 flex gap-3 overflow-x-auto px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((c) => {
        const picked = c.options.find((o) => o.value === c.value);
        const on = c.value !== "all";
        return (
          <button
            key={c.label}
            type="button"
            aria-haspopup="dialog"
            aria-label={picked && on ? `${c.label}: ${picked.label}` : c.label}
            onClick={() => setOpen(c.label)}
            className="group flex h-[44px] shrink-0 items-center outline-none"
          >
            <span
              className={cn(
                T.rowTitle,
                "inline-flex h-[36px] items-center gap-2 rounded-full border-[length:var(--border-width-1)] border-solid px-6 transition-colors duration-fast group-focus-visible:ring-2 group-focus-visible:ring-border-focus group-active:opacity-[var(--opacity-muted)]",
                on ? "border-border-brand bg-bg-brand-subtle text-text-brand" : "border-border bg-bg-surface",
              )}
            >
              <span className="max-w-[160px] truncate">{on && picked ? picked.label : c.label}</span>
              <Icon icon={ArrowDown01Icon} size={16} />
            </span>
          </button>
        );
      })}
      {active && onClear && (
        <button type="button" onClick={onClear} className={cn(T.rowTitle, "flex h-[44px] shrink-0 items-center px-2 text-text-brand outline-none focus-visible:underline active:opacity-[var(--opacity-muted)]")}>
          Clear
        </button>
      )}
      {current && (
        <PickSheet
          open
          onClose={() => setOpen(null)}
          title={current.label}
          options={current.options}
          value={current.value}
          onPick={current.onChange}
        />
      )}
    </div>
  );
}

/** A record's full table in a sheet (lens 2): the summary row stays on the list, the rows are here. */
export function DetailRows({ rows }: { rows: readonly { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className={cn("-mx-2 flex flex-col", LIST_DIVIDERS)}>
      {rows.map((r) => (
        <div key={r.label} className="flex min-h-[44px] items-center justify-between gap-6 px-2 py-4">
          <dt className={cn(T.body, "shrink-0")}>{r.label}</dt>
          <dd className={cn(T.body, "flex min-w-0 flex-wrap items-center justify-end gap-2 text-right text-text-primary")}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "All details" that opens the full table in place (the buyer page's ReceiptCard pattern). */
export function AllDetails({ rows, title = "All details" }: { rows: readonly { label: string; value: React.ReactNode }[]; title?: string }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={cn(T.rowTitle, "flex min-h-[44px] w-full items-center justify-between gap-2 text-left outline-none focus-visible:underline active:opacity-[var(--opacity-muted)]")}
      >
        {title}
        <span aria-hidden className={cn("inline-flex text-[color:var(--color-icon-default)] transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")}>
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      <div id={id} hidden={!open}>
        <DetailRows rows={rows} />
      </div>
    </div>
  );
}

/** The screen's one quiet testnet line (Testnet demo, no real money). */
export function TestnetLine({ children = "Testnet demo · no real money moves." }: { children?: React.ReactNode }) {
  return (
    <p className={cn(T.meta, "flex items-start gap-3")}>
      <span aria-hidden className="mt-[1px] shrink-0 text-[color:var(--color-icon-warning)]">
        <Icon icon={TestTube01Icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

/** Connect your wallet (the request's own first step, and the Refer & Earn ask, Figma 228900). */
export function ConnectSheet({
  open,
  onClose,
  onConnected,
  description = "This is the testnet demo wallet — test funds only, nothing is written to a real blockchain.",
}: {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
  description?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const toast = useToast();
  const timer = React.useRef<number | null>(null);
  React.useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  const close = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
    setError(null);
    onClose();
  };
  const connect = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const w = readWallet();
      const ok = persistWallet(walletConnect(w, makerId(w.account)));
      setBusy(false);
      if (!ok) return setError("This browser couldn’t save it — storage is full or blocked.");
      toast({ title: "Wallet connected" });
      onClose();
      onConnected?.();
    }, TIMING.connect);
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title="Connect your wallet"
      description={description}
      actions={
        <>
          <Button size="xl" className="w-full" loading={busy} onClick={connect}>
            {busy ? "Connecting…" : "Connect demo wallet"}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className={cn(T.caption, "text-text-error")}>
          {error}
        </p>
      )}
    </Sheet>
  );
}

/** The Demo wallet (the web's Demo wallet dialog, as a sheet): connect, the demo account, the network. */
export function DemoWalletSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wallet, market, now } = useEarnState();
  const toast = useToast();
  if (!wallet) return null;
  const id = makerId(wallet.account);
  const state = wallet.identities[id];
  const network = state?.network ?? "baseSepolia";
  const save = (next: typeof wallet, done: string) => {
    if (persistWallet(next)) toast({ title: done });
    else toast({ title: "This browser couldn’t save it — storage is full or blocked.", lead: "error" });
  };
  const ctx = { wallet, market, now };
  const radio = "flex min-h-[44px] w-full items-center justify-between gap-6 rounded-lg px-6 py-3 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Demo wallet"
      description={state?.connected ? `Connected: ${shortAddress(demoAddress(id))}` : "Not connected"}
      actions={
        <>
          {state?.connected ? (
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => save(walletDisconnect(readWallet(), id), "Wallet disconnected")}>
              Disconnect
            </Button>
          ) : (
            <Button size="xl" className="w-full" onClick={() => save(walletConnect(readWallet(), id), "Wallet connected")}>
              Connect demo wallet
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-4">
        <TestnetDemoBadge />
        <span className={T.meta}>Test funds only. Nothing is written to a real blockchain.</span>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className={cn(T.rowTitle, "pb-2")}>Account</legend>
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.index}
            type="button"
            role="radio"
            aria-checked={a.index === wallet.account}
            onClick={() => a.index !== wallet.account && save(walletSwitchAccount(readWallet(), a.index as AccountIndex), `${a.label} chosen`)}
            className={radio}
          >
            <span className="flex min-w-0 flex-col">
              <span className={T.bodyLg}>{a.label}</span>
              <span className={cn(T.meta, "truncate")}>
                {shortAddress(a.address)} · {balanceLineOf(makerId(a.index), network, ctx)}
              </span>
            </span>
            {a.index === wallet.account && (
              <span className="text-[color:var(--color-icon-brand)]">
                <Icon icon={Tick02Icon} size={16} />
              </span>
            )}
          </button>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className={cn(T.rowTitle, "pb-2")}>Network</legend>
        {NETWORKS.map((n) => (
          <button
            key={n.value}
            type="button"
            role="radio"
            aria-checked={n.value === network}
            onClick={() => n.value !== network && save(walletSwitchNetwork(readWallet(), id, n.value), `Wallet on ${n.label}`)}
            className={radio}
          >
            <span className={T.bodyLg}>{n.label}</span>
            {n.value === network && (
              <span className="text-[color:var(--color-icon-brand)]">
                <Icon icon={Tick02Icon} size={16} />
              </span>
            )}
          </button>
        ))}
      </fieldset>
    </Sheet>
  );
}

/** Import IDZ token (web ImportTokenDialog, as a sheet): the contract, symbol and decimals to copy. */
export function ImportTokenSheet({ open, onClose, network }: { open: boolean; onClose: () => void; network: Network }) {
  const copy = useCopy();
  const contract = idzContractOf(network);
  const rows = [
    { label: "Token contract address", value: contract, mono: true },
    { label: "Token symbol", value: IDZ_TOKEN.symbol },
    { label: "Token decimals", value: String(IDZ_TOKEN.decimals) },
  ];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Import IDZ token into Wallet"
      description="Add IDZ to your wallet app so it shows your balance there."
      actions={
        <>
          <Button size="xl" className="w-full" onClick={onClose}>
            Done
          </Button>
          <p className={cn(T.meta, "text-center")}>Adding it to MetaMask in one step opens once real wallets can connect.</p>
        </>
      }
    >
      <div className="flex items-center gap-6 rounded-xl bg-bg-subtle p-6">
        <IdzCoin height={32} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={T.section}>{IDZ_TOKEN.name}</span>
          <span className={T.meta}>{networkLabelOf(network)}</span>
        </div>
        <TestnetDemoBadge />
      </div>
      <dl className="flex flex-col gap-6">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-2">
            <dt className={T.label}>{r.label}</dt>
            <dd className="flex items-center justify-between gap-4 rounded-lg border-[length:var(--border-width-1)] border-solid border-border py-2 pl-6 pr-2">
              <span className={cn(T.body, "min-w-0 text-text-primary", r.mono && "break-all font-mono")}>{r.value}</span>
              <button
                type="button"
                aria-label={`Copy ${r.label.toLowerCase()}`}
                onClick={() => copy(r.value, `${r.label} copied`)}
                className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Copy01Icon} size={18} />
              </button>
            </dd>
          </div>
        ))}
      </dl>
      <p className={T.body}>
        In your wallet app, choose Import tokens, pick {networkLabelOf(network)}, and paste the contract address. The symbol and decimals fill in from it.
      </p>
    </Sheet>
  );
}

/** The ⋯ menu's two rows every Earn screen has: the wallet balance and the Demo wallet. */
export const WALLET_ICON = Wallet01Icon;


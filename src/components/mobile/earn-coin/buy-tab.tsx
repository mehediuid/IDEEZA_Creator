"use client";

// Earn Coin › Buy $IDZ (Figma "Buy IDEEZA Coin" › Ideeza-Wallet 229495 not
// connected, 229392 connected; the web's Balance › Buy IDZ Token), laid out
// for a phone (UX pass 2026-11-15): a compact balance strip (Available ·
// Ready to claim · Pending, a row to Wallet balance, where the full card,
// the network and the token address are), then every presale purchase of the
// connected demo account as a row — its IDZ, chain and date, and at the end
// where it stands: Claim in … (a countdown, the web's words), Claim (through the wallet
// sheet), Claimed. The row opens the purchase's sheet with every field (Txn
// ID, Wallet Address, You paid, Date) and its Claim. Filters are one row of
// chips: Chain Type and Status (Figma), Month and Year (the web's table);
// ten at a time. Buy $IDZ Coin is the BottomBar's; Import IDZ token is in ⋯.
// After a purchase the presale comes back here with `?bought=<tx>`, and the
// success sheet (Figma 230189) counts down to its claim; View transaction log
// goes to the list. A `bought` that names no purchase of this wallet opens
// nothing. The wallet sheet is the screen's, so a disconnect mid-claim still
// says so.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlarmClockIcon, Download04Icon, Note01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { demoAddress, readWallet } from "@/lib/wallet/demo-wallet";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import { LOCK_WORDS, claimInOf, claimRequestOf, countdownOf } from "@/lib/wallet/presale";
import {
  PURCHASE_STATUSES,
  filterPurchases,
  purchaseStatusOf,
  purchaseYearsOf,
  purchasesOf,
  type Purchase,
  type PurchaseStatus,
} from "@/lib/wallet/presale-records";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { BottomBar } from "../kit/bottom-bar";
import { ListCard } from "../kit/list";
import { PRESSED } from "../kit/press";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { tabPanelProps } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useEarnMenu } from "./earn-menu";
import {
  BalanceStrip,
  ConnectSheet,
  CopyChip,
  DetailRows,
  EARN_TABS_ID,
  EarnTabs,
  FilterChips,
  ImportTokenSheet,
  MONTH_OPTIONS,
  SectionHead,
  TestnetLine,
  shortNetworkOf,
  useEarnState,
  whenOf,
} from "./parts";
import { useWalletSheet } from "./wallet-sheet";

export const ACTIVITY_ID = "earn-activity";
const PER_PAGE = 10;

/** Report a problem, opened about this purchase (the web's "contact us"). */
function reportHref(txHash: string | null): string {
  const details = txHash ? `IDZ presale purchase ${txHash}` : "IDZ presale purchase";
  return `/m/help/report?from=${encodeURIComponent("/m/earn/buy")}&details=${encodeURIComponent(details)}`;
}

export function BuyTab() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { wallet, now, id, connected, network, holdings } = useEarnState();
  const [importing, setImporting] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const menu = useEarnMenu({ extra: [{ label: "Import IDZ token", icon: Download04Icon, onSelect: () => setImporting(true) }] });
  const sheet = useWalletSheet();
  const bought = params.get("bought");
  const purchases = wallet && id && connected ? purchasesOf(wallet, id) : [];
  const boughtPurchase = bought ? (purchases.find((p) => p.txHash === bought) ?? null) : null;

  // `?bought=` that names no purchase of this wallet: no success to show, so it says so and leaves the address.
  const stray = !!bought && !!wallet && !boughtPurchase;
  React.useEffect(() => {
    if (!stray) return;
    toast({ title: "That purchase isn’t in this wallet.", lead: "error" });
    router.replace("/m/earn/buy", { scroll: false });
  }, [stray, toast, router]);

  return (
    <Screen
      top={<TopBar back="/m/earn" title="Earn Coin" actions={[menu.action]} />}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" onClick={() => router.push("/m/earn/presale")}>
            Buy $IDZ Coin
          </Button>
        </BottomBar>
      }
      className="px-8 pb-8"
    >
      <div className="flex flex-col gap-10">
        <EarnTabs />
        <div {...tabPanelProps(EARN_TABS_ID, "buy")} className="flex flex-col gap-10 outline-none">
          {!wallet ? (
            <Skeleton shape="block" className="h-[76px] w-full" />
          ) : (
            holdings && (
              <BalanceStrip
                facts={[
                  { label: "Available", value: formatAmount(holdings.available, "IDZ") },
                  { label: "Ready to claim", value: formatAmount(holdings.claimable, "IDZ"), tone: compareAmounts(holdings.claimable, "0") > 0 ? "success" : undefined },
                  { label: "Pending", value: formatAmount(holdings.pending, "IDZ") },
                ]}
              />
            )
          )}

          <section className="flex flex-col gap-4" aria-labelledby={ACTIVITY_ID}>
            <SectionHead id={ACTIVITY_ID}>Transaction Activity</SectionHead>
            {!wallet ? null : connected && id ? (
              <Purchases purchases={purchases} now={now} sheet={sheet} />
            ) : (
              <EmptyState
                icon={Note01Icon}
                title="No data found"
                body="Connect your wallet to see your purchases."
                action={{ label: "Connect wallet", onClick: () => setConnecting(true) }}
              />
            )}
          </section>
          <TestnetLine>Testnet demo · no real money moves. Bought IDZ unlocks {LOCK_WORDS} after the purchase confirms.</TestnetLine>
        </div>
      </div>
      <ImportTokenSheet open={importing} onClose={() => setImporting(false)} network={network} />
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} />
      {boughtPurchase && <PurchaseSuccess purchase={boughtPurchase} now={now} onClose={() => router.replace("/m/earn/buy", { scroll: false })} />}
      {sheet.sheet}
      {menu.node}
    </Screen>
  );
}

function Purchases({ purchases, now, sheet }: { purchases: Purchase[]; now: number; sheet: ReturnType<typeof useWalletSheet> }) {
  const [chain, setChain] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [month, setMonth] = React.useState("all");
  const [year, setYear] = React.useState("all");
  const [count, setCount] = React.useState(PER_PAGE);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const shown = filterPurchases(
    purchases,
    {
      network: chain === "all" ? "all" : (chain as Network),
      status: status === "all" ? "all" : (status as PurchaseStatus),
      month: month === "all" ? "all" : Number(month),
      year: year === "all" ? "all" : Number(year),
    },
    now,
  );
  const toast = useToast();
  const pick = (set: (v: string) => void) => (v: string) => {
    set(v);
    setCount(PER_PAGE);
  };
  const clear = () => {
    setChain("all");
    setStatus("all");
    setMonth("all");
    setYear("all");
    setCount(PER_PAGE);
  };

  const claim = async (p: Purchase) => {
    setOpenId(null);
    const result = await sheet.request(claimRequestOf(p), {
      recheck: () => {
        const fresh = purchasesOf(readWallet(), p.identity).find((x) => x.id === p.id);
        if (!fresh) return "This purchase isn't in this wallet any more.";
        if (fresh.claim) return "This purchase was already claimed.";
        if (Date.now() < fresh.buy.unlocksAt) return "It isn't unlocked yet.";
        return null;
      },
    });
    if (result.ok) toast({ title: `${formatAmount(p.buy.idz, "IDZ")} added to your balance` });
  };
  const opened = openId ? (purchases.find((p) => p.id === openId) ?? null) : null;

  return (
    <>
      <FilterChips
        label="Filter purchases"
        onClear={clear}
        chips={[
          { label: "Chain Type", value: chain, onChange: pick(setChain), options: [{ value: "all", label: "All chains" }, ...NETWORKS.map((n) => ({ value: n.value, label: n.label }))] },
          { label: "Status", value: status, onChange: pick(setStatus), options: [{ value: "all", label: "Every status" }, ...PURCHASE_STATUSES.map((s) => ({ value: s.value, label: s.label }))] },
          { label: "Month", value: month, onChange: pick(setMonth), options: MONTH_OPTIONS },
          {
            label: "Year",
            value: year,
            onChange: pick(setYear),
            options: [{ value: "all", label: "Every year" }, ...purchaseYearsOf(purchases, now).map((y) => ({ value: String(y), label: String(y) }))],
          },
        ]}
      />
      {shown.length === 0 ? (
        purchases.length ? (
          <EmptyState title="No purchases match" body="No purchase matches these filters." action={{ label: "Clear filters", onClick: clear }} />
        ) : (
          <EmptyState icon={Note01Icon} title="No purchases yet" body="Buy IDZ in the presale to see it here." />
        )
      ) : (
        <ListCard label="Presale purchases">
          {shown.slice(0, count).map((p) => (
            <PurchaseRow key={p.id} p={p} now={now} busy={sheet.busy} onClaim={() => claim(p)} onOpen={() => setOpenId(p.id)} />
          ))}
        </ListCard>
      )}
      {shown.length > count && (
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setCount((n) => n + PER_PAGE)}>
          Show more
        </Button>
      )}
      {opened && <PurchaseSheet p={opened} now={now} busy={sheet.busy} onClaim={() => claim(opened)} onClose={() => setOpenId(null)} />}
    </>
  );
}

/** Where a purchase stands, at the end of its row: Claim, the unlock countdown, or Claimed. */
function PurchaseState({ p, now, busy, onClaim, lockId }: { p: Purchase; now: number; busy?: boolean; onClaim?: () => void; lockId?: string }) {
  const status = purchaseStatusOf(p, now);
  if (status === "claimable" && !onClaim) return <Badge tone="success">Ready to claim now</Badge>;
  if (status === "claimed")
    return (
      <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
        Claimed
      </Badge>
    );
  if (status === "claimable")
    return (
      <Button size="sm" className="shrink-0" disabled={busy} onClick={onClaim} aria-label={`Claim ${formatAmount(p.buy.idz, "IDZ")}`}>
        Claim
      </Button>
    );
  // The web's pill words ("Claim in 1 m 58 s", purchase-table.tsx), as the phone's wallet ledger says it (MON-19).
  const left = claimInOf(p.buy.unlocksAt - now);
  return (
    <span id={lockId} role="timer" aria-label={left} className="inline-flex shrink-0">
      <Badge tone="error" icon={<Icon icon={AlarmClockIcon} size={12} />} className="tabular-nums">
        <span aria-hidden>{left}</span>
      </Badge>
    </span>
  );
}

/** One purchase as a row (lens 2): the IDZ, its chain and date; the row opens every detail. */
function PurchaseRow({ p, now, busy, onClaim, onOpen }: { p: Purchase; now: number; busy: boolean; onClaim: () => void; onOpen: () => void }) {
  return (
    <li className="flex items-center gap-4 pr-8">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onOpen}
        aria-label={`Purchase details, ${formatAmount(p.buy.idz, "IDZ")}, ${whenOf(p.at)}`}
        className={cn("flex min-h-[64px] min-w-0 flex-1 items-center gap-6 py-6 pl-8 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus", PRESSED)}
      >
        <IdzCoin height={28} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className={cn(T.rowTitle, "tabular-nums")}>{formatAmount(p.buy.idz, "IDZ")}</span>
          <span className={cn(T.meta, "truncate")}>
            {shortNetworkOf(p.network)} · {whenOf(p.at)}
          </span>
        </span>
      </button>
      <PurchaseState p={p} now={now} busy={busy} onClaim={onClaim} />
    </li>
  );
}

/** A purchase's every field (the old card's table), with its Claim. */
function PurchaseSheet({ p, now, busy, onClaim, onClose }: { p: Purchase; now: number; busy: boolean; onClaim: () => void; onClose: () => void }) {
  const status = purchaseStatusOf(p, now);
  const lockId = `unlock-${p.id}`;
  return (
    <Sheet
      open
      onClose={onClose}
      title={formatAmount(p.buy.idz, "IDZ")}
      description={`Presale purchase · ${networkLabelOf(p.network)}`}
      actions={
        status === "claimable" ? (
          <Button size="xl" className="w-full" disabled={busy} onClick={onClaim}>
            Claim {formatAmount(p.buy.idz, "IDZ")}
          </Button>
        ) : status === "locked" ? (
          <Button size="xl" className="w-full" disabled aria-describedby={lockId}>
            Claim
          </Button>
        ) : undefined
      }
    >
      <DetailRows
        rows={[
          { label: "Status", value: <PurchaseState p={p} now={now} lockId={lockId} /> },
          { label: "Txn ID", value: p.txHash ? <CopyChip value={p.txHash} what="Transaction ID" /> : "—" },
          { label: "Wallet Address", value: <CopyChip value={demoAddress(p.identity)} what="Wallet address" /> },
          { label: "You paid", value: formatAmount(p.buy.paid.amount, p.buy.paid.coin) },
          { label: "Date", value: whenOf(p.at) },
        ]}
      />
      <p className={T.meta}>
        If you have any questions or need support,{" "}
        <Link href={reportHref(p.txHash)} className="text-text-brand underline underline-offset-2">
          contact us
        </Link>
        .
      </p>
    </Sheet>
  );
}

const UNITS = [
  { key: "hours", name: "hr" },
  { key: "minutes", name: "min" },
  { key: "seconds", name: "sec" },
] as const;

/** Figma 230189 (as a sheet): the purchase went through; its IDZ can be claimed when the countdown ends. */
function PurchaseSuccess({ purchase, now, onClose }: { purchase: Purchase; now: number; onClose: () => void }) {
  const left = purchase.buy.unlocksAt - now;
  const c = countdownOf(left);
  const hours = c.days * 24 + c.hours;
  const viewLog = () => {
    onClose();
    window.setTimeout(() => {
      const h = document.getElementById(ACTIVITY_ID);
      h?.scrollIntoView({ block: "start" });
      h?.focus();
    }, 0);
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title="Purchase successful"
      description={`${formatAmount(purchase.buy.idz, "IDZ")} for ${formatAmount(purchase.buy.paid.amount, purchase.buy.paid.coin)}.`}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={viewLog}>
            View transaction log
          </Button>
          <p className={cn(T.meta, "text-center")}>
            If you have any questions or need support,{" "}
            <Link href={reportHref(purchase.txHash)} className="text-text-brand underline underline-offset-2">
              contact us
            </Link>
            .
          </p>
        </>
      }
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <span aria-hidden className="inline-flex size-[56px] items-center justify-center rounded-full bg-bg-success-subtle text-text-success">
          <Icon icon={Tick02Icon} size={28} />
        </span>
        {left > 0 ? (
          <>
            <p className={T.title}>Your IDZ will be available to claim in</p>
            <div role="timer" aria-label={`${hours} hours ${c.minutes} minutes ${c.seconds} seconds`} className="flex gap-4">
              {UNITS.map((u) => (
                <span key={u.key} aria-hidden className="inline-flex h-[28px] items-center gap-1 rounded-md bg-bg-subtle px-4 tabular-nums">
                  <span className={T.name}>{String(u.key === "hours" ? hours : c[u.key]).padStart(2, "0")}</span>
                  <span className={T.meta}>{u.name}</span>
                </span>
              ))}
            </div>
            <p className={T.body}>Once the countdown reaches zero, you’ll be able to claim your IDZ.</p>
          </>
        ) : (
          <p role="status" className={T.title}>
            Your IDZ is ready to claim.
          </p>
        )}
        {purchase.txHash && (
          <p className={cn(T.body, "flex flex-wrap items-center justify-center gap-3")}>
            Transaction
            <CopyChip value={purchase.txHash} what="Transaction hash" />
          </p>
        )}
        <p className={T.meta}>
          Bought IDZ unlocks {LOCK_WORDS} after the purchase confirms. Then you claim it here, on Buy $IDZ.
        </p>
      </div>
    </Sheet>
  );
}

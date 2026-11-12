"use client";

// Earn Coin › Buy $IDZ (Figma "Buy IDEEZA Coin" › Ideeza-Wallet 229495 not
// connected, 229392 connected; the web's Balance › Buy IDZ Token): the
// balance card with Import IDZ Token and Buy $IDZ Coin, and every presale
// purchase of the connected demo account, filtered by Chain Type and Status
// (Figma) and by Month and Year (the web's table), ten at a time, each with
// where it stands — Unlocks in … (Claim off), Ready to claim now (Claim,
// through the wallet sheet), Claimed. After a purchase the presale comes back
// here with `?bought=<tx>`, and the success sheet (Figma 230189) shows its
// transaction and counts down to its claim; View transaction log goes to the
// list. A `bought` that names no purchase of this wallet opens nothing.
// The wallet sheet is the screen's, so a disconnect mid-claim still says so.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlarmClockIcon, Note01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { cn } from "@/lib/utils";
import { demoAddress, readWallet } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { LOCK_WORDS, claimRequestOf, countdownOf } from "@/lib/wallet/presale";
import {
  PURCHASE_STATUSES,
  filterPurchases,
  purchaseStatusOf,
  purchaseYearsOf,
  purchasesOf,
  type Purchase,
  type PurchaseStatus,
} from "@/lib/wallet/presale-records";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { tabPanelProps } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useEarnMenu } from "./earn-menu";
import {
  BalanceCard,
  BalanceHeading,
  CARD,
  CardActions,
  ChainTitle,
  ConnectSheet,
  CopyChip,
  EARN_TABS_ID,
  EarnTabs,
  FilterButton,
  IdzFigure,
  ImportTokenSheet,
  InfoRow,
  MONTH_OPTIONS,
  NoBalanceCard,
  clockOf,
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
  const menu = useEarnMenu();
  const sheet = useWalletSheet();
  const [importing, setImporting] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
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

  const buyButton = (
    <Button size="xl" className="w-full px-4" onClick={() => router.push("/m/earn/presale")}>
      Buy $IDZ Coin
    </Button>
  );

  return (
    <Screen top={<TopBar back="/m/earn" title="Earn Coin" actions={[menu.action]} />} className="px-8 pb-8">
      <div className="flex flex-col gap-12">
        <EarnTabs />
        <div {...tabPanelProps(EARN_TABS_ID, "buy")} className="flex flex-col gap-12 outline-none">
          <section className="flex flex-col gap-6" aria-label="Current Balance">
            <BalanceHeading network={network} connected={connected} />
            {!wallet ? (
              <Skeleton shape="block" className="h-[242px] w-full" />
            ) : holdings ? (
              <BalanceCard network={network} holdings={holdings}>
                <CardActions>
                  <Button hierarchy="secondary" size="xl" className="w-full px-4" onClick={() => setImporting(true)}>
                    Import IDZ Token
                  </Button>
                  {buyButton}
                </CardActions>
              </BalanceCard>
            ) : (
              <NoBalanceCard>
                <CardActions>
                  <Button hierarchy="secondary" size="xl" className="w-full px-4" onClick={() => setConnecting(true)}>
                    Connect wallet
                  </Button>
                  {buyButton}
                </CardActions>
              </NoBalanceCard>
            )}
          </section>

          <section className="flex flex-col gap-8" aria-labelledby={ACTIVITY_ID}>
            <h2 id={ACTIVITY_ID} tabIndex={-1} className={cn(T.section, "outline-none")}>
              Transaction Activity
            </h2>
            {!wallet ? null : connected && id ? (
              <Purchases purchases={purchases} now={now} sheet={sheet} />
            ) : (
              <EmptyState icon={Note01Icon} title="No data found" body="Connect your wallet to see your purchases." />
            )}
          </section>
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

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex gap-6">
          <FilterButton
            label="Chain Type"
            value={chain}
            onChange={pick(setChain)}
            options={[{ value: "all", label: "All chains" }, ...NETWORKS.map((n) => ({ value: n.value, label: n.label }))]}
          />
          <FilterButton
            label="Status"
            value={status}
            onChange={pick(setStatus)}
            options={[{ value: "all", label: "Every status" }, ...PURCHASE_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
          />
        </div>
        <div className="flex gap-6">
          <FilterButton label="Month" value={month} onChange={pick(setMonth)} options={MONTH_OPTIONS} />
          <FilterButton
            label="Year"
            value={year}
            onChange={pick(setYear)}
            options={[{ value: "all", label: "Every year" }, ...purchaseYearsOf(purchases, now).map((y) => ({ value: String(y), label: String(y) }))]}
          />
        </div>
      </div>
      {shown.length === 0 ? (
        purchases.length ? (
          <EmptyState title="No purchases match" body="No purchase matches these filters." action={{ label: "Clear filters", onClick: clear }} />
        ) : (
          <EmptyState icon={Note01Icon} title="No purchases yet" body="Buy IDZ in the presale to see it here." />
        )
      ) : (
        <ul className="flex flex-col gap-8">
          {shown.slice(0, count).map((p) => (
            <PurchaseCard key={p.id} p={p} now={now} busy={sheet.busy} onClaim={() => claim(p)} />
          ))}
        </ul>
      )}
      {shown.length > count && (
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setCount((n) => n + PER_PAGE)}>
          Show more
        </Button>
      )}
    </>
  );
}

function PurchaseCard({ p, now, busy, onClaim }: { p: Purchase; now: number; busy: boolean; onClaim: () => void }) {
  const status = purchaseStatusOf(p, now);
  const lockId = `unlock-${p.id}`;
  return (
    <li className={cn(CARD, "flex flex-col gap-8 p-8")}>
      <div className="flex items-center justify-between gap-6">
        <ChainTitle network={p.network} />
        <IdzFigure amount={p.buy.idz} />
      </div>
      <dl className="flex flex-col gap-4">
        <InfoRow label="Txn ID">{p.txHash ? <CopyChip value={p.txHash} what="Transaction ID" /> : "—"}</InfoRow>
        <InfoRow label="Wallet Address">
          <CopyChip value={demoAddress(p.identity)} what="Wallet address" />
        </InfoRow>
        <InfoRow label="You paid">{formatAmount(p.buy.paid.amount, p.buy.paid.coin)}</InfoRow>
        <InfoRow label="Date">{whenOf(p.at)}</InfoRow>
      </dl>
      <div className="flex min-h-[36px] flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t-[length:var(--border-width-1)] border-solid border-border pt-8">
        {status === "claimed" ? (
          <>
            <span className={T.body}>In your balance</span>
            <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
              Claimed
            </Badge>
          </>
        ) : status === "claimable" ? (
          <>
            <span className={cn(T.rowTitle, "text-text-success")}>Ready to claim now</span>
            <Button size="sm" disabled={busy} onClick={onClaim} aria-label={`Claim ${formatAmount(p.buy.idz, "IDZ")}`}>
              Claim
            </Button>
          </>
        ) : (
          <>
            <span id={lockId} className={cn(T.body, "flex items-center gap-3 text-text-primary")}>
              Unlocks in:
              <span role="timer">
                <Badge tone="error" icon={<Icon icon={AlarmClockIcon} size={12} />} className="tabular-nums">
                  {clockOf(p.buy.unlocksAt - now)}
                </Badge>
              </span>
            </span>
            <Button size="sm" disabled aria-describedby={lockId}>
              Claim
            </Button>
          </>
        )}
      </div>
    </li>
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

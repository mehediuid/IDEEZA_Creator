"use client";

// Earn Coin › Stake (Figma "Stacking" › Ideeza-Wallet 228508, Contract pause
// 228566, Contract Block 228625), laid out for a phone (UX pass 2026-11-15):
// a compact balance strip (Staked · Reward ready · Available, a row to Wallet
// balance), then every stake of the connected demo account, filtered by Month
// and Year (one row of chips). Each stake is a card whose head opens Stake
// detail — the amount, the contract and chain, the lock-up's progress and
// days left — and whose foot says where its reward stands: the reward and
// what was claimed, then Claim, Claim in …, Claimed. Withdraw and the TXN ID
// live on Stake detail (they were on both). A paused contract counts on but
// takes nothing (its line on the card); a blocked one shows the held line
// and Get support (Report a problem, naming the stake) — unless the stake was
// already withdrawn, which keeps its own card and only says the contract is
// blocked. Stake IDZ is the BottomBar's (it opens the Stake List); Import IDZ
// token and the Demo contract states are in ⋯. The wallet sheet is the
// screen's, so a disconnect mid-claim still says so.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerSupportIcon, Download04Icon, Note01Icon, PauseIcon, Settings02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Skeleton } from "@/components/ideeza/skeleton";
import { cn } from "@/lib/utils";
import { addAmounts, compareAmounts, formatAmount } from "@/lib/wallet/money";
import {
  STAKE_TIME_LINE,
  STATUS_WORDS,
  claimRewardRequestOf,
  contractOf,
  contractStatusOf,
  daysLeftOf,
  daysText,
  filterStakes,
  lockProgressOf,
  rewardOf,
  stakeActionBlockOf,
  stakePhaseOf,
  stakeYearsOf,
  stakesOf,
  withdrawRequestOf,
  type ContractStatus,
  type Stake,
  type StakeAdmin,
} from "@/lib/wallet/staking";
import { readWallet } from "@/lib/wallet/demo-wallet";
import { useStakeAdmin } from "@/lib/wallet/use-earn-stores";
import { BottomBar } from "../kit/bottom-bar";
import { Chevron, LIST_ROW } from "../kit/list";
import { PRESSED } from "../kit/press";
import { EmptyState } from "../kit/state";
import { tabPanelProps } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useEarnMenu } from "./earn-menu";
import {
  BalanceStrip,
  CARD,
  ConnectSheet,
  EARN_TABS_ID,
  EarnTabs,
  FilterChips,
  ImportTokenSheet,
  MONTH_OPTIONS,
  SectionHead,
  TestnetLine,
  clockOf,
  shortNetworkOf,
  useEarnState,
} from "./parts";
import { StakeAdminSheet } from "./stake-admin-sheet";
import { useWalletSheet } from "./wallet-sheet";

/** "Get support": Report a problem, opened about this stake. */
export function supportHref(s: Stake): string {
  const details = `Staking contract blocked · stake ${s.txHash ?? s.id}`;
  return `/m/help/report?from=${encodeURIComponent("/m/earn/stake")}&details=${encodeURIComponent(details)}`;
}

/** Withdraw and Claim for one stake, through the wallet sheet, with the request rechecked at Confirm. */
export function useStakeActions() {
  const wallet = useWalletSheet();
  const toast = useToast();
  const recheck = (s: Stake, action: "withdraw" | "claim", admin: () => StakeAdmin | undefined) => () => {
    const fresh = stakesOf(readWallet(), s.identity).find((x) => x.id === s.id);
    if (!fresh) return "This stake isn't in this wallet any more.";
    return stakeActionBlockOf(fresh, contractStatusOf(admin(), s.record.contract), Date.now(), action);
  };
  const withdraw = async (s: Stake, admin: () => StakeAdmin | undefined) => {
    const c = contractOf(s.record.contract);
    if (!c) return;
    const r = await wallet.request(withdrawRequestOf(c, s), { recheck: recheck(s, "withdraw", admin) });
    if (r.ok) toast({ title: `${formatAmount(s.record.amount, "IDZ")} is back in your balance` });
  };
  const claim = async (s: Stake, admin: () => StakeAdmin | undefined) => {
    const c = contractOf(s.record.contract);
    if (!c) return;
    const ready = rewardOf(s, Date.now()).ready;
    if (compareAmounts(ready, "0") <= 0) return;
    const r = await wallet.request(claimRewardRequestOf(c, s, ready), { recheck: recheck(s, "claim", admin) });
    if (r.ok) toast({ title: `${formatAmount(ready, "IDZ")} added to your balance` });
  };
  return { withdraw, claim, sheet: wallet.sheet, busy: wallet.busy };
}

export function StakeTab() {
  const router = useRouter();
  const { wallet, now, id, connected, network, holdings } = useEarnState();
  const admin = useStakeAdmin();
  const [importing, setImporting] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [demo, setDemo] = React.useState(false);
  const menu = useEarnMenu({
    extra: [
      { label: "Import IDZ token", icon: Download04Icon, onSelect: () => setImporting(true) },
      { label: "Demo: contract states", icon: Settings02Icon, onSelect: () => setDemo(true) },
    ],
  });
  const actions = useStakeActions();
  const stakes = wallet && id && connected ? stakesOf(wallet, id) : [];
  const ready = stakes.filter((s) => contractStatusOf(admin, s.record.contract) === "active").map((s) => rewardOf(s, now).ready);
  const readyTotal = ready.length ? addAmounts(...ready) : "0";

  return (
    <Screen
      top={<TopBar back="/m/earn" title="Earn Coin" actions={[menu.action]} />}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" onClick={() => router.push("/m/earn/stake/contracts")}>
            Stake IDZ
          </Button>
        </BottomBar>
      }
      className="px-8 pb-8"
    >
      <div className="flex flex-col gap-10">
        <EarnTabs />
        <div {...tabPanelProps(EARN_TABS_ID, "stake")} className="flex flex-col gap-10 outline-none">
          {!wallet ? (
            <Skeleton shape="block" className="h-[76px] w-full" />
          ) : (
            holdings && (
              <BalanceStrip
                facts={[
                  { label: "Staked", value: formatAmount(holdings.staked, "IDZ") },
                  { label: "Reward ready", value: formatAmount(readyTotal, "IDZ"), tone: compareAmounts(readyTotal, "0") > 0 ? "success" : undefined },
                  { label: "Available", value: formatAmount(holdings.available, "IDZ") },
                ]}
              />
            )
          )}

          <section className="flex flex-col gap-4" aria-labelledby="stake-activity">
            <SectionHead id="stake-activity">Transaction Activity</SectionHead>
            {!wallet ? null : connected && id ? (
              <Stakes stakes={stakes} now={now} admin={admin} actions={actions} />
            ) : (
              <EmptyState
                icon={Note01Icon}
                title="No data found"
                body="Connect your wallet to see your stakes."
                action={{ label: "Connect wallet", onClick: () => setConnecting(true) }}
              />
            )}
          </section>
          <TestnetLine>{STAKE_TIME_LINE}</TestnetLine>
        </div>
      </div>
      <ImportTokenSheet open={importing} onClose={() => setImporting(false)} network={network} />
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} />
      <StakeAdminSheet open={demo} onClose={() => setDemo(false)} />
      {actions.sheet}
      {menu.node}
    </Screen>
  );
}

function Stakes({ stakes, now, admin, actions }: { stakes: Stake[]; now: number; admin: StakeAdmin | undefined; actions: ReturnType<typeof useStakeActions> }) {
  const [month, setMonth] = React.useState("all");
  const [year, setYear] = React.useState("all");
  const adminRef = React.useRef(admin);
  React.useEffect(() => {
    adminRef.current = admin;
  }, [admin]);
  const shown = filterStakes(stakes, { month: month === "all" ? "all" : Number(month), year: year === "all" ? "all" : Number(year) });
  const clear = () => {
    setMonth("all");
    setYear("all");
  };
  return (
    <>
      <FilterChips
        label="Filter stakes"
        onClear={clear}
        chips={[
          { label: "Month", value: month, onChange: setMonth, options: MONTH_OPTIONS },
          { label: "Year", value: year, onChange: setYear, options: [{ value: "all", label: "Every year" }, ...stakeYearsOf(stakes, now).map((y) => ({ value: String(y), label: String(y) }))] },
        ]}
      />
      {shown.length === 0 ? (
        stakes.length ? (
          <EmptyState title="No stakes match" body="No stake matches these filters." action={{ label: "Clear filters", onClick: clear }} />
        ) : (
          <EmptyState icon={Note01Icon} title="Nothing staked yet" body="Pick a staking option to start." />
        )
      ) : (
        <ul className="flex flex-col gap-6">
          {shown.map((s) => (
            <StakeCard key={s.id} s={s} now={now} status={contractStatusOf(admin, s.record.contract)} busy={actions.busy} onClaim={() => actions.claim(s, () => adminRef.current)} />
          ))}
        </ul>
      )}
    </>
  );
}

/** A status on a stake's card, as the DS badge; a countdown is a timer. */
function Pill({ tone, children, timer }: { tone: "brand" | "error" | "neutral"; children: React.ReactNode; timer?: boolean }) {
  return (
    <span role={timer ? "timer" : undefined} className="inline-flex shrink-0">
      <Badge tone={tone} className="tabular-nums">
        {children}
      </Badge>
    </span>
  );
}

/** The card's head: the amount, the contract and chain, the days left, the lock-up bar; it opens Stake detail
 *  (where Withdraw, the TXN ID and every other detail are). */
function StakeHead({ s, now, tone = "brand" }: { s: Stake; now: number; tone?: "brand" | "error" }) {
  const phase = stakePhaseOf(s, now);
  const c = contractOf(s.record.contract);
  return (
    <Link
      href={`/m/earn/staked/${s.txHash ?? s.id}`}
      aria-label={`Stake details, ${formatAmount(s.record.amount, "IDZ")}`}
      className={cn("flex flex-col gap-6 p-8 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus", PRESSED)}
    >
      <div className="flex items-center gap-6">
        <IdzCoin height={28} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.section, "tabular-nums")}>{formatAmount(s.record.amount, "IDZ")}</span>
          <span className={cn(T.meta, "flex min-w-0 items-center gap-2")}>
            <span aria-hidden className={cn("size-[8px] shrink-0 rounded-full", tone === "brand" ? "bg-bg-brand" : "bg-bg-error")} />
            <span className="truncate">
              {c?.name ?? s.record.contract} · {shortNetworkOf(s.network)}
            </span>
          </span>
        </span>
        <Chevron />
      </div>
      {tone === "brand" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-6">
            <span className={T.meta}>Lockup period • {daysText(s.record.lockDays)}</span>
            <span className={cn(T.meta, "tabular-nums text-text-primary")}>
              {phase === "withdrawn" ? "Withdrawn" : phase === "open" ? "Ended" : `${daysLeftOf(s, now)}d left`}
            </span>
          </div>
          <ProgressBar value={lockProgressOf(s, now)} label="Lock-up" />
        </div>
      )}
    </Link>
  );
}

const FOOT = "flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t-[length:var(--border-width-1)] border-solid border-border px-8 py-6";

function StakeCard({ s, now, status, busy, onClaim }: { s: Stake; now: number; status: ContractStatus; busy: boolean; onClaim: () => void }) {
  const phase = stakePhaseOf(s, now);
  const reward = rewardOf(s, now);

  // Blocked: what is still in the contract is held. A stake already withdrawn keeps its own card below.
  if (status === "blocked" && phase !== "withdrawn") {
    return (
      <li className={cn(CARD, "flex flex-col overflow-hidden")}>
        <StakeHead s={s} now={now} tone="error" />
        <div className={FOOT}>
          <p className={cn(T.meta, "min-w-0 flex-1 text-text-error")}>
            {STATUS_WORDS.blocked}. Your {formatAmount(s.record.amount, "IDZ")} and its rewards are held until it’s sorted out.
          </p>
          <Pill tone="error">Blocked</Pill>
        </div>
        <SupportRow s={s} />
      </li>
    );
  }

  const rewardLeft = compareAmounts(reward.ready, "0") > 0 || reward.nextAt !== null;
  let foot: React.ReactNode;
  if (status === "blocked") foot = rewardLeft ? <Pill tone="error">Blocked</Pill> : compareAmounts(reward.claimed, "0") > 0 ? <ClaimedBadge /> : <Pill tone="neutral">No reward</Pill>;
  else if (status === "paused") foot = reward.nextAt ? <Pill tone="brand" timer>Next claim in {clockOf(reward.nextAt - now)}</Pill> : <Pill tone="brand">Paused</Pill>;
  else if (compareAmounts(reward.ready, "0") > 0)
    foot = (
      <Button size="sm" className="shrink-0" disabled={busy} onClick={onClaim} aria-label={`Claim ${formatAmount(reward.ready, "IDZ")}`}>
        Claim
      </Button>
    );
  else if (reward.nextAt) foot = <Pill tone="brand" timer>Claim in {clockOf(reward.nextAt - now)}</Pill>;
  else if (compareAmounts(reward.claimed, "0") <= 0) foot = <Pill tone="neutral">No reward</Pill>;
  else foot = <ClaimedBadge />;

  return (
    <li className={cn(CARD, "flex flex-col overflow-hidden")}>
      <StakeHead s={s} now={now} />
      <div className={FOOT}>
        <span className="flex min-w-0 flex-col">
          <span className={T.micro}>Reward</span>
          <span className={cn(T.rowTitle, "tabular-nums text-text-success")}>{formatAmount(reward.total, "IDZ")}</span>
          <span className={cn(T.micro, "tabular-nums")}>{formatAmount(reward.claimed, "IDZ")} claimed</span>
        </span>
        {foot}
      </div>
      {status === "paused" && phase !== "withdrawn" && (
        <p className={cn(T.meta, "px-8 pb-6")}>
          <span className="inline-flex items-center gap-2 align-middle text-badge-warning-text">
            <Icon icon={PauseIcon} size={14} />
          </span>{" "}
          {STATUS_WORDS.paused}. Claims and withdrawals wait until it resumes.
        </p>
      )}
      {status === "blocked" && (
        <>
          <p className={cn(T.meta, "px-8 pb-2 text-text-error")}>
            {STATUS_WORDS.blocked}.{rewardLeft ? " Its unclaimed rewards are held until it’s sorted out." : ""}
          </p>
          <SupportRow s={s} />
        </>
      )}
    </li>
  );
}

/** "Get support" as a row (was a text link): Report a problem, opened about this stake. */
function SupportRow({ s }: { s: Stake }) {
  return (
    <Link href={supportHref(s)} className={cn(LIST_ROW, "border-t-[length:var(--border-width-1)] border-solid border-border")}>
      <span className="shrink-0 text-[color:var(--color-icon-default)]">
        <Icon icon={CustomerSupportIcon} size={20} />
      </span>
      <span className={cn(T.rowTitle, "min-w-0 flex-1")}>Get support</span>
      <Chevron />
    </Link>
  );
}

function ClaimedBadge() {
  return (
    <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
      Claimed
    </Badge>
  );
}

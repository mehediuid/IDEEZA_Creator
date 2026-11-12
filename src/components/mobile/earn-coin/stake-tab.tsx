"use client";

// Earn Coin › Stake (Figma "Stacking" › Ideeza-Wallet 228508, Contract pause
// 228566, Contract Block 228625): the balance card, then every stake of the
// connected demo account, filtered by Month and Year. Each card: its chain,
// Withdraw (open in the grace time and once the lock-up ends; locked in
// between, with why), STAKED and REWARD (earned so far, and what was
// claimed), the lock-up's progress and days left, its transaction, and where
// its reward stands — Claim, Claim in …, Claimed. A paused contract counts on
// but takes nothing (the pause mark on its transaction); a blocked one shows
// only Get support (Report a problem, naming the stake) — unless the stake was
// already withdrawn, which keeps its own card and only says the contract is
// blocked. Stake IDZ (beside the heading) opens the Stake List. The wallet
// sheet is the screen's, so a disconnect mid-claim still says so.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Note01Icon, PauseIcon, Tick02Icon, UnavailableIcon, Settings02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Skeleton } from "@/components/ideeza/skeleton";
import { cn } from "@/lib/utils";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
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
import { Eyebrow } from "../kit/eyebrow";
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
  ImportTokenSheet,
  MONTH_OPTIONS,
  NoBalanceCard,
  clockOf,
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
  const menu = useEarnMenu({ extra: [{ label: "Demo: contract states", icon: Settings02Icon, onSelect: () => setDemo(true) }] });
  const actions = useStakeActions();
  const buyButton = (
    <Button size="xl" className="w-full px-4" onClick={() => router.push("/m/earn/presale")}>
      Buy $IDZ Coin
    </Button>
  );

  return (
    <Screen top={<TopBar back="/m/earn" title="Earn Coin" actions={[menu.action]} />} className="px-8 pb-8">
      <div className="flex flex-col gap-12">
        <EarnTabs />
        <div {...tabPanelProps(EARN_TABS_ID, "stake")} className="flex flex-col gap-12 outline-none">
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

        <section className="flex flex-col gap-8" aria-labelledby="stake-activity">
          <div className="flex items-center justify-between gap-6">
            <h2 id="stake-activity" className={T.section}>
              Transaction Activity
            </h2>
            <Link href="/m/earn/stake/contracts" className={cn(T.rowTitle, "text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
              Stake IDZ
            </Link>
          </div>
          {!wallet ? null : connected && id ? (
            <Stakes stakes={stakesOf(wallet, id)} now={now} admin={admin} actions={actions} />
          ) : (
            <EmptyState icon={Note01Icon} title="No data found" body="Connect your wallet to see your stakes." />
          )}
        </section>
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
  return (
    <>
      <div className="flex gap-6">
        <FilterButton label="Month" value={month} onChange={setMonth} options={MONTH_OPTIONS} />
        <FilterButton
          label="Year"
          value={year}
          onChange={setYear}
          options={[{ value: "all", label: "Every year" }, ...stakeYearsOf(stakes, now).map((y) => ({ value: String(y), label: String(y) }))]}
        />
      </div>
      {shown.length === 0 ? (
        stakes.length ? (
          <EmptyState
            title="No stakes match"
            body="No stake matches these filters."
            action={{
              label: "Clear filters",
              onClick: () => {
                setMonth("all");
                setYear("all");
              },
            }}
          />
        ) : (
          <EmptyState icon={Note01Icon} title="Nothing staked yet" body="Pick a staking option to start." action={{ label: "Stake IDZ", href: "/m/earn/stake/contracts" }} />
        )
      ) : (
        <ul className="flex flex-col gap-8">
          {shown.map((s) => (
            <StakeCard
              key={s.id}
              s={s}
              now={now}
              status={contractStatusOf(admin, s.record.contract)}
              busy={actions.busy}
              onWithdraw={() => actions.withdraw(s, () => adminRef.current)}
              onClaim={() => actions.claim(s, () => adminRef.current)}
            />
          ))}
        </ul>
      )}
      <p className={T.meta}>{STAKE_TIME_LINE}</p>
    </>
  );
}

/** A status on a stake's card, as the DS badge; a countdown is a timer. */
function Pill({ tone, children, timer }: { tone: "brand" | "error"; children: React.ReactNode; timer?: boolean }) {
  return (
    <span role={timer ? "timer" : undefined} className="inline-flex shrink-0">
      <Badge tone={tone} className="tabular-nums">
        {children}
      </Badge>
    </span>
  );
}

function StakeCard({
  s,
  now,
  status,
  busy,
  onWithdraw,
  onClaim,
}: {
  s: Stake;
  now: number;
  status: ContractStatus;
  busy: boolean;
  onWithdraw: () => void;
  onClaim: () => void;
}) {
  const phase = stakePhaseOf(s, now);
  const reward = rewardOf(s, now);
  const withdrawBlock = stakeActionBlockOf(s, status, now, "withdraw");
  const noteId = `stake-note-${s.id}`;
  const txn = s.txHash ?? s.id;

  // Blocked: what is still in the contract is held. A stake already withdrawn keeps its own card below.
  if (status === "blocked" && phase !== "withdrawn") {
    return (
      <li className={cn(CARD, "flex flex-col gap-8 p-8")}>
        <div className="flex items-center justify-between gap-6">
          <ChainTitle network={s.network} tone="error" />
          <Link href={supportHref(s)} className={cn(T.rowTitle, "text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
            Get support
          </Link>
        </div>
        <div className="flex items-center justify-between gap-6 border-t-[length:var(--border-width-1)] border-solid border-border pt-8">
          <span className="flex min-w-0 items-center gap-4">
            <span className={cn(T.meta, "shrink-0 text-text-primary")}>TXN ID:</span>
            <CopyChip value={txn} what="Transaction ID" tone="error" lead={<Icon icon={UnavailableIcon} size={14} />} />
          </span>
          <Pill tone="error">Blocked</Pill>
        </div>
        <p className={cn(T.meta, "text-text-error")}>{STATUS_WORDS.blocked}. Your {formatAmount(s.record.amount, "IDZ")} and its rewards are held until it’s sorted out.</p>
      </li>
    );
  }

  const rewardLeft = compareAmounts(reward.ready, "0") > 0 || reward.nextAt !== null;
  let foot: React.ReactNode;
  if (status === "blocked") foot = rewardLeft ? <Pill tone="error">Blocked</Pill> : compareAmounts(reward.claimed, "0") > 0 ? <ClaimedBadge /> : <Badge tone="neutral">No reward</Badge>;
  else if (status === "paused") foot = reward.nextAt ? <Pill tone="brand" timer>Next claim in {clockOf(reward.nextAt - now)}</Pill> : <Pill tone="brand">Paused</Pill>;
  else if (compareAmounts(reward.ready, "0") > 0)
    foot = (
      <Button size="sm" disabled={busy} onClick={onClaim} aria-label={`Claim ${formatAmount(reward.ready, "IDZ")}`}>
        Claim
      </Button>
    );
  else if (reward.nextAt) foot = <Pill tone="brand" timer>Claim in {clockOf(reward.nextAt - now)}</Pill>;
  else if (compareAmounts(reward.claimed, "0") <= 0) foot = <Badge tone="neutral">No reward</Badge>;
  else foot = <ClaimedBadge />;

  return (
    <li className={cn(CARD, "flex flex-col gap-8 p-8")}>
      <div className="flex items-center justify-between gap-6">
        <ChainTitle network={s.network} />
        {phase === "withdrawn" ? (
          <span className={cn(T.rowTitle, "text-text-disabled")}>Withdrawn</span>
        ) : (
          <button
            type="button"
            onClick={withdrawBlock ? undefined : onWithdraw}
            aria-disabled={withdrawBlock || busy ? true : undefined}
            aria-describedby={withdrawBlock ? noteId : undefined}
            className={cn(
              T.rowTitle,
              "rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              withdrawBlock ? "cursor-not-allowed text-text-disabled" : "text-text-brand",
            )}
          >
            Withdraw
          </button>
        )}
      </div>
      <Link href={`/m/earn/staked/${s.txHash ?? s.id}`} className="-m-2 flex flex-col gap-8 rounded-lg p-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus" aria-label={`Stake details, ${formatAmount(s.record.amount, "IDZ")}`}>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-6">
            <Eyebrow tone="tertiary" as="span">
              Staked
            </Eyebrow>
            <span className={cn(T.section, "inline-flex min-w-0 items-center gap-2 tabular-nums")}>
              <IdzCoin height={18} />
              <span className="truncate">{formatAmount(s.record.amount, "IDZ").replace(/ IDZ$/, "")}</span>
              <span className={cn(T.meta, "text-text-brand")}>IDZ</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-6">
            <Eyebrow tone="tertiary" as="span">
              Reward
            </Eyebrow>
            <span className={cn(T.section, "inline-flex min-w-0 items-center gap-2 tabular-nums text-text-success")}>
              <IdzCoin height={18} />
              <span className="truncate">{formatAmount(reward.total, "IDZ").replace(/ IDZ$/, "")}</span>
              <span className={cn(T.meta, "text-text-brand")}>IDZ</span>
            </span>
            <span className={cn(T.micro, "tabular-nums")}>{formatAmount(reward.claimed, "IDZ")} claimed</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-6">
            <span className={cn(T.body, "text-text-primary")}>Lockup period • {daysText(s.record.lockDays)}</span>
            <span className={cn(T.meta, "tabular-nums")}>
              {phase === "withdrawn" ? "Withdrawn" : phase === "open" ? "Ended" : `${daysLeftOf(s, now)}d left`}
            </span>
          </div>
          <ProgressBar value={lockProgressOf(s, now)} label="Lock-up" />
        </div>
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t-[length:var(--border-width-1)] border-solid border-border pt-8">
        <span className="flex min-w-0 items-center gap-4">
          <span className={cn(T.meta, "shrink-0 text-text-primary")}>TXN ID:</span>
          <CopyChip value={txn} what="Transaction ID" tone={status === "paused" ? "warning" : "brand"} lead={status === "paused" ? <Icon icon={PauseIcon} size={14} /> : undefined} />
        </span>
        {foot}
      </div>
      {(status === "paused" || withdrawBlock) && phase !== "withdrawn" && (
        <p id={noteId} className={T.meta}>
          {status === "paused" ? `${STATUS_WORDS.paused}. Claims and withdrawals wait until it resumes.` : `Withdraw: ${withdrawBlock}`}
        </p>
      )}
      {status === "blocked" && (
        <p className={cn(T.meta, "text-text-error")}>
          {STATUS_WORDS.blocked}.{rewardLeft ? " Its unclaimed rewards are held until it’s sorted out." : ""}{" "}
          <Link href={supportHref(s)} className="text-text-brand underline underline-offset-2">
            Get support
          </Link>
        </p>
      )}
    </li>
  );
}

function ClaimedBadge() {
  return (
    <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
      Claimed
    </Badge>
  );
}

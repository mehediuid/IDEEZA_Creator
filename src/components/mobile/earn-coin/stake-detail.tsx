"use client";

// One stake (Figma "Stacking" 228256 with Withdraw, 228382 withdrawn): its
// details — the contract, chain ID, start and lock-up end, the amount with
// Withdraw, the lock-up, the reward interval and each share's amount, the
// whole reward with what was claimed — then Reward Claimed: every share,
// oldest first, with Claim in …, ready, or Claimed, and Claim All for every
// ready share at once (one wallet transaction).

import * as React from "react";
import Link from "next/link";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { cn } from "@/lib/utils";
import { formatWhen } from "@/lib/wallet/idz";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import {
  STAKE_TIME_LINE,
  STATUS_WORDS,
  chainIdOf,
  contractOf,
  contractStatusOf,
  daysText,
  lockEndOf,
  rewardOf,
  stakeActionBlockOf,
  stakePhaseOf,
  stakesOf,
  tranchesOf,
} from "@/lib/wallet/staking";
import { useStakeAdmin } from "@/lib/wallet/use-earn-stores";
import { NotFoundState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { CARD, CopyChip, InfoRow, clockOf, useEarnState } from "./parts";
import { supportHref, useStakeActions } from "./stake-tab";

export function StakeDetail({ stakeKey }: { stakeKey: string }) {
  const { wallet, now, id } = useEarnState();
  const admin = useStakeAdmin();
  const actions = useStakeActions();
  const adminRef = React.useRef(admin);
  React.useEffect(() => {
    adminRef.current = admin;
  }, [admin]);

  if (!wallet) {
    return (
      <Screen top={<TopBar back title="Stake" />} className="px-8 pb-8 pt-4">
        <Skeleton shape="block" className="h-[320px] w-full" />
      </Screen>
    );
  }
  const s = id ? stakesOf(wallet, id).find((x) => x.txHash === stakeKey || x.id === stakeKey) : undefined;
  const c = s ? contractOf(s.record.contract) : null;
  if (!s || !c) {
    return (
      <Screen top={<TopBar back title="Stake" />} className="px-8 pb-8 pt-4">
        <NotFoundState
          thing="stake"
          body="Stakes belong to the demo account that made them. Switch account in the Demo wallet to see its own."
          action={{ label: "Go to Stake", href: "/m/earn/stake" }}
        />
      </Screen>
    );
  }

  const status = contractStatusOf(admin, c.id);
  const phase = stakePhaseOf(s, now);
  const reward = rewardOf(s, now);
  const tranches = tranchesOf(s, now);
  const withdrawBlock = stakeActionBlockOf(s, status, now, "withdraw");
  const claimBlock = stakeActionBlockOf(s, status, now, "claim");
  const share = tranches[0]?.amount ?? "0";
  const link = cn(T.rowTitle, "rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-border-focus");

  return (
    <Screen top={<TopBar back title={c.name} />} className="px-8 pb-8 pt-4">
      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-8" aria-labelledby="stake-details">
          <div className="flex items-center justify-between gap-6">
            <h2 id="stake-details" className={T.section}>
              Stake Details
            </h2>
            <TestnetDemoBadge />
          </div>
          {status !== "active" && (
            <Banner tone={status === "blocked" ? "error" : "attention"}>
              {status === "blocked" ? (
                <>
                  {STATUS_WORDS.blocked}.{" "}
                  <Link href={supportHref(s)} className="text-text-brand underline underline-offset-2">
                    Get support
                  </Link>
                </>
              ) : (
                `${STATUS_WORDS.paused}. Claims and withdrawals wait until it resumes.`
              )}
            </Banner>
          )}
          <dl className={cn(CARD, "flex flex-col gap-6 p-8")}>
            <InfoRow label="Contract">
              <CopyChip value={c.address} what="Contract address" />
            </InfoRow>
            <InfoRow label="Chain ID">{chainIdOf(s.network)}</InfoRow>
            <InfoRow label="Start Time">{formatWhen(s.at)}</InfoRow>
            <InfoRow label="End Time">{formatWhen(lockEndOf(s))}</InfoRow>
            <InfoRow label="Stake Amount">
              {formatAmount(s.record.amount, "IDZ")}
              {phase === "withdrawn" ? (
                <span className={cn(T.rowTitle, "text-text-disabled")}>Withdrawn</span>
              ) : (
                <button
                  type="button"
                  onClick={withdrawBlock ? undefined : () => actions.withdraw(s, () => adminRef.current)}
                  aria-disabled={withdrawBlock || actions.busy ? true : undefined}
                  aria-describedby={withdrawBlock ? "withdraw-why" : undefined}
                  className={cn(link, withdrawBlock ? "cursor-not-allowed text-text-disabled" : "text-text-brand")}
                >
                  Withdraw
                </button>
              )}
            </InfoRow>
            <InfoRow label="Lock-up Period">{daysText(s.record.lockDays)}</InfoRow>
            <InfoRow label="Reward Interval">{daysText(s.record.intervalDays)}</InfoRow>
            <InfoRow label="Reward Token Amount">{formatAmount(share, "IDZ")}</InfoRow>
            <InfoRow label="Total Reward">
              {formatAmount(reward.total, "IDZ")}
              {compareAmounts(reward.claimed, "0") > 0 && <Badge tone="success">Claimed {formatAmount(reward.claimed, "IDZ")}</Badge>}
            </InfoRow>
          </dl>
          {withdrawBlock && phase !== "withdrawn" && (
            <p id="withdraw-why" className={T.meta}>
              Withdraw: {withdrawBlock}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-8" aria-labelledby="reward-claimed">
          <div className="flex items-center justify-between gap-6">
            <h2 id="reward-claimed" className={T.section}>
              Reward Claimed
            </h2>
            <button
              type="button"
              onClick={claimBlock ? undefined : () => actions.claim(s, () => adminRef.current)}
              aria-disabled={claimBlock || actions.busy ? true : undefined}
              aria-describedby={claimBlock ? "claim-why" : undefined}
              className={cn(link, claimBlock ? "cursor-not-allowed text-text-disabled" : "text-text-brand")}
            >
              Claim All
            </button>
          </div>
          {claimBlock && (
            <p id="claim-why" className={cn(T.meta, "-mt-4")}>
              {claimBlock}
            </p>
          )}
          {tranches.length === 0 ? (
            <p className={T.body}>It was withdrawn before any reward unlocked.</p>
          ) : (
            <ul className="flex flex-col gap-6">
              {tranches.map((t) => (
                <li key={t.index} className={cn(CARD, "flex items-center gap-6 p-6")}>
                  <IdzCoin height={40} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn(T.section, "tabular-nums")}>{formatAmount(t.amount, "IDZ")}</span>
                    <span className={T.meta}>{formatWhen(t.unlocksAt)}</span>
                  </span>
                  {t.status === "claimed" ? (
                    <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
                      Claimed
                    </Badge>
                  ) : t.status === "ready" ? (
                    <Badge tone="brand">Ready</Badge>
                  ) : (
                    <span role="timer" className="inline-flex shrink-0">
                      <Badge tone="brand" className="tabular-nums">
                        Claim in {clockOf(t.unlocksAt - now)}
                      </Badge>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className={T.meta}>{STAKE_TIME_LINE}</p>
        </section>
      </div>
      {actions.sheet}
    </Screen>
  );
}

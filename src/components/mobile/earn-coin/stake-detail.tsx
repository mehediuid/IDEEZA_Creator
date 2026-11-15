"use client";

// One stake (Figma "Stacking" 228256 with Withdraw, 228382 withdrawn), laid
// out for a phone (UX pass 2026-11-15, lens 2 / 4 / 6): the stake first — the
// amount, the contract and chain, the lock-up's progress and days left, the
// whole reward, what was claimed and when the lock-up ends — with every
// detail behind "All details" (the contract, chain ID, start and end, the
// amount, the lock-up, the reward interval and each share's amount, the whole
// reward, the TXN ID); then Reward Claimed: every share, oldest first, with
// Claim in …, Ready, or Claimed. Withdraw and Claim All (every ready share at
// once, one wallet transaction) are the BottomBar's, each with why it's off.

import * as React from "react";
import Link from "next/link";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Skeleton } from "@/components/ideeza/skeleton";
import { cn } from "@/lib/utils";
import { formatWhen } from "@/lib/wallet/idz";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import {
  STAKE_TIME_LINE,
  STATUS_WORDS,
  chainIdOf,
  contractOf,
  contractStatusOf,
  daysLeftOf,
  daysText,
  lockEndOf,
  lockProgressOf,
  rewardOf,
  stakeActionBlockOf,
  stakePhaseOf,
  stakesOf,
  tranchesOf,
} from "@/lib/wallet/staking";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { useStakeAdmin } from "@/lib/wallet/use-earn-stores";
import { BottomBar } from "../kit/bottom-bar";
import { Eyebrow } from "../kit/eyebrow";
import { LIST_CARD, ListCard } from "../kit/list";
import { NotFoundState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { AllDetails, CopyChip, FactGrid, SectionHead, TestnetLine, clockOf, useEarnState } from "./parts";
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
  const txn = s.txHash ?? s.id;
  const off = "aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

  return (
    <Screen
      top={<TopBar back title={c.name} />}
      footer={
        <BottomBar>
          <div className="flex gap-4 [&>*]:min-w-0 [&>*]:flex-1">
            {phase !== "withdrawn" && (
              <Button
                hierarchy="secondary"
                size="xl"
                className={off}
                aria-disabled={withdrawBlock || actions.busy ? true : undefined}
                aria-describedby={withdrawBlock ? "withdraw-why" : undefined}
                onClick={withdrawBlock || actions.busy ? undefined : () => actions.withdraw(s, () => adminRef.current)}
              >
                Withdraw
              </Button>
            )}
            <Button
              size="xl"
              className={off}
              aria-disabled={claimBlock || actions.busy ? true : undefined}
              aria-describedby={claimBlock ? "claim-why" : undefined}
              onClick={claimBlock || actions.busy ? undefined : () => actions.claim(s, () => adminRef.current)}
            >
              Claim All
            </Button>
          </div>
          {withdrawBlock && phase !== "withdrawn" && (
            <p id="withdraw-why" className={T.meta}>
              Withdraw: {withdrawBlock}
            </p>
          )}
          {claimBlock && (
            <p id="claim-why" className={T.meta}>
              Claim All: {claimBlock}
            </p>
          )}
        </BottomBar>
      }
      className="px-8 pb-8 pt-2"
    >
      <div className="flex flex-col gap-10">
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
        <section aria-labelledby="stake-details" className={cn(LIST_CARD, "gap-6 p-8")}>
          <div className="flex flex-col gap-1">
            <h2 id="stake-details" className="flex items-center justify-between gap-4">
              <Eyebrow as="span">Stake Details</Eyebrow>
              {phase === "withdrawn" && <Badge tone="neutral">Withdrawn</Badge>}
            </h2>
            <p className="flex flex-wrap items-center gap-3">
              <IdzCoin height={28} />
              <span className={cn(T.amountHero, "tabular-nums")}>{formatAmount(s.record.amount, "IDZ")}</span>
            </p>
            <p className={T.meta}>
              {c.name} · {networkLabelOf(s.network)}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-6">
              <span className={T.meta}>Lock-up Period • {daysText(s.record.lockDays)}</span>
              <span className={cn(T.meta, "tabular-nums text-text-primary")}>
                {phase === "withdrawn" ? "Withdrawn" : phase === "open" ? "Ended" : `${daysLeftOf(s, now)}d left`}
              </span>
            </div>
            <ProgressBar value={lockProgressOf(s, now)} label="Lock-up" />
          </div>
          <FactGrid
            facts={[
              { label: "Total Reward", value: formatAmount(reward.total, "IDZ"), tone: "success" },
              { label: "Claimed", value: formatAmount(reward.claimed, "IDZ") },
              { label: "End Time", value: formatWhen(lockEndOf(s)) },
            ]}
          />
          <div className="border-t-[length:var(--border-width-1)] border-solid border-border pt-2">
            <AllDetails
              rows={[
                { label: "Contract", value: <CopyChip value={c.address} what="Contract address" /> },
                { label: "Chain ID", value: String(chainIdOf(s.network)) },
                { label: "Start Time", value: formatWhen(s.at) },
                { label: "End Time", value: formatWhen(lockEndOf(s)) },
                { label: "Stake Amount", value: formatAmount(s.record.amount, "IDZ") },
                { label: "Lock-up Period", value: daysText(s.record.lockDays) },
                { label: "Reward Interval", value: daysText(s.record.intervalDays) },
                { label: "Reward Token Amount", value: formatAmount(share, "IDZ") },
                {
                  label: "Total Reward",
                  value: (
                    <>
                      {formatAmount(reward.total, "IDZ")}
                      {compareAmounts(reward.claimed, "0") > 0 && <Badge tone="success">Claimed {formatAmount(reward.claimed, "IDZ")}</Badge>}
                    </>
                  ),
                },
                { label: "TXN ID", value: <CopyChip value={txn} what="Transaction ID" /> },
              ]}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="reward-claimed">
          <SectionHead id="reward-claimed">Reward Claimed</SectionHead>
          {tranches.length === 0 ? (
            <p className={T.body}>It was withdrawn before any reward unlocked.</p>
          ) : (
            <ListCard label="Reward shares">
              {tranches.map((t) => (
                <li key={t.index} className="flex min-h-[64px] items-center gap-6 px-8 py-6">
                  <IdzCoin height={28} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={cn(T.rowTitle, "tabular-nums")}>{formatAmount(t.amount, "IDZ")}</span>
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
            </ListCard>
          )}
          <TestnetLine>{STAKE_TIME_LINE}</TestnetLine>
        </section>
      </div>
      {actions.sheet}
    </Screen>
  );
}

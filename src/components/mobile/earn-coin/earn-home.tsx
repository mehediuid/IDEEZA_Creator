"use client";

// Earn Coin (Figma "Buy IDEEZA Coin" › Ideeza-Wallet 229448), as a wallet tab
// of 2026 (UX pass 2026-11-15, lens 10 / 14): it leads with your IDZ — the
// Current Balance with Available · Staked · Ready to claim · Pending, the
// claim line when presale IDZ is ready, and a row to Wallet balance — then
// "Ways to earn": Buy $IDZ Coin, Stake IDZ, Refer and Earn Coin and the web's
// "Earn IDZ tokens · Watch tutorial videos", one row each with its live line
// (what is ready, staked, earned) and the same destination as before. The
// four sentences that explain them sit behind ⓘ. The Figma's bitcoin
// artwork is replaced by the DS icons (IDZ isn't bitcoin). Named Figma
// departure: "Stake IDZ", not "Staking Risklessly" — staking isn't riskless,
// and the presale's own risk line says IDZ can lose value.

import * as React from "react";
import { MoneyBag01Icon, PlayCircleIcon, ShoppingBasket02Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { IdzCoin } from "@/components/balance/idz-coin";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { cn } from "@/lib/utils";
import { isAvailable, videosOf } from "@/lib/tutorials/catalog";
import { TUTORIAL_CATEGORIES } from "@/lib/tutorials/content";
import { rewardStateOf } from "@/lib/tutorials/progress";
import { useTutorialProgress } from "@/lib/tutorials/use-progress";
import { addAmounts, compareAmounts, formatAmount } from "@/lib/wallet/money";
import { purchaseStatusOf, purchasesOf } from "@/lib/wallet/presale-records";
import { campaignStateOf, campaignStatsOf, currentLinkOf, referralRowsOf } from "@/lib/wallet/referral";
import { contractStatusOf, rewardOf, stakePhaseOf, stakesOf } from "@/lib/wallet/staking";
import { useReferralData, useStakeAdmin } from "@/lib/wallet/use-earn-stores";
import { ListCard, ListRow } from "../kit/list";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useEarnMenu } from "./earn-menu";
import { BalanceHero, CARD, ClaimLine, ConnectSheet, HeroFootRow, SectionHead, TestnetLine, clockOf, useEarnState } from "./parts";

type Way = { href: string; title: string; body: string; icon: IconValue };

/** The four ways, with the sentence each used to print inline (now in the ⓘ sheet). */
const WAYS = {
  buy: {
    href: "/m/earn/buy",
    title: "Buy $IDZ Coin",
    body: "Buy IDZ in the presale with ETH, USDT or USDC, then claim it into your balance once it unlocks.",
    icon: ShoppingBasket02Icon,
  },
  stake: {
    href: "/m/earn/stake",
    title: "Stake IDZ",
    body: "Lock IDZ in a staking option for its lock-up and claim the rewards as they unlock.",
    icon: MoneyBag01Icon,
  },
  refer: {
    href: "/m/earn/refer",
    title: "Refer and Earn Coin",
    body: "Share your link. When creators you bring buy IDZ, you earn points you claim as IDZ.",
    icon: UserAdd01Icon,
  },
  watch: {
    href: "/m/tutorials",
    title: "Watch and earn IDZ",
    body: "Watch tutorial videos and claim IDZ for each one.",
    icon: PlayCircleIcon,
  },
} satisfies Record<string, Way>;

/** The row's icon: the brand tint, as the old cards had it, at row size. */
function WayIcon({ icon }: { icon: IconValue }) {
  return (
    <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-full bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
      <Icon icon={icon} size={20} />
    </span>
  );
}

function Ready({ children = "Ready" }: { children?: string }) {
  return <Badge tone="success">{children}</Badge>;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function EarnHome() {
  const { wallet, now, id, connected, holdings } = useEarnState();
  const admin = useStakeAdmin();
  const referrals = useReferralData();
  const progress = useTutorialProgress();
  const menu = useEarnMenu({ wallet: false });
  const [connecting, setConnecting] = React.useState(false);
  const live = connected && id && wallet ? id : null;

  // Buy $IDZ Coin: what is ready, else what unlocks next, else how many.
  const purchases = live ? purchasesOf(wallet, live) : [];
  const locked = purchases.filter((p) => purchaseStatusOf(p, now) === "locked");
  const nextUnlock = locked.length ? Math.min(...locked.map((p) => p.buy.unlocksAt)) : null;
  let buyLine = "Buy in the presale with ETH, USDT or USDC";
  if (holdings && compareAmounts(holdings.claimable, "0") > 0) buyLine = `${formatAmount(holdings.claimable, "IDZ")} ready to claim`;
  else if (holdings && nextUnlock !== null) buyLine = `${formatAmount(holdings.pending, "IDZ")} unlocks in ${clockOf(nextUnlock - now)}`;
  else if (purchases.length) buyLine = `${plural(purchases.length, "purchase", "purchases")}, all claimed`;

  // Stake IDZ: what is staked, and whether a reward can be claimed now.
  const stakes = live ? stakesOf(wallet, live).filter((s) => stakePhaseOf(s, now) !== "withdrawn") : [];
  const rewardReady = stakes.some((s) => contractStatusOf(admin, s.record.contract) === "active" && compareAmounts(rewardOf(s, now).ready, "0") > 0);
  const stakeLine =
    holdings && compareAmounts(holdings.staked, "0") > 0
      ? `${formatAmount(holdings.staked, "IDZ")} staked · ${plural(stakes.length, "stake", "stakes")}`
      : "Lock IDZ and claim rewards as they unlock";

  // Refer and Earn Coin: the current campaign's points and people.
  const link = live && referrals ? currentLinkOf(referrals, live) : null;
  const stats = link && referrals && live ? campaignStatsOf(referralRowsOf(referrals, wallet, live), link.campaign) : null;
  const referPhase = link ? campaignStateOf(link, wallet, now).phase : null;
  const referLine = stats
    ? `${formatAmount(stats.points, "IDZ").replace(/ IDZ$/, "")} points · ${stats.users} referred`
    : "Share your link, earn points you claim as IDZ";

  // Watch and earn IDZ: what was earned, what can be claimed, what is left to watch.
  const videos = TUTORIAL_CATEGORIES.flatMap(videosOf);
  const open = videos.filter(isAvailable);
  const earned = progress ? Object.values(progress.claimed).map((c) => c.amount) : [];
  const earnedTotal = earned.length ? addAmounts(...earned) : "0";
  const toClaim = progress ? open.filter((v) => rewardStateOf(progress, v) === "ready").length : 0;
  const toWatch = progress ? open.filter((v) => !progress.claimed[v.id]).length : open.length;
  let watchLine = "Tutorial videos are coming soon";
  if (compareAmounts(earnedTotal, "0") > 0) watchLine = `${formatAmount(earnedTotal, "IDZ")} earned${toWatch ? ` · ${plural(toWatch, "video", "videos")} left` : ""}`;
  else if (toWatch) watchLine = `${plural(toWatch, "video", "videos")} to watch`;

  return (
    <Screen top={<TopBar title="Earn Coin" actions={[menu.action]} />} className="px-8 pb-8 pt-2">
      <div className="flex flex-col gap-10">
        {!wallet ? (
          <Skeleton shape="block" className="h-[248px] w-full" />
        ) : holdings ? (
          <BalanceHero holdings={holdings} foot={<HeroFootRow href="/m/earn/wallet" title="Wallet balance" meta="Every IDZ movement, the token address" />}>
            <ClaimLine amount={holdings.claimable} />
          </BalanceHero>
        ) : (
          <section aria-labelledby="earn-connect" className={cn(CARD, "flex flex-col items-center gap-6 p-8 text-center")}>
            <IdzCoin height={40} />
            <h2 id="earn-connect" className={T.section}>
              Connect your wallet to see your IDZ
            </h2>
            <TestnetLine>Test funds only. Nothing is written to a real blockchain.</TestnetLine>
            <Button size="xl" className="w-full" onClick={() => setConnecting(true)}>
              Connect wallet
            </Button>
          </section>
        )}

        <section aria-labelledby="earn-ways" className="flex flex-col gap-4">
          <SectionHead
            id="earn-ways"
            info={Object.values(WAYS).map((w) => (
              <div key={w.href} className="flex flex-col gap-1">
                <p className={T.rowTitle}>{w.title}</p>
                <p>{w.body}</p>
              </div>
            ))}
          >
            Ways to earn
          </SectionHead>
          <ListCard label="Ways to earn">
            <ListRow href={WAYS.buy.href} leading={<WayIcon icon={WAYS.buy.icon} />} title={WAYS.buy.title} meta={buyLine} trailing={holdings && compareAmounts(holdings.claimable, "0") > 0 ? <Ready /> : undefined} />
            <ListRow href={WAYS.stake.href} leading={<WayIcon icon={WAYS.stake.icon} />} title={WAYS.stake.title} meta={stakeLine} trailing={rewardReady ? <Ready /> : undefined} />
            <ListRow href={WAYS.refer.href} leading={<WayIcon icon={WAYS.refer.icon} />} title={WAYS.refer.title} meta={referLine} trailing={referPhase === "claimable" ? <Ready /> : undefined} />
            <ListRow href={WAYS.watch.href} leading={<WayIcon icon={WAYS.watch.icon} />} title={WAYS.watch.title} meta={watchLine} trailing={toClaim ? <Ready /> : undefined} />
          </ListCard>
        </section>
      </div>
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} />
      {menu.node}
    </Screen>
  );
}

"use client";

// Earn Coin (Figma "Buy IDEEZA Coin" › Ideeza-Wallet 229448): the tab's first
// screen, three cards — Buy $IDZ Coin, Stake IDZ, Refer and Earn Coin — each
// opening its tab of Buy $IDZ · Stake · Refer & Earn, and a fourth for the
// web's "Earn IDZ tokens · Watch tutorial videos" (the wallet menu), which
// opens Tutorials. The Figma's lorem ipsum is replaced by what each does (the
// web's words), and its bitcoin artwork by the DS icons for each (IDZ isn't
// bitcoin). Named Figma departure: card 2 is "Stake IDZ", not the Figma's
// "Staking Risklessly" — staking isn't riskless, and the presale's own risk
// line says IDZ can lose value.

import Link from "next/link";
import { MoneyBag01Icon, PlayCircleIcon, ShoppingBasket02Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import { Chevron } from "../kit/list";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useEarnMenu } from "./earn-menu";
import { CARD } from "./parts";

const WAYS: { href: string; title: string; body: string; icon: IconValue }[] = [
  {
    href: "/m/earn/buy",
    title: "Buy $IDZ Coin",
    body: "Buy IDZ in the presale with ETH, USDT or USDC, then claim it into your balance once it unlocks.",
    icon: ShoppingBasket02Icon,
  },
  {
    href: "/m/earn/stake",
    title: "Stake IDZ",
    body: "Lock IDZ in a staking option for its lock-up and claim the rewards as they unlock.",
    icon: MoneyBag01Icon,
  },
  {
    href: "/m/earn/refer",
    title: "Refer and Earn Coin",
    body: "Share your link. When creators you bring buy IDZ, you earn points you claim as IDZ.",
    icon: UserAdd01Icon,
  },
  {
    href: "/m/tutorials",
    title: "Watch and earn IDZ",
    body: "Watch tutorial videos and claim IDZ for each one.",
    icon: PlayCircleIcon,
  },
];

export function EarnHome() {
  const menu = useEarnMenu();
  return (
    <Screen top={<TopBar title="Earn Coin" actions={[menu.action]} />} className="px-8 pb-8 pt-4">
      <ul className="flex flex-col gap-8">
        {WAYS.map((w) => (
          <li key={w.href}>
            <Link
              href={w.href}
              className={cn(CARD, "flex items-start gap-8 p-8 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
            >
              <span aria-hidden className="inline-flex size-[56px] shrink-0 items-center justify-center rounded-full bg-bg-brand-subtle text-[color:var(--color-icon-brand)]">
                <Icon icon={w.icon} size={28} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="flex items-start justify-between gap-4">
                  <span className={T.section}>{w.title}</span>
                  <Chevron />
                </span>
                <span className={T.body}>{w.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {menu.node}
    </Screen>
  );
}

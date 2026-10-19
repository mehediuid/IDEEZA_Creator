"use client";

// The top of the presale card and of the buy form (Figma 41571:114598,
// 116857): Buy $IDZ Token, In Presale Now! with the round, the countdown to
// the round's real end (it never resets; after it, the card says the round
// ended), UNTIL PRICE INCREASE with the next price written beside it (D8),
// TOTAL USD RAISED as the sum of the demo purchases, labelled demo (D7), and
// the one-price line. The Figma's magenta has no DS token: the headings take
// the brand violet (X6).

import * as React from "react";
import { Download04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { TestnetDemoBadge } from "@/components/ideeza";
import { formatWhen } from "@/lib/wallet/idz";
import { PRESALE, coinRateOf, countdownOf, formatPrice, formatUsd, presaleOpenAt, type Countdown, type PayCoin } from "@/lib/wallet/presale";
import type { Amount } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/** "31 Dec 2026, 11:59 PM GMT+6": the round's end in the reader's time, with its zone named. */
function whenWithZone(at: number): string {
  const zone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value;
  return zone ? `${formatWhen(at)} ${zone}` : formatWhen(at);
}

function spoken(c: Countdown): string {
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  return [part(c.days, "day"), part(c.hours, "hour"), part(c.minutes, "minute")].join(", ");
}

/** Four boxes, Days · Hours · Minutes · Seconds; a timer that is never read out every second. */
export function CountdownBoxes({ ms, label, units }: { ms: number; label: string; units: { key: keyof Countdown; name: string }[] }) {
  const c = countdownOf(ms);
  return (
    <div role="timer" aria-label={`${spoken(c)} ${label}`} className="grid grid-flow-col gap-[8px] [grid-auto-columns:1fr]">
      {units.map((u) => (
        <div key={u.key} aria-hidden className="flex flex-col items-center rounded-lg bg-bg-subtle px-[8px] py-[8px]">
          <span className="text-4xl font-bold leading-4xl tabular-nums text-text-primary">{pad(c[u.key])}</span>
          <span className="text-sm leading-xs text-text-secondary">{u.name}</span>
        </div>
      ))}
    </div>
  );
}

const ROUND_UNITS: { key: keyof Countdown; name: string }[] = [
  { key: "days", name: "Days" },
  { key: "hours", name: "Hours" },
  { key: "minutes", name: "Minutes" },
  { key: "seconds", name: "Seconds" },
];

export function PresaleHead({ headingId, now, raised }: { headingId: string; now: number; raised: Amount }) {
  const open = presaleOpenAt(now);
  return (
    <div className="flex flex-col gap-[12px] text-center">
      <div className="flex flex-col gap-[2px]">
        <h2 id={headingId} tabIndex={-1} className="text-3xl font-semibold leading-3xl text-text-brand outline-none">
          Buy $IDZ Token
        </h2>
        <p className="text-xl font-semibold leading-xl text-text-primary">
          {open ? `In Presale Now! · ${PRESALE.round}` : `${PRESALE.round} has ended`}
        </p>
      </div>
      <CountdownBoxes ms={PRESALE.endsAt - now} label="until the price increase" units={ROUND_UNITS} />
      <div className="flex flex-col gap-[2px]">
        <p className="rounded-full bg-bg-subtle px-[12px] py-[2px] text-md font-medium uppercase leading-md text-text-primary">
          Until price increase
        </p>
        <p className="text-sm leading-sm text-text-secondary">
          {open
            ? `Then 1 $IDZ = ${formatPrice(PRESALE.nextPrice)}. ${PRESALE.round} ends ${whenWithZone(PRESALE.endsAt)}.`
            : `It ended ${whenWithZone(PRESALE.endsAt)}. The next round opens at 1 $IDZ = ${formatPrice(PRESALE.nextPrice)}.`}
        </p>
      </div>
      <p className="flex flex-wrap items-center justify-center gap-x-[8px] gap-y-[4px] text-md font-medium uppercase leading-md text-text-brand">
        <span className="tabular-nums">Total USD raised: {formatUsd(raised)}</span>
        <TestnetDemoBadge className="normal-case" />
      </p>
      <p className="sr-only">The sum of the demo purchases in this browser.</p>
    </div>
  );
}

/** "1 $IDZ = $0.025065" between two rules; the whitelist's price beside the struck one; ETH's demo rate. */
export function RateLine({ price, whitelisted, coin }: { price: Amount; whitelisted?: boolean; coin?: PayCoin }) {
  return (
    <div className="flex items-center gap-[12px]">
      <span aria-hidden className="h-[1px] flex-1 bg-border" />
      <p className="text-center text-md leading-md tabular-nums text-text-primary">
        1 $IDZ ={" "}
        {whitelisted && (
          <>
            <s className="text-text-tertiary">{formatPrice(PRESALE.price)}</s>
            <span className="sr-only"> now </span>{" "}
          </>
        )}
        {formatPrice(price)}
        {coin === "ETH" && <span className="text-text-secondary"> · 1 ETH = {formatPrice(coinRateOf("ETH"))} (demo rate)</span>}
      </p>
      <span aria-hidden className="h-[1px] flex-1 bg-border" />
    </div>
  );
}

/** C2f: no white paper exists yet, so the link says Soon instead of downloading nothing. */
export function WhitePaperLink() {
  return (
    <p className="flex items-center justify-center gap-[8px] text-lg leading-lg text-text-disabled">
      <Icon icon={Download04Icon} size={20} />
      <span>Download White Paper</span>
      <span className="text-sm leading-sm text-text-tertiary">Soon</span>
    </p>
  );
}

/** D8: one line of risk, never a pressure line. */
export function RiskLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-sm leading-sm text-text-secondary", className)}>
      Testnet demo, no real money. IDZ can lose value; this isn&apos;t investment advice.
    </p>
  );
}

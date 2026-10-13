"use client";

// How to pay — shared by Buy credits and a plan's checkout (User Panel V2
// checkout: Card · PayPal · Crypto, then USDT or IDZ). Payments aren't on:
// Card and PayPal are listed, disabled, with the reason; Crypto pays from the
// Demo wallet on testnet, USDT one for one and IDZ at the demo rate.

import * as React from "react";
import { TestnetDemoBadge } from "@/components/ideeza";
import { IDZ_PER_USD, coinAmount, usd } from "@/lib/create/credit-pricing";
import { cn } from "@/lib/utils";

export type PayCoin = "USDT" | "IDZ";
const COINS: PayCoin[] = ["USDT", "IDZ"];

export const PAY_CARD =
  "flex min-h-[var(--touch-min)] items-center gap-[12px] rounded-lg border border-solid px-[14px] py-[12px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";
export const PAY_CARD_ON = "border-border-brand bg-bg-brand-subtle";
export const PAY_CARD_OFF = "border-border bg-bg-surface hover:bg-bg-subtle";

export function PaymentPicker({
  amountUsd,
  coin,
  onCoin,
  coinRef,
  footnote,
}: {
  amountUsd: number;
  coin: PayCoin;
  onCoin: (c: PayCoin) => void;
  /** Takes the chosen token's button, so a dialog can focus it. */
  coinRef?: React.RefObject<HTMLButtonElement | null>;
  /** The line under the testnet badge: what is bought and how long it lasts. */
  footnote: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const ids = { method: React.useId(), coin: React.useId() };
  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + COINS.length) % COINS.length;
    onCoin(COINS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[8px]">
        <span id={ids.method} className="text-md font-semibold leading-md text-text-primary">
          Pay with
        </span>
        <div role="radiogroup" aria-labelledby={ids.method} className="grid grid-cols-3 gap-[8px] max-md:grid-cols-1">
          {(["Card", "PayPal"] as const).map((m) => (
            <span
              key={m}
              role="radio"
              aria-checked={false}
              aria-disabled
              title={`${m} isn't available yet`}
              className={cn(PAY_CARD, "cursor-not-allowed flex-col items-start gap-[2px] border-border bg-bg-surface")}
            >
              <span className="text-md font-semibold leading-md text-text-disabled">{m}</span>
              <span className="text-sm leading-sm text-text-tertiary">Not available yet</span>
            </span>
          ))}
          <span role="radio" aria-checked className={cn(PAY_CARD, PAY_CARD_ON, "flex-col items-start gap-[2px]")}>
            <span className="text-md font-semibold leading-md text-text-primary">Crypto</span>
            <span className="text-sm leading-sm text-text-secondary">Demo wallet</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[8px]">
        <span id={ids.coin} className="text-md font-semibold leading-md text-text-primary">
          Token
        </span>
        <div role="radiogroup" aria-labelledby={ids.coin} className="grid grid-cols-2 gap-[8px]">
          {COINS.map((c, i) => {
            const on = coin === c;
            return (
              <button
                key={c}
                ref={(el) => {
                  refs.current[i] = el;
                  if (on && coinRef) coinRef.current = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => onCoin(c)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault();
                    move(i, 1);
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault();
                    move(i, -1);
                  }
                }}
                className={cn(PAY_CARD, on ? PAY_CARD_ON : PAY_CARD_OFF, "justify-between")}
              >
                <span className="text-md font-semibold leading-md text-text-primary">{c}</span>
                <span className="text-md leading-md tabular-nums text-text-secondary">
                  {coinAmount(amountUsd, c)} {c}
                </span>
              </button>
            );
          })}
        </div>
        {coin === "IDZ" && <p className="text-sm leading-sm text-text-tertiary">Demo rate: 1 IDZ = {usd(1 / IDZ_PER_USD)}</p>}
      </div>

      <p className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-sm leading-sm text-text-secondary">
        <TestnetDemoBadge />
        Paid from your demo wallet on testnet. No real money moves. {footnote}
      </p>
    </div>
  );
}

"use client";

// Payment method (User Panel V2 › Payment Method 41549:161482–161873). The
// design keeps cards and PayPal, one marked Default. Payments aren't on, so:
//
// - The one working method is Crypto from the Demo wallet: its state, and
//   Connect or Manage — the wallet's own dialog, the same one its sidebar
//   button opens, not a copy of it.
// - Default token (USDT or IDZ) is the choice that's real today: Buy credits
//   and a plan's checkout open on it.
// - Card and PayPal are listed, not available yet, with no fields to fill.

import * as React from "react";
import { Badge, Button, TestnetDemoBadge } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { setDefaultToken, useDefaultToken, type PayToken } from "@/lib/account/payment";
import { menuEntryOf } from "@/lib/wallet/request-view";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { PAY_CARD, PAY_CARD_OFF, PAY_CARD_ON } from "./payment-picker";

const TOKENS: { coin: PayToken; hint: string }[] = [
  { coin: "IDZ", hint: "IDEEZA token, at the demo rate 1 IDZ = $1.00" },
  { coin: "USDT", hint: "Tether, one for one with the dollar" },
];

export function PaymentMethodPanel() {
  const wallet = useDemoWallet();
  const { openManage } = useWalletRequest();
  const entry = menuEntryOf(wallet);
  const connected = !!entry.detail;
  const token = useDefaultToken();
  const [refused, setRefused] = React.useState(false);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = React.useId();

  const choose = (i: number) => {
    const next = TOKENS[(i + TOKENS.length) % TOKENS.length];
    setRefused(!setDefaultToken(next.coin));
    refs.current[(i + TOKENS.length) % TOKENS.length]?.focus();
  };

  return (
    <div className="flex max-w-[760px] flex-col gap-[28px]">
      <section aria-labelledby="pm-methods" className="flex flex-col gap-[12px]">
        <h2 id="pm-methods" className="text-2xl font-semibold leading-2xl text-text-primary">
          How you pay
        </h2>
        <ul role="list" className="flex flex-col gap-[8px]">
          <li className="flex flex-wrap items-center justify-between gap-[12px] rounded-xl border border-solid border-border bg-bg-surface p-[16px]">
            <div className="flex min-w-0 flex-col gap-[4px]">
              <p className="flex flex-wrap items-center gap-[8px] text-md font-semibold leading-md text-text-primary">
                Crypto · Demo wallet <Badge tone="success">Default</Badge> <TestnetDemoBadge />
              </p>
              <p className="text-md leading-md text-text-secondary">
                {connected ? `${entry.title} · ${entry.detail}` : "Not connected. You connect it when you pay, or here."}
              </p>
            </div>
            <Button hierarchy="secondary" size="lg" aria-haspopup="dialog" onClick={openManage}>
              {connected ? "Manage wallet" : "Connect wallet"}
            </Button>
          </li>
          {(["Card", "PayPal"] as const).map((m) => (
            <li
              key={m}
              className="flex flex-wrap items-center justify-between gap-[12px] rounded-xl border border-solid border-border bg-bg-surface p-[16px]"
            >
              <p className="text-md font-semibold leading-md text-text-disabled">{m}</p>
              <p className="text-md leading-md text-text-tertiary">Not available yet</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={labelId} className="flex flex-col gap-[12px]">
        <div className="flex flex-col gap-[4px]">
          <h2 id={labelId} className="text-lg font-semibold leading-lg text-text-primary">
            Default token
          </h2>
          <p className="text-md leading-md text-text-secondary">
            Checkout opens on this token. You can still pick the other one when you pay.
          </p>
        </div>
        <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-2 gap-[8px] max-md:grid-cols-1">
          {TOKENS.map((t, i) => {
            const on = token === t.coin;
            return (
              <button
                key={t.coin}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => choose(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault();
                    choose(i + 1);
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault();
                    choose(i - 1);
                  }
                }}
                className={cn(PAY_CARD, on ? PAY_CARD_ON : PAY_CARD_OFF, "flex-col items-start gap-[2px]")}
              >
                <span className="text-md font-semibold leading-md text-text-primary">{t.coin}</span>
                <span className="text-sm leading-sm text-text-secondary">{t.hint}</span>
              </button>
            );
          })}
        </div>
        {refused && (
          <p role="alert" className="text-sm leading-sm text-text-error">
            This browser couldn&apos;t save the choice (storage is full or blocked).
          </p>
        )}
      </section>

      <p className="text-sm leading-sm text-text-tertiary">
        When a plan renews, nothing is charged on testnet; the renewal shows in Billing history as not charged.
      </p>
    </div>
  );
}

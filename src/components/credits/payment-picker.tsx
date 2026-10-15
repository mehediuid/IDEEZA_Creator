"use client";

// How to pay — the left column of every checkout (User Panel V2 "Payment
// details" 41549:165658, Crypto · USDT / IDZ 41549:166351 / 166427, Wallet
// connected 41549:166562). Payments aren't on: Card and PayPal are listed,
// not available yet; Crypto pays from the Demo wallet on testnet, USDT one for
// one and IDZ at the demo rate. Until the wallet is connected the column ends
// in Connect wallet (the wallet's own dialog); once it is, in the address it
// pays from.

import * as React from "react";
import { CreditCardIcon, EthereumIcon, PaypalIcon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Icon } from "@/components/dashboard/icon";
import { Button, TestnetDemoBadge } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { IDZ_PER_USD, coinAmount, usd } from "@/lib/create/credit-pricing";
import { demoAddress, makerId, shortAddress } from "@/lib/wallet/demo-wallet";
import { identityLabelOf, networkLabelOf } from "@/lib/wallet/request-view";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";

export type PayCoin = "USDT" | "IDZ";
const COINS: PayCoin[] = ["USDT", "IDZ"];

/** A choice card: a payment method, a token, a pack. */
export const CHOICE =
  "flex min-h-[var(--touch-min)] items-center gap-[12px] rounded-xl border border-solid px-[16px] py-[12px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";
export const CHOICE_ON = "border-border-brand bg-bg-brand-subtle";
export const CHOICE_OFF = "border-transparent bg-bg-subtle hover:bg-bg-surface-raised";

/** The Demo wallet as a checkout reads it: connected or not, and from where. */
export function useWalletStatus() {
  const wallet = useDemoWallet();
  const id = wallet ? makerId(wallet.account) : null;
  const state = wallet && id ? wallet.identities[id] : null;
  const connected = !!state?.connected;
  return {
    connected,
    address: connected && id ? demoAddress(id) : null,
    short: connected && id ? shortAddress(demoAddress(id)) : null,
    detail: connected && id && state ? `${identityLabelOf(id)} · ${networkLabelOf(state.network)}` : null,
  };
}

/** A token's mark: IDZ wears the IDEEZA mark, USDT a T. */
export function CoinGlyph({ coin }: { coin: PayCoin }) {
  if (coin === "IDZ")
    return (
      <span aria-hidden className="inline-flex size-[24px] shrink-0 items-center justify-center rounded-full bg-bg-surface">
        <IdeezaLogo mark height={16} decorative />
      </span>
    );
  return (
    <span
      aria-hidden
      className="inline-flex size-[24px] shrink-0 items-center justify-center rounded-full bg-bg-success-subtle text-sm font-bold leading-sm text-text-success"
    >
      T
    </span>
  );
}

export function PaymentPicker({
  amountUsd,
  coin,
  onCoin,
  coinRef,
}: {
  amountUsd: number;
  coin: PayCoin;
  onCoin: (c: PayCoin) => void;
  /** Takes the chosen token's button, so a dialog can focus it. */
  coinRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const ids = { method: React.useId(), coin: React.useId() };
  const wallet = useWalletStatus();
  const { openManage } = useWalletRequest();
  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + COINS.length) % COINS.length;
    onCoin(COINS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex flex-col gap-[16px]">
        <h2 id={ids.method} className="text-2xl font-semibold leading-2xl text-text-primary">
          Payment method
        </h2>
        <div role="radiogroup" aria-labelledby={ids.method} className="grid grid-cols-3 gap-[16px] max-sm:grid-cols-1">
          {(
            [
              ["Card", CreditCardIcon],
              ["PayPal", PaypalIcon],
            ] as const
          ).map(([m, icon]) => (
            <span
              key={m}
              role="radio"
              aria-checked={false}
              aria-disabled
              title={`${m} isn't available yet`}
              className={cn(CHOICE, CHOICE_OFF, "min-h-[80px] cursor-not-allowed flex-col items-start justify-center gap-[6px] hover:bg-bg-subtle")}
            >
              <span aria-hidden className="text-text-disabled">
                <Icon icon={icon} size={24} />
              </span>
              <span className="flex flex-col">
                <span className="text-lg leading-lg text-text-disabled">{m}</span>
                <span className="text-sm leading-sm text-text-tertiary">Not available yet</span>
              </span>
            </span>
          ))}
          <span role="radio" aria-checked className={cn(CHOICE, CHOICE_ON, "min-h-[80px] flex-col items-start justify-center gap-[6px]")}>
            <span aria-hidden className="text-text-brand">
              <Icon icon={EthereumIcon} size={24} />
            </span>
            <span className="flex flex-col">
              <span className="text-lg leading-lg text-text-primary">Crypto</span>
              <span className="text-sm leading-sm text-text-secondary">Demo wallet</span>
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <span id={ids.coin} className="text-lg leading-lg text-text-primary">
          Select token
        </span>
        <div role="radiogroup" aria-labelledby={ids.coin} className="grid grid-cols-2 gap-[16px]">
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
                className={cn(
                  CHOICE,
                  "justify-center",
                  on ? (c === "USDT" ? "border-border-success bg-bg-success-subtle" : CHOICE_ON) : CHOICE_OFF,
                )}
              >
                <CoinGlyph coin={c} />
                <span className="text-md font-semibold leading-md text-text-primary">{c}</span>
                <span className="text-md leading-md tabular-nums text-text-secondary">{coinAmount(amountUsd, c)}</span>
              </button>
            );
          })}
        </div>
        {coin === "IDZ" && <p className="text-sm leading-sm text-text-tertiary">Demo rate: 1 IDZ = {usd(1 / IDZ_PER_USD)}</p>}
      </div>

      {wallet.connected ? (
        <div className="flex items-start gap-[12px] rounded-xl bg-bg-brand-subtle p-[16px]">
          <span aria-hidden className="mt-[2px] text-text-brand">
            <Icon icon={Wallet02Icon} size={24} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <p className="text-lg font-semibold leading-lg text-text-brand">Wallet connected</p>
            <p className="font-mono text-md leading-md text-text-brand">{wallet.short}</p>
            <p className="flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
              {wallet.detail} <TestnetDemoBadge />
            </p>
          </div>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={openManage}
            className="shrink-0 text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          <Button hierarchy="primary" size="lg" className="w-full" aria-haspopup="dialog" onClick={openManage}>
            Connect wallet
          </Button>
          <p className="flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
            <TestnetDemoBadge /> The demo wallet pays with test tokens. No real money moves.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

// The presale's buy form (Figma 41571:116857 empty, 117443 filled, 118030
// the currency menu, 118664 the whitelist link). You get (IDZ) ⇅ You pay:
// either field can be typed in and the other is the live quote at the one
// price (C5a); ⇅ swaps which comes first. The coin menu lists ETH, USDT and
// USDC with their chain and the demo wallet's balance there (C6). The gas
// line, Max and every check come from `lib/wallet/presale.ts`: Buy $IDZ stays
// aria-disabled until the amount is valid, and pressing it then shows why
// under the field it belongs to.

import * as React from "react";
import { ArrowDataTransferVerticalIcon, ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, Menu } from "@/components/ideeza";
import type { MarketData } from "@/lib/market/types";
import { availableOf } from "@/lib/wallet/balances";
import { demoAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import {
  PAY_COINS,
  PRESALE,
  buyCheckOf,
  gasReserveOf,
  maxPayOf,
  presalePriceOf,
  type PayCoin,
} from "@/lib/wallet/presale";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { Amount, DemoWallet, IdentityId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { IdzCoin } from "./idz-coin";
import { PayCoinGlyph } from "./pay-coin-glyph";
import { RateLine } from "./presale-head";

const BOX =
  "flex flex-col gap-[8px] rounded-xl bg-bg-subtle px-[16px] py-[12px] text-left focus-within:ring-2 focus-within:ring-border-focus";
const INPUT =
  "min-w-0 flex-1 bg-transparent text-xl font-semibold leading-xl tabular-nums text-text-primary outline-none placeholder:font-regular placeholder:text-text-tertiary";
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export type BuyArgs = { idz: Amount; pay: Amount; coin: PayCoin; price: Amount; whitelisted: boolean };

export function BuyForm({
  wallet,
  id,
  market,
  now,
  paying,
  note,
  onBuy,
}: {
  wallet: DemoWallet;
  id: IdentityId;
  market: MarketData;
  now: number;
  paying: boolean;
  /** What the last attempt ended in: cancelled in the wallet, or failed. */
  note: string | null;
  onBuy: (a: BuyArgs) => void;
}) {
  const [driver, setDriver] = React.useState<"get" | "pay">("get");
  const [text, setText] = React.useState("");
  const [coin, setCoin] = React.useState<PayCoin>("ETH");
  const [payFirst, setPayFirst] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [whyWhitelist, setWhyWhitelist] = React.useState(false);
  const getRef = React.useRef<HTMLInputElement>(null);
  const payRef = React.useRef<HTMLInputElement>(null);
  const ids = { get: React.useId(), pay: React.useId(), getErr: React.useId(), payErr: React.useId(), gas: React.useId(), form: React.useId() };

  const { price, whitelisted } = presalePriceOf(demoAddress(id));
  const ctx = { wallet, market, now };
  const reserve = gasReserveOf(PRESALE.network);
  const have = { coin: availableOf(id, coin, PRESALE.network, ctx), gas: availableOf(id, reserve.coin, PRESALE.network, ctx) };
  const check = buyCheckOf({ driver, text, coin }, { price, have, now });
  const getValue = driver === "get" ? text : (check.idz ?? "");
  const payValue = driver === "pay" ? text : (check.pay ?? "");
  const shown = touched || check.error?.field === "form" ? check.error : null;
  const getErr = shown?.field === "get" ? shown.text : null;
  const payErr = shown?.field === "pay" ? shown.text : null;
  const walletNetwork = wallet.identities[id]?.network ?? PRESALE.network;

  const type = (field: "get" | "pay") => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDriver(field);
    setText(e.target.value);
    setTouched(true);
  };

  // A new coin keeps the IDZ asked for and quotes it again in that coin.
  const chooseCoin = (next: PayCoin) => {
    if (next === coin) return;
    if (driver === "pay") {
      setDriver("get");
      setText(check.idz ?? "");
    }
    setCoin(next);
  };

  const useMax = () => {
    const max = maxPayOf(coin, have);
    setDriver("pay");
    setText(max === "0" ? "" : max);
    setTouched(true);
  };

  const buy = () => {
    if (paying) return;
    if (check.error || !check.idz || !check.pay) {
      setTouched(true);
      (check.error?.field === "pay" ? payRef : getRef).current?.focus();
      return;
    }
    onBuy({ idz: check.idz, pay: check.pay, coin, price, whitelisted });
  };

  const getBox = (
    <div key="get" className="flex flex-col gap-[4px]">
      <div className={BOX}>
        <label htmlFor={ids.get} className="text-sm leading-xs text-text-secondary">
          You get
        </label>
        <div className="flex items-center gap-[8px]">
          <IdzCoin height={24} />
          <input
            ref={getRef}
            id={ids.get}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Enter purchase amount"
            value={getValue}
            onChange={type("get")}
            aria-invalid={getErr ? true : undefined}
            aria-describedby={getErr ? ids.getErr : undefined}
            className={INPUT}
          />
          <span className="shrink-0 text-md font-medium leading-md text-text-secondary">IDZ</span>
        </div>
      </div>
      {getErr && (
        <p id={ids.getErr} className="text-sm leading-xs text-text-error">
          {getErr}
        </p>
      )}
    </div>
  );

  const payBox = (
    <div key="pay" className="flex flex-col gap-[4px]">
      <div className={BOX}>
        <div className="flex items-center justify-between gap-[8px]">
          <label htmlFor={ids.pay} className="text-sm leading-xs text-text-secondary">
            You pay
          </label>
          <Menu
            label="Pay with"
            align="end"
            items={PAY_COINS.map((c) => ({
              id: c,
              label: c,
              icon: <PayCoinGlyph coin={c} />,
              selected: c === coin,
              hint: `${networkLabelOf(PRESALE.network)} · ${formatAmount(availableOf(id, c, PRESALE.network, ctx), c)}`,
              onSelect: () => chooseCoin(c),
            }))}
            trigger={(props, { open }) => (
              <button
                {...props}
                type="button"
                aria-label={`Pay with ${coin}, change`}
                className={cn(
                  "inline-flex h-[32px] items-center gap-[6px] rounded-lg bg-bg-brand-subtle px-[10px] text-md font-medium leading-md text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-border-focus",
                  TAP,
                )}
              >
                <PayCoinGlyph coin={coin} className="size-[20px]" />
                {coin}
                <Icon icon={ArrowDown01Icon} size={16} className={cn("transition-transform duration-fast", open && "rotate-180")} />
              </button>
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-[8px]">
          <PayCoinGlyph coin={coin} />
          <input
            ref={payRef}
            id={ids.pay}
            inputMode="decimal"
            autoComplete="off"
            placeholder="--"
            value={payValue}
            onChange={type("pay")}
            aria-invalid={payErr ? true : undefined}
            aria-describedby={[payErr ? ids.payErr : null, ids.gas].filter(Boolean).join(" ")}
            className={INPUT}
          />
          {whitelisted ? (
            <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />}>
              Whitelist price −{PRESALE.whitelist.percentOff}%
            </Badge>
          ) : (
            <button
              type="button"
              aria-expanded={whyWhitelist}
              onClick={() => setWhyWhitelist((v) => !v)}
              className={cn(
                "inline-flex shrink-0 items-center rounded-xs text-sm font-medium leading-xs text-text-brand underline underline-offset-2 outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus",
                TAP,
              )}
            >
              Discount for whitelist
            </button>
          )}
        </div>
      </div>
      {payErr && (
        <p id={ids.payErr} className="text-sm leading-xs text-text-error">
          {payErr}
        </p>
      )}
      {!whitelisted && whyWhitelist && (
        <p className="text-sm leading-sm text-text-secondary">
          Wallets on the presale whitelist pay {PRESALE.whitelist.percentOff}% less. This wallet isn&apos;t on it; on the
          demo whitelist is Demo account {PRESALE.whitelist.accounts.join(", ")} (switch account in the Demo wallet to
          try it).
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-[12px]">
      <RateLine price={price} whitelisted={whitelisted} coin={coin} />
      <div className="flex flex-col">
        {payFirst ? payBox : getBox}
        <div className="relative z-[1] -my-[6px] flex justify-center">
          <button
            type="button"
            onClick={() => setPayFirst((v) => !v)}
            aria-label={payFirst ? "Swap: type the IDZ you get first" : "Swap: type what you pay first"}
            title="Swap the fields"
            className="inline-flex size-[32px] items-center justify-center rounded-full border border-solid border-border bg-bg-surface text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]"
          >
            <Icon icon={ArrowDataTransferVerticalIcon} size={16} />
          </button>
        </div>
        {payFirst ? getBox : payBox}
      </div>

      <p id={ids.gas} className="text-center text-sm leading-sm text-text-secondary">
        {coin === reserve.coin
          ? `${formatAmount(reserve.amount, reserve.coin)} is reserved for gas: this purchase and its claim. The actual amount depends on the network.`
          : `Gas is paid in test ${reserve.coin}: ${formatAmount(reserve.amount, reserve.coin)} stays for this purchase and its claim. The actual amount depends on the network.`}
      </p>

      {walletNetwork !== PRESALE.network && (
        <p className="text-center text-sm leading-sm text-text-secondary">
          Your wallet is on {networkLabelOf(walletNetwork)}. The presale is on {networkLabelOf(PRESALE.network)} — the
          wallet asks to switch when you buy.
        </p>
      )}

      {note && (
        <div role="status">
          <Banner tone="info">{note}</Banner>
        </div>
      )}
      {shown?.field === "form" && (
        <p id={ids.form} className="text-center text-sm leading-sm text-text-error">
          {shown.text}
        </p>
      )}

      <Button
        type="button"
        hierarchy="primary"
        size="2xl"
        className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        aria-disabled={paying || !!check.error || undefined}
        aria-busy={paying || undefined}
        aria-describedby={shown?.field === "form" ? ids.form : undefined}
        onClick={buy}
      >
        {paying ? "Waiting for the wallet…" : "Buy $IDZ"}
      </Button>

      <p className="flex flex-wrap items-center justify-center gap-x-[8px] text-sm leading-xs text-text-tertiary">
        <span className="uppercase tabular-nums tracking-caps">Available balance = {formatAmount(have.coin, coin)}</span>
        <Button type="button" hierarchy="ghost" size="sm" className={TAP} onClick={useMax}>
          Max
        </Button>
      </p>
    </div>
  );
}

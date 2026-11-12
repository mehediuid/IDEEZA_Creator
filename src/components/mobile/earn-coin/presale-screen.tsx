"use client";

// Buy IDEEZA Coin (Figma "Buy IDEEZA Coin" 229538, 229602–229902, 230004–
// 230129; the web's presale dialog, components/balance/presale-dialog.tsx):
// one screen, three steps, each its own address so Back walks them:
// - the presale card: Buy $IDZ Token, In Presale Now! with the round, the
//   countdown to the round's real end, UNTIL PRICE INCREASE with the next
//   price, TOTAL USD RAISED (the demo purchases), the one price, and the buy
//   form (You get ⇅ You pay, the coin sheet, the whitelist, the gas line,
//   every check from lib/wallet/presale.ts). Before a wallet is connected
//   (Figma 229602) the form already quotes at the presale price, without Max
//   or a balance, and its button is Buy With Crypto (then Don't have a
//   wallet?); the amount typed is kept through the connect step;
// - Connect Wallet (`?step=connect`): the Demo wallet first and on, the four
//   real wallets Soon (web D9), I don't have a wallet;
// - Need a wallet? (`?step=wallet`): the IDEEZA Wallet app's steps, its QR
//   Coming soon, Use the Demo wallet.
// Buy $IDZ goes through the wallet sheet (purpose `buyIdz`); once it
// confirms, the Buy $IDZ tab shows the purchase and its success sheet. The
// draft and the wallet sheet belong to the screen, not the form, so a wallet
// that disconnects mid-sign shows "That didn't go through" and keeps the
// amount. A referral link (`?ref=<code>`) says who invited, and a purchase by
// another demo account through it counts for the link's owner.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDataTransferVerticalIcon, ArrowDown01Icon, CoinbaseIcon, Download04Icon, QrCodeIcon, Tick02Icon, Wallet01Icon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { IdzCoin } from "@/components/balance/idz-coin";
import { PayCoinGlyph } from "@/components/balance/pay-coin-glyph";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";
import { availableOf } from "@/lib/wallet/balances";
import { demoAddress, makerId, readWallet, shortAddress, walletConnect } from "@/lib/wallet/demo-wallet";
import { formatWhen } from "@/lib/wallet/idz";
import { formatAmount } from "@/lib/wallet/money";
import {
  PAY_COINS,
  PRESALE,
  buyCheckOf,
  buyRequestOf,
  coinRateOf,
  countdownOf,
  formatPrice,
  formatUsd,
  gasReserveOf,
  maxPayOf,
  presaleOpenAt,
  presalePriceOf,
  type PayCoin,
} from "@/lib/wallet/presale";
import { totalRaisedOf } from "@/lib/wallet/presale-records";
import { campaignOf, linkByCodeOf, referralFromLink } from "@/lib/wallet/referral";
import { readReferralData, useReferralData, writeReferralData } from "@/lib/wallet/use-earn-stores";
import { TIMING } from "@/lib/wallet/request";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { Amount, DemoWallet, IdentityId } from "@/lib/wallet/types";
import type { MarketData } from "@/lib/market/types";
import { PickList } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { CARD, useEarnState } from "./parts";
import { useWalletSheet } from "./wallet-sheet";

const SOON_WALLETS = ["IDEEZA Wallet", "MetaMask", "Wallet Connect", "Coinbase Wallet"] as const;
const STORAGE = "This browser couldn’t save it — storage is full or blocked.";
const REF_KEY = "ideeza:m:presale-ref";
const pad = (n: number) => String(n).padStart(2, "0");
const nonce = () => Math.random().toString(36).slice(2, 10);

/** The buy form's draft: which field was typed last, what, in which coin, and the field order. */
type Draft = { driver: "get" | "pay"; text: string; coin: PayCoin; payFirst: boolean; touched: boolean };
const EMPTY_DRAFT: Draft = { driver: "get", text: "", coin: "ETH", payFirst: false, touched: false };

/** The referral code this visit came with: `?ref=`, kept for the session so the connect step and a reload don't lose it. */
function useReferralCode(fromAddress: string | null): string | null {
  const [code] = React.useState<string | null>(() => {
    if (fromAddress) {
      try {
        sessionStorage.setItem(REF_KEY, fromAddress);
      } catch {
        // Storage refused: the code still holds for this visit.
      }
      return fromAddress;
    }
    try {
      return sessionStorage.getItem(REF_KEY);
    } catch {
      return null;
    }
  });
  return code;
}

export function PresaleScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const step = params.get("step");
  const { wallet, market, now, id, connected } = useEarnState();
  const sheet = useWalletSheet();
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const toast = useToast();
  const timer = React.useRef<number | null>(null);
  React.useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  const refCode = useReferralCode(params.get("ref"));
  const referrals = useReferralData();
  const refLink = refCode && referrals ? linkByCodeOf(referrals, refCode) : null;
  const invitedBy = refLink && refLink.identity !== id ? refLink : null;

  /** Connects the Demo wallet, then back to the card, where the form keeps what was typed. */
  const connect = () => {
    if (connecting) return;
    if (connected) return router.replace("/m/earn/presale");
    setConnecting(true);
    setError(null);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const w = readWallet();
      const ok = persistWallet(walletConnect(w, makerId(w.account)));
      setConnecting(false);
      if (!ok) return setError(STORAGE);
      toast({ title: "Wallet connected" });
      router.replace("/m/earn/presale");
    }, TIMING.connect);
  };

  /** A purchase through someone's link counts for them (best effort: the purchase itself is done). */
  const countReferral = (who: IdentityId, idz: Amount) => {
    if (!refCode) return;
    const next = referralFromLink(readReferralData(), readWallet(), refCode, { id: `ref_${nonce()}`, who, bought: idz, at: Date.now() });
    if (next) writeReferralData(next);
  };

  let body: React.ReactNode;
  if (step === "connect") body = <ConnectStep connecting={connecting} error={error} onDemo={connect} onNoWallet={() => router.push("/m/earn/presale?step=wallet")} />;
  else if (step === "wallet") body = <NeedWalletStep connecting={connecting} error={error} onDemo={connect} />;
  else
    body = (
      <div className="flex flex-col gap-12">
        <div className={cn(CARD, "flex flex-col gap-8 p-8 text-center")}>
          <PresaleHead now={now} raised={totalRaisedOf(wallet)} />
          {invitedBy && (
            <p className={cn(T.meta, "rounded-lg bg-bg-brand-subtle px-6 py-3 text-text-primary")}>
              Invited by {shortAddress(demoAddress(invitedBy.identity))} · {campaignOf(invitedBy.campaign)?.name ?? invitedBy.campaign}
            </p>
          )}
          {!wallet ? (
            <Skeleton shape="block" className="h-[280px] w-full" />
          ) : (
            <BuyForm
              wallet={wallet}
              id={connected ? id : null}
              market={market}
              now={now}
              draft={draft}
              setDraft={setDraft}
              sheet={sheet}
              onConnect={() => router.push("/m/earn/presale?step=connect")}
              onNoWallet={() => router.push("/m/earn/presale?step=wallet")}
              onBought={(who, idz, txHash) => {
                countReferral(who, idz);
                setDraft(EMPTY_DRAFT);
                router.replace(`/m/earn/buy?bought=${txHash}`);
              }}
            />
          )}
        </div>
        <WhitePaper />
        <p className={cn(T.meta, "text-center")}>Testnet demo, no real money. IDZ can lose value; this isn’t investment advice.</p>
      </div>
    );

  return (
    <Screen top={<TopBar back="/m/earn/buy" title="Buy IDEEZA Coin" />} className="px-8 pb-8 pt-4">
      {body}
      {sheet.sheet}
    </Screen>
  );
}

/** "31 Dec 2026, 11:59 PM GMT+6" */
function whenWithZone(at: number): string {
  const zone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value;
  return zone ? `${formatWhen(at)} ${zone}` : formatWhen(at);
}

const ROUND_UNITS = [
  { key: "days", name: "Days" },
  { key: "hours", name: "Hours" },
  { key: "minutes", name: "Minutes" },
  { key: "seconds", name: "Seconds" },
] as const;

function PresaleHead({ now, raised }: { now: number; raised: Amount }) {
  const open = presaleOpenAt(now);
  const c = countdownOf(PRESALE.endsAt - now);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className={cn(T.title, "text-text-brand")}>Buy $IDZ Token</h2>
        <p className={T.bodyStrong}>{open ? `In Presale Now! · ${PRESALE.round}` : `${PRESALE.round} has ended`}</p>
      </div>
      <div role="timer" aria-label={`${c.days} days ${c.hours} hours ${c.minutes} minutes until the price increase`} className="grid grid-cols-4 gap-6">
        {ROUND_UNITS.map((u) => (
          <div key={u.key} aria-hidden className="flex min-w-0 flex-col items-center gap-1 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface py-5">
            <span className={cn(T.title, "tabular-nums")}>{pad(c[u.key])}</span>
            <span className={cn(T.micro, "font-mono")}>{u.name}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className={cn(T.overline, "rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-subtle py-3 font-mono text-text-primary")}>
          Until price increase
        </p>
        <p className={T.meta}>
          {open
            ? `Then 1 $IDZ = ${formatPrice(PRESALE.nextPrice)}. ${PRESALE.round} ends ${whenWithZone(PRESALE.endsAt)}.`
            : `It ended ${whenWithZone(PRESALE.endsAt)}. The next round opens at 1 $IDZ = ${formatPrice(PRESALE.nextPrice)}.`}
        </p>
      </div>
      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <span className={cn(T.overline, "font-mono tabular-nums")}>Total USD raised: {formatUsd(raised)}</span>
        <TestnetDemoBadge />
      </p>
    </div>
  );
}

function RateLine({ price, whitelisted, coin }: { price: Amount; whitelisted?: boolean; coin?: PayCoin }) {
  return (
    <div className="flex items-center gap-6">
      <span aria-hidden className="h-[1px] flex-1 bg-border-subtle" />
      <p className={cn(T.body, "font-mono tabular-nums text-text-primary")}>
        1 $IDZ ={" "}
        {whitelisted && (
          <>
            <s className="text-text-tertiary">{formatPrice(PRESALE.price)}</s>
            <span className="sr-only"> now </span>{" "}
          </>
        )}
        {formatPrice(price)}
        {coin === "ETH" && <span className={cn(T.meta, "block")}>1 ETH = {formatPrice(coinRateOf("ETH"))} (demo rate)</span>}
      </p>
      <span aria-hidden className="h-[1px] flex-1 bg-border-subtle" />
    </div>
  );
}

/** No white paper exists yet (web C2f): it says Soon instead of downloading nothing. */
function WhitePaper() {
  return (
    <p className={cn(T.bodyLg, "flex items-center justify-center gap-6 text-text-disabled")} aria-disabled>
      <span aria-hidden className="inline-flex size-[36px] items-center justify-center rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface">
        <Icon icon={Download04Icon} size={20} />
      </span>
      Download White Paper
      <span className={cn(T.meta, "text-text-tertiary")}>Soon</span>
    </p>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cn(CARD, "flex flex-col gap-8 p-8 text-center")}>
      <h2 className={cn(T.title, "flex items-center justify-center gap-4 border-b-[length:var(--border-width-1)] border-solid border-border pb-8")}>
        <span aria-hidden className="text-[color:var(--color-icon-secondary)]">
          <Icon icon={Wallet01Icon} size={24} />
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function ConnectStep({ connecting, error, onDemo, onNoWallet }: { connecting: boolean; error: string | null; onDemo: () => void; onNoWallet: () => void }) {
  return (
    <StepCard title="Connect Wallet">
      <div className={cn(T.body, "flex flex-col gap-6")}>
        <p>To buy into this token sale, connect a wallet so you can receive your $IDZ.</p>
        <p>
          If you already have a wallet, choose it below. If you don’t, the <span className="font-medium text-text-brand">IDEEZA Wallet</span> app is on its way; until then the Demo wallet works here on testnet.
        </p>
      </div>
      <ul className="flex flex-col gap-6">
        <li>
          <Button size="xl" className="w-full justify-between" loading={connecting} onClick={onDemo}>
            <span>{connecting ? "Connecting…" : "Demo wallet"}</span>
            {!connecting && <TestnetDemoBadge />}
          </Button>
        </li>
        {SOON_WALLETS.map((w) => (
          <li key={w}>
            <Button hierarchy="secondary" size="xl" disabled className="w-full justify-between" title="Opens once real wallets can connect">
              <span className="inline-flex items-center gap-4">
                {w === "IDEEZA Wallet" ? (
                  <IdeezaLogo mark height={20} decorative />
                ) : (
                  <Icon icon={w === "Coinbase Wallet" ? CoinbaseIcon : w === "MetaMask" ? Wallet01Icon : Wallet02Icon} size={20} />
                )}
                {w}
              </span>
              <span className={T.micro}>Soon</span>
            </Button>
          </li>
        ))}
        <li>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onNoWallet}>
            I don’t have a wallet
          </Button>
        </li>
      </ul>
      {error && <Banner tone="error">{error}</Banner>}
    </StepCard>
  );
}

function NeedWalletStep({ connecting, error, onDemo }: { connecting: boolean; error: string | null; onDemo: () => void }) {
  return (
    <StepCard title="Need a wallet?">
      <div className="flex items-start gap-6 text-left">
        <IdeezaLogo mark height={48} decorative className="shrink-0" />
        <p className={T.bodyLg}>
          IDEEZA Wallet is a beginner-friendly app that makes it easy to buy our presale token. Follow the steps below to get started.
        </p>
      </div>
      <div className="flex items-center justify-between gap-6 rounded-xl bg-bg-subtle p-6 text-left">
        <ol className={cn(T.body, "flex list-decimal flex-col gap-1 pl-8 text-text-primary")}>
          <li>Download the IDEEZA Wallet app</li>
          <li>Create your account</li>
          <li>Buy in-app with card or crypto</li>
        </ol>
        <div className="flex size-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface text-text-tertiary">
          <Icon icon={QrCodeIcon} size={24} />
          <span className={cn(T.micro, "text-text-tertiary")}>Coming soon</span>
        </div>
      </div>
      <p className={T.body}>The app isn’t out yet, so there is no code to scan. Until it is, buy with the Demo wallet here on testnet.</p>
      {error && <Banner tone="error">{error}</Banner>}
      <Button size="xl" className="w-full" loading={connecting} onClick={onDemo}>
        {connecting ? "Connecting…" : "Use the Demo wallet"}
      </Button>
    </StepCard>
  );
}

// ── the buy form (Figma 229602 before connecting, 229701 empty, 229801 filled, 229902 the coin list) ──

const BOX = "flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-8 py-6 text-left focus-within:ring-2 focus-within:ring-border-focus";
const INPUT = cn(T.bodyLg, "min-w-0 flex-1 bg-transparent tabular-nums outline-none placeholder:text-text-tertiary");
/** Before a wallet is connected the form only quotes: no balance stops it. */
const NO_LIMIT = { coin: "1000000000", gas: "1000000000" };

function BuyForm({
  wallet,
  id,
  market,
  now,
  draft,
  setDraft,
  sheet,
  onConnect,
  onNoWallet,
  onBought,
}: {
  wallet: DemoWallet;
  /** The connected account; null before connecting (the form quotes, Buy With Crypto connects). */
  id: IdentityId | null;
  market: MarketData;
  now: number;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  sheet: ReturnType<typeof useWalletSheet>;
  onConnect: () => void;
  onNoWallet: () => void;
  onBought: (who: IdentityId, idz: Amount, txHash: string) => void;
}) {
  const [coins, setCoins] = React.useState(false);
  const [whyWhitelist, setWhyWhitelist] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const getRef = React.useRef<HTMLInputElement>(null);
  const payRef = React.useRef<HTMLInputElement>(null);
  const ids = { get: React.useId(), pay: React.useId(), getErr: React.useId(), payErr: React.useId(), gas: React.useId() };
  const { driver, text, coin, payFirst, touched } = draft;

  const { price, whitelisted } = id ? presalePriceOf(demoAddress(id)) : { price: PRESALE.price, whitelisted: false };
  const ctx = { wallet, market, now };
  const reserve = gasReserveOf(PRESALE.network);
  const have = id ? { coin: availableOf(id, coin, PRESALE.network, ctx), gas: availableOf(id, reserve.coin, PRESALE.network, ctx) } : NO_LIMIT;
  const check = buyCheckOf({ driver, text, coin }, { price, have, now });
  const getValue = driver === "get" ? text : (check.idz ?? "");
  const payValue = driver === "pay" ? text : (check.pay ?? "");
  const shown = touched || check.error?.field === "form" ? check.error : null;
  const [maxNote, setMaxNote] = React.useState<string | null>(null);
  const getErr = shown?.field === "get" ? shown.text : null;
  const payErr = maxNote ?? (shown?.field === "pay" ? shown.text : null);
  const walletNetwork = id ? (wallet.identities[id]?.network ?? PRESALE.network) : PRESALE.network;

  const type = (field: "get" | "pay") => (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxNote(null);
    setDraft((d) => ({ ...d, driver: field, text: e.target.value, touched: true }));
  };
  const chooseCoin = (next: PayCoin) => {
    setCoins(false);
    setMaxNote(null);
    if (next === coin) return;
    setDraft((d) => (d.driver === "pay" ? { ...d, driver: "get", text: check.idz ?? "", coin: next } : { ...d, coin: next }));
  };
  const useMax = () => {
    const max = maxPayOf(coin, have);
    // Nothing to pay with: keep what was typed and say how to go on.
    if (max === "0") {
      setMaxNote(`You have 0 ${coin} on ${networkLabelOf(PRESALE.network)}. Pay with ${coin === "ETH" ? "another coin" : "ETH"} or switch account in the Demo wallet.`);
      return;
    }
    setMaxNote(null);
    setDraft((d) => ({ ...d, driver: "pay", text: max, touched: true }));
  };
  const buy = async () => {
    if (!id) return onConnect();
    if (sheet.busy) return;
    if (check.error || !check.idz || !check.pay) {
      setDraft((d) => ({ ...d, touched: true }));
      (check.error?.field === "pay" ? payRef : getRef).current?.focus();
      return;
    }
    setNote(null);
    const idz = check.idz;
    const result = await sheet.request(buyRequestOf({ idz, pay: check.pay, coin, price, whitelisted }), {
      recheck: () => (presaleOpenAt(Date.now()) ? null : `${PRESALE.round} ended before the purchase confirmed. Nothing was charged.`),
    });
    if (result.ok) onBought(result.proof.identity, idz, result.proof.txHash ?? "");
    else setNote(result.reason === "rejected" ? "Purchase cancelled in the wallet. Nothing was charged." : (result.message ?? "The purchase didn’t go through. Nothing was charged."));
  };

  const getBox = (
    <div key="get" className="flex flex-col gap-2">
      <div className={BOX}>
        <label htmlFor={ids.get} className={cn(T.body, "font-mono text-text-primary")}>
          You get
        </label>
        <div className="flex items-center gap-4">
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
          <span className={cn(T.body, "shrink-0")}>IDZ</span>
        </div>
      </div>
      {getErr && (
        <p id={ids.getErr} className={cn(T.caption, "text-left text-text-error")}>
          {getErr}
        </p>
      )}
    </div>
  );

  const payBox = (
    <div key="pay" className="flex flex-col gap-2">
      <div className={BOX}>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={ids.pay} className={cn(T.body, "font-mono text-text-primary")}>
            You pay
          </label>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`Pay with ${coin}, change`}
            onClick={() => setCoins(true)}
            className={cn(T.body, "inline-flex h-[28px] items-center gap-2 rounded-md bg-bg-subtle px-3 text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
          >
            <PayCoinGlyph coin={coin} className="size-[20px]" />
            {coin}
            <Icon icon={ArrowDown01Icon} size={14} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
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
              className={cn(T.meta, "inline-flex min-h-[28px] shrink-0 items-center rounded-xs text-text-success underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
            >
              Discount for whitelist
            </button>
          )}
        </div>
      </div>
      {payErr && (
        <p id={ids.payErr} role={maxNote ? "alert" : undefined} className={cn(T.caption, "text-left text-text-error")}>
          {payErr}
        </p>
      )}
      {!whitelisted && whyWhitelist && (
        <p className={cn(T.meta, "text-left")}>
          Wallets on the presale whitelist pay {PRESALE.whitelist.percentOff}% less.{" "}
          {id ? "This wallet isn’t on it; on" : "On"} the demo whitelist is Demo account {PRESALE.whitelist.accounts.join(", ")} (switch account in the Demo wallet to try
          it).
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <RateLine price={price} whitelisted={whitelisted} coin={coin} />
      <div className="flex flex-col">
        {payFirst ? payBox : getBox}
        <div className="relative z-[1] -my-3 flex justify-center">
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, payFirst: !d.payFirst }))}
            aria-label={payFirst ? "Swap: type the IDZ you get first" : "Swap: type what you pay first"}
            className="inline-flex size-[32px] items-center justify-center rounded-full border-[length:var(--border-width-1)] border-solid border-border bg-bg-subtle text-[color:var(--color-icon-default)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={ArrowDataTransferVerticalIcon} size={16} />
          </button>
        </div>
        {payFirst ? getBox : payBox}
      </div>
      <p id={ids.gas} className={cn(T.meta, "font-mono")}>
        {coin === reserve.coin
          ? `${formatAmount(reserve.amount, reserve.coin)} is reserved for gas: this purchase and its claim. The actual amount depends on the network.`
          : `Gas is paid in test ${reserve.coin}: ${formatAmount(reserve.amount, reserve.coin)} stays for this purchase and its claim. The actual amount depends on the network.`}
      </p>
      {id && walletNetwork !== PRESALE.network && (
        <p className={T.meta}>
          Your wallet is on {networkLabelOf(walletNetwork)}. The presale is on {networkLabelOf(PRESALE.network)} — the wallet asks to switch when you buy.
        </p>
      )}
      {note && <Banner tone="info">{note}</Banner>}
      {shown?.field === "form" && <p className={cn(T.caption, "text-text-error")}>{shown.text}</p>}
      {id ? (
        <>
          <Button size="xl" className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-60" aria-disabled={!!check.error || undefined} loading={sheet.busy} onClick={buy}>
            Buy $IDZ
          </Button>
          <p className={cn(T.body, "flex flex-wrap items-center justify-center gap-x-4")}>
            <span className="tabular-nums">Available balance = {formatAmount(have.coin, coin)}</span>
            <Button hierarchy="ghost" size="sm" onClick={useMax}>
              Max
            </Button>
          </p>
        </>
      ) : (
        <>
          <Button size="xl" className="w-full" disabled={!presaleOpenAt(now)} onClick={onConnect}>
            Buy With Crypto
          </Button>
          <button
            type="button"
            onClick={onNoWallet}
            className={cn(T.body, "self-center rounded-xs underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus")}
          >
            Don’t have a wallet?
          </button>
        </>
      )}
      <Sheet open={coins} onClose={() => setCoins(false)} title="Pay with" description={`On ${networkLabelOf(PRESALE.network)}`}>
        <PickList
          label="Pay with"
          value={coin}
          onPick={chooseCoin}
          options={PAY_COINS.map((c) => ({
            value: c,
            label: c,
            helper: id ? `${formatAmount(availableOf(id, c, PRESALE.network, ctx), c)} on ${networkLabelOf(PRESALE.network)}` : networkLabelOf(PRESALE.network),
          }))}
        />
      </Sheet>
    </div>
  );
}

"use client";

// Buy IDEEZA Coin (Figma "Buy IDEEZA Coin" 229538, 229602–229902, 230004–
// 230129; the web's presale dialog, components/balance/presale-dialog.tsx):
// one screen, three steps, each its own address so Back walks them. Laid out
// for a phone (UX pass 2026-11-15, lens 6 / 8 / 11 / 14):
// - the round, summary first: Buy $IDZ Token as the overline with In Presale
//   Now! and the round, the countdown until the price increase, then the next
//   price, TOTAL USD RAISED (the demo purchases) and the round's end as facts;
//   then the buy form (You get ⇅ You pay, the coin sheet, the whitelist, the
//   available balance with Max in the pay box, the gas line, every check from
//   lib/wallet/presale.ts). Buy $IDZ is the BottomBar's, so it stays above the
//   keyboard. Before a wallet is connected (Figma 229602) the form already
//   quotes at the presale price, without Max or a balance, and the BottomBar
//   holds Buy With Crypto and Don't have a wallet?; the amount typed is kept
//   through the connect step. White paper (Soon) and the risk line close it;
// - Connect Wallet (`?step=connect`): the wallets as rows — the Demo wallet
//   first and on, the four real wallets Soon (web D9) — then I don't have a
//   wallet; the second paragraph is behind ⓘ;
// - Need a wallet? (`?step=wallet`): the IDEEZA Wallet app's steps, its QR
//   Coming soon; Use the Demo wallet in the BottomBar.
// Buy $IDZ goes through the wallet sheet (purpose `buyIdz`); once it
// confirms, the Buy $IDZ tab shows the purchase and its success sheet. The
// draft and the wallet sheet belong to the screen, not the form, so a wallet
// that disconnects mid-sign shows "That didn't go through" and keeps the
// amount. A referral link (`?ref=<code>`) says who invited, and a purchase by
// another demo account through it counts for the link's owner.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDataTransferVerticalIcon, ArrowDown01Icon, CoinbaseIcon, Download04Icon, HelpCircleIcon, QrCodeIcon, Tick02Icon, Wallet01Icon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { IdzCoin } from "@/components/balance/idz-coin";
import { PayCoinGlyph } from "@/components/balance/pay-coin-glyph";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { Spinner } from "@/components/ideeza/spinner";
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
import { BottomBar, TEXT_LINK } from "../kit/bottom-bar";
import { Eyebrow } from "../kit/eyebrow";
import { ListCard, ListRow } from "../kit/list";
import { PickList } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { CARD, FactGrid, SectionHead, TestnetLine, useEarnState } from "./parts";
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

  const form = useBuyForm({
    wallet,
    id: connected ? id : null,
    market,
    now,
    draft,
    setDraft,
    sheet,
    onConnect: () => router.push("/m/earn/presale?step=connect"),
    onNoWallet: () => router.push("/m/earn/presale?step=wallet"),
    onBought: (who, idz, txHash) => {
      countReferral(who, idz);
      setDraft(EMPTY_DRAFT);
      router.replace(`/m/earn/buy?bought=${txHash}`);
    },
  });

  let body: React.ReactNode;
  let footer: React.ReactNode = null;
  if (step === "connect") body = <ConnectStep connecting={connecting} error={error} onDemo={connect} onNoWallet={() => router.push("/m/earn/presale?step=wallet")} />;
  else if (step === "wallet") {
    body = <NeedWalletStep error={error} />;
    footer = (
      <BottomBar>
        <Button size="xl" className="w-full" loading={connecting} onClick={connect}>
          {connecting ? "Connecting…" : "Use the Demo wallet"}
        </Button>
      </BottomBar>
    );
  } else {
    body = (
      <div className="flex flex-col gap-8">
        <PresaleHead now={now} raised={totalRaisedOf(wallet)} />
        {invitedBy && (
          <p className={cn(T.meta, "rounded-lg bg-bg-brand-subtle px-6 py-3 text-text-primary")}>
            Invited by {shortAddress(demoAddress(invitedBy.identity))} · {campaignOf(invitedBy.campaign)?.name ?? invitedBy.campaign}
          </p>
        )}
        {!wallet ? <Skeleton shape="block" className="h-[280px] w-full" /> : form.form}
        <WhitePaper />
        <TestnetLine>Testnet demo, no real money. IDZ can lose value; this isn’t investment advice.</TestnetLine>
      </div>
    );
    footer = wallet ? form.footer : null;
  }

  return (
    <Screen top={<TopBar back="/m/earn/buy" title="Buy IDEEZA Coin" />} footer={footer} className="px-8 pb-8 pt-2">
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

/** The round (Figma 229538), summary first: Buy $IDZ Token as the overline with where the round
 *  stands, the countdown until the price increase, then three facts — the next price, the total USD
 *  raised (the demo purchases) and when the round ends. */
function PresaleHead({ now, raised }: { now: number; raised: Amount }) {
  const open = presaleOpenAt(now);
  const c = countdownOf(PRESALE.endsAt - now);
  const ends = whenWithZone(PRESALE.endsAt);
  const [day, ...time] = ends.split(", ");
  return (
    <section aria-labelledby="presale-title" className={cn(CARD, "flex flex-col gap-6 p-8")}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="presale-title">
          <Eyebrow as="span">Buy $IDZ Token</Eyebrow>
        </h2>
        <Badge tone={open ? "brand" : "neutral"}>{open ? `In Presale Now! · ${PRESALE.round}` : `${PRESALE.round} has ended`}</Badge>
      </div>
      <div className="flex flex-col gap-3">
        <p className={T.meta}>Until price increase</p>
        <div role="timer" aria-label={`${c.days} days ${c.hours} hours ${c.minutes} minutes until the price increase`} className="grid grid-cols-4 gap-4">
          {ROUND_UNITS.map((u) => (
            <div key={u.key} aria-hidden className="flex min-w-0 flex-col items-center rounded-lg bg-bg-subtle py-3">
              <span className={cn(T.section, "tabular-nums")}>{pad(c[u.key])}</span>
              <span className={T.micro}>{u.name}</span>
            </div>
          ))}
        </div>
      </div>
      <FactGrid
        facts={[
          { label: open ? "Then 1 $IDZ =" : "Next round", value: formatPrice(PRESALE.nextPrice) },
          { label: "Total USD raised", value: formatUsd(raised) },
          {
            label: open ? `${PRESALE.round} ends` : "It ended",
            value: (
              <>
                <span className="block">{day}</span>
                {time.length > 0 && <span className={cn(T.micro, "block")}>{time.join(", ")}</span>}
              </>
            ),
          },
        ]}
      />
    </section>
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

/** No white paper exists yet (web C2f): a disabled row that says Soon instead of downloading nothing. */
function WhitePaper() {
  return (
    <ListCard label="White paper">
      <ListRow icon={Download04Icon} title="Download White Paper" disabled reason="Soon" onClick={() => undefined} />
    </ListCard>
  );
}

const WALLET_ICON_BOX = "inline-flex size-[40px] shrink-0 items-center justify-center rounded-full bg-bg-subtle text-[color:var(--color-icon-default)]";

/** Connect Wallet (Figma 230004): the wallets as rows — the Demo wallet first and on, the four real
 *  wallets Soon (web D9) — and "I don't have a wallet". The second paragraph sits behind ⓘ. */
function ConnectStep({ connecting, error, onDemo, onNoWallet }: { connecting: boolean; error: string | null; onDemo: () => void; onNoWallet: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SectionHead
          info={
            <p>
              If you already have a wallet, choose it below. If you don’t, the IDEEZA Wallet app is on its way; until then the Demo wallet works here on testnet.
            </p>
          }
          infoTitle="Choosing a wallet"
        >
          Connect Wallet
        </SectionHead>
        <p className={T.body}>To buy into this token sale, connect a wallet so you can receive your $IDZ.</p>
      </div>
      <ListCard label="Wallets">
        <ListRow
          onClick={() => {
            if (!connecting) onDemo();
          }}
          leading={
            <span aria-hidden className={cn(WALLET_ICON_BOX, "bg-bg-brand-subtle text-[color:var(--color-icon-brand)]")}>
              <Icon icon={Wallet01Icon} size={20} />
            </span>
          }
          title={connecting ? "Connecting…" : "Demo wallet"}
          meta="Works here on testnet"
          trailing={connecting ? <Spinner size={20} /> : <TestnetDemoBadge />}
        />
        {SOON_WALLETS.map((w) => (
          <ListRow
            key={w}
            disabled
            reason="Soon · opens once real wallets can connect"
            onClick={() => undefined}
            leading={
              <span aria-hidden className={WALLET_ICON_BOX}>
                {w === "IDEEZA Wallet" ? (
                  <IdeezaLogo mark height={20} decorative />
                ) : (
                  <Icon icon={w === "Coinbase Wallet" ? CoinbaseIcon : w === "MetaMask" ? Wallet01Icon : Wallet02Icon} size={20} />
                )}
              </span>
            }
            title={w}
          />
        ))}
      </ListCard>
      <ListCard label="No wallet">
        <ListRow onClick={onNoWallet} icon={HelpCircleIcon} title="I don’t have a wallet" />
      </ListCard>
      {error && <Banner tone="error">{error}</Banner>}
    </div>
  );
}

/** Need a wallet? (Figma 230129): the IDEEZA Wallet app's steps and its QR, Coming soon; Use the Demo
 *  wallet is the BottomBar's. */
function NeedWalletStep({ error }: { error: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionHead>Need a wallet?</SectionHead>
      <div className="flex items-start gap-6">
        <IdeezaLogo mark height={40} decorative className="shrink-0" />
        <p className={T.body}>IDEEZA Wallet is a beginner-friendly app that makes it easy to buy our presale token. Follow the steps below to get started.</p>
      </div>
      <div className={cn(CARD, "flex items-center justify-between gap-6 p-8")}>
        <ol className={cn(T.body, "flex list-decimal flex-col gap-2 pl-8 text-text-primary")}>
          <li>Download the IDEEZA Wallet app</li>
          <li>Create your account</li>
          <li>Buy in-app with card or crypto</li>
        </ol>
        <div className="flex size-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-subtle text-text-tertiary">
          <Icon icon={QrCodeIcon} size={24} />
          <span className={cn(T.micro, "text-text-tertiary")}>Coming soon</span>
        </div>
      </div>
      <TestnetLine>The app isn’t out yet, so there is no code to scan. Until it is, buy with the Demo wallet here on testnet.</TestnetLine>
      {error && <Banner tone="error">{error}</Banner>}
    </div>
  );
}

// ── the buy form (Figma 229602 before connecting, 229701 empty, 229801 filled, 229902 the coin list) ──

const BOX = "flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-8 py-6 text-left focus-within:ring-2 focus-within:ring-border-focus";
const INPUT = cn(T.bodyLg, "min-w-0 flex-1 bg-transparent tabular-nums outline-none placeholder:text-text-tertiary");
/** Before a wallet is connected the form only quotes: no balance stops it. */
const NO_LIMIT = { coin: "1000000000", gas: "1000000000" };

/** The buy form and its BottomBar: the boxes, rate and gas lines go in the content; Buy $IDZ (or Buy
 *  With Crypto and Don't have a wallet? before connecting) goes in the thumb zone, so it stays above
 *  the keyboard. A hook, so the screen can pin the footer. */
function useBuyForm({
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
  wallet: DemoWallet | undefined;
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
}): { form: React.ReactNode; footer: React.ReactNode } {
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
  const walletNetwork = id ? (wallet?.identities[id]?.network ?? PRESALE.network) : PRESALE.network;

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
        {id && (
          <p className={cn(T.meta, "flex flex-wrap items-center justify-between gap-x-4 border-t-[length:var(--border-width-1)] border-solid border-border-subtle pt-2")}>
            <span className="tabular-nums">Available balance = {formatAmount(have.coin, coin)}</span>
            <Button hierarchy="ghost" size="sm" onClick={useMax}>
              Max
            </Button>
          </p>
        )}
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

  const form = (
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

  const footer = id ? (
    <BottomBar>
      <Button size="xl" className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-60" aria-disabled={!!check.error || undefined} loading={sheet.busy} onClick={buy}>
        Buy $IDZ
      </Button>
    </BottomBar>
  ) : (
    <BottomBar>
      <Button size="xl" className="w-full" disabled={!presaleOpenAt(now)} onClick={onConnect}>
        Buy With Crypto
      </Button>
      <button type="button" onClick={onNoWallet} className={cn(TEXT_LINK, "my-0 self-center")}>
        Don’t have a wallet?
      </button>
    </BottomBar>
  );

  return { form, footer };
}

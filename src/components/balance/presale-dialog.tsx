"use client";

// The presale dialog (Figma User Panel V2 › Balance → Buy IDEEZA Coin;
// spec 2026-10-19-balance-buy-idz-design.md). One dialog, five steps:
// - the presale card (41571:114598): Buy With Crypto, Don't have a wallet?;
// - Connect a Wallet (115150 / 115735, one text): the Demo wallet first and
//   on, the four real wallets listed Soon (D9), I don't have a wallet, Back;
// - Need a wallet? (116320): the IDEEZA Wallet app's steps, its QR's place
//   saying Coming soon, Use the Demo wallet, Back;
// - the buy form (116857–118664), whose Buy $IDZ goes through the wallet's
//   own request dialog (purpose `buyIdz`, the N5 review) while this one waits
//   under it;
// - Purchase Successful (119254): what was bought and paid, the hash, the
//   claim countdown, the release line, View transaction log, contact us.
// No blocker: the card opens without a wallet, which is asked for only at
// Buy With Crypto. ✕ and Escape close every step but a payment in flight.

import * as React from "react";
import { ArrowLeft01Icon, QrCodeIcon, Tick02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, ModalFrame, TestnetDemoBadge } from "@/components/ideeza";
import { CopyButton, useCopy } from "@/components/wallet/wallet-dialog";
import { persistWallet, useWalletRequest } from "@/components/wallet/wallet-provider";
import { useMarket } from "@/lib/market/market-store";
import { openReportProblem } from "@/lib/support/open-report";
import { makerId, readWallet, shortAddress, walletConnect } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { PRESALE, RELEASE_LINE, buyRequestOf, presaleOpenAt } from "@/lib/wallet/presale";
import { purchasesOf, totalRaisedOf, type Purchase } from "@/lib/wallet/presale-records";
import { TIMING } from "@/lib/wallet/request";
import { estimateGas } from "@/lib/commerce/gas";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { BuyForm, type BuyArgs } from "./buy-form";
import { IdzCoin } from "./idz-coin";
import { CountdownBoxes, PresaleHead, RateLine, RiskLine, WhitePaperLink } from "./presale-head";
import { useSecondClock } from "./use-second-clock";

type Step = "card" | "connect" | "needWallet" | "form" | "success";

const TITLE: Record<Step, string> = {
  card: "Buy $IDZ Token",
  connect: "Connect a Wallet",
  needWallet: "Need a wallet?",
  form: "Buy $IDZ Token",
  success: "Purchase Successful",
};

const SOON_WALLETS = ["IDEEZA Wallet", "MetaMask", "WalletConnect", "Coinbase Wallet"] as const;
const CLAIM_UNITS = [
  { key: "hours", name: "hr" },
  { key: "minutes", name: "min" },
  { key: "seconds", name: "sec" },
] as const;
const DAY = 86_400_000;
const FULL = "w-full max-md:min-h-[var(--touch-min)]";
const STORAGE = "This browser couldn't save it — storage is full or blocked.";

export function PresaleDialog({ open, onClose, onViewLog }: { open: boolean; onClose: () => void; onViewLog: () => void }) {
  // Mounted only while open, so every opening starts on the card with an empty form.
  if (!open) return null;
  return <PresaleSteps onClose={onClose} onViewLog={onViewLog} />;
}

function PresaleSteps({ onClose, onViewLog }: { onClose: () => void; onViewLog: () => void }) {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useSecondClock();
  const { request, dialogOpen: walletOpen } = useWalletRequest();
  const [step, setStep] = React.useState<Step>("card");
  const [back, setBack] = React.useState<Step>("card");
  const [connecting, setConnecting] = React.useState(false);
  const [connectError, setConnectError] = React.useState<string | null>(null);
  const [paying, setPaying] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [bought, setBought] = React.useState<string | null>(null);
  const headingId = React.useId();
  const timer = React.useRef<number | null>(null);
  React.useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const id = wallet ? makerId(wallet.account) : null;
  const connected = !!(wallet && id && wallet.identities[id]?.connected);
  // A wallet that disconnects (another tab) while the form is open goes back to connecting.
  const shown: Step = step === "form" && wallet && !connected ? "connect" : step;
  const open = presaleOpenAt(now);

  // Each step's heading takes the focus, so a screen reader hears where it now is — once the
  // wallet's own dialog on top (its Done after a purchase) has closed.
  const covered = paying || walletOpen;
  // The frame's own focus effect (a child's) has run by now, so this one wins.
  React.useEffect(() => {
    if (!covered) document.getElementById(headingId)?.focus();
  }, [shown, headingId, covered]);

  const go = (next: Step) => {
    setConnectError(null);
    setStep(next);
  };
  const toForm = () => go(connected ? "form" : "connect");

  const connect = () => {
    if (connecting) return;
    if (connected) return go("form");
    setConnecting(true);
    setConnectError(null);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const w = readWallet();
      const ok = persistWallet(walletConnect(w, makerId(w.account)));
      setConnecting(false);
      if (ok) setStep("form");
      else setConnectError(STORAGE);
    }, TIMING.connect);
  };

  const buy = async (a: BuyArgs) => {
    if (paying) return;
    setPaying(true);
    setNote(null);
    try {
      const result = await request(buyRequestOf(a), {
        recheck: () => (presaleOpenAt(Date.now()) ? null : `${PRESALE.round} ended before the purchase confirmed. Nothing was charged.`),
      });
      if (result.ok) {
        setBought(result.proof.txHash ?? null);
        setStep("success");
      } else if (result.reason === "rejected") {
        setNote(result.message ?? "Purchase cancelled in the wallet. Nothing was charged.");
      } else {
        setNote(result.message ?? "The purchase didn't go through. Nothing was charged.");
      }
    } finally {
      setPaying(false);
    }
  };

  const purchase = bought && wallet && id ? (purchasesOf(wallet, id).find((p) => p.txHash === bought) ?? null) : null;

  let body: React.ReactNode;
  switch (shown) {
    case "card":
      body = (
        <div className="flex flex-col gap-[16px] text-center">
          <PresaleHead headingId={headingId} now={now} raised={totalRaisedOf(wallet)} />
          <RateLine price={PRESALE.price} />
          <Button
            hierarchy="primary"
            size="2xl"
            className={cn(FULL, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
            aria-disabled={!open || undefined}
            onClick={open ? toForm : undefined}
          >
            Buy With Crypto
          </Button>
          <button
            type="button"
            onClick={() => {
              setBack("card");
              go("needWallet");
            }}
            className="self-center rounded-xs text-md leading-md text-text-primary underline underline-offset-2 outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
          >
            Don&apos;t have a wallet?
          </button>
          <WhitePaperLink />
          <RiskLine />
        </div>
      );
      break;

    case "connect":
      body = (
        <div className="flex flex-col gap-[16px] text-center">
          <h2 id={headingId} tabIndex={-1} className="text-3xl font-semibold leading-3xl text-text-brand outline-none">
            Connect a Wallet
          </h2>
          <div className="flex flex-col gap-[8px] text-md leading-md text-text-secondary">
            <p>To buy into this token sale, connect a wallet so you can receive your $IDZ.</p>
            <p>
              If you already have a wallet, choose it below. If you don&apos;t, the{" "}
              <span className="font-medium text-text-brand">IDEEZA Wallet</span> app is on its way; until then the Demo
              wallet works here on testnet.
            </p>
          </div>
          <ul className="flex flex-col gap-[12px]">
            <li>
              <Button
                hierarchy="primary"
                size="2xl"
                className={cn(FULL, "justify-between")}
                aria-busy={connecting || undefined}
                onClick={connect}
              >
                <span>{connecting ? "Connecting…" : "Demo wallet"}</span>
                <TestnetDemoBadge />
              </Button>
            </li>
            {SOON_WALLETS.map((w) => (
              <li key={w}>
                <Button hierarchy="secondary" size="2xl" disabled className={cn(FULL, "justify-between")} title="Opens once real wallets can connect">
                  <span className="inline-flex items-center gap-[8px]">
                    {w === "IDEEZA Wallet" && <IdeezaLogo mark height={20} decorative />}
                    {w}
                  </span>
                  <span className="text-sm font-regular leading-sm">Soon</span>
                </Button>
              </li>
            ))}
            <li>
              <Button
                hierarchy="outline-brand"
                size="2xl"
                className={FULL}
                onClick={() => {
                  setBack("connect");
                  go("needWallet");
                }}
              >
                <Icon icon={Wallet01Icon} size={20} />
                I don&apos;t have a wallet
              </Button>
            </li>
          </ul>
          {connectError && (
            <div role="alert">
              <Banner tone="error">{connectError}</Banner>
            </div>
          )}
          <Button hierarchy="ghost" size="lg" className="self-center max-md:min-h-[var(--touch-min)]" onClick={() => go("card")}>
            <Icon icon={ArrowLeft01Icon} size={18} />
            Back
          </Button>
        </div>
      );
      break;

    case "needWallet":
      body = (
        <div className="flex flex-col gap-[16px] text-center">
          <h2 id={headingId} tabIndex={-1} className="text-3xl font-semibold leading-3xl text-text-brand outline-none">
            Need a wallet?
          </h2>
          <div className="flex items-start gap-[12px] text-left">
            <IdeezaLogo mark height={48} decorative className="shrink-0" />
            <p className="text-lg leading-lg text-text-primary">
              IDEEZA Wallet is a beginner-friendly app that makes it easy to buy our presale token. Follow the steps
              below to get started.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-[16px] rounded-xl bg-bg-subtle p-[16px] text-left">
            <ol className="flex list-decimal flex-col gap-[2px] pl-[20px] text-md leading-md text-text-primary">
              <li>Download the IDEEZA Wallet app</li>
              <li>Create your account</li>
              <li>Buy in-app with card or crypto</li>
            </ol>
            <div className="flex size-[96px] shrink-0 flex-col items-center justify-center gap-[4px] rounded-lg bg-bg-surface text-text-tertiary">
              <Icon icon={QrCodeIcon} size={28} />
              <span className="text-sm font-medium leading-xs">Coming soon</span>
            </div>
          </div>
          <p className="text-md leading-md text-text-secondary">
            The app isn&apos;t out yet, so there is no code to scan. Until it is, buy with the Demo wallet here on testnet.
          </p>
          {connectError && (
            <div role="alert">
              <Banner tone="error">{connectError}</Banner>
            </div>
          )}
          <Button hierarchy="primary" size="2xl" className={FULL} aria-busy={connecting || undefined} onClick={open ? connect : () => go("card")}>
            {connecting ? "Connecting…" : "Use the Demo wallet"}
          </Button>
          <Button hierarchy="ghost" size="lg" className="self-center max-md:min-h-[var(--touch-min)]" onClick={() => go(back)}>
            <Icon icon={ArrowLeft01Icon} size={18} />
            Back
          </Button>
        </div>
      );
      break;

    case "form":
      body =
        wallet && id ? (
          <div className="flex flex-col gap-[16px] text-center">
            <PresaleHead headingId={headingId} now={now} raised={totalRaisedOf(wallet)} />
            <BuyForm wallet={wallet} id={id} market={market} now={now} paying={paying} note={note} onBuy={buy} />
            <WhitePaperLink />
            <RiskLine />
          </div>
        ) : null;
      break;

    case "success":
      body = (
        <Success
          headingId={headingId}
          purchase={purchase}
          now={now}
          onViewLog={onViewLog}
          onContact={() => {
            onClose();
            openReportProblem({ details: purchase?.txHash ? `IDZ presale purchase ${purchase.txHash}` : "IDZ presale purchase" });
          }}
        />
      );
      break;
  }

  return (
    <ModalFrame
      open
      onClose={covered ? () => undefined : onClose}
      title={TITLE[shown]}
      labelledBy={headingId}
      size="sm"
      sheet
      covered={covered}
      closeUnavailable={paying}
    >
      {body}
    </ModalFrame>
  );
}

function Success({
  headingId,
  purchase,
  now,
  onViewLog,
  onContact,
}: {
  headingId: string;
  purchase: Purchase | null;
  now: number;
  onViewLog: () => void;
  onContact: () => void;
}) {
  const { copied, copy } = useCopy();
  const left = purchase ? purchase.buy.unlocksAt - now : 0;
  const gas = estimateGas(PRESALE.network);
  return (
    <div className="flex flex-col items-center gap-[16px] text-center">
      <span aria-hidden className="inline-flex size-[64px] items-center justify-center rounded-full bg-bg-success-subtle text-text-success">
        <Icon icon={Tick02Icon} size={32} />
      </span>
      <h2 id={headingId} tabIndex={-1} className="text-2xl font-semibold leading-2xl text-text-brand outline-none">
        Purchase Successful
      </h2>
      {purchase && (
        <dl className="flex w-full flex-col gap-[6px] rounded-xl bg-bg-subtle p-[12px] text-left text-md leading-md">
          <div className="flex flex-wrap items-center justify-between gap-x-[12px]">
            <dt className="text-text-secondary">You get</dt>
            <dd className="inline-flex items-center gap-[4px] font-semibold tabular-nums text-text-primary">
              <IdzCoin height={20} />
              {formatAmount(purchase.buy.idz, "IDZ")}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-[12px]">
            <dt className="text-text-secondary">You paid</dt>
            <dd className="font-medium tabular-nums text-text-primary">
              {formatAmount(purchase.buy.paid.amount, purchase.buy.paid.coin)}
              <span className="font-regular text-text-tertiary"> + {formatAmount(String(gas.fee), gas.native)} gas</span>
            </dd>
          </div>
          {purchase.txHash && (
            <div className="flex flex-wrap items-center justify-between gap-x-[12px]">
              <dt className="text-text-secondary">Transaction</dt>
              <dd className="inline-flex items-center gap-[4px] font-medium tabular-nums text-text-primary">
                <span title={purchase.txHash}>
                  <span aria-hidden>{shortAddress(purchase.txHash)}</span>
                  <span className="sr-only">{purchase.txHash}</span>
                </span>
                <CopyButton
                  label="Copy transaction hash"
                  done={copied?.what === "tx"}
                  onPress={() => copy("tx", purchase.txHash!, "Transaction hash copied")}
                />
              </dd>
            </div>
          )}
        </dl>
      )}
      {purchase && left > 0 ? (
        <>
          <p className="text-md leading-md text-text-primary">Your IDZ will be available to claim in</p>
          <CountdownBoxes
            ms={left}
            label="until you can claim"
            units={left >= DAY ? [{ key: "days", name: "d" }, ...CLAIM_UNITS] : [...CLAIM_UNITS]}
          />
          <p className="text-md leading-md text-text-primary">
            Once the countdown reaches zero, you&apos;ll be able to claim your IDZ.
          </p>
        </>
      ) : (
        <p role="status" className="text-md font-medium leading-md text-text-primary">
          Your IDZ is ready to claim.
        </p>
      )}
      <p className="text-sm leading-sm text-text-secondary">{RELEASE_LINE}</p>
      <Button hierarchy="primary" size="xl" className={FULL} onClick={onViewLog}>
        View transaction log
      </Button>
      <p className="text-sm leading-sm text-text-secondary">
        If you have any questions or need support, please{" "}
        <button
          type="button"
          onClick={onContact}
          className="rounded-xs text-text-primary underline underline-offset-2 outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          contact us
        </button>
        .
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {copied?.text ?? ""}
      </p>
    </div>
  );
}

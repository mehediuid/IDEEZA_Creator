"use client";

// Payment method (/m/settings/payments; mobile Figma "Payment Method": the
// Credit Card · PayPal · Wallet Connect tabs, `?tab=card|paypal|wallet`,
// client state — a tap never navigates, so they work offline). The web
// decides what can be saved (components/credits/payment-method-panel.tsx,
// lib/account/payment.ts): card and PayPal payments aren't on, so those tabs
// keep the Figma's empty state with Add held and its reason (no card or
// PayPal details are ever asked for); the one method is Crypto from the Demo
// wallet. Wallet Connect lists the providers — the Demo wallet connects (the
// method is added, as the default), the real wallets are Soon — and the saved
// method's ⋮ picks the token you pay with (each with what the wallet holds),
// manages the wallet, or removes the method (disconnects the demo wallet,
// asked first). Offline, connecting waits with its reason.

import * as React from "react";
import { CreditCardIcon, MoreVerticalIcon, PaypalIcon, Settings02Icon, Delete02Icon, Wallet01Icon, Wallet02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { persistWallet } from "@/components/wallet/wallet-provider";
import { CoinGlyph, useWalletStatus } from "@/components/credits/payment-picker";
import { setDefaultToken, useDefaultToken, type PayToken } from "@/lib/account/payment";
import { makerId, readWallet, walletDisconnect } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { ConnectSheet, DemoWalletSheet } from "../earn-coin/parts";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../kit/list";
import { ActionSheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { OfflineBanner, useOnline } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { CARD, OFFLINE_REASON, usePayBalances } from "./parts";

const TABS = ["card", "paypal", "wallet"] as const;

/** The real wallets the Figma lists: none connects yet (web D9), so each says Soon. */
const SOON_WALLETS = ["MetaMask", "Coinbase", "Fantom", "Trust", "Portis"] as const;

export function PaymentsScreen() {
  const [tab, setTab] = useTabParam("tab", TABS, "wallet");
  return (
    <Screen top={<TopBar back="/m/settings" title="Payment method" />} className="pb-12">
      <MobileTabs
        label="Payment method"
        idBase="pay"
        value={tab}
        onChange={setTab}
        className="mx-8"
        tabs={[
          { value: "card", label: "Credit card" },
          { value: "paypal", label: "PayPal" },
          { value: "wallet", label: "Wallet Connect" },
        ]}
      />
      <div {...tabPanelProps("pay", tab)} className="flex flex-col gap-8 px-8 pt-8 outline-none">
        <OfflineBanner />
        {tab === "wallet" ? <WalletTab /> : <NotYetTab kind={tab} onWallet={() => setTab("wallet")} />}
      </div>
    </Screen>
  );
}

function NotYetTab({ kind, onWallet }: { kind: "card" | "paypal"; onWallet: () => void }) {
  const card = kind === "card";
  return (
    <div className="flex flex-col gap-8">
      <EmptyState icon={card ? CreditCardIcon : PaypalIcon} title="No saved payment method" body="You pay with test USDT or IDZ from the Demo wallet." />
      <div className="flex flex-col gap-3">
        <Button size="xl" className="w-full" disabled aria-describedby="not-yet">
          {card ? "Add new card" : "Add PayPal"}
        </Button>
        <p id="not-yet" className={T.caption}>
          {card ? "Card payments aren’t available yet." : "PayPal isn’t available yet."}
        </p>
      </div>
      <Button hierarchy="secondary" size="xl" className="w-full" onClick={onWallet}>
        Use Wallet Connect
      </Button>
    </div>
  );
}

function WalletTab() {
  const wallet = useWalletStatus();
  const online = useOnline();
  const token = useDefaultToken();
  const balances = usePayBalances("baseSepolia");
  const toast = useToast();
  const [connecting, setConnecting] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [manage, setManage] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const choose = (coin: PayToken) => {
    if (setDefaultToken(coin)) toast({ title: `You pay with ${coin}` });
    else toast({ title: "This browser couldn’t save the choice (storage is full or blocked).", lead: "error" });
  };
  const have = (coin: PayToken) => (balances ? ` · you have ${formatAmount(balances[coin], coin)}` : "");
  const offlineConnect = !wallet.connected && !online;

  return (
    <div className="flex flex-col gap-8">
      {wallet.connected && (
        <section aria-labelledby="saved" className="flex flex-col gap-4">
          <h2 id="saved" className={T.section}>
            Saved
          </h2>
          <div className={cn(CARD, "flex items-center gap-6 p-6")}>
            <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
              <Icon icon={Wallet02Icon} size={22} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-3">
                <span className={T.rowTitle}>Demo wallet</span>
                <Badge tone="success">Default</Badge>
              </span>
              <span className={cn(T.meta, "truncate")}>
                <span className="font-mono">{wallet.short}</span> · {wallet.detail}
              </span>
              <span className={cn(T.meta, "flex flex-wrap items-center gap-2")}>
                Pay with
                <span className="inline-flex items-center gap-1 text-text-primary">
                  <CoinGlyph coin={token} /> {token}
                </span>
                {balances && <span className="tabular-nums">· you have {formatAmount(balances[token], token)}</span>}
              </span>
            </span>
            <button
              type="button"
              aria-label="More for the demo wallet"
              onClick={() => setMenu(true)}
              className="-mr-3 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={MoreVerticalIcon} size={20} />
            </button>
          </div>
          <p className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
            <TestnetDemoBadge />
            Checkout opens on the token you pay with, unless the wallet can’t cover it; you can pick the other one when you pay. A plan’s renewal isn’t charged on testnet.
          </p>
        </section>
      )}
      <section aria-labelledby="providers" className="flex flex-col gap-6">
        <h2 id="providers" className={cn(T.body, "text-center text-text-primary")}>
          Connect with one of our available wallet providers.
        </h2>
        <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
          <li>
            <button
              type="button"
              disabled={offlineConnect}
              aria-describedby={offlineConnect ? "connect-why" : undefined}
              onClick={() => (wallet.connected ? setManage(true) : setConnecting(true))}
              className={cn(LIST_ROW, "disabled:cursor-not-allowed disabled:hover:bg-transparent")}
            >
              <IdeezaLogo mark height={22} decorative />
              <span className={cn(T.body, "flex-1", offlineConnect ? "text-text-disabled" : "text-text-primary")}>Demo wallet</span>
              {wallet.connected ? (
                <span className={cn(T.caption, "inline-flex items-center gap-2 text-text-success")}>
                  <Icon icon={Tick02Icon} size={14} />
                  Connected
                </span>
              ) : (
                <TestnetDemoBadge />
              )}
              <Chevron disabled={offlineConnect} />
            </button>
          </li>
          {SOON_WALLETS.map((w) => (
            <li key={w} className={cn(LIST_ROW, "text-[color:var(--color-icon-disabled)] hover:bg-transparent")} title="Opens once real wallets can connect">
              <Icon icon={Wallet01Icon} size={24} />
              <span className={cn(T.body, "flex-1 text-text-disabled")}>{w}</span>
              <span className={cn(T.caption, "text-text-disabled")}>Soon</span>
            </li>
          ))}
        </ul>
        {offlineConnect ? (
          <p id="connect-why" className={T.caption}>
            {OFFLINE_REASON}
          </p>
        ) : (
          <p className={cn(T.meta, "text-text-tertiary")}>Real wallets open once they can connect. Until then the Demo wallet pays on testnet.</p>
        )}
      </section>

      <ConnectSheet
        open={connecting}
        onClose={() => setConnecting(false)}
        description="It becomes your payment method. This is the testnet demo wallet — test funds only, nothing is written to a real blockchain."
      />
      <DemoWalletSheet open={manage} onClose={() => setManage(false)} />
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title="Demo wallet"
        items={[
          { label: `Pay with IDZ${have("IDZ")}`, icon: token === "IDZ" ? Tick02Icon : Wallet02Icon, onSelect: () => choose("IDZ") },
          { label: `Pay with USDT${have("USDT")}`, icon: token === "USDT" ? Tick02Icon : Wallet02Icon, onSelect: () => choose("USDT") },
          { label: "Manage wallet", icon: Settings02Icon, onSelect: () => setManage(true) },
          { label: "Remove", icon: Delete02Icon, destructive: true, onSelect: () => setRemoving(true) },
        ]}
      />
      <ConfirmSheet
        open={removing}
        onClose={() => setRemoving(false)}
        title="Remove the demo wallet?"
        body="It disconnects from IDEEZA, so checkout asks you to connect a wallet again. Your test coins and past payments stay as they are."
        verb="Remove"
        destructive
        onConfirm={() => {
          const w = readWallet();
          if (persistWallet(walletDisconnect(w, makerId(w.account)))) toast({ title: "Demo wallet removed" });
          else toast({ title: "This browser couldn’t save it — storage is full or blocked.", lead: "error" });
        }}
      />
    </div>
  );
}

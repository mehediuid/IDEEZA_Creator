"use client";

// Payment method (/m/settings/payments; mobile Figma "Payment Method"). The
// web decides what can be saved (components/credits/payment-method-panel.tsx,
// lib/account/payment.ts): card and PayPal payments aren't on, and no real
// wallet connects yet, so the one method is Crypto from the Demo wallet. On
// the phone that is one screen, not the Figma's three tabs: your method
// first (the Demo wallet, Default, its address and network; Pay with — the
// token, with what the wallet holds — Manage wallet, Remove, asked first),
// or, with none, Connect demo wallet in the Bottom action bar; then the ways
// that aren't on yet (Credit card, PayPal, the real wallets) as info rows
// with their reason, nothing greyed pretending to be a control. Offline,
// connecting waits with its reason. Old `?tab=` links land here.

import * as React from "react";
import { CreditCardIcon, PaypalIcon, Settings02Icon, Delete02Icon, Wallet01Icon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
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
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { LIST_ROW, ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { EmptyState } from "../kit/state";
import { OfflineBanner, useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { OFFLINE_REASON, SectionHead, usePayBalances } from "./parts";

/** The real wallets the Figma lists: none connects yet (web D9), so each says Soon. */
const SOON_WALLETS = ["MetaMask", "Coinbase", "Fantom", "Trust", "Portis"] as const;

export function PaymentsScreen() {
  const wallet = useWalletStatus();
  const online = useOnline();
  const token = useDefaultToken();
  const balances = usePayBalances("baseSepolia");
  const toast = useToast();
  const [connecting, setConnecting] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const [manage, setManage] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const choose = (coin: PayToken) => {
    if (setDefaultToken(coin)) toast({ title: `You pay with ${coin}` });
    else toast({ title: "This browser couldn’t save the choice (storage is full or blocked).", lead: "error" });
  };
  const have = (coin: PayToken) => (balances ? `You have ${formatAmount(balances[coin], coin)}` : undefined);
  const offlineConnect = !wallet.connected && !online;

  return (
    <Screen
      top={<TopBar back="/m/settings" title="Payment method" />}
      className="px-8 pb-12"
      footer={
        wallet.connected ? undefined : (
          <BottomBar>
            {offlineConnect && (
              <p id="connect-why" className={T.caption}>
                {OFFLINE_REASON}
              </p>
            )}
            <Button size="xl" className="w-full" disabled={offlineConnect} aria-describedby={offlineConnect ? "connect-why" : undefined} onClick={() => setConnecting(true)}>
              Connect demo wallet
            </Button>
          </BottomBar>
        )
      }
    >
      <div className="flex flex-col gap-10 pt-4">
        <OfflineBanner />
        {wallet.connected ? (
          <section aria-labelledby="saved" className="flex flex-col gap-4">
            <SectionHead
              id="saved"
              infoTitle="Paying with the Demo wallet"
              info={
                <>
                  <p className={T.body}>Checkout opens on the token you pay with, unless the wallet can’t cover it; you can pick the other one when you pay. A plan’s renewal isn’t charged on testnet.</p>
                  <p className={cn(T.meta, "flex items-center gap-3")}>
                    <TestnetDemoBadge /> Test funds only.
                  </p>
                </>
              }
            >
              Saved
            </SectionHead>
            <ListCard label="Your payment method">
              <li className={cn(LIST_ROW, "hover:bg-transparent")}>
                <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
                  <Icon icon={Wallet02Icon} size={22} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-3">
                    <span className={cn(T.body, "text-text-primary")}>Demo wallet</span>
                    <Badge tone="success">Default</Badge>
                  </span>
                  <span className={cn(T.meta, "truncate")}>
                    <span className="font-mono">{wallet.short}</span> · {wallet.detail}
                  </span>
                </span>
                <TestnetDemoBadge />
              </li>
              <ListRow
                leading={<CoinGlyph coin={token} />}
                title="Pay with"
                meta={balances ? `You have ${formatAmount(balances[token], token)}` : undefined}
                value={token}
                onClick={() => setPicking(true)}
              />
              <ListRow icon={Settings02Icon} title="Manage wallet" onClick={() => setManage(true)} />
              <ListRow icon={Delete02Icon} title="Remove" danger onClick={() => setRemoving(true)} />
            </ListCard>
          </section>
        ) : (
          <EmptyState icon={Wallet01Icon} title="No saved payment method" body="You pay with test USDT or IDZ from the Demo wallet. Connect it to make it your payment method." />
        )}

        <section aria-labelledby="not-yet" className="flex flex-col gap-4">
          <SectionHead id="not-yet">Not available yet</SectionHead>
          <ListCard label="Not available yet">
            <ListRow icon={CreditCardIcon} title="Credit card" meta="Card payments aren’t available yet." trailing={<Badge tone="neutral">Soon</Badge>} />
            <ListRow icon={PaypalIcon} title="PayPal" meta="PayPal isn’t available yet." trailing={<Badge tone="neutral">Soon</Badge>} />
            <ListRow
              icon={Wallet01Icon}
              title={SOON_WALLETS.join(", ")}
              meta="Real wallets open once they can connect. Until then the Demo wallet pays on testnet."
              trailing={<Badge tone="neutral">Soon</Badge>}
            />
          </ListCard>
        </section>
      </div>

      <ConnectSheet
        open={connecting}
        onClose={() => setConnecting(false)}
        description="It becomes your payment method. This is the testnet demo wallet — test funds only, nothing is written to a real blockchain."
      />
      <DemoWalletSheet open={manage} onClose={() => setManage(false)} />
      <PickSheet
        open={picking}
        onClose={() => setPicking(false)}
        title="Pay with"
        value={token}
        options={(["IDZ", "USDT"] as const).map((c) => ({ value: c, label: c, helper: have(c) }))}
        onPick={choose}
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
    </Screen>
  );
}

"use client";

// Payment method (User Panel V2 › Payment Method 41549:161482 – 161873):
// "Payment method" with Add new payment, then each saved method as a row —
// its mark, what it is, Default, and a ⋮ menu — or "No saved payment method".
//
// Payments aren't on, so the one method that can be saved is Crypto from the
// Demo wallet: it is listed once the wallet is connected, as the default,
// with the token a checkout opens on (USDT or IDZ, switched from its menu).
// Add new payment lists Card and PayPal as not available yet and connects the
// Demo wallet through the wallet's own dialog.

import * as React from "react";
import { CreditCardIcon, EthereumIcon, MoreVerticalIcon, PaypalIcon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, Menu, ModalFrame, TestnetDemoBadge } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { setDefaultToken, useDefaultToken, type PayToken } from "@/lib/account/payment";
import { cn } from "@/lib/utils";
import { CHOICE, CHOICE_OFF, CoinGlyph, useWalletStatus } from "./payment-picker";

export function PaymentMethodPanel() {
  const wallet = useWalletStatus();
  const { openManage } = useWalletRequest();
  const token = useDefaultToken();
  const [adding, setAdding] = React.useState(false);
  const [refused, setRefused] = React.useState(false);

  const choose = (coin: PayToken) => setRefused(!setDefaultToken(coin));

  return (
    <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-[24px]">
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <h2 className="text-2xl font-semibold leading-2xl text-text-primary">Payment method</h2>
        <Button hierarchy="primary" size="lg" aria-haspopup="dialog" onClick={() => setAdding(true)}>
          Add new payment
        </Button>
      </div>

      {wallet.connected ? (
        <ul role="list" className="flex flex-col gap-[16px]">
          <li className="flex flex-wrap items-center gap-[16px] rounded-xl bg-bg-subtle p-[16px]">
            <span aria-hidden className="inline-flex h-[40px] w-[64px] items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
              <Icon icon={Wallet02Icon} size={24} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <p className="text-lg leading-lg text-text-primary">
                Demo wallet <span className="font-mono">{wallet.short}</span>
              </p>
              <p className="flex flex-wrap items-center gap-[8px] text-md leading-md text-text-secondary">
                {wallet.detail} · Pays in
                <span className="inline-flex items-center gap-[4px] text-text-primary">
                  <CoinGlyph coin={token} /> {token}
                </span>
                <TestnetDemoBadge />
              </p>
            </div>
            <Badge tone="success">Default</Badge>
            <Menu
              label="Payment method actions"
              align="end"
              items={[
                { id: "manage", label: "Manage wallet", onSelect: openManage },
                { id: "idz", label: "Pay in IDZ by default", selected: token === "IDZ", onSelect: () => choose("IDZ") },
                { id: "usdt", label: "Pay in USDT by default", selected: token === "USDT", onSelect: () => choose("USDT") },
              ]}
              trigger={(props) => (
                <button
                  {...props}
                  type="button"
                  aria-label="More for the demo wallet"
                  className="inline-flex size-[40px] items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-bg-surface hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
                >
                  <Icon icon={MoreVerticalIcon} size={20} />
                </button>
              )}
            />
          </li>
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-[12px] py-[80px] text-center">
          <span aria-hidden className="text-text-tertiary">
            <Icon icon={Wallet02Icon} size={28} />
          </span>
          <p className="text-lg leading-lg text-text-primary">No saved payment method</p>
          <Button hierarchy="primary" size="lg" aria-haspopup="dialog" onClick={() => setAdding(true)}>
            Add new payment
          </Button>
        </div>
      )}

      {refused && (
        <p role="alert" className="text-sm leading-sm text-text-error">
          This browser couldn&apos;t save the choice (storage is full or blocked).
        </p>
      )}
      <p className="text-md leading-md text-text-tertiary">
        Checkout opens on your default token; you can pick the other one when you pay. A plan&apos;s renewal isn&apos;t charged on
        testnet.
      </p>

      {adding && (
        <AddPaymentDialog
          connected={wallet.connected}
          onClose={() => setAdding(false)}
          onConnect={() => {
            setAdding(false);
            openManage();
          }}
        />
      )}
    </div>
  );
}

function AddPaymentDialog({ connected, onClose, onConnect }: { connected: boolean; onClose: () => void; onConnect: () => void }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  return (
    <ModalFrame open onClose={onClose} title="Add payment method" size="sm" initialFocus={ref}>
      <ul role="list" className="flex flex-col gap-[12px]">
        {(
          [
            ["Card", CreditCardIcon],
            ["PayPal", PaypalIcon],
          ] as const
        ).map(([m, icon]) => (
          <li key={m} className={cn(CHOICE, CHOICE_OFF, "cursor-not-allowed hover:bg-bg-subtle")}>
            <span aria-hidden className="text-text-disabled">
              <Icon icon={icon} size={24} />
            </span>
            <span className="flex-1 text-lg leading-lg text-text-disabled">{m}</span>
            <span className="text-md leading-md text-text-tertiary">Not available yet</span>
          </li>
        ))}
        <li className={cn(CHOICE, "border-border-brand bg-bg-brand-subtle")}>
          <span aria-hidden className="text-text-brand">
            <Icon icon={EthereumIcon} size={24} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-lg leading-lg text-text-primary">Crypto · Demo wallet</span>
            <span className="text-sm leading-sm text-text-secondary">Test USDT or IDZ on testnet</span>
          </span>
          <Button ref={ref} hierarchy="primary" size="md" onClick={onConnect}>
            {connected ? "Manage" : "Connect"}
          </Button>
        </li>
      </ul>
    </ModalFrame>
  );
}

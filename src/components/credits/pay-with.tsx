"use client";

// Pay with — a section of Settings › Plan & billing (#pay-with), from User
// Panel V2 › Payment Method (41549:161482 – 161873): each saved way to pay as
// a row (its mark, what it is, Default, and a ⋮ menu), or "No saved payment
// method"; Add payment method on the card's header.
//
// Payments aren't on, so the one method that can be saved is Crypto from the
// Demo wallet: it is listed once the wallet is connected, as the default,
// with the token you pay with (USDT or IDZ, switched from its menu). "Pay
// with" is the spending side; Get paid's "Get paid in" is the earning one (D14).
// Add payment method lists Card and PayPal as not available yet and connects
// the Demo wallet through the wallet's own dialog.

import * as React from "react";
import { CreditCardIcon, EthereumIcon, MoreVerticalIcon, PaypalIcon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, Menu, ModalFrame, TestnetDemoBadge } from "@/components/ideeza";
import { SettingsCard, SettingsRow } from "@/components/settings/settings-card";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { setDefaultToken, useDefaultToken, type PayToken } from "@/lib/account/payment";
import { PLAN_SECTIONS } from "@/lib/create/credit-pricing";
import { cn } from "@/lib/utils";
import { CHOICE, CHOICE_OFF, CoinGlyph, useWalletStatus } from "./payment-picker";

export function PayWithCard() {
  const wallet = useWalletStatus();
  const { openManage } = useWalletRequest();
  const token = useDefaultToken();
  const [adding, setAdding] = React.useState(false);
  const [refused, setRefused] = React.useState(false);

  const choose = (coin: PayToken) => setRefused(!setDefaultToken(coin));

  return (
    <SettingsCard
      id={PLAN_SECTIONS.payWith}
      title="Pay with"
      description="What checkout pays plans and credits with. Card and PayPal aren't available yet."
      action={
        <Button
          hierarchy="outline-brand"
          size="sm"
          aria-haspopup="dialog"
          className="[@media(pointer:coarse)]:h-[var(--touch-min)]"
          onClick={() => setAdding(true)}
        >
          Add payment method
        </Button>
      }
    >
      {wallet.connected ? (
        <SettingsRow
          label={
            <span className="inline-flex items-center gap-[10px]">
              <span aria-hidden className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
                <Icon icon={Wallet02Icon} size={16} />
              </span>
              <span>
                Demo wallet <span className="font-mono">{wallet.short}</span>
              </span>
            </span>
          }
          help={
            <span className="inline-flex flex-wrap items-center gap-[6px]">
              {wallet.detail} · Pays in
              <span className="inline-flex items-center gap-[4px] text-text-primary">
                <CoinGlyph coin={token} /> {token}
              </span>
              <TestnetDemoBadge />
            </span>
          }
          control={
            <>
              <Badge tone="success">Default</Badge>
              <Menu
                label="Payment method actions"
                align="end"
                items={[
                  { id: "manage", label: "Manage wallet", onSelect: openManage },
                  { id: "idz", label: "Pay with IDZ", selected: token === "IDZ", onSelect: () => choose("IDZ") },
                  { id: "usdt", label: "Pay with USDT", selected: token === "USDT", onSelect: () => choose("USDT") },
                ]}
                trigger={(props) => (
                  <button
                    {...props}
                    type="button"
                    aria-label="More for the demo wallet"
                    className="inline-flex size-[36px] items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:size-[var(--touch-min)]"
                  >
                    <Icon icon={MoreVerticalIcon} size={16} />
                  </button>
                )}
              />
            </>
          }
        />
      ) : (
        <SettingsRow
          label="No saved payment method"
          help="Add the Demo wallet to pay for a plan or credits. It pays in test USDT or IDZ, on testnet."
        />
      )}
      {refused && (
        <p role="alert" className="m-0 mt-[8px] text-sm leading-sm text-text-error">
          This browser couldn&apos;t save the choice (storage is full or blocked). Nothing changed.
        </p>
      )}
      <p className="m-0 mt-[12px] max-w-[62ch] text-sm leading-sm text-text-tertiary">
        Checkout opens on the token you pay in, and you can pick the other one when you pay. A plan&apos;s renewal isn&apos;t charged on
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
    </SettingsCard>
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
            <span className="flex-1 text-md leading-md text-text-disabled">{m}</span>
            <span className="text-sm leading-sm text-text-tertiary">Not available yet</span>
          </li>
        ))}
        <li className={cn(CHOICE, "border-border-brand bg-bg-brand-subtle")}>
          <span aria-hidden className="text-text-brand">
            <Icon icon={EthereumIcon} size={24} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-md font-medium leading-md text-text-primary">Crypto · Demo wallet</span>
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

"use client";

// Balance › Overview (Figma User Panel V2 41571:126260; spec
// 2026-10-19-balance-overview-design.md): the IDZ balance of the connected
// demo account, and every IDZ movement. It sits in the V2 sheet with the
// breadcrumb on its first line, as Plan & pricing does.
//
// The card (41571:126270): the network select is the demo wallet's own
// network, so choosing one switches the wallet; the amount and "= $…" read
// the one IDZ price; the token address is the demo IDZ contract on that
// network. Buy and Stake are the next two steps of this feature and say so;
// Import opens the token's details. Not connected: the card offers Connect
// wallet and the page shows the Figma's empty state with the same button.

import * as React from "react";
import NextLink from "next/link";
import { MoneyBag01Icon, PackageIcon, ShoppingBasket02Icon, Upload01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { PricingFrame } from "@/components/credits/pricing-frame";
import { Button, Select, Skeleton, linkVariants } from "@/components/ideeza";
import { CopyButton, useCopy, useWalletClock } from "@/components/wallet/wallet-dialog";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { CREDITS_HREF } from "@/lib/create/credit-pricing";
import { useMarket } from "@/lib/market/market-store";
import { makerId, shortAddress, walletSwitchNetwork, readWallet } from "@/lib/wallet/demo-wallet";
import { idzContractOf, idzHoldingsOf, idzLedgerOf, idzUsdOf } from "@/lib/wallet/idz";
import { formatAmount } from "@/lib/wallet/money";
import { useDemoWallet, writeDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { IdzActivity } from "./idz-activity";
import { IdzCoin } from "./idz-coin";
import { ImportTokenDialog } from "./import-token-dialog";
import { TipButton } from "./tip-button";

const SOON = "Opens in the next step of Balance.";

export function BalanceOverview() {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useWalletClock();
  const { openManage } = useWalletRequest();
  const [importing, setImporting] = React.useState(false);

  const id = wallet ? makerId(wallet.account) : null;
  const state = wallet && id ? wallet.identities[id] : undefined;
  const connected = !!state?.connected;
  const network: Network = state?.network ?? "baseSepolia";

  const actions = (
    <div className="flex items-center gap-[6px]">
      <TipButton label="Buy Ideeza Coin" soon={SOON} icon={<Icon icon={ShoppingBasket02Icon} size={20} />} />
      <TipButton label="Stake" soon={SOON} icon={<Icon icon={MoneyBag01Icon} size={20} />} />
      <TipButton
        label="Import IDZ token into Wallet"
        icon={<Icon icon={Upload01Icon} size={20} />}
        onPress={() => setImporting(true)}
      />
    </div>
  );

  return (
    <PricingFrame crumbs={[{ label: "Balance" }, { label: "Overview" }]}>
      <h1 className="sr-only">Balance</h1>
      <div className="flex flex-col gap-[24px]">
        {!wallet ? (
          <div className="flex flex-col gap-[24px] rounded-xl bg-bg-page p-[24px]" aria-busy="true">
            <Skeleton shape="block" className="h-[32px] w-[160px]" />
            <Skeleton shape="block" className="h-[36px] w-[240px]" />
          </div>
        ) : connected && id ? (
          <ConnectedCard
            network={network}
            onNetwork={(n) => writeDemoWallet(walletSwitchNetwork(readWallet(), makerId(readWallet().account), n))}
            amount={idzHoldingsOf(wallet, id, { wallet, market, now })}
            actions={actions}
          />
        ) : (
          // Figma 41571:114057: "Current Balance" and Connect Wallet in place of the amount.
          <div className="flex flex-wrap items-start justify-between gap-[16px] rounded-xl bg-bg-page p-[24px]">
            <div className="flex flex-col items-start gap-[8px]">
              <span className="text-md leading-md text-text-secondary">Current Balance</span>
              <Button hierarchy="secondary" size="md" onClick={openManage}>
                Connect wallet
              </Button>
            </div>
            {actions}
          </div>
        )}

        <AboutIdz />

        {!wallet ? null : connected && id ? (
          <IdzActivity rows={idzLedgerOf(wallet, id)} />
        ) : (
          // Figma 41571:128609: the empty state, with the way out it was missing.
          <div className="flex flex-col items-center gap-[12px] py-[64px] text-center">
            <span aria-hidden className="text-text-tertiary">
              <Icon icon={PackageIcon} size={28} />
            </span>
            <p className="text-lg leading-lg text-text-secondary">
              No data found.
              <br />
              Please Connect Your Wallet.
            </p>
            <Button hierarchy="primary" size="lg" onClick={openManage}>
              Connect wallet
            </Button>
          </div>
        )}
      </div>
      <ImportTokenDialog open={importing} network={network} onClose={() => setImporting(false)} />
    </PricingFrame>
  );
}

function ConnectedCard({
  network,
  onNetwork,
  amount,
  actions,
}: {
  network: Network;
  onNetwork: (n: Network) => void;
  amount: ReturnType<typeof idzHoldingsOf>;
  actions: React.ReactNode;
}) {
  const { copied, copy } = useCopy();
  const contract = idzContractOf(network);
  const parts: { label: string; value: string }[] = [
    { label: "Available", value: amount.available },
    { label: "Staked", value: amount.staked },
    { label: "Ready to claim", value: amount.claimable },
    { label: "Pending", value: amount.pending },
  ];
  return (
    <div className="flex flex-col gap-[24px] rounded-xl bg-bg-page p-[24px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <Select
          aria-label="Network"
          size="md"
          minWidth={140}
          value={network}
          onChange={(v) => onNetwork(v as Network)}
          options={NETWORKS.map((n) => ({ label: n.label, value: n.value }))}
        />
        {actions}
      </div>
      <div className="flex flex-col gap-[8px]">
        <p className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
          <IdzCoin height={36} />
          <span className="text-4xl font-semibold leading-4xl tabular-nums text-text-brand">
            {formatAmount(amount.available, "IDZ")}
          </span>
          <span className="text-lg font-semibold leading-lg tabular-nums text-text-secondary">= {idzUsdOf(amount.available)}</span>
        </p>
        <dl className="flex flex-wrap gap-x-[16px] gap-y-[4px] text-sm leading-xs">
          {parts.map((p) => (
            <div key={p.label} className="flex items-center gap-[4px]">
              <dt className="text-text-secondary">{p.label}</dt>
              <dd className="font-semibold tabular-nums text-text-primary">{formatAmount(p.value, "IDZ")}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-[4px]">
          <span
            title={contract}
            className="inline-flex h-[24px] items-center gap-[4px] rounded-lg bg-bg-surface px-[8px] text-sm font-medium leading-xs tabular-nums text-text-secondary"
          >
            Token Address : <span aria-hidden>{shortAddress(contract)}</span>
            <span className="sr-only">{contract}</span>
          </span>
          <CopyButton
            label="Copy token address"
            done={copied?.what === "contract"}
            onPress={() => copy("contract", contract, "Token address copied")}
          />
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {copied?.text ?? ""}
      </p>
    </div>
  );
}

/** N3 + N4: what IDZ is next to credits, and where sale money lives. */
function AboutIdz() {
  const link = linkVariants({ color: "brand", size: "lg" });
  return (
    <div className="flex flex-col gap-[4px] text-md leading-md text-text-secondary">
      <p className="max-w-[62ch]">
        IDZ is IDEEZA&apos;s own coin. It pays an instant mint&apos;s fee and can pay for AI credits; your credits are a
        separate balance. <NextLink href={CREDITS_HREF} className={link}>Buy credits with IDZ</NextLink>
      </p>
      <p className="max-w-[62ch]">
        Money from selling your projects is on each project&apos;s Earn › Money.{" "}
        <NextLink href="/projects" className={link}>My projects</NextLink>
      </p>
    </div>
  );
}

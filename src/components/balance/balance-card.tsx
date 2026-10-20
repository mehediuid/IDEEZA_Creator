"use client";

// The balance card every Balance page shares (Figma Overview 41571:126270,
// Buy IDZ Token 41571:113547): the network select is the demo wallet's own
// network, so choosing one switches the wallet; the amount and "= $…" read
// the one IDZ price; the holdings line (N1) splits what is free from what
// the presale holds; the token address is the demo IDZ contract on that
// network. Each page brings its own actions. Not connected (41571:114057):
// "Current Balance" and Connect wallet in place of the amount, and the
// page's empty state says the same with the same button.

import * as React from "react";
import { PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Select, Skeleton } from "@/components/ideeza";
import { CopyButton, useCopy } from "@/components/wallet/wallet-dialog";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { makerId, readWallet, shortAddress, walletSwitchNetwork } from "@/lib/wallet/demo-wallet";
import { idzContractOf, idzUsdOf, type IdzHoldings } from "@/lib/wallet/idz";
import { formatAmount } from "@/lib/wallet/money";
import { writeDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { IdzCoin } from "./idz-coin";

const CARD = "rounded-xl bg-bg-page p-[24px]";

/** Switches the current demo account's network: the card's select is the wallet's own. */
export function switchMakerNetwork(n: Network) {
  const w = readWallet();
  writeDemoWallet(walletSwitchNetwork(w, makerId(w.account), n));
}

export function BalanceCardSkeleton() {
  return (
    <div className={`flex flex-col gap-[24px] ${CARD}`} aria-busy="true">
      <Skeleton shape="block" className="h-[32px] w-[160px]" />
      <Skeleton shape="block" className="h-[36px] w-[240px]" />
    </div>
  );
}

export function BalanceCard({
  network,
  holdings,
  actions,
  label,
}: {
  network: Network;
  holdings: IdzHoldings;
  actions: React.ReactNode;
  /** "Current Balance" over the amount, where the page's Figma has it. */
  label?: string;
}) {
  const { copied, copy } = useCopy();
  const contract = idzContractOf(network);
  const parts: { label: string; value: string }[] = [
    { label: "Available", value: holdings.available },
    { label: "Staked", value: holdings.staked },
    { label: "Ready to claim", value: holdings.claimable },
    { label: "Pending", value: holdings.pending },
  ];
  return (
    <div className={`flex flex-col gap-[24px] ${CARD}`}>
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <Select
          aria-label="Network"
          size="md"
          minWidth={140}
          value={network}
          onChange={(v) => switchMakerNetwork(v as Network)}
          options={NETWORKS.map((n) => ({ label: n.label, value: n.value }))}
        />
        {actions}
      </div>
      <div className="flex flex-col gap-[8px]">
        {label && <span className="text-md leading-md text-text-secondary">{label}</span>}
        <p className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
          <IdzCoin height={36} />
          <span className="text-4xl font-semibold leading-4xl tabular-nums text-text-brand">
            {formatAmount(holdings.available, "IDZ")}
          </span>
          <span className="text-lg font-semibold leading-lg tabular-nums text-text-secondary">= {idzUsdOf(holdings.available)}</span>
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

/** Figma 41571:114057: "Current Balance" and Connect wallet where the amount goes. */
export function NotConnectedCard({ actions, onConnect }: { actions: React.ReactNode; onConnect: () => void }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-[16px] ${CARD}`}>
      <div className="flex flex-col items-start gap-[8px]">
        <span className="text-md leading-md text-text-secondary">Current Balance</span>
        <Button hierarchy="secondary" size="md" onClick={onConnect}>
          Connect wallet
        </Button>
      </div>
      {actions}
    </div>
  );
}

/** The Figma's empty state (41571:128609, 114057), with the way out it was missing (B7). */
export function ConnectEmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center gap-[12px] py-[64px] text-center">
      <span aria-hidden className="text-text-tertiary">
        <Icon icon={PackageIcon} size={28} />
      </span>
      <p className="text-lg leading-lg text-text-secondary">
        No data found.
        <br />
        Please Connect Your Wallet.
      </p>
      <Button hierarchy="primary" size="lg" onClick={onConnect}>
        Connect wallet
      </Button>
    </div>
  );
}

"use client";

// "Import IDZ token into Wallet" (Figma tooltip 41571:127654). A wallet app
// shows a token once it knows the token's contract, symbol and decimals, so
// the dialog gives those, each with a copy button. Adding it to MetaMask in
// one step needs a real wallet connection; today only the Demo wallet
// connects, so that button says why it is off rather than doing nothing.

import * as React from "react";
import { Button, ModalFrame, TestnetDemoBadge } from "@/components/ideeza";
import { CopyButton, useCopy } from "@/components/wallet/wallet-dialog";
import type { Network } from "@/lib/brief/types";
import { IDZ_TOKEN, idzContractOf } from "@/lib/wallet/idz";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { IdzCoin } from "./idz-coin";

export function ImportTokenDialog({ open, network, onClose }: { open: boolean; network: Network; onClose: () => void }) {
  const { copied, copy } = useCopy();
  const contract = idzContractOf(network);
  const rows: { what: string; label: string; value: string; mono?: boolean }[] = [
    { what: "contract", label: "Token contract address", value: contract, mono: true },
    { what: "symbol", label: "Token symbol", value: IDZ_TOKEN.symbol },
    { what: "decimals", label: "Token decimals", value: String(IDZ_TOKEN.decimals) },
  ];
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      sheet
      title="Import IDZ token into Wallet"
      description="Add IDZ to your wallet app so it shows your balance there."
      footer={
        <div className="flex flex-wrap items-center justify-end gap-[8px]">
          <Button
            hierarchy="secondary"
            size="lg"
            disabled
            title="Works once a real wallet can connect. Today only the Demo wallet connects."
          >
            Add to MetaMask
          </Button>
          <Button hierarchy="primary" size="lg" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[16px]">
        <div className="flex items-center gap-[12px] rounded-xl bg-bg-subtle p-[12px]">
          <IdzCoin height={32} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-md font-semibold leading-md text-text-primary">{IDZ_TOKEN.name}</span>
            <span className="text-sm leading-xs text-text-secondary">{networkLabelOf(network)}</span>
          </div>
          <TestnetDemoBadge />
        </div>
        <dl className="flex flex-col gap-[12px]">
          {rows.map((r) => (
            <div key={r.what} className="flex flex-col gap-[4px]">
              <dt className="text-sm font-medium leading-xs text-text-secondary">{r.label}</dt>
              <dd className="flex items-center justify-between gap-[8px] rounded-lg border border-solid border-border px-[12px] py-[4px]">
                <span className={r.mono ? "min-w-0 break-all font-mono text-md leading-md text-text-primary" : "text-md leading-md text-text-primary"}>
                  {r.value}
                </span>
                <CopyButton
                  label={`Copy ${r.label.toLowerCase()}`}
                  done={copied?.what === r.what}
                  onPress={() => copy(r.what, r.value, `${r.label} copied`)}
                />
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm leading-sm text-text-secondary">
          In your wallet app, choose Import tokens, pick {networkLabelOf(network)}, and paste the contract address. The
          symbol and decimals fill in from it. Adding it to MetaMask in one step opens once real wallets can connect;
          today only the Demo wallet does.
        </p>
        <p role="status" aria-live="polite" className="sr-only">
          {copied?.text ?? ""}
        </p>
      </div>
    </ModalFrame>
  );
}

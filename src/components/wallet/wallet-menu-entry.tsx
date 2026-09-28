"use client";

// The wallet's one standing entry (P2-MINT-2): a row in the account menu of
// whichever chrome the page has — the dashboard sidebar's "Wallet & tokens",
// or the editor TopBar's profile dropdown. The two chromes never render
// together, so a page has one entry.
//
// | not read     | "Wallet"                 | —                                                        |
// | disconnected | "Connect wallet"         | [Testnet demo]                                           |
// | connected    | "Connected: 0x955d…ed95" | "Demo account 1 · Base Sepolia (Testnet)" [Testnet demo] |
//
// Pressing it closes the menu (`onOpen`, the menu's own business — it also
// moves focus to the menu's button, where the dialog hands focus back when
// it closes, since the entry itself goes with the menu) and opens the Demo
// wallet dialog.

import * as React from "react";
import { Wallet01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { TestnetDemoBadge } from "@/components/ideeza";
import { menuEntryOf } from "@/lib/wallet/request-view";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { useWalletRequest } from "./wallet-provider";

export function WalletMenuEntry({
  onOpen,
  variant = "sidebar",
}: {
  /** Closes the menu the entry sits in, before the dialog opens. */
  onOpen?: () => void;
  /** "sidebar": a sub-row under "Wallet & tokens". "dropdown": a featured row with its icon. */
  variant?: "sidebar" | "dropdown";
}) {
  const wallet = useDemoWallet();
  const { openManage } = useWalletRequest();
  const text = menuEntryOf(wallet);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onOpen?.();
        openManage();
      }}
      className={cn(
        "flex w-full items-center gap-[12px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
        // 44 px at phone width and on a coarse pointer; the two lines already clear it.
        "min-h-[var(--touch-min)]",
        variant === "sidebar"
          ? "px-[20px] py-[12px] hover:bg-bg-brand-subtle focus-visible:bg-bg-brand-subtle"
          : "rounded-md px-[12px] py-[10px] hover:bg-bg-surface-raised focus-visible:bg-bg-surface-raised",
      )}
    >
      {variant === "dropdown" && (
        <span aria-hidden className="shrink-0 text-text-secondary">
          <Icon icon={Wallet01Icon} size={20} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-[2px]">
        <span
          className={cn(
            "max-w-full truncate text-text-primary",
            variant === "sidebar" ? "text-md font-regular" : "text-sm font-bold",
          )}
        >
          {text.title}
        </span>
        {(text.detail || text.demo) && (
          <span className="flex max-w-full flex-wrap items-center gap-x-[6px] gap-y-[2px] text-xs font-regular text-text-tertiary">
            {text.detail && <span className="min-w-0">{text.detail}</span>}
            {text.demo && <TestnetDemoBadge />}
          </span>
        )}
      </span>
    </button>
  );
}

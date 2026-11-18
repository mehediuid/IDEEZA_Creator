"use client";

// The ⋯ every Earn Coin screen has in its top bar (the Figma draws it, not
// its menu): an M12 action sheet with Wallet balance and the Demo wallet, and
// any rows the screen adds (prototype-only demo controls say "Demo").

import * as React from "react";
import { useRouter } from "next/navigation";
import { Wallet01Icon, Coins01Icon } from "@hugeicons/core-free-icons";
import { ActionSheet, type ActionSheetItem } from "../kit/sheet";
import { MORE_ICON, type TopBarAction } from "../top-bar";
import { DemoWalletSheet } from "./parts";

export function useEarnMenu({ wallet = true, extra = [] }: { wallet?: boolean; extra?: ActionSheetItem[] } = {}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [demo, setDemo] = React.useState(false);
  const items: ActionSheetItem[] = [
    ...(wallet ? [{ label: "Wallet balance", icon: Coins01Icon, onSelect: () => router.push("/m/earn/wallet") }] : []),
    { label: "Demo wallet", icon: Wallet01Icon, onSelect: () => setDemo(true) },
    ...extra,
  ];
  const action: TopBarAction = { icon: MORE_ICON, label: "More", onClick: () => setOpen(true) };
  const node = (
    <>
      <ActionSheet open={open} onClose={() => setOpen(false)} title="Earn Coin" items={items} />
      <DemoWalletSheet open={demo} onClose={() => setDemo(false)} />
    </>
  );
  return { action, node };
}

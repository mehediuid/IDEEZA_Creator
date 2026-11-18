"use client";

// The phone's wallet for everything under it. The web's money hooks
// (`useMint`, `usePurchase`, `useEditionPurchase`, `usePlaceBid`, the listing
// and copies flows) ask `useWalletRequest()` for the wallet; inside this scope
// they get the phone's bottom sheet (earn-coin/wallet-sheet.tsx, KIT-WS-01…05)
// instead of the web's centred dialog, and `openManage` opens the Demo wallet
// sheet. So the phone signs through the web's own requests and writes.

import * as React from "react";
import { WalletRequestScope, type WalletRequestApi } from "@/components/wallet/wallet-provider";
import { DemoWalletSheet } from "../earn-coin/parts";
import { useWalletSheet } from "../earn-coin/wallet-sheet";

export function PhoneWalletScope({ children }: { children: React.ReactNode }) {
  const { request, sheet, busy } = useWalletSheet();
  const [manage, setManage] = React.useState(false);
  const api = React.useMemo<WalletRequestApi>(() => ({ request, openManage: () => setManage(true), dialogOpen: busy || manage }), [request, busy, manage]);
  return (
    <WalletRequestScope api={api}>
      {children}
      {sheet}
      <DemoWalletSheet open={manage} onClose={() => setManage(false)} />
    </WalletRequestScope>
  );
}

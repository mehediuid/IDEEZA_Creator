"use client";

// The current demo account's IDZ, live, for the sidebar's wallet button and
// Wallet menu (the Figma's navbar "Balance: 50 $IDZ"). `null` until the
// wallet is read, and while it isn't connected: a balance shows only for a
// connected wallet, as on the Balance page.

import { useWalletClock } from "@/components/wallet/wallet-dialog";
import { useMarket } from "@/lib/market/market-store";
import { demoAddress, makerId } from "@/lib/wallet/demo-wallet";
import { idzHoldingsOf } from "@/lib/wallet/idz";
import type { Amount } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";

export type MakerIdz = { read: boolean; connected: boolean; address: string | null; idz: Amount | null };

export function useMakerIdz(): MakerIdz {
  const wallet = useDemoWallet();
  const { data: market } = useMarket();
  const now = useWalletClock();
  if (!wallet) return { read: false, connected: false, address: null, idz: null };
  const id = makerId(wallet.account);
  if (!wallet.identities[id]?.connected) return { read: true, connected: false, address: null, idz: null };
  return { read: true, connected: true, address: demoAddress(id), idz: idzHoldingsOf(wallet, id, { wallet, market, now }).available };
}

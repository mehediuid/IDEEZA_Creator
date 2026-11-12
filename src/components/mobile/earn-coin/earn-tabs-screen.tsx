"use client";

// Earn Coin's three tabs — Buy $IDZ · Stake · Refer & Earn (M14) — as one
// screen. /m/earn/buy, /m/earn/stake and /m/earn/refer all render it, so a
// tap on a tab only swaps the panel: no navigation, no server round trip, and
// it works offline. The address follows by history.replaceState (parts.tsx ›
// useEarnTab), so a reload or a shared link opens the same tab.

import { BuyTab } from "./buy-tab";
import { EarnTabContext, useEarnTab } from "./parts";
import { ReferTab } from "./refer-tab";
import { StakeTab } from "./stake-tab";

export function EarnTabsScreen() {
  const [tab, setTab] = useEarnTab();
  return (
    <EarnTabContext.Provider value={{ tab, setTab }}>
      {tab === "buy" ? <BuyTab /> : tab === "stake" ? <StakeTab /> : <ReferTab />}
    </EarnTabContext.Provider>
  );
}

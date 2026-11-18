"use client";

// What every Earn screen on the phone reads: the project page's one derivation
// (`useProjectPageData`, the owner's "project" context), the commercial state
// the header's pill says, and the screen's polite live region (`announce`).
// The same props the web's Earn tabs get (SlotProps), so the web's helpers take
// them as they are.
//
// Earn's own screen (the hub and its pushed Sell · Business plan · Money) also
// hands down its frame: `footEl`, the foot a section's BottomBar portals into
// (`EarnBar`), `setTopActions`, the top bar's right slot (`useEarnTopActions`),
// and `openSection`, which opens a section in place. All three are absent on
// the mint, which has a frame of its own.

import * as React from "react";
import type { CommercialState } from "@/lib/commerce/state";
import type { EarnSection } from "@/lib/manual/earn-route";
import type { Ready } from "../project/context";
import type { TopBarAction } from "../top-bar";

export type EarnCtx = Ready & {
  commercial: CommercialState;
  /** Says a change in the screen's live region (a fix done in place, a listing written). */
  announce: (message: string) => void;
  /** The screen's foot, where the open section's one primary goes (`EarnBar`). */
  footEl?: HTMLElement | null;
  /** The top bar's right slot for the open section (`useEarnTopActions`). */
  setTopActions?: (actions: TopBarAction[]) => void;
  /** Opens a section of Earn in place (`/earn/<section>`, pushed, no fetch), `hash` scrolled to. */
  openSection?: (section: EarnSection, hash?: string) => void;
};

const Ctx = React.createContext<EarnCtx | null>(null);
export const EarnProvider = Ctx.Provider;

export function useEarn(): EarnCtx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useEarn outside an Earn screen");
  return v;
}

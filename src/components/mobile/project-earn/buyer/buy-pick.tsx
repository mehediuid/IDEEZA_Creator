"use client";

// The phone's buy box and its bar (owner 2026-11-22, "Yes, build A" on study Uq1VPBrq9Jjez6jeWwEkjz):
// the web's Marketplace box (Main NFT / Physical NFT / Virtual NFT tabs, a Use choice, one Buy now) in a
// phone's form. Every buyer screen that sells more than one thing uses these parts:
// · PickTabs — Main NFT · Physical NFT · Virtual NFT (the web's tab names, only what the screen sells),
//   the kit's M14 tabs inside
//   the box, one panel at a time;
// · Choice — a radio row: a use (Personal use / Business use) or another holder's copy, its price on the
//   right, what it gets and how many are sold under it; a use that can't be bought stays, greyed, with
//   why ("Sold out", "Not on sale"). No row has a Buy of its own;
// · PickBar — the sticky bar: what is picked and its price ("Physical NFT · Personal use", "0.02 ETH · makes
//   1 unit") with Change, which brings the box back into view, then Ask the creator as a chat icon beside
//   the one primary (Buy now, Place bid, Manage…). It always says what its button buys, so a press never
//   buys something the buyer didn't see. Nothing to buy: Ask the creator alone, as the primary.
// The wallet sheet says it too (D4): a request's title names what is bought (buyTitleOf).

import * as React from "react";
import Link from "next/link";
import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { scrollWithin } from "@/components/create/anchors";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { PICK_TAB_LABEL, type PickTab } from "@/lib/market/buy-pick";
import type { WalletRequest } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { BottomBar, TEXT_LINK } from "../../kit/bottom-bar";
import { MobileTabs } from "../../kit/tabs";
import { T } from "../../type";

/** The box's id: Change on the bar (and a link's `?nft=`) brings it into view by it. */
export const BUY_BOX_ID = "buy-box";

/** A wallet request titled with what it buys (D4), in place of the builder's "Confirm purchase". */
export function titled(req: WalletRequest, title: string | null): WalletRequest {
  return title ? { ...req, title } : req;
}

/** Bring the box into view inside the screen's scroller and put focus on its picked tab. */
export function revealBuyBox(behavior: ScrollBehavior = "smooth"): void {
  const box = document.getElementById(BUY_BOX_ID);
  if (!box) return;
  scrollWithin(box, "start", behavior);
  box.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true });
}

/** Main NFT · Physical NFT · Virtual NFT, only the tabs the screen sells; one tab draws nothing. */
export function PickTabs({ tabs, value, onChange, idBase }: { tabs: readonly PickTab[]; value: PickTab; onChange: (t: PickTab) => void; idBase: string }) {
  if (tabs.length < 2) return null;
  return <MobileTabs label="What to buy" idBase={idBase} value={value} onChange={onChange} tabs={tabs.map((t) => ({ value: t, label: PICK_TAB_LABEL[t] }))} />;
}

/** A group of choices with its small heading ("Use", "From holders · 1") and an optional line under it. */
export function ChoiceGroup({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <div role="radiogroup" aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span id={id} className={cn(T.label, "tabular-nums")}>
          {label}
        </span>
        {note && <span className={T.caption}>{note}</span>}
      </div>
      {children}
    </div>
  );
}

/** One choice as a radio row: its title and price, what it gets under them; greyed with why when it can't be bought. */
export function Choice({
  name,
  checked,
  disabled,
  onSelect,
  title,
  price,
  aside,
  children,
}: {
  /** The radio group's name: one per tab. */
  name: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  /** Said in the price's place when it can't be bought ("Sold out", "Not on sale"). */
  aside?: string;
  children?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-[44px] items-start gap-4 rounded-md border-[length:var(--border-width-1)] border-solid px-6 py-5",
        checked ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <input type="radio" name={name} className="peer sr-only" checked={checked} disabled={disabled} onChange={onSelect} />
      <Radio checked={checked} decorative size="sm" className="mt-[2px] shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus" />
      <span className={cn("flex min-w-0 flex-1 flex-col gap-1", disabled && "opacity-60")}>
        <span className="flex items-baseline gap-4">
          <span className={cn(T.rowTitle, "min-w-0 flex-1 break-words tabular-nums")}>{title}</span>
          <span className={cn(T.rowTitle, "shrink-0 tabular-nums", disabled && "font-regular text-text-secondary")}>{disabled && aside ? aside : price}</span>
        </span>
        {children}
      </span>
    </label>
  );
}

/** What the bar says is picked: its name, and its price with what it gets. */
export type BarPick = { title: string; line: string };

/** The bar's one primary for the pick. */
export type BarAction =
  | {
      kind: "button";
      label: string;
      run: () => void;
      busy?: boolean;
      /** Another checkout holds it: greyed, it does nothing, and `reason` says why (CL-016). */
      held?: boolean;
      /** Off (a preview, a share not yet settled): greyed, `reason` says why. */
      disabled?: boolean;
    }
  | { kind: "link"; label: string; href: string };

/** The sticky bar: the pick and its price over Ask the creator (a chat icon) and the one primary. */
export function PickBar({
  ask,
  pick,
  action,
  reason,
  onChange,
}: {
  ask: { href: string; label: string };
  pick: BarPick | null;
  action: BarAction | null;
  reason?: string | null;
  /** Bring the box back into view (Change); none where the box is the screen itself. */
  onChange?: () => void;
}) {
  const reasonId = React.useId();
  if (!action || !pick) {
    return (
      <BottomBar className="pt-8">
        <Link href={ask.href} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
          <Icon icon={BubbleChatIcon} size={20} />
          {ask.label}
        </Link>
      </BottomBar>
    );
  }
  const off = action.kind === "button" && (action.held || action.disabled);
  return (
    <BottomBar className="gap-3 pt-6">
      <div className="flex items-start gap-4">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn(T.rowTitle, "break-words")}>{pick.title}</span>
          <span className={cn(T.meta, "tabular-nums")}>{pick.line}</span>
        </span>
        {onChange && (
          <button type="button" onClick={onChange} className={cn(TEXT_LINK, "shrink-0")} aria-label={`Change what to buy (${pick.title})`}>
            Change
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Link href={ask.href} aria-label={ask.label} title={ask.label} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl", iconOnly: true }), "shrink-0")}>
          <Icon icon={BubbleChatIcon} size={22} />
        </Link>
        {action.kind === "link" ? (
          <Link href={action.href} className={cn(buttonVariants({ size: "xl" }), "min-w-0 flex-1")}>
            {action.label}
          </Link>
        ) : (
          <Button
            size="xl"
            className={cn("min-w-0 flex-1", off && "cursor-not-allowed opacity-60")}
            loading={action.busy}
            // Not `disabled`: that drops its focus before the wallet sheet reads its opener.
            aria-disabled={action.busy || off || undefined}
            aria-describedby={reason ? reasonId : undefined}
            onClick={() => {
              if (!action.busy && !off) action.run();
            }}
          >
            {action.label}
          </Button>
        )}
      </div>
      {reason && (
        <p id={reasonId} className={T.meta}>
          {reason}
        </p>
      )}
    </BottomBar>
  );
}

"use client";

// ListingFlow — the header's "Add to marketplace" / "List another share"
// (Phase 2 spec §2.2, §3.6.3; P2-LISTING-1 and -3 as changed in §4.5). The
// header renders it through `slots.actions["add-to-marketplace"]` in the
// action pair's place, with the pair's tone (★ only while Private).
//
// Pressing it reads the Sell readiness first (C5: a rendering video never
// counts). When nothing the gate can fix blocks, the form opens straight
// away; otherwise T14's ReadinessDialog opens, and its "Continue to
// listing" replaces it with the form once every video is ready — one
// floating layer at a time. `?list=1` (My projects' card) does the same
// once, on arrival, and the address drops `list` (errata 43).
//
// When the maker holds no share, the button stays focusable but
// aria-disabled, with the reason beside it, and opens nothing (COR-67).
// Below the ladder's L3 (Build and Earn P1-4) it does the same, with the
// missing steps and their fixes under it; videos and ownership stay the
// gate's and the form's own.

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Tag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { LISTING_TRIGGER_ID, MARKETPLACE_FOCUS_ID } from "@/lib/market/listing-flow";
import { cn } from "@/lib/utils";
import { LevelCheck, useCommitCheck } from "../earn/ladder/level-check";
import { earnSourceOf } from "../earn/ladder/use-earn-facts";
import { dialogBlockerOf, ReadinessDialog } from "../details/readiness-dialog";
import type { ActionSlotProps } from "../details/slots";
import { focusSoon, ListingDialog } from "./listing-dialog";

type Open = "gate" | "form" | null;

const LIST_HANDLED = ["videos", "ownership"] as const;

const BASE =
  "inline-flex h-[40px] shrink-0 items-center gap-4 whitespace-nowrap rounded-lg px-8 text-md font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";
// The same paint as the header's other pair buttons (LeaveButton): the brand
// fill for the page's one violet, a bordered surface otherwise.
const PRIMARY =
  "bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface";
const QUIET = "border border-solid border-border bg-bg-surface text-text-primary hover:bg-bg-surface-raised";

export function ListingFlow({ project, view, brief, now, announce, action, violet, className }: ActionSlotProps) {
  const search = useSearchParams();
  const pathname = usePathname();
  const ladder = useCommitCheck("list", earnSourceOf(view, brief), { handled: LIST_HANDLED });
  const blocked = action.blocked ?? null;
  const steps = !blocked && !ladder.ok;
  const reasonId = React.useId();
  const stepsId = React.useId();

  const firstStep = React.useCallback(
    (): Open => (dialogBlockerOf(view.videos.readiness.sell) ? "gate" : "form"),
    [view.videos.readiness.sell],
  );
  // `?list=1` opens the flow once, on arrival.
  const [open, setOpen] = React.useState<Open>(() => (!blocked && search.get("list") === "1" ? firstStep() : null));

  // …and the address drops `list`, so a reload or Back doesn't open it again.
  React.useEffect(() => {
    if (search.get("list") === null) return;
    const qs = new URLSearchParams(search.toString());
    qs.delete("list");
    const rest = qs.toString();
    window.history.replaceState(window.history.state, "", rest ? `${pathname}?${rest}` : pathname);
  }, [search, pathname]);

  const close = () => {
    setOpen(null);
    focusSoon(LISTING_TRIGGER_ID);
  };

  return (
    <>
      <button
        id={LISTING_TRIGGER_ID}
        type="button"
        aria-disabled={blocked || steps ? true : undefined}
        aria-describedby={blocked ? reasonId : steps ? stepsId : undefined}
        onClick={() => {
          if (!blocked && !steps) setOpen(firstStep());
        }}
        className={cn(BASE, violet && !blocked && !steps ? PRIMARY : QUIET, (blocked || steps) && "cursor-not-allowed opacity-60", className)}
      >
        <Icon icon={Tag01Icon} size={18} />
        {action.label}
      </button>
      {blocked && (
        <p id={reasonId} className="text-sm text-text-secondary">
          {blocked}
        </p>
      )}

      {steps && (
        <LevelCheck check={ladder} what="list" id={stepsId} project={project} brief={brief} announce={announce} className="order-last w-full max-w-[720px] basis-full" />
      )}

      {open === "gate" && !steps && (
        <ReadinessDialog
          purpose="sell"
          project={project}
          view={view}
          brief={brief}
          onPass={() => setOpen("form")}
          onClose={close}
        />
      )}
      {open === "form" && !steps && (
        <ListingDialog
          mode="add"
          project={project}
          view={view}
          brief={brief}
          now={now}
          onClose={close}
          onDone={(message) => {
            setOpen(null);
            announce(message);
            focusSoon(MARKETPLACE_FOCUS_ID);
          }}
        />
      )}
    </>
  );
}

"use client";

// Publish — how a project goes out, chosen on its own page (owner,
// 2026-10-12: "Draft → Publish: private, give or sell; Private → Publish:
// give or sell"). The choice is made here, once:
// - a Draft: Keep private · Give to the community · Sell → the mint flow,
//   opened on Details with that choice (`earnMintHref(id, intent)`), so it is
//   never asked a second time;
// - a Private project (minted, kept to the maker): Give to the community —
//   the mint flow's Details again (nothing new to sign: it is minted), only
//   when its mint came through the flow — or Sell → Earn › Sell's listing
//   flow (`?list=1`), the way a minted project is listed.
// The wallet is asked when the maker signs, never before.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, ModalFrame } from "@/components/ideeza";
import { INTENTS } from "@/components/brief/step-choose";
import { publishHrefOf, type PublishIntent } from "@/lib/manual/earn-route";
import { cn } from "@/lib/utils";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

const SUB_PRIVATE: Partial<Record<PublishIntent, string>> = {
  sell: "List it on Explore marketplace.",
};

export function PublishDialog({
  projectId,
  projectName,
  status,
  options,
  onClose,
}: {
  projectId: string;
  projectName: string;
  status: string;
  options: PublishIntent[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pick, setPick] = React.useState<PublishIntent | null>(null);
  const [tried, setTried] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const labelId = React.useId();
  const reasonId = React.useId();
  const items = INTENTS.filter((i) => options.includes(i.id as PublishIntent));

  const go = () => {
    if (!pick) {
      setTried(true);
      refs.current[items[0]?.id ?? ""]?.focus();
      return;
    }
    setLeaving(true);
    router.push(publishHrefOf(projectId, status, pick));
  };
  const move = (from: number, dir: 1 | -1) => {
    const next = items[(from + dir + items.length) % items.length];
    setPick(next.id as PublishIntent);
    refs.current[next.id]?.focus();
  };

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="md"
      title={`Publish ${projectName}`}
      description={
        status === "draft"
          ? "Choose how it goes out. Each one mints it to your name first."
          : "It's minted and private. Choose how it goes out."
      }
      footer={
        <div className="ml-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-4">
            <Button type="button" hierarchy="ghost" size="lg" className={TAP} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              disabled={leaving}
              aria-disabled={!pick || undefined}
              aria-describedby={!pick ? reasonId : undefined}
              className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
              onClick={go}
            >
              {leaving ? "Opening…" : "Continue"}
            </Button>
          </div>
          {!pick && (
            <p id={reasonId} className={cn("text-md", tried ? "text-text-error" : "text-text-secondary")}>
              Pick how it goes out.
            </p>
          )}
        </div>
      }
    >
      <p id={labelId} className="sr-only">
        How it goes out
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        {items.map((it, i) => {
          const on = pick === it.id;
          return (
            <button
              key={it.id}
              ref={(el) => {
                refs.current[it.id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (!pick && i === 0) ? 0 : -1}
              onClick={() => setPick(it.id as PublishIntent)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(i, 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(i, -1);
                }
              }}
              className={cn(
                "flex min-h-[44px] flex-col items-start gap-3 rounded-xl border border-solid px-5 py-5 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
                on ? "border-border-brand bg-bg-brand-subtle" : "border-border hover:bg-bg-subtle",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-[36px] items-center justify-center rounded-lg",
                  on ? "bg-bg-brand text-text-inverse" : "bg-bg-subtle text-text-secondary",
                )}
              >
                {it.icon}
              </span>
              <span className="text-md font-semibold text-text-primary">{it.label}</span>
              <span className="text-md leading-relaxed text-text-secondary">
                {(status === "private" && SUB_PRIVATE[it.id as PublishIntent]) || it.sub}
              </span>
              <span className="rounded-md bg-bg-subtle px-[8px] py-[2px] text-sm font-semibold text-text-secondary">{it.requirement}</span>
            </button>
          );
        })}
      </div>
    </ModalFrame>
  );
}

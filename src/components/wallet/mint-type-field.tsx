"use client";

// Mint type: ONE shared field (P2-MINT-4). The Brief's form step and
// LISTING's "Add To Main NFT Marketplace" form both render this component;
// there is no second copy.
//
// A radiogroup labelled "Minting type" with two option cards, not the Figma
// dropdown: the option that costs money stays visible beside the free one
// (MINT D2). Lazy is the default. The field follows the project's mint
// status (`mintTypeOptions`, T02):
// - notMinted / legacy: both options, free to choose;
// - lazyMinted (LISTING only): "Keep lazy minted" / "Mint on chain now";
// - onChain: locked — a read-only box "Minted on chain", not a disabled
//   control, since there's nothing to choose and nothing to explain;
// - `locked` (a listing Edit): the current value, "Can't be changed after listing."
//
// Two cards side by side from a 480 px container, stacked below it. Each is
// at least 44 px tall. The chosen card takes the selection violet
// (`border-border-brand`) and `aria-checked`; the arrow keys move and choose.
// The cost chip needs no wallet: it comes from `estimateGas`.

import * as React from "react";
import { Badge, Radio, TestnetDemoBadge } from "@/components/ideeza";
import type { Intent, Network } from "@/lib/brief/types";
import { mintTypeOptions } from "@/lib/wallet/mint";
import type { MintStatus, MintType } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";

export type MintTypeFieldProps = {
  value: MintType;
  onChange: (type: MintType) => void;
  intent: Intent;
  network: Network;
  /** The project's mint status now (`mintViewOf(...).status`). */
  current: MintStatus;
  /** A listing Edit: the type can't change after listing (Figma 143717). */
  locked?: boolean;
  /** The on-chain wallet, named in the locked note ("Already on chain at 0x955d…ed95"). */
  address?: string;
  /** Ids of anything else describing the field (a form error). */
  describedBy?: string;
  className?: string;
};

export function MintTypeField({
  value,
  onChange,
  intent,
  network,
  current,
  locked,
  address,
  describedBy,
  className,
}: MintTypeFieldProps) {
  const labelId = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const opts = mintTypeOptions({ intent, current, network, locked, address });

  const label = (
    <div className="flex flex-wrap items-center gap-[8px]">
      <span id={labelId} className="text-sm font-semibold text-text-primary">
        Minting type
      </span>
      <TestnetDemoBadge />
    </div>
  );

  if (opts.locked) {
    // A listing Edit shows the value it was listed with, whichever that is.
    const title =
      current === "onChain"
        ? (opts.lockedText?.title ?? "Minted on chain")
        : (opts.options.find((o) => o.type === value)?.title ?? opts.lockedText?.title ?? "");
    return (
      <div role="group" aria-labelledby={labelId} aria-describedby={describedBy} className={cn("flex flex-col gap-[8px]", className)}>
        {label}
        <div className="flex flex-col gap-[2px] rounded-lg border border-solid border-border bg-bg-surface-raised px-[14px] py-[12px]">
          <span className="text-md font-semibold text-text-primary">{title}</span>
          {opts.lockedText?.note && <span className="text-sm text-text-secondary">{opts.lockedText.note}</span>}
        </div>
      </div>
    );
  }

  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + opts.options.length) % opts.options.length;
    onChange(opts.options[next].type);
    refs.current[next]?.focus();
  };

  return (
    <div className={cn("flex flex-col gap-[8px]", className)}>
      {label}
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,232px),1fr))] gap-[12px]"
      >
        {opts.options.map((o, i) => {
          const on = o.type === value;
          return (
            <button
              key={o.type}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(o.type)}
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
                "flex min-h-[var(--touch-min)] items-start gap-[10px] rounded-lg border border-solid p-[14px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-subtle",
              )}
            >
              <Radio checked={on} decorative size="sm" className="mt-[2px]" />
              <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
                <span className="text-md font-semibold text-text-primary">{o.title}</span>
                <span className="text-sm leading-relaxed text-text-secondary">{o.sub}</span>
                <Badge tone="neutral" className="self-start tabular-nums">
                  {o.cost}
                </Badge>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

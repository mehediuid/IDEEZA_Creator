"use client";

// A project bought from, as a card in My projects (CL-035, CL-037): the list's own card — the same frame, cover,
// title, line and hint as the maker's projects — with what makes it a purchase in the card's own places:
// · in All: the chip Purchased, the line "By {creator} · {n} products · Bought {date}", the hint
//   "You own 3 NFTs · 1 for sale · 1 sold";
// · in Purchased: the line "By {creator} · {n} products" and, with several, the product names under it; what is
//   held as chips ("Physical NFT ×2", "Virtual NFT ×1", "For sale ×1", "Sold ×1"), the uses held, then
//   "You own {n} NFTs · Last bought {date}".
// The whole card opens what was bought: the purchased screen, or the project itself for a whole project bought.
// A part of the line or the hint never breaks across two lines; the line and the hint wrap instead of being cut.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, CpuIcon, ImageNotFound01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Tag } from "@/components/ideeza/tag";
import { purchasedHintOf } from "@/components/projects/purchased/purchased-list-card";
import { formatDate, formatShortDate } from "@/lib/manual/project-summary";
import { cardChipsOf, usesOf, type PurchasedProject } from "@/lib/market/purchases";
import { cn } from "@/lib/utils";
import { LIST_CARD } from "../kit/list";
import { T } from "../type";
import { PurchasedChip } from "./parts";
import { purchasedPhoneHrefOf } from "./paths";

/** Parts joined by " · ", each kept whole on its line. */
function Parts({ parts }: { parts: readonly React.ReactNode[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && " · "}
          <span className="whitespace-nowrap">{part}</span>
        </React.Fragment>
      ))}
    </>
  );
}

export function PurchasedCard({ p, now, variant, onOpen }: { p: PurchasedProject; now: number; variant: "all" | "tab"; onOpen?: () => void }) {
  const [failed, setFailed] = React.useState(false);
  const products = p.products.length === 1 ? "1 product" : `${p.products.length} products`;
  const bought = (
    <time dateTime={new Date(p.lastAt).toISOString()} title={formatDate(p.lastAt)}>
      Bought {formatShortDate(p.lastAt, now)}
    </time>
  );
  const uses = usesOf(p);
  const hint =
    variant === "all"
      ? purchasedHintOf(p).split(" · ")
      : [`You own ${p.count} ${p.count === 1 ? "NFT" : "NFTs"}`, `Last bought ${formatDate(p.lastAt)}`];
  return (
    <Link
      href={purchasedPhoneHrefOf(p)}
      onClick={onOpen}
      className={cn(LIST_CARD, "gap-4 p-4 outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus")}
    >
      <span className="relative block aspect-video w-full overflow-hidden rounded-md bg-bg-surface-raised">
        {p.cover && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element -- the project's cover, a sample's picture or the build's
          <img src={p.cover} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[color:var(--color-icon-secondary)]">
            <Icon icon={p.cover ? ImageNotFound01Icon : CpuIcon} size={24} />
            {p.cover && <span className={cn(T.meta, "text-text-tertiary")}>Image didn’t load</span>}
          </span>
        )}
      </span>
      <span className="flex flex-col gap-2 px-2 pb-2">
        <span className="flex items-start justify-between gap-4">
          <span className={cn(T.section, "line-clamp-2 min-w-0 break-words")}>{p.name}</span>
          <PurchasedChip />
        </span>
        <span className={T.body}>
          <Parts parts={variant === "all" ? [`By ${p.creator}`, products, bought] : [`By ${p.creator}`, products]} />
        </span>
        {variant === "tab" && p.products.length > 1 && <span className={cn(T.meta, "break-words")}>{p.products.join(" · ")}</span>}
        {variant === "tab" && (
          <span aria-label="What you own" role="list" className="flex flex-wrap gap-2 pt-1">
            {cardChipsOf(p).map((c) => (
              <span role="listitem" key={c}>
                <Tag size="sm">{c}</Tag>
              </span>
            ))}
          </span>
        )}
        {variant === "tab" && uses.length > 0 && <span className={T.meta}>{uses.join(" · ")}</span>}
        <span className={cn(T.rowTitle, "flex items-center gap-2 text-text-secondary")}>
          <span className="min-w-0">
            <Parts parts={hint} />
          </span>
          <Icon icon={ArrowRight01Icon} size={16} className="shrink-0" />
        </span>
      </span>
    </Link>
  );
}

"use client";

// Earn › Sell's board (owner, 2026-11-18, the Sell desk plan, A with every
// recommendation): what the project sells, at a glance.
// - "How selling works" (D2): the three rule cards and their lead, word for
//   word, behind one disclosure beside the heading, as the phone keeps them
//   behind ⓘ. Each column's head says its rule in a line.
// - The board: a row for the whole project and one per product (D3: a
//   one-product project has one row), a column for Main, Physical and
//   Virtual. A product's Main cell is empty and says why ("Products sell copies
//   only, not a Main NFT."), so the rule shows in the board's shape.
// - A tile is the row's state in a chip, its price, how much has sold (a
//   meter) and what it earned (D6). A tile only picks (aria-pressed); every
//   control for it is in the item panel (D4).
// - Before the mint (D10) one band stands in for the tiles: one mint first,
//   then each sells on its own.
// - The board's container query: from 720 px the row's name sits beside its
//   tiles; narrower, above them; under 480 px the tiles stack and say their kind.
// Sizes and colours are the DS's: body 14, captions 12, the header pill's chip.

import * as React from "react";
import { InformationCircleIcon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, TestnetDemoBadge, type BadgeTone } from "@/components/ideeza";
import { payoutLinesText } from "@/lib/commerce/payout";
import { DESK_KIND_LINE, DESK_KINDS, type DeskKind, type DeskTile, type DeskTone } from "@/lib/market/sell-desk";
import { SELL_RULES, SELL_RULES_LEAD } from "@/lib/market/sell-flow";
import { cn } from "@/lib/utils";
import { EARN_H2, EARN_LEAD } from "../surface";

const DOT: Record<DeskKind, string> = { main: "bg-bg-brand", physical: "bg-bg-warning", virtual: "bg-bg-info" };
export const KIND_NAME: Record<DeskKind, string> = { main: "Main NFT", physical: "Physical NFT", virtual: "Virtual NFT" };
const TONE: Record<DeskTone, BadgeTone> = { success: "success", brand: "brand", neutral: "neutral", warning: "warning", info: "info" };

/** A kind's dot: colour helps, the word beside it carries the meaning. */
export function KindDot({ kind }: { kind: DeskKind }) {
  return <span aria-hidden className={cn("inline-block size-[10px] shrink-0 rounded-full", DOT[kind])} />;
}

/** The tile's state, as the header's status pill is drawn (12 px, semibold). */
export function DeskChip({ chip, className }: { chip: DeskTile["chip"]; className?: string }) {
  return (
    <Badge tone={TONE[chip.tone]} className={cn("h-[24px] shrink-0 px-[10px] py-0 text-sm font-semibold leading-sm", className)}>
      {chip.label}
    </Badge>
  );
}

/** Sold of made, as a thin bar; full turns brand. */
export function SoldMeter({ meter, label }: { meter: { sold: number; total: number }; label: string }) {
  const pct = meter.total > 0 ? Math.min(100, (meter.sold / meter.total) * 100) : 0;
  const full = meter.total > 0 && meter.sold >= meter.total;
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={meter.total}
      aria-valuenow={meter.sold}
      className="block h-[4px] w-full overflow-hidden rounded-full bg-bg-subtle"
    >
      <span className={cn("block h-full rounded-full", full ? "bg-bg-brand" : "bg-bg-success")} style={{ width: `${meter.sold > 0 ? Math.max(pct, 3) : 0}%` }} />
    </span>
  );
}

export type BoardRow = {
  scope: string;
  name: string;
  /** "Whole project · 3 products", "Product". */
  what: string;
  /** The project row of a one-product project names the product too. */
  also: string | null;
  cover: string | null;
  earned: string | null;
  tiles: Partial<Record<DeskKind, DeskTile>>;
};

export function SellBoard({
  rows,
  caption,
  selected,
  onSelect,
  draft,
  sold,
}: {
  rows: BoardRow[];
  caption: { value: string; label: string }[] | null;
  selected: string | null;
  onSelect: (key: string) => void;
  /** Not minted: the mint band stands in for the tiles (D10). */
  draft: { name: string; selected: boolean } | null;
  /** Sold in full: the heading says what was sold, the rules stay behind their disclosure. */
  sold: boolean;
}) {
  const headingId = React.useId();
  const [rules, setRules] = React.useState(false);
  const rulesId = React.useId();
  return (
    // `#copies` (the Overview's "Sell copies of a product") lands on the board, `#editions-<product>` on its row.
    <section id="copies" aria-labelledby={headingId} data-tour="earn-sell-rules" className="flex min-w-0 scroll-mt-10 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <h2 id={headingId} className={EARN_H2}>
            {sold ? "What you sold" : "What you're selling"}
          </h2>
          <TestnetDemoBadge />
          <button
            type="button"
            aria-expanded={rules}
            aria-controls={rulesId}
            onClick={() => setRules((r) => !r)}
            className="ml-auto inline-flex min-h-[36px] items-center gap-3 rounded-lg border border-solid border-border bg-bg-surface px-6 text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
          >
            <Icon icon={InformationCircleIcon} size={16} />
            How selling works
          </button>
        </div>
        {!sold && <p className={EARN_LEAD}>{SELL_RULES_LEAD}</p>}
      </div>

      {rules && (
        <div id={rulesId} className="flex flex-col gap-6 rounded-xl border border-solid border-border bg-bg-surface p-8">
          {sold && <p className={EARN_LEAD}>{SELL_RULES_LEAD}</p>}
          <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 [@container(min-width:640px)]:grid-cols-3">
            {SELL_RULES.map((r) => (
              <li key={r.id} className="flex min-w-0 flex-col gap-2">
                <span className="flex items-center gap-3 text-md font-semibold leading-md text-text-primary">
                  <KindDot kind={r.id} />
                  {r.title}
                </span>
                <span className="text-md leading-md text-text-secondary">{r.line}</span>
                <span className="text-sm font-semibold leading-sm text-text-tertiary">{r.where}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {caption && (
        <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-md leading-md text-text-secondary tabular-nums">
          {caption.map((c, i) => (
            <React.Fragment key={c.label}>
              {i > 0 && (
                <span aria-hidden className="text-text-tertiary">
                  ·
                </span>
              )}
              <span>
                <span className="font-semibold text-text-primary">{c.value}</span>
                {c.label ? ` ${c.label}` : null}
              </span>
            </React.Fragment>
          ))}
        </p>
      )}

      <div className="min-w-0 rounded-2xl border border-solid border-border bg-bg-surface px-8 py-2 [container-type:inline-size] [@container(min-width:640px)]:px-12">
        <div role="presentation" className={cn(ROW, "hidden py-6 [@container(min-width:480px)]:grid")}>
          <span className="hidden [@container(min-width:720px)]:block" />
          {DESK_KINDS.map((k) => (
            <span key={k} className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-3 text-md font-semibold leading-md text-text-primary">
                <KindDot kind={k} />
                {KIND_NAME[k]}
              </span>
              <span className="text-sm leading-sm text-text-tertiary">{DESK_KIND_LINE[k]}</span>
            </span>
          ))}
        </div>
        {rows.map((row, i) => (
          <div
            key={row.scope}
            id={i === 0 ? undefined : `editions-${row.scope}`}
            className={cn(ROW, "scroll-mt-10 border-0 border-t border-solid border-border py-8", i === 0 && "[@container(max-width:479px)]:border-t-0")}
          >
            <ScopeCell row={row} />
            {draft && i === 0 ? (
              <button
                type="button"
                aria-pressed={draft.selected}
                onClick={() => onSelect("draft")}
                className={cn(
                  "col-span-full grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-7 gap-y-1 rounded-xl border border-dashed border-border-strong bg-transparent px-9 py-8 text-left outline-none transition-colors duration-fast hover:border-text-tertiary focus-visible:ring-2 focus-visible:ring-border-focus [@container(min-width:720px)]:col-span-3",
                  draft.selected && "border-solid border-border-brand bg-bg-brand-subtle",
                )}
              >
                <span aria-hidden className="row-span-2 inline-flex size-[40px] items-center justify-center rounded-xl bg-bg-subtle text-text-secondary">
                  <Icon icon={LockIcon} size={20} />
                </span>
                <span className="text-md font-semibold leading-md text-text-primary">Not minted yet</span>
                <span className="text-md leading-md text-text-secondary">
                  Mint {draft.name} once, and each of these can go on sale on its own: the Main NFT, Physical copies and Virtual copies.
                </span>
              </button>
            ) : (
              DESK_KINDS.map((k) => {
                const tile = row.tiles[k];
                if (!tile) return <EmptyMain key={k} first={i === 1} />;
                return <Tile key={k} tile={tile} rowName={row.name} selected={selected === tile.key} onSelect={onSelect} />;
              })
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** The board's grid: from 720 px the row's name beside its three tiles, narrower above them, under 480 px one column. */
const ROW =
  "grid min-w-0 grid-cols-1 gap-6 [@container(min-width:480px)]:grid-cols-3 [@container(min-width:720px)]:grid-cols-[176px_repeat(3,minmax(0,1fr))]";

function ScopeCell({ row }: { row: BoardRow }) {
  const [imgOk, setImgOk] = React.useState(true);
  return (
    <div className="col-span-full flex min-w-0 items-start gap-6 [@container(min-width:720px)]:col-span-1">
      <span className="inline-flex size-[56px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-solid border-border-subtle bg-bg-subtle text-lg font-semibold text-text-brand">
        {row.cover && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.cover} alt="" loading="lazy" decoding="async" onError={() => setImgOk(false)} className="size-full object-cover" />
        ) : (
          <span aria-hidden>{initialsOf(row.name)}</span>
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="break-words text-md font-semibold leading-md text-text-primary">{row.name}</span>
        <span className="text-sm leading-sm text-text-tertiary">{row.what}</span>
        {row.also && <span className="break-words text-sm leading-sm text-text-tertiary">{row.also}</span>}
        {row.earned && <span className="mt-1 text-sm font-medium leading-sm text-text-success tabular-nums">{row.earned} earned</span>}
      </span>
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

/** A product's Main cell: products sell copies only. The first one says so; the others are a dash. */
function EmptyMain({ first }: { first: boolean }) {
  return (
    <span className="hidden min-h-[112px] items-center justify-center rounded-xl border border-dashed border-border px-6 text-center text-sm leading-sm text-text-tertiary [@container(min-width:480px)]:flex">
      {first ? "Products sell copies only, not a Main NFT." : <span aria-label="No Main NFT">—</span>}
    </span>
  );
}

function Tile({ tile, rowName, selected, onSelect }: { tile: DeskTile; rowName: string; selected: boolean; onSelect: (key: string) => void }) {
  const earned = tile.earned.length ? payoutLinesText(tile.earned) : null;
  const meterLabel = `${KIND_NAME[tile.kind]} of ${rowName}: ${tile.soldLine ?? ""}`;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${KIND_NAME[tile.kind]} · ${rowName}: ${tile.chip.label}${tile.price ? `, ${tile.price}` : ""}${tile.soldLine ? `, ${tile.soldLine}` : ""}${earned ? `, ${earned} earned` : ""}`}
      onClick={() => onSelect(tile.key)}
      className={cn(
        "flex min-h-[112px] min-w-0 flex-col gap-4 rounded-xl border border-solid border-border bg-transparent px-7 py-6 text-left outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
        selected && "border-border-brand bg-bg-brand-subtle hover:border-border-brand",
      )}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="hidden items-center gap-2 text-sm font-semibold text-text-primary [@container(max-width:479px)]:inline-flex">
          <KindDot kind={tile.kind} />
          {KIND_NAME[tile.kind]}
        </span>
        <DeskChip chip={tile.chip} />
        {tile.uses && <span className="text-sm leading-sm text-text-tertiary">{tile.uses}</span>}
      </span>
      {tile.price ? (
        <span className="break-words text-lg font-semibold leading-lg text-text-primary tabular-nums">{tile.price}</span>
      ) : (
        <span className="text-md leading-md text-text-tertiary">{noPriceOf(tile)}</span>
      )}
      {tile.meter && <SoldMeter meter={tile.meter} label={meterLabel} />}
      <span className="mt-auto flex min-w-0 flex-wrap justify-between gap-x-4 text-sm leading-sm text-text-tertiary tabular-nums">
        <span>{tile.soldLine ?? ""}</span>
        {earned ? (
          <span className="font-semibold text-text-success">{earned}</span>
        ) : tile.hint ? (
          <span className="font-semibold text-text-warning">{tile.hint}</span>
        ) : tile.chip.label === "Not selling" ? (
          <span className="font-semibold text-text-link">Set a price ›</span>
        ) : null}
      </span>
    </button>
  );
}

function noPriceOf(tile: DeskTile): string {
  if (tile.chip.label === "Stopped" || tile.chip.label === "Given") return "Not on sale";
  if (tile.chip.label === "Not minted yet") return "Mint first";
  return "No price yet";
}

"use client";

// The concept stage on a phone, image first (create-flow round 2, the owner's
// approved sample QymWEbLugMwQEk7NpJVRy2): the drawing IS the page. With two or
// more products a switcher sits on top (thumb, name, state); under it the
// chosen product's big drawing with only its name, one line of facts and one
// secondary button, Change. Change opens a sheet with the description, the
// facts, the prompt and Refine · Regenerate · Edit spec. What gets built and
// at which Quality are build decisions, so they live in the Build line's
// Options sheet. The Build line itself is pinned at the foot of the screen.
//
// The drawing's clock is real (use-clock.ts): a render gives no milestones,
// so the ring turns and says how long it has been drawing, as the web's tile
// does, instead of a percentage nobody measured.

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Alert02Icon,
  Cancel01Icon,
  Copy01Icon,
  Delete02Icon,
  FullScreenIcon,
  PencilEdit02Icon,
  Refresh01Icon,
  Settings02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Tag } from "@/components/ideeza/tag";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { IconButton } from "@/components/ideeza/icon-button";
import { TextInput } from "@/components/ideeza/text-input";
import { Field } from "@/components/auth/auth-parts";
import { CreditBadge } from "@/components/credits/credit-badge";
import { elapsedLabel } from "@/components/create/use-clock";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { companionId } from "@/lib/create/companions";
import { CONCEPT_COST, useCredits } from "@/lib/create/credits";
import { aboutTime, cleanPick, pickCost, qualityOf, withQuality, type PiecePick, type PieceQuality } from "@/lib/create/pieces";
import { QUALITIES, QUALITY_INFO } from "@/lib/create/quality";
import type { RailRow } from "@/lib/create/project-state";
import { cardFacts } from "@/lib/spec/format";
import { asConceptSummary } from "@/lib/spec/hints";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { StatusBar } from "../status-bar";
import { Eyebrow } from "../kit/eyebrow";
import { LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { DASHED, FAIL_COPY, FAIL_FALLBACK, OFFLINE_REASON } from "./parts";
import { PickList } from "../kit/pick-list";
import { PromptBox } from "./prompt-box";
import { BuyCreditsSheet } from "./buy-credits-sheet";
import { PlanLink, ShortOfCreditsLine } from "../plans/upsell";
import type { AssistantTurn, ConceptFlow } from "./use-concept-flow";

/** One line of facts for a product's drawing: up to three of the spec's card facts. */
function factsLine(flow: ConceptFlow, turn: AssistantTurn | undefined): string {
  if (!turn) return "";
  const spec = flow.state.specs.get(turn.id) ?? null;
  const parts = flow.state.parts.get(turn.id) ?? [];
  const concept = asConceptSummary(turn.concept);
  if (!spec || !concept || concept.fallback) return concept?.description ?? "";
  return cardFacts(spec, parts)
    .slice(0, 3)
    .map((f) => (f.label ? `${f.label} ${f.value}` : f.value))
    .join(" · ");
}

function pickOf(flow: ConceptFlow, productId: string): PiecePick {
  return flow.state.picks.get(productId) ?? cleanPick(undefined, flow.chat?.quality);
}

/** What the switcher says under a product's name. */
function stateOf(row: RailRow): { text: string; tone: "plain" | "success" | "brand" | "error" } {
  if (row.phase === "drawing") return { text: "Drawing…", tone: "brand" };
  if (row.phase === "failed") return { text: "Couldn't draw", tone: "error" };
  if (row.productId === "primary") return { text: "Always built", tone: "plain" };
  return row.leftOut ? { text: "Not in this build", tone: "plain" } : { text: "In this build", tone: "success" };
}

/** Add a product by name (the web canvas's Add a product): drawn for 1 credit; a name that
 *  was removed before comes back with its concept, free. */
function AddProductSheet({ flow, open, onClose, onAdded }: { flow: ConceptFlow; open: boolean; onClose: () => void; onAdded: (productId: string) => void }) {
  const [name, setName] = React.useState("");
  const id = React.useId();
  const trimmed = name.trim();
  const same = (a: string) => a.trim().toLowerCase() === trimmed.toLowerCase();
  const wasRemoved = trimmed ? flow.state.removed.find((r) => same(r.name)) : undefined;
  const drawn = trimmed ? flow.rail.rows.find((r) => same(r.name)) : undefined;
  const reason = !trimmed
    ? "Name the product first"
    : drawn
      ? `${drawn.name} is already in this project`
      : wasRemoved
        ? null
        : !flow.online
          ? OFFLINE_REASON
          : !flow.canRender
            ? "You are out of credits — top them up to draw another concept."
            : null;
  const close = () => {
    setName("");
    onClose();
  };
  const add = () => {
    if (reason) return;
    const done = flow.addProduct(trimmed);
    if (!done) return;
    onAdded(companionId(trimmed));
    close();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title="Add a product"
      description="Name it and IDEEZA draws its concept. It joins this project."
      actions={
        <>
          <Button size="xl" className="w-full" onClick={add} disabled={!!reason}>
            {wasRemoved ? "Put it back" : "Add"} <CreditBadge credits={wasRemoved ? 0 : CONCEPT_COST} onBrand={!reason} />
          </Button>
          {(reason && trimmed) || wasRemoved ? (
            <p role="status" className={cn(T.meta, "text-center")}>
              {reason ?? `${wasRemoved!.name} was removed — its concept is kept, so putting it back is free.`}
            </p>
          ) : null}
        </>
      }
    >
      <Field label="Product name" htmlFor={id}>
        <TextInput
          id={id}
          size="xl"
          value={name}
          onValueChange={setName}
          placeholder="e.g. Charging dock"
          maxLength={60}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
      </Field>
    </Sheet>
  );
}

// ─────────────────────────── the stage ───────────────────────────

export function ConceptStage({
  flow,
  now,
  selected,
  onSelect,
  onChange,
  onImage,
}: {
  flow: ConceptFlow;
  now: number;
  selected: string;
  onSelect: (productId: string) => void;
  onChange: (productId: string) => void;
  onImage: (productId: string) => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const rows = flow.rail.rows;
  const row = rows.find((r) => r.productId === selected) ?? rows[0];
  if (!row) return null;
  const turn = flow.state.products.find((t) => t.id === row.turnId);
  const multi = rows.length > 1;
  return (
    <section aria-label={multi ? "Concepts" : "Concept"} className="flex flex-col gap-5">
      {multi && (
        <div role="tablist" aria-label="Products" className="-mx-8 flex gap-4 overflow-x-auto px-8 [scrollbar-width:none]">
          {rows.map((r) => {
            const on = r.productId === row.productId;
            const s = stateOf(r);
            return (
              <button
                key={r.productId}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onSelect(r.productId)}
                className={cn(
                  "flex min-h-[56px] min-w-[156px] flex-1 items-center gap-4 rounded-xl bg-bg-surface px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  on ? "border-[length:var(--border-width-2)] border-solid border-border-brand" : "border-[length:var(--border-width-1)] border-solid border-border-subtle",
                )}
              >
                <span className={cn("relative size-[38px] shrink-0 overflow-hidden rounded-lg bg-bg-subtle", r.leftOut && "opacity-50")}>
                  {r.imageUrl && <Image src={r.imageUrl} alt="" fill sizes="38px" className="object-cover" unoptimized />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={cn(T.label, "truncate text-text-primary")}>{r.name}</span>
                  <span
                    className={cn(
                      T.micro, "truncate",
                      s.tone === "success" && "text-text-success",
                      s.tone === "brand" && "text-text-brand",
                      s.tone === "error" && "text-text-error",
                      s.tone === "plain" && "text-text-secondary",
                    )}
                  >
                    {s.text}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <ConceptHero row={row} turn={turn} flow={flow} now={now} onChange={() => onChange(row.productId)} onImage={() => onImage(row.productId)} />
      {!flow.held && (
        <div className="flex flex-col gap-3">
          {flow.state.available.length > 0 && <p className={T.meta}>Suggested · 1 credit each</p>}
          <div className="flex flex-wrap gap-3">
            {flow.state.available.map((c) => (
              <Tag key={c.id} disabled={!flow.canRender || !flow.online} onClick={() => flow.addOffered(c.id)}>
                + {c.name}
              </Tag>
            ))}
            <Tag onClick={() => setAdding(true)}>+ Add a product</Tag>
          </div>
          {flow.state.removed.length > 0 && (
            <>
              <p className={T.meta}>Removed · restore free</p>
              <div className="flex flex-wrap gap-3">
                {flow.state.removed.map((r) => (
                  <Tag
                    key={r.id}
                    onClick={() => {
                      flow.restoreProduct(r.id);
                      onSelect(r.id);
                    }}
                  >
                    + {r.name}
                  </Tag>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <AddProductSheet flow={flow} open={adding} onClose={() => setAdding(false)} onAdded={onSelect} />
    </section>
  );
}

function ConceptHero({
  row,
  turn,
  flow,
  now,
  onChange,
  onImage,
}: {
  row: RailRow;
  turn: AssistantTurn | undefined;
  flow: ConceptFlow;
  now: number;
  onChange: () => void;
  onImage: () => void;
}) {
  const frame = "relative aspect-[4/3] w-full overflow-hidden rounded-lg";
  if (row.phase === "drawing") {
    return (
      <div className={cn(LIST_CARD, "flex flex-col gap-4 p-4")}>
        <div className={cn(frame, "flex flex-col items-center justify-center gap-4 bg-bg-brand-subtle")}>
          <span aria-hidden className="absolute inset-0 bg-[image:var(--gradient-ai)] opacity-20 motion-safe:animate-pulse" />
          <DrawingRing since={row.since ?? now} now={now} label={`Drawing ${row.name}`} />
          <span className="relative flex flex-col items-center">
            <span className={T.rowTitle}>Drawing {row.name}</span>
            <span className={T.meta}>Usually 30–60 seconds</span>
          </span>
        </div>
      </div>
    );
  }
  if (row.phase === "failed") {
    return (
      <div className={cn(LIST_CARD, "flex flex-col gap-4 border-border-error p-6")}>
        <div className="flex items-start gap-5">
          <span aria-hidden className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-lg bg-bg-error-subtle text-[color:var(--color-icon-error)]">
            <Icon icon={Alert02Icon} size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <Eyebrow className="text-text-error">Couldn&apos;t draft that concept</Eyebrow>
            <span className={cn(T.rowTitle, "truncate")}>{row.name}</span>
            <span className={T.meta}>{turn?.failReason ? FAIL_COPY[turn.failReason] : FAIL_FALLBACK}</span>
          </span>
        </div>
        <Button
          hierarchy="secondary"
          size="lg"
          className="w-full"
          disabled={!flow.canRender || !flow.online || flow.held || !turn}
          onClick={() => turn && flow.regenerate(turn.id)}
          iconLeading={<Icon icon={Refresh01Icon} size={16} />}
        >
          Try again <CreditBadge credits={CONCEPT_COST} />
        </Button>
        {!flow.online && <p className={cn(T.meta, "text-center")}>{OFFLINE_REASON}</p>}
        {/* An extra product that won't draw doesn't hold the build: it can be left out (and put back). */}
        {row.productId !== "primary" && !flow.held && (
          <Button hierarchy="ghost" size="lg" className="w-full" onClick={() => flow.toggleInBuild(row.productId)}>
            {row.leftOut ? "Include it in the build again" : "Build without it"}
          </Button>
        )}
      </div>
    );
  }
  const status = row.phase === "reading" ? "Reading the parts" : row.phase === "conflict" ? "Doesn't fit its size" : "Ready";
  const facts = factsLine(flow, turn);
  return (
    <div className={cn(LIST_CARD, "flex flex-col gap-4 p-4")}>
      <div className={cn(frame, "bg-bg-subtle", row.leftOut && "opacity-60")}>
        {row.imageUrl && <Image src={row.imageUrl} alt={`${row.name}, concept ${flow.labels.get(row.turnId) ?? "1"}`} fill sizes="343px" className="object-cover" unoptimized />}
        <span className="absolute left-4 top-4">
          <Badge tone={row.phase === "conflict" ? "warning" : row.phase === "reading" ? "neutral" : "success"}>{status}</Badge>
        </span>
        {row.imageUrl && (
          <button
            type="button"
            onClick={onImage}
            aria-label={`Open ${row.name} full screen`}
            className="absolute bottom-4 right-4 inline-flex size-[44px] items-center justify-center rounded-lg border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface text-[color:var(--color-icon-default)] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={FullScreenIcon} size={18} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 px-2 pb-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className={cn(T.section, "truncate")}>{row.name}</p>
          <p className={cn(T.meta, "truncate")}>
            {row.leftOut ? "Not in this build · turn it on in Options" : facts || "Reading the parts…"}
          </p>
        </div>
        <Button hierarchy="secondary" size="lg" className="shrink-0" onClick={onChange} iconLeading={<Icon icon={PencilEdit02Icon} size={16} />}>
          {flow.held ? "View" : "Change"}
        </Button>
      </div>
    </div>
  );
}

/** After a build holds the concepts: one quiet row for them, opening each one's sheet. */
export function ConceptsMini({ flow, onOpen }: { flow: ConceptFlow; onOpen: (productId: string) => void }) {
  const rows = flow.rail.rows.filter((r) => r.phase !== "failed");
  if (rows.length === 0) return null;
  return (
    <section aria-label="Concepts" className={cn(LIST_CARD, "flex-row items-center gap-5 p-5")}>
      <span className="flex shrink-0">
        {rows.slice(0, 3).map((r, i) => (
          <span key={r.productId} className={cn("relative size-[40px] overflow-hidden rounded-lg border-[length:var(--border-width-2)] border-solid border-bg-surface bg-bg-subtle", i > 0 && "-ml-5")}>
            {r.imageUrl && <Image src={r.imageUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />}
          </span>
        ))}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <Eyebrow className="text-text-success">{rows.length === 1 ? "Concept ready" : `${rows.length} concepts ready`}</Eyebrow>
        <span className={cn(T.rowTitle, "truncate")}>{rows.map((r) => r.name).join(" · ")}</span>
      </span>
      <button
        type="button"
        onClick={() => onOpen(rows[0].productId)}
        className={cn(T.rowTitle, "-my-3 inline-flex min-h-[44px] shrink-0 items-center text-text-brand outline-none hover:underline focus-visible:underline")}
      >
        View
      </button>
    </section>
  );
}

/** The ring of a drawing: it turns, and says how long it has been drawing. */
function DrawingRing({ since, now, label }: { since: number; now: number; label: string }) {
  return (
    <span role="status" aria-label={`${label} · ${elapsedLabel(since, now)}`} className="relative inline-flex size-[44px] shrink-0 items-center justify-center">
      <svg aria-hidden viewBox="0 0 40 40" className="absolute inset-0 size-full motion-safe:animate-spin">
        <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" className="stroke-[var(--color-bg-brand-subtle)]" />
        <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 101" className="stroke-[var(--color-icon-brand)]" />
      </svg>
      <span className={cn(T.micro, "relative tabular-nums text-text-primary")}>{elapsedLabel(since, now).replace(/ min .*/, " min")}</span>
    </span>
  );
}

// ─────────────────────────── the Build line ───────────────────────────

/** The Build line. Short of credits with every concept drawn (CL-032, no warning hung under it): Buy
 *  credits is the line's one button (the sheet in place, the smallest pack that covers the shortfall picked),
 *  with one line on what's missing and the next plan up under it. Once the credits cover the build, Build
 *  is back; while a concept still draws, the usual reason shows and no Buy credits. */
export function BuildBar({ flow, onBuild, onOptions }: { flow: ConceptFlow; onBuild: () => void; onOptions?: () => void }) {
  const { state } = flow;
  const { hydrated, balance } = useCredits();
  const [buying, setBuying] = React.useState(false);
  const n = state.selected.length;
  const waiting = !state.allReady;
  const failedRow = state.failedChoice ? flow.rail.rows.find((r) => r.turnId === state.failedChoice!.id) : undefined;
  const reason = state.failedChoice
    ? // The main product is always built, so only an extra product can be left out.
      `${failedRow?.name ?? "A concept"} couldn't be drawn — try it again${state.failedChoice.companionOf ? ", or leave it out" : ""}`
    : waiting
      ? "Wait for all concepts to finish"
      : state.emptyPick
        ? "A product has nothing picked to build"
        : !flow.online
          ? OFFLINE_REASON
          : null;
  const short = hydrated && balance < state.cost && !reason && !flow.preparing;
  const qualities = new Set(state.selected.map((t) => qualityOf(pickOf(flow, t.companionOf ?? "primary"))));
  const quality = qualities.size === 1 ? QUALITY_INFO[[...qualities][0]].label : "Mixed quality";
  const off = !!reason || flow.preparing;
  return (
    <section
      aria-label="Build"
      className={cn(DASHED, "flex flex-col gap-4 p-6", off && !flow.preparing ? "border-border bg-bg-subtle" : "border-border-brand bg-bg-brand-subtle")}
    >
      <div className="flex items-center gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={cn(T.rowTitle, reason ? "text-text-tertiary" : "text-text-brand")}>
            {n} {n === 1 ? "product" : "products"} · {state.cost} credits
          </p>
          <p className={T.meta}>
            {reason ?? `${quality} · ${aboutTime(state.seconds).replace(/^about/, "About")}`}
            {onOptions && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={onOptions}
                  className={cn(T.label, "-my-3 inline-flex min-h-[40px] items-center text-text-brand underline outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
                >
                  Options
                </button>
              </>
            )}
          </p>
        </div>
        {short ? (
          <Button size="md" className="shrink-0" onClick={() => setBuying(true)}>
            Buy credits
          </Button>
        ) : (
          <Button size="md" className="shrink-0" onClick={onBuild} disabled={!!reason} loading={flow.preparing} aria-label={flow.preparing ? "Preparing the build" : undefined}>
            {n === 1 ? "Build" : `Build ${n} products`}
          </Button>
        )}
      </div>
      {short && (
        <div role="status" className="flex flex-col gap-1 border-t-[length:var(--border-width-1)] border-solid border-border-brand pt-4">
          <ShortOfCreditsLine cost={state.cost} balance={balance} />
          <PlanLink className="-mb-3 self-start" />
        </div>
      )}
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} need={state.cost} />
    </section>
  );
}

/** The Build line's Options: which products go into this build, and each one's Quality. */
export function BuildOptionsSheet({ flow, open, onClose }: { flow: ConceptFlow; open: boolean; onClose: () => void }) {
  const [qualityFor, setQualityFor] = React.useState<string | null>(null);
  const rows = flow.rail.rows;
  const n = flow.state.selected.length;
  const qRow = qualityFor ? rows.find((r) => r.productId === qualityFor) : undefined;
  const qPick = qualityFor ? pickOf(flow, qualityFor) : null;
  return (
    <>
      <Sheet
        open={open && !qualityFor}
        onClose={onClose}
        title="Build options"
        description="Every product gets its PCB, code, 3D module, assembly and wiring, plus a parts list."
        actions={
          <>
            <p className={cn(T.rowTitle, "text-center text-text-brand")}>
              {n} {n === 1 ? "product" : "products"} · {flow.state.cost} credits
            </p>
            <Button size="xl" className="w-full" onClick={onClose}>
              Done
            </Button>
          </>
        }
      >
        <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
          {rows.map((r) => {
            const companion = r.productId !== "primary";
            const inBuild = !companion || !r.leftOut;
            const pick = pickOf(flow, r.productId);
            return (
              <li key={r.productId} className="flex flex-col gap-3 px-6 py-5">
                <div className="flex items-center gap-5">
                  {companion ? (
                    <label className="relative -m-3 inline-flex size-[44px] shrink-0 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={inBuild}
                        disabled={flow.held}
                        onChange={() => flow.toggleInBuild(r.productId)}
                        aria-label={`Build ${r.name}`}
                      />
                      <Checkbox checked={inBuild} disabled={flow.held} decorative />
                    </label>
                  ) : (
                    <span className="inline-flex size-[20px] shrink-0" aria-hidden />
                  )}
                  <span className="relative size-[40px] shrink-0 overflow-hidden rounded-lg bg-bg-subtle">
                    {r.imageUrl && <Image src={r.imageUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn(T.rowTitle, "truncate")}>{r.name}</span>
                    <span className={T.micro}>{companion ? (inBuild ? "In this build" : "Not in this build") : "Always built · the main product"}</span>
                  </span>
                  <span className={cn(T.meta, "shrink-0 tabular-nums")}>{inBuild ? `${pickCost(pick)} credits` : "—"}</span>
                </div>
                {inBuild && (
                  <span className="ml-[64px] flex">
                    <Tag disabled={flow.held} onClick={() => setQualityFor(r.productId)}>
                      Quality · {QUALITY_INFO[qualityOf(pick)].label}
                    </Tag>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Sheet>
      <Sheet open={!!qualityFor} onClose={() => setQualityFor(null)} title="Quality" description={`Every piece of ${qRow?.name ?? "this product"} is built at it.`}>
        {qPick && (
          <PickList
            label="Quality"
            value={qualityOf(qPick)}
            options={QUALITIES.map((q) => ({
              value: q,
              label: QUALITY_INFO[q].label,
              helper: `${QUALITY_INFO[q].hint} · ${pickCost(withQuality(qPick, q))} credits`,
            }))}
            onPick={(q) => {
              if (qualityFor) flow.setQuality(qualityFor, q as PieceQuality);
              setQualityFor(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

// ─────────────────────────── Change (the product's sheet) ───────────────────────────

function SheetRow({
  icon,
  title,
  sub,
  right,
  disabled,
  danger,
  onClick,
}: {
  icon: IconValue;
  title: string;
  sub: string;
  right: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[64px] w-full items-center gap-5 px-6 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={cn("shrink-0", danger ? "text-[color:var(--color-icon-error)]" : "text-[color:var(--color-icon-brand)]")}>
        <Icon icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn(T.rowTitle, danger && "text-text-error")}>{title}</span>
        <span className={T.meta}>{sub}</span>
      </span>
      {right != null && <span className="shrink-0">{right}</span>}
    </button>
  );
}

export function ConceptSheet({
  flow,
  productId,
  onClose,
  onRefine,
  onEditSpec,
}: {
  flow: ConceptFlow;
  productId: string | null;
  onClose: () => void;
  onRefine: (turnId: string) => void;
  onEditSpec: (productId: string) => void;
}) {
  const toast = useToast();
  const rows = flow.rail.rows;
  const index = rows.findIndex((r) => r.productId === productId);
  const row = index >= 0 ? rows[index] : null;
  const turn = row ? flow.state.products.find((t) => t.id === row.turnId) : undefined;
  const open = !!row && !!turn;
  const spec = turn ? flow.state.specs.get(turn.id) ?? null : null;
  const parts = turn ? flow.state.parts.get(turn.id) ?? [] : [];
  const concept = turn ? asConceptSummary(turn.concept) : undefined;
  const locked = !!turn && flow.state.locked.has(turn.id);
  const facts = spec && concept && !concept.fallback ? cardFacts(spec, parts) : [];
  const ready = turn?.status === "ready";
  const label = row ? flow.labels.get(row.turnId) ?? "1" : "1";

  const copy = async () => {
    if (!turn) return;
    try {
      await navigator.clipboard.writeText(turn.prompt);
      toast({ title: "Prompt copied", lead: "success" });
    } catch {
      toast({ title: "Couldn't copy the prompt", lead: "error" });
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={row?.name ?? "Concept"}
      description={rows.length > 1 ? `Concept ${label} · Product ${index + 1} of ${rows.length}` : `Concept ${label}`}
    >
      {turn && row && (
        <>
          {locked && (
            <div className="flex">
              <Badge tone="brand">Built</Badge>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {concept?.description && <p className={cn(T.body, "text-text-primary")}>{concept.description}</p>}
            {concept?.fallback && (
              <p className={T.meta}>
                Stand-in parts — the model didn&apos;t answer, so these are generic.{" "}
                <button
                  type="button"
                  disabled={flow.rereading.has(turn.id)}
                  onClick={() => flow.readConcept(turn.id)}
                  className={cn(T.label, "text-text-brand hover:underline disabled:text-text-disabled")}
                >
                  {flow.rereading.has(turn.id) ? "Reading again…" : "Read again"}
                </button>
              </p>
            )}
            {facts.length > 0 ? (
              <ul className="flex flex-wrap gap-3">
                {facts.map((f, i) => (
                  <li key={f.key + i}>
                    <Tag className={cn(f.tone === "error" && "text-text-error", f.tone === "warn" && "text-text-warning")}>{f.label ? `${f.label} ${f.value}` : f.value}</Tag>
                  </li>
                ))}
              </ul>
            ) : (
              !concept?.fallback && <p className={cn(T.meta, "text-text-tertiary")}>{ready ? "Reading the parts…" : "The spec comes with the drawing."}</p>
            )}
            <div className="flex items-center gap-4">
              <p className={cn(T.meta, "min-w-0 flex-1 truncate")}>
                <span className="text-text-primary">Prompt: </span>
                {turn.prompt}
              </p>
              <button
                type="button"
                onClick={copy}
                aria-label="Copy the prompt"
                className="-m-3 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Copy01Icon} size={16} />
              </button>
            </div>
          </div>
          <div className={cn(LIST_CARD, LIST_DIVIDERS)}>
            {!locked && (
              <>
                <SheetRow
                  icon={SparklesIcon}
                  title="Refine"
                  sub="Describe a change in plain words"
                  right={<CreditBadge credits={CONCEPT_COST} />}
                  disabled={!ready || !flow.canRender || !flow.online}
                  onClick={() => onRefine(turn.id)}
                />
                <SheetRow
                  icon={Refresh01Icon}
                  title="Regenerate"
                  sub="A new take on this product"
                  right={<CreditBadge credits={CONCEPT_COST} />}
                  disabled={!flow.canRender || !flow.online}
                  onClick={() => {
                    if (flow.regenerate(turn.id)) onClose();
                  }}
                />
              </>
            )}
            {spec && (
              <SheetRow
                icon={Settings02Icon}
                title={locked ? "View spec" : "Edit spec"}
                sub="Size, power, parts, case"
                right={<CreditBadge credits={0} />}
                onClick={() => productId && onEditSpec(productId)}
              />
            )}
            {/* An extra product can leave the project (the web's Remove); its concept is kept, so Undo is free. */}
            {!locked && !flow.held && row.productId !== "primary" && (
              <SheetRow
                icon={Delete02Icon}
                title="Remove from this project"
                sub="Its concept is kept — putting it back is free"
                right={null}
                danger
                onClick={() => {
                  const removed = row;
                  flow.removeProduct(removed.productId);
                  onClose();
                  toast({ title: `${removed.name} removed`, action: { label: "Undo", onClick: () => flow.restoreProduct(removed.productId) } });
                }}
              />
            )}
          </div>
          {!locked && !flow.online ? (
            <p className={cn(T.meta, "text-center")}>{OFFLINE_REASON}</p>
          ) : (
            !locked && !flow.canRender && <p className={cn(T.meta, "text-center")}>You are out of credits — top them up to draw another concept.</p>
          )}
          {locked && <p className={T.meta}>This is what was built. To change it, save the build and change the product from its page.</p>}
        </>
      )}
    </Sheet>
  );
}

// ─────────────────────────── the image, full screen ───────────────────────────

export function ConceptImageViewer({ flow, productId, onClose }: { flow: ConceptFlow; productId: string | null; onClose: () => void }) {
  const panel = React.useRef<HTMLDivElement>(null);
  const row = productId ? flow.rail.rows.find((r) => r.productId === productId) : undefined;
  const open = !!row?.imageUrl;
  useDialogFocus(open, panel);
  React.useEffect(() => {
    if (!open) return;
    const app = document.getElementById("m-app");
    app?.setAttribute("inert", "");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      app?.removeAttribute("inert");
    };
  }, [open, onClose]);
  if (!open || !row?.imageUrl) return null;
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={`${row.name}, full screen`}
      data-theme="dark"
      className="fixed inset-0 z-sheet flex flex-col bg-bg-page font-sans text-text-primary motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal"
    >
      <StatusBar tone="media" />
      <header className="flex h-[56px] shrink-0 items-center justify-between gap-4 px-8">
        <span data-theme="light">
          <IconButton hierarchy="secondary" size="xl" aria-label="Close" icon={<Icon icon={Cancel01Icon} size={22} />} onClick={onClose} />
        </span>
        <p className={cn(T.bodyStrong, "truncate")}>{row.name}</p>
        <span className="w-[44px]" aria-hidden />
      </header>
      <div className="relative min-h-0 flex-1">
        <Image src={row.imageUrl} alt={`${row.name}, concept ${flow.labels.get(row.turnId) ?? "1"}`} fill sizes="100vw" className="object-contain" unoptimized />
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────── Refine ───────────────────────────

export function RefineSheet({ flow, turnId, onClose }: { flow: ConceptFlow; turnId: string | null; onClose: () => void }) {
  const [text, setText] = React.useState("");
  const turn = turnId ? flow.chat?.turns.find((t): t is AssistantTurn => t.id === turnId && t.role === "assistant") : undefined;
  const row = turn ? flow.rail.rows.find((r) => r.productId === (turn.companionOf ?? "primary")) : undefined;
  const label = turn ? flow.labels.get(turn.id) ?? "1" : "1";
  const nextIndex = turn ? (flow.chat?.turns.filter((t) => t.role === "assistant" && t.kind === "refine" && t.parentTurnId === turn.id).length ?? 0) + 1 : 1;
  const name = row?.name ?? "this concept";
  return (
    <Sheet
      open={!!turn}
      onClose={() => {
        setText("");
        onClose();
      }}
      title={`Refine ${name}`}
      description={`The result lands as Concept ${label}.${nextIndex} — the original stays. Each change costs 1 credit.`}
    >
      {turn && (
        <>
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-bg-subtle">
            {turn.imageUrl && <Image src={turn.imageUrl} alt={`${name}, concept ${label}`} fill sizes="343px" className="object-cover" unoptimized />}
          </div>
          <p className={cn(T.meta, "truncate")}>
            <span className="text-text-primary">Prompt: </span>
            {turn.prompt}
          </p>
          <div className="-mx-8 pb-2">
            <PromptBox
              value={text}
              onChange={setText}
              placeholder="Describe a change to this image…"
              sendKind="send"
              enhanceMode="change"
              canSend={flow.canRender}
              sendReason="You are out of credits — top them up to draw another concept."
              onSubmit={(t) => {
                if (!flow.refine(turn.id, t)) return false;
                setText("");
                onClose();
              }}
            />
          </div>
          <p className={cn(T.meta, "text-text-tertiary")}>Refining evolves this concept. To start over from your prompt, use Regenerate instead.</p>
        </>
      )}
    </Sheet>
  );
}

"use client";

// The pieces (Product Details 10b, 10n, 10y, 23d) and Add pieces (10p, 10pa,
// 10pb; decision D2: adding pieces is an AI build, not editing, so it works on
// a phone). The owner's object page lays the pieces out in its Build section
// (owner-page.tsx); a buyer reads them in the Build tab:
// - a buyer who owns a copy: Your copy (type and serial, use, tier, paid,
//   transaction) and Get creator support, which opens the conversation about
//   that purchase in Messages;
// - one row per piece, in the build's order and state — the piece's icon (the
//   create flow's), Ready, Failed, Building with its progress, Waiting, and for
//   the owner who can still build, Not built with + Add (nobody else reads the
//   maker's left-out pieces) — each a whole-row tap to its view-only screen;
// - Downloads as rows: the firmware, the parts list and the netlist, made from
//   this product's parts in this browser, and — when the build made its own
//   3D model for this product — Download 3D model (.glb) (CL-015, a spinner
//   while it downloads, "The 3D model couldn't be downloaded. Try again." when
//   it fails), for whoever may take them away; for anyone else "Firmware and
//   downloads come with a purchase." (O12). The owner's page opens them in a
//   sheet (`DownloadsSheet`);
// - the seed caption (the web Editor block's "Opens with version {n}'s …"),
//   which the owner's page keeps in its Build ⓘ (`useSeedCaption`).

import * as React from "react";
import Link from "next/link";
import { Add01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Spinner } from "@/components/ideeza/spinner";
import { Segmented } from "@/components/ideeza/segmented";
import { Toggle } from "@/components/ideeza/toggle";
import { fileFor, modelFileOf, save, saveBlob, type DownloadFile } from "@/components/projects/product/product-deliverables";
import { TIER_WORD } from "@/components/marketplace/purchase-dialog";
import { bomFor, specOfSource } from "@/lib/create/build-artifacts";
import { useCredits } from "@/lib/create/credits";
import { ITEM_LABELS, useCreateHistory, type BuildItemKind, type BuildProduct } from "@/lib/create/history";
import {
  OPTIMIZE_COST,
  PIECES,
  PIECE_KINDS,
  aboutTime,
  chainSeconds,
  cleanPick,
  creditsLabel,
  isLeftOut,
  pieceCost,
  pieceSeconds,
  togglePiece,
  type PiecePick,
  type PieceQuality,
} from "@/lib/create/pieces";
import { piecesOf as seedPiecesOf, seedCaptionOf } from "@/lib/manual/build-load";
import { readSeed } from "@/lib/manual/build-load-io";
import { formatDate } from "@/lib/manual/project-summary";
import { PIECE_BADGE, aboutPieceTime, hasPiecesLine, pieceLineOf, pieceRowsOf, type PieceRow, type PieceState } from "@/lib/manual/phone-product";
import { KIND_WORD } from "@/lib/market/editions";
import { USE_LABEL } from "@/lib/market/sell-flow";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { boardLabel, mcuOf } from "@/lib/spec/format";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { Eyebrow } from "../kit/eyebrow";
import { Chevron, LIST_DIVIDERS, LIST_ROW, ListCard } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { SectionHeading } from "../project/parts";
import { PIECE_ICON } from "../ai/build";
import { BuyCreditsSheet } from "./credits-sheet";
import { BANNER_LINK, CARD } from "./parts";
import { useProduct } from "./use-product";

export const BADGE_TONE: Record<PieceState, BadgeTone> = {
  ready: "success",
  failed: "error",
  building: "info",
  waiting: "neutral",
  notBuilt: "neutral",
};

/** The phone's Build list's facts, from this product's own parts. */
export function pieceFactsOf(bp: BuildProduct) {
  return { board: boardLabel(specOfSource(bp)), mcu: mcuOf(bp.parts), parts: bomFor(bp).units };
}

/** The files this product's ready pieces make, each once (the PCB and Wiring share the netlist). */
export function filesOf(bp: BuildProduct): DownloadFile[] {
  const ready = (k: BuildItemKind) => bp.items.some((i) => i.kind === k && i.status === "ready");
  const out: DownloadFile[] = [];
  for (const k of ["code", "parts", "pcb", "wiring"] as const) {
    if (!ready(k)) continue;
    const f = fileFor(k, bp);
    if (f && !out.some((x) => x.filename === f.filename)) out.push(f);
  }
  return out;
}

export type ModelDownload = {
  /** The build's own 3D model of this product, once its 3D piece is ready; null otherwise. */
  file: { url: string; filename: string } | null;
  state: "idle" | "busy" | "failed";
  run: () => void;
};

/** CL-015 · Download 3D model (.glb): the web's `modelFileOf` (only the build's main product wears
 *  the generated model; the bundled sample mesh never downloads), fetched and saved as
 *  "{product}-3d-model.glb". Whether the viewer may take it is the caller's (`downloads`). */
export function useModelDownload(): ModelDownload {
  const { job, bp } = useProduct();
  const [state, setState] = React.useState<ModelDownload["state"]>("idle");
  const ready = !!bp?.items.some((i) => i.kind === "3d" && i.status === "ready");
  const file = job && bp && ready ? modelFileOf(job, bp) : null;
  const run = () => {
    if (!file || state === "busy") return;
    setState("busy");
    void (async () => {
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(String(res.status));
        saveBlob(await res.blob(), file.filename);
        setState("idle");
      } catch {
        setState("failed");
      }
    })();
  };
  return { file, state, run };
}

export const MODEL_LABEL = "Download 3D model (.glb)";
export const MODEL_FAILED = "The 3D model couldn't be downloaded. Try again.";

/** The web Editor block's caption for the version on screen (the owner's only), or null. */
export function useSeedCaption(): string | null {
  const { project, product, version, bp, mode } = useProduct();
  return React.useMemo(() => {
    if (mode !== "owner" || !bp || !version) return null;
    let record = null;
    try {
      record = readSeed({ projectId: project.id, productId: product.id }, window.localStorage);
    } catch {
      record = null;
    }
    return seedCaptionOf(product.state, record, product.built?.ref.version ?? version.shown, seedPiecesOf(bp))?.lines.join(" ") ?? null;
  }, [mode, bp, version, project.id, product]);
}

/** The pieces as list rows, each opening its screen; Not built rows carry + Add (the owner who can build). */
export function PieceRows({ bp, onAdd }: { bp: BuildProduct; onAdd: (k: BuildItemKind) => void }) {
  const { chat, canEdit, downloads, path } = useProduct();
  const rows = pieceRowsOf(bp.items, { firmware: downloads, leftOut: canEdit });
  const facts = pieceFactsOf(bp);
  return (
    <>
      {rows.map((r) => (
        <PieceListRow
          key={r.kind}
          row={r}
          line={pieceLineOf(r, facts, { chat: chat !== null })}
          href={path(`build/${r.kind}`)}
          onAdd={r.state === "notBuilt" && canEdit ? () => onAdd(r.kind) : undefined}
        />
      ))}
    </>
  );
}

/** The buyer's Build tab. */
export function BuildTab() {
  const { bp, downloads, copies } = useProduct();
  const [adding, setAdding] = React.useState<BuildItemKind[] | null>(null);
  const model = useModelDownload();
  if (!bp) return null;
  const files = filesOf(bp);

  return (
    <div className="flex flex-col gap-12">
      {copies.length > 0 && <YourCopy />}
      <ListCard label="Pieces">
        <PieceRows bp={bp} onAdd={(k) => setAdding([k])} />
      </ListCard>
      <section aria-labelledby="pd-downloads" className="flex flex-col gap-4">
        <SectionHeading id="pd-downloads" title="Downloads" />
        {downloads ? <FileRows files={files} model={model} /> : <p className={T.body}>Firmware and downloads come with a purchase.</p>}
      </section>
      {adding && <AddPiecesSheet bp={bp} preselect={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

/** Each file as a row with its download mark; a tap saves it. The 3D model last, its spinner in
 *  place of the mark while it downloads and the web's failure line under it. */
function FileRows({ files, model }: { files: DownloadFile[]; model: ModelDownload }) {
  const glb = model.file;
  if (!files.length && !glb) return <p className={T.body}>Nothing to download yet — the files come once their pieces are ready.</p>;
  return (
    <ListCard label="Downloads">
      {files.map((f) => (
        <li key={f.filename}>
          <button type="button" onClick={() => save(f)} className={LIST_ROW}>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={cn(T.body, "text-text-primary")}>{f.label}</span>
              {!f.label.includes(f.filename) && <span className={cn(T.meta, "break-all")}>{f.filename}</span>}
            </span>
            <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
              <Icon icon={Download04Icon} size={24} />
            </span>
          </button>
        </li>
      ))}
      {glb && (
        <li>
          <button type="button" aria-busy={model.state === "busy" || undefined} onClick={model.run} className={LIST_ROW}>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={cn(T.body, "text-text-primary")}>{MODEL_LABEL}</span>
              <span className={cn(T.meta, "break-all")}>{glb.filename}</span>
              <span aria-live="polite" className={cn(T.meta, "text-text-error empty:hidden")}>
                {model.state === "failed" ? MODEL_FAILED : ""}
              </span>
            </span>
            <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
              {model.state === "busy" ? <Spinner size={24} /> : <Icon icon={Download04Icon} size={24} />}
            </span>
          </button>
        </li>
      )}
    </ListCard>
  );
}

/** The owner's Downloads, from the Build section's row. */
export function DownloadsSheet({ open, onClose, bp, model }: { open: boolean; onClose: () => void; bp: BuildProduct; model: ModelDownload }) {
  return (
    <Sheet open={open} onClose={onClose} title="Downloads">
      <div className="pb-8">
        <FileRows files={filesOf(bp)} model={model} />
      </div>
    </Sheet>
  );
}

function PieceListRow({ row, line, href, onAdd }: { row: PieceRow; line: string; href: string; onAdd?: () => void }) {
  return (
    <li className="flex items-center">
      <Link href={href} className={cn(LIST_ROW, "min-w-0 flex-1")}>
        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
          <Icon icon={PIECE_ICON[row.kind]} size={24} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.body, "text-text-primary")}>{ITEM_LABELS[row.kind]}</span>
          <span className={T.meta}>{line}</span>
          {row.state === "building" && <ProgressBar value={row.progress} label={`${ITEM_LABELS[row.kind]} build`} className="mt-2" />}
        </span>
        {/* A Not built row's line and its Add button already say it: no third "Not built". */}
        {!onAdd && (
          <>
            <Badge tone={BADGE_TONE[row.state]} className="shrink-0">
              {PIECE_BADGE[row.state]}
            </Badge>
            <Chevron />
          </>
        )}
      </Link>
      {onAdd && (
        <div className="shrink-0 pr-8">
          <Button hierarchy="secondary" size="xl" aria-label={`Add ${ITEM_LABELS[row.kind]}`} iconLeading={<Icon icon={Add01Icon} size={20} />} onClick={onAdd}>
            Add
          </Button>
        </div>
      )}
    </li>
  );
}

// ─────────────────────────── Your copy (23d) ───────────────────────────

/** 23d: a small "Your copy" eyebrow over plain rows — the same words the buy sheet used. */
function YourCopy() {
  const { project, view, copies, buyerId } = useProduct();
  const latest = copies.reduce((a, s) => (s.at > a.at ? s : a), copies[0]);
  const item = latest.item;
  if (item.nft === "main") return null;
  const track = view.editions.find((t) => t.id === item.trackId);
  const support = buyerId
    ? `/m${startHref({ kind: "direct", to: ME, projectId: project.id, about: { kind: "purchase", saleId: latest.id } }, buyerId)}`
    : null;
  const rows: [string, string][] = [
    ["Type", `${KIND_WORD[item.nft]} NFT · #${item.serial}${track ? ` of ${track.supply.total}` : ""}`],
    ["Use", USE_LABEL[item.use]],
    ["Tier", TIER_WORD[item.tier]],
    ["Paid", `${formatAmount(latest.price, latest.token)} · ${formatDate(latest.at)}`],
    ["Transaction", shortAddress(latest.txHash)],
  ];
  return (
    <section aria-labelledby="pd-copy" className="flex flex-col gap-3">
      <Eyebrow as="h2" id="pd-copy" tone="tertiary">
        Your copy
      </Eyebrow>
      <dl className={cn("flex flex-col", LIST_DIVIDERS)}>
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-6 py-4">
            <dt className={cn(T.body, "shrink-0")}>{k}</dt>
            <dd className={cn(T.body, "min-w-0 break-words text-right text-text-primary")}>{v}</dd>
          </div>
        ))}
      </dl>
      {copies.length > 1 && <p className={T.meta}>You hold {copies.length} copies of this product; this is the newest.</p>}
      {support && (
        <Link href={support} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "mt-3 w-full border-solid")}>
          Get creator support
        </Link>
      )}
    </section>
  );
}

// ─────────────────────────── Add pieces (10p, 10pa, 10pb) ───────────────────────────

/** The added pieces' own ledger entry — one per press, never the build's (the web dialog's). */
function addChargeId(buildId: string): string {
  return `${buildId}:add:${Date.now()}`;
}

export function AddPiecesSheet({ bp, preselect, onClose }: { bp: BuildProduct; preselect: BuildItemKind[]; onClose: () => void }) {
  const { job, name } = useProduct();
  const { addBuildPieces } = useCreateHistory();
  const { hydrated, balance, charge } = useCredits();
  const toast = useToast();
  const [buying, setBuying] = React.useState(false);

  // What the build already has (ready or on its way): these stay ticked, so what is added fits them.
  const has = PIECE_KINDS.filter((k) => {
    const it = bp.items.find((i) => i.kind === k);
    return !!it && it.status !== "skipped";
  });
  // 10p's sentence names only what is ready, in its own lower-case words.
  const hasLine = hasPiecesLine(bp.items);
  const open = PIECE_KINDS.filter((k) => {
    const it = bp.items.find((i) => i.kind === k);
    return k !== "parts" && !!it && isLeftOut(it);
  });
  const [pick, setPick] = React.useState<PiecePick>(() => {
    const p = cleanPick(undefined);
    for (const k of PIECE_KINDS) p[k] = { ...p[k], on: has.includes(k) || preselect.includes(k) };
    let out = p;
    for (const k of preselect) {
      for (const n of PIECES[k].needs) if (!out[n].on) out = { ...out, [n]: { ...out[n], on: true } };
    }
    return out;
  });
  const [note, setNote] = React.useState<string | null>(null);

  const chosen = open.filter((k) => pick[k].on);
  const cost = chosen.reduce((n, k) => n + pieceCost(k, pick[k]), 0);
  const seconds = chainSeconds(Object.fromEntries(chosen.map((k) => [k, pieceSeconds(k, pick[k])])));
  const short = hydrated && balance < cost;

  const toggle = (k: BuildItemKind) => {
    const r = togglePiece(pick, k);
    const next = { ...r.pick };
    for (const h of has) next[h] = { ...next[h], on: true };
    setPick(next);
    setNote(r.note);
  };
  const build = () => {
    if (!job || !chosen.length || short) return;
    if (!charge(addChargeId(job.id), cost, "build")) return;
    addBuildPieces(
      job.id,
      bp.id,
      chosen.map((k) => ({ kind: k, quality: pick[k].quality, optimize: pick[k].optimize })),
    );
    toast({ title: `Building ${chosen.length === 1 ? "1 piece" : `${chosen.length} pieces`}` });
    onClose();
  };
  const count = chosen.length === 0 ? "Nothing picked" : chosen.length === 1 ? "1 piece" : `${chosen.length} pieces`;
  const youHave = hydrated ? `You have ${balance} ${balance === 1 ? "credit" : "credits"}` : null;

  return (
    <>
      <Sheet
        open={!buying}
        onClose={onClose}
        title={`Add pieces to ${name}`}
        description={hasLine ? `${hasLine} Each piece below is made for ${has.length > 1 ? "those" : "it"}, so it fits.` : "Each piece below is made from this product's concept and spec."}
        actions={
          <>
            <Button size="xl" className="w-full" disabled={!chosen.length || short} onClick={build}>
              {chosen.length === 1 ? "Build 1 piece" : chosen.length ? `Build ${chosen.length} pieces` : "Build"}
            </Button>
          </>
        }
      >
        <ul className={CARD}>
          {open.map((k) => {
            const p = PIECES[k];
            const c = pick[k];
            const shown = c.on ? c : { quality: "medium" as const, optimize: false };
            return (
              <li key={k} className="flex flex-col gap-4 p-6">
                <label className="relative flex cursor-pointer items-start gap-4">
                  <input type="checkbox" className="sr-only" checked={c.on} onChange={() => toggle(k)} />
                  <Checkbox checked={c.on} decorative className="mt-1" />
                  {/* 10p: the price and time sit right of the name (under it when the row is too narrow). */}
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className={T.name}>{p.name}</span>
                    <span className={T.meta}>
                      {creditsLabel(pieceCost(k, shown))} · {aboutPieceTime(pieceSeconds(k, shown))}
                    </span>
                  </span>
                </label>
                <p className={T.meta}>{p.addsLater}</p>
                {c.on && p.quality && (
                  <div className="flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-2">
                    <span className={cn(T.meta, "w-[64px] shrink-0")}>Quality</span>
                    <Segmented<PieceQuality>
                      label={`${p.name} quality`}
                      size="md"
                      value={c.quality}
                      options={[
                        { value: "medium", label: "Medium" },
                        { value: "high", label: `High · +${p.price.high - p.price.medium}` },
                      ]}
                      onChange={(q) => setPick({ ...pick, [k]: { ...c, quality: q } })}
                    />
                  </div>
                )}
                {c.on && p.optimize && (
                  <label className="relative flex min-h-[44px] cursor-pointer items-center gap-4">
                    <span className={cn(T.meta, "w-[64px] shrink-0")}>Optimize</span>
                    <Toggle
                      checked={c.optimize}
                      onChange={() => setPick({ ...pick, [k]: { ...c, optimize: !c.optimize } })}
                      aria-label={`Optimize ${p.name} — ${p.optimize}, +${OPTIMIZE_COST} credit`}
                    />
                    <span className={cn(T.meta, "min-w-0 flex-1")}>
                      {p.optimize} · +{OPTIMIZE_COST} credit
                    </span>
                  </label>
                )}
              </li>
            );
          })}
        </ul>
        {note && (
          <p role="status" className={T.meta}>
            {note}
          </p>
        )}
        <p className={cn(T.body, "pb-4 text-text-primary")}>
          <span className={T.name}>{count}</span>
          {chosen.length ? ` · ${creditsLabel(cost)} · ${aboutTime(seconds)}` : ""}
          {youHave ? ` · ${youHave}` : ""}
        </p>
        {short && (
          <div className="pb-4">
            <Banner
              tone="error"
              title="Not enough credits"
              action={
                <button type="button" onClick={() => setBuying(true)} className={BANNER_LINK}>
                  Buy credits
                </button>
              }
            >
              {`${chosen.length === 1 ? "This piece needs" : `These ${chosen.length} pieces need`} ${creditsLabel(cost)}. You have ${balance}.`}
            </Banner>
          </div>
        )}
      </Sheet>
      {buying && <BuyCreditsSheet open need={cost} onClose={() => setBuying(false)} />}
    </>
  );
}

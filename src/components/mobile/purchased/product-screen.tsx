"use client";

// A product a bought copy covers, on the phone (CL-035 › Your products; the web's product card with Overview and
// the piece tabs this kind opens), as a native object page and its piece screens:
// · the product `…/products/<productId>?nft=physical|virtual`: its video or picture first, the name, "{kind} ·
//   from {project}" and its summary; "What your {kind} opens" — a row per piece this kind opens that the build
//   has (Physical: 3D model, PCB, Firmware, Wiring, Assembly, Parts; Virtual: 3D model, Parts), each pushing the
//   piece; a Virtual copy's note on what it leaves out; then the specs as a grouped list;
// · a piece `…/products/<productId>/<piece>?nft=…`: the piece view only — the board and the wiring map (each
//   scrolls inside its box), Pin to pin as rows, the firmware read-only with line numbers, the parts list (its
//   summary, then a row per part), the 3D model and the assembly in the phone's 3D viewer — then "What this
//   covers". Its files come from each copy's Download files (copy-screen.tsx), which takes a unit (owner,
//   2026-11-25), so a piece screen has no download of its own.
// A piece this kind doesn't open, or the build doesn't have, is a state card with Back to the product.

import * as React from "react";
import { coversFor, PcbPreview, WiringPreview } from "@/components/create/deliverable-previews";
import { usePurchased } from "@/components/projects/purchased/use-purchased";
import { bomFor, firmwareFor, isSampleModel, netsFor } from "@/lib/create/build-artifacts";
import type { BuildItemKind, BuildJob, BuildProduct } from "@/lib/create/history";
import type { PostProduct } from "@/lib/innovations/types";
import { KIND_NAME, wholeProjectOnly } from "@/lib/market/purchases";
import type { EditionKind } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { PIECE_ICON } from "../ai/build";
import { LIST_CARD, LIST_DIVIDERS, ListCard, ListRow } from "../kit/list";
import { EmptyState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { ModelPiece } from "../product/model-view";
import { MediaHero } from "../project/sample-project";
import { InfoRow } from "../project/parts";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { coveredOf, heldKindsOf, NothingBought, piecesOf, PurchasedLoading, VIRTUAL_NOTE, WithPost, type PieceWord, type PostRead } from "./parts";
import { piecePath, productPath, PURCHASED_TAB_HREF, purchasedKindHref, purchasedPhoneHrefOf } from "./paths";

type Found = { read: PostRead; product: PostProduct; index: number; kind: EditionKind };

/** The purchase, its post and the product, for a kind the buyer holds that covers it; else why not. */
function useFound(id: string, productId: string, kindParam: EditionKind | null, body: (f: Found) => React.ReactNode, back: (kind: EditionKind | null) => string) {
  const { ready, buyer, purchases } = usePurchased();
  if (!ready) return <PurchasedLoading back={back(kindParam)} />;
  const p = purchases.find((x) => x.id === id);
  if (!p || wholeProjectOnly(p)) return <NothingBought buyerName={buyer.name} back={p ? purchasedPhoneHrefOf(p) : PURCHASED_TAB_HREF} />;
  const held = heldKindsOf(p);
  const kind = kindParam && held.includes(kindParam) ? kindParam : held[0];
  return (
    <WithPost p={p} loading={<PurchasedLoading back={back(kind ?? null)} />} missing={<NothingBought buyerName={buyer.name} />}>
      {(read) => {
        const hit = kind ? coveredOf(p, kind, read.post).find(({ x }) => x.id === productId) : undefined;
        if (!kind || !hit) {
          return (
            <Screen top={<TopBar back={purchasedKindHref(id, kind ?? null)} />} className="px-8 pb-8">
              <EmptyState
                title="Your copies don’t cover this product"
                body={`It isn’t one of the products your copies of ${p.name} open.`}
                action={{ label: `Back to ${p.name}`, href: purchasedKindHref(id, kind ?? null) }}
              />
            </Screen>
          );
        }
        return body({ read, product: hit.x, index: hit.i, kind });
      }}
    </WithPost>
  );
}

// ─────────────────────────── the product ───────────────────────────

export function PurchasedProductScreen({ id, productId, kind }: { id: string; productId: string; kind: EditionKind | null }) {
  return useFound(id, productId, kind, (f) => <ProductBody id={id} {...f} />, (k) => purchasedKindHref(id, k));
}

function ProductBody({ id, read, product, index, kind }: Found & { id: string }) {
  const build = read.buildOf(index);
  const pieces = piecesOf(kind, build);
  const video = product.video?.kind === "video" ? product.video : null;
  return (
    <Screen top={<TopBar back={purchasedKindHref(id, kind)} title={product.name} />}>
      <OfflineBanner />
      <MediaHero video={video ? { src: video.src, alt: video.alt } : null} picture={video?.poster ?? product.image ?? build?.job.conceptImageUrl ?? null} name={product.name} />
      <div className="flex flex-col gap-12 px-8 pb-12">
        <header className="flex flex-col gap-2">
          <h1 className={cn(T.title, "break-words")}>{product.name}</h1>
          <p className={T.meta}>
            {KIND_NAME[kind]} · from {read.post.title}
          </p>
          {product.summary && <p className={cn(T.body, "pt-2")}>{product.summary}</p>}
        </header>

        <section aria-labelledby="pp-pieces" className="flex flex-col gap-4">
          <h2 id="pp-pieces" className={T.section}>
            What your {KIND_NAME[kind]} opens
          </h2>
          {pieces.length ? (
            <ListCard label={`What your ${KIND_NAME[kind]} opens`}>
              {pieces.map((t) => (
                <ListRow key={t.id} icon={PIECE_ICON[t.id]} title={t.label} meta={pieceLineOf(t.id, build?.bp ?? null)} href={piecePath(id, product.id, t.id, kind)} />
              ))}
            </ListCard>
          ) : (
            <p className={T.body}>This product’s build has no pieces to open here.</p>
          )}
          {kind === "virtual" && <p className={T.meta}>{VIRTUAL_NOTE}</p>}
        </section>

        {product.specs.length > 0 && (
          <section aria-labelledby="pp-specs" className="flex flex-col gap-4">
            <h2 id="pp-specs" className={T.section}>
              Specs
            </h2>
            <ul aria-label="Specs" className={cn(LIST_CARD, "shrink-0")}>
              {product.specs.map((s) => (
                <InfoRow key={s.label} label={s.label} value={s.value} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </Screen>
  );
}

/** A piece row's one line: what is in it. */
function pieceLineOf(kind: BuildItemKind, bp: BuildProduct | null): string | undefined {
  if (!bp) return undefined;
  if (kind === "parts") {
    const bom = bomFor(bp);
    return `${bom.unique} parts · ${bom.units} units`;
  }
  if (kind === "code") return firmwareFor(bp).filename;
  if (kind === "wiring") return `${netsFor(bp).wires.length} wires`;
  return undefined;
}

// ─────────────────────────── a piece ───────────────────────────

export function PurchasedPieceScreen({ id, productId, piece, kind }: { id: string; productId: string; piece: string; kind: EditionKind | null }) {
  return useFound(id, productId, kind, (f) => <PieceBody id={id} piece={piece} {...f} />, (k) => (k ? productPath(id, productId, k) : purchasedKindHref(id, null)));
}

function PieceBody({ id, piece, read, product, index, kind }: Found & { id: string; piece: string }) {
  const build = read.buildOf(index);
  const back = productPath(id, product.id, kind);
  const word: PieceWord | undefined = piecesOf(kind, build).find((t) => t.id === piece);
  if (!build || !word) {
    return (
      <Screen top={<TopBar back={back} title="Piece" />} className="px-8 pb-8">
        <EmptyState
          title={`Your ${KIND_NAME[kind]} doesn’t open this`}
          body={kind === "virtual" ? VIRTUAL_NOTE : "It isn’t a piece of this product’s build."}
          action={{ label: `Back to ${product.name}`, href: back }}
        />
      </Screen>
    );
  }
  const item = build.bp.items.find((i) => i.kind === word.id);
  const ready = item?.status === "ready";
  return (
    <Screen top={<TopBar back={back} title={word.label} />}>
      <div className="flex flex-col gap-8 px-8 pb-12">
        <p className={T.meta}>
          {product.name} · {word.label} files are yours · view only on a phone
        </p>
        {ready ? (
          <ReadyPiece kind={word.id} job={build.job} bp={build.bp} />
        ) : (
          <EmptyState title="This piece isn’t ready in this build" body="The creator’s build didn’t finish it." />
        )}
        {ready && <Covers kind={word.id} job={build.job} bp={build.bp} />}
      </div>
    </Screen>
  );
}

function Covers({ kind, job, bp }: { kind: BuildItemKind; job: BuildJob; bp: BuildProduct }) {
  const lines = coversFor(kind, bp, isSampleModel(job.modelGlbUrl), bp.id !== "primary");
  if (!lines.length) return null;
  return (
    <section aria-labelledby="pp-covers" className="flex flex-col gap-4">
      <h2 id="pp-covers" className={T.section}>
        What this covers
      </h2>
      <ListCard label="What this covers">
        {lines.map((l) => (
          <ListRow key={l} title={l} />
        ))}
      </ListCard>
    </section>
  );
}

const SCROLL_BOX = "max-h-[420px] overflow-auto rounded-xl border-[length:var(--border-width-1)] border-solid border-border outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

function ReadyPiece({ kind, job, bp }: { kind: BuildItemKind; job: BuildJob; bp: BuildProduct }) {
  switch (kind) {
    case "pcb":
      return (
        <div className="flex flex-col gap-3">
          <div role="region" aria-label="PCB layout, scrollable" tabIndex={0} className={SCROLL_BOX}>
            <div className="min-w-[560px]">
              <PcbPreview job={bp} />
            </div>
          </div>
          <p className={T.meta}>Scroll to see all of it.</p>
        </div>
      );
    case "wiring":
      return (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div role="region" aria-label="Wiring map, scrollable" tabIndex={0} className={SCROLL_BOX}>
              <div className="min-w-[560px]">
                <WiringPreview job={bp} />
              </div>
            </div>
            <p className={T.meta}>Scroll to see all of it.</p>
          </div>
          <PinRows bp={bp} />
        </div>
      );
    case "code":
      return <CodeView bp={bp} />;
    case "parts":
      return <PartsRows bp={bp} />;
    case "3d":
    case "assembly":
      return <ModelPiece job={job} product={bp} kind={kind} />;
  }
}

function PinRows({ bp }: { bp: BuildProduct }) {
  const nets = netsFor(bp);
  const name = new Map(nets.nodes.map((n) => [n.id, n.label]));
  const short = (ref: string) => {
    const label = name.get(ref);
    return label && label !== ref ? `${ref} · ${label}` : ref;
  };
  return (
    <section aria-labelledby="pp-pins" className="flex flex-col gap-4">
      <h2 id="pp-pins" className={T.section}>
        Pin to pin
      </h2>
      <ul aria-label="Pin to pin: net, from, to" className={cn(LIST_CARD, LIST_DIVIDERS)}>
        {nets.wires.map((w, i) => (
          <li key={`${w.label}-${i}`} className="flex flex-col gap-1 px-8 py-6">
            <span className={cn(T.rowTitle, "font-mono")}>{w.label}</span>
            <span className={cn(T.meta, "break-words")}>
              {short(w.from)} → {short(w.to)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CodeView({ bp }: { bp: BuildProduct }) {
  const fw = firmwareFor(bp);
  return (
    <div className="flex flex-col gap-3">
      <div role="region" aria-label="Firmware code, scrollable" tabIndex={0} className="overflow-hidden rounded-xl border-[length:var(--border-width-1)] border-solid border-border outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        <div className="flex items-center justify-between gap-4 border-b-[length:var(--border-width-1)] border-solid border-border bg-bg-subtle px-6 py-4">
          <span className={cn(T.meta, "truncate font-mono text-text-primary")}>{fw.filename}</span>
          <span className={cn(T.meta, "shrink-0")}>{fw.lines.length} lines</span>
        </div>
        <div className="max-h-[480px] overflow-auto bg-bg-surface">
          <pre className={cn(T.meta, "flex font-mono")}>
            <code aria-hidden className="select-none border-r-[length:var(--border-width-1)] border-solid border-border px-4 py-4 text-right text-text-tertiary">
              {fw.lines.map((_, i) => (
                <span key={i} className="block">
                  {i + 1}
                </span>
              ))}
            </code>
            <code className="px-4 py-4 text-text-primary">
              {fw.lines.map((l, i) => (
                <span key={i} className="block whitespace-pre">
                  {l === "" ? " " : l}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>
      <p className={T.meta}>Scroll sideways for long lines.</p>
    </div>
  );
}

function PartsRows({ bp }: { bp: BuildProduct }) {
  const bom = bomFor(bp);
  const summary = [
    { label: "Unique parts", value: String(bom.unique) },
    { label: "Total units", value: String(bom.units) },
    { label: "Active devices", value: String(bom.active) },
    { label: "Passives", value: String(bom.passives) },
    { label: "Connectors & mech", value: String(bom.connectors) },
  ];
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="pp-summary" className="flex flex-col gap-4">
        <h2 id="pp-summary" className={T.section}>
          Summary
        </h2>
        <dl className={cn(LIST_CARD, "grid grid-cols-3 gap-x-6 gap-y-6 p-8")}>
          {summary.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col gap-1">
              <dt className={T.micro}>{f.label}</dt>
              <dd className={cn(T.rowTitle, "tabular-nums")}>{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="pp-parts" className="flex flex-col gap-4">
        <h2 id="pp-parts" className={T.section}>
          Parts
        </h2>
        <ul aria-label="Parts list" className={cn(LIST_CARD, LIST_DIVIDERS)}>
          {bom.rows.map((r) => (
            <li key={r.ref} className="flex items-center gap-6 px-8 py-6">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.body, "break-words text-text-primary")}>{r.name}</span>
                <span className={T.meta}>
                  <span className="font-mono">{r.ref}</span> · {r.category}
                </span>
              </span>
              <span className={cn(T.rowTitle, "shrink-0 tabular-nums")} aria-label={`Quantity ${r.qty}`}>
                ×{r.qty}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

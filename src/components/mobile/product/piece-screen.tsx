"use client";

// One piece of the product, full screen and view only (Product Details 10g,
// 10i–10m, 10o, 10ya, 33a–33c; D3: nothing is edited on a phone):
// `/m/projects/<id>/products/<productId>/build/<piece>`. Under the bar, one
// line: "{product} · version {n} · view only on a phone" (a buyer without a
// copy: "files come with a copy"); then the piece in its state —
// · ready: the web review's own previews (the board and the wiring map, with
//   pinch to zoom; the wiring's Pin to pin as rows, net over from → to), the
//   firmware read-only with line numbers (it scrolls sideways), the parts list
//   (its Summary first as a facts grid, then each part as a row: name, "U1 ·
//   Microcontroller", ×qty), the 3D Module and Assembly in the phone's 3D
//   viewer;
// · failed (10o), waiting (33b), still being built (33c, with its bar) and
//   not built (33a: what it adds, its price and time) as the kit's clean
//   states, their one action in the Bottom action bar — Rebuild this piece
//   (the review's free retry) with Open chat, or Add pieces (D2);
// then "What this covers" (`coversFor`, the web's words) as a grouped list,
// and the ready piece's file as the bar's primary — or, for a buyer, "Buy a
// copy to download" (off in a preview, with the reason). The 3D Module's file
// is the build's own 3D model, Download 3D model (.glb) (CL-015), for whoever
// may take the files, when the build made one for this product. A piece the build
// doesn't have is a state card with Back to Build; a buyer without a copy who
// opens the firmware is told it comes with a copy. Back is the top bar's
// (back, or replace to the product's Build section): it never pushes, so Back
// can't loop. A Feed sample opens its parts list and says it has no 3D file.

import * as React from "react";
import { Clock01Icon, Download04Icon, Loading03Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { coversFor, PcbPreview, WiringPreview } from "@/components/create/deliverable-previews";
import { fileFor, save } from "@/components/projects/product/product-deliverables";
import { bomFor, firmwareFor, isSampleModel, netsFor } from "@/lib/create/build-artifacts";
import { ITEM_LABELS, useCreateHistory, type BuildItem, type BuildItemKind, type BuildProduct } from "@/lib/create/history";
import { PIECES, isLeftOut } from "@/lib/create/pieces";
import { offMarketNow, sampleProjectOf } from "@/lib/manual/phone-project";
import { copiesFromOf, notBuiltCostLine, notBuiltTitle, parsePiece, phoneProductPath } from "@/lib/manual/phone-product";
import { trackCardOf } from "@/lib/market/editions";
import { formatAmount } from "@/lib/wallet/money";
import type { PostProduct } from "@/lib/innovations/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { LIST_CARD, ListCard, ListRow } from "../kit/list";
import { EmptyState, ErrorState } from "../kit/state";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { AddPiecesSheet, MODEL_FAILED, MODEL_LABEL, useModelDownload } from "./build-tab";
import { BuyCopy, PREVIEW_BUY_OFF } from "./buy";
import { ModelPiece } from "./model-view";
import { useListedCopies } from "./overview";
import { PIECE_ICON } from "../ai/build";
import { CARD, FactGrid } from "./parts";
import { OffMarket, PieceMissing, ProductLoading, ProductMissing, ProjectMissing } from "./states";
import { ProductProvider, useProduct, useProductData } from "./use-product";

export function PieceScreen({ id, productId, piece }: { id: string; productId: string; piece: string }) {
  const kind = parsePiece(piece);
  const data = useProductData(id, productId);
  if (data.state === "loading") return <ProductLoading />;
  if (data.state === "missing") {
    const sample = data.market ? null : sampleProjectOf(id);
    const sp = sample?.products.find((p) => p.id === productId) ?? null;
    if (sample && sp && kind) return <SamplePiece projectId={id} product={sp} kind={kind} />;
    return <ProjectMissing />;
  }
  if (data.state === "no-product") return <ProductMissing projectName={data.projectName} back={`/m/projects/${encodeURIComponent(data.projectId)}?tab=products`} />;
  const { ctx } = data;
  // A piece is part of the product's page: a paused listing is off the marketplace here too (BUY-4).
  if (ctx.mode === "market" && offMarketNow({ listing: ctx.view.listing.kind, projectId: ctx.project.id, sales: ctx.view.sales, buyerId: ctx.buyerId })) {
    return <OffMarket paused />;
  }
  return (
    <ProductProvider value={ctx}>
      <PieceView kind={kind} />
    </ProductProvider>
  );
}

function PieceView({ kind }: { kind: BuildItemKind | null }) {
  const { job, bp, name, version, downloads, mode, path, canEdit } = useProduct();
  const back = path("", { tab: "build" });
  const item = kind && bp ? (bp.items.find((i) => i.kind === kind) ?? null) : null;
  // A left-out piece is the maker's to add: anyone who can't build finds it isn't in the build.
  const shown = item && (item.status !== "skipped" || (isLeftOut(item) && canEdit)) ? item : null;
  // A buyer without a copy never reads the firmware (O12): its row isn't on the Build list either.
  const hiddenCode = kind === "code" && !downloads && !!shown;
  if (hiddenCode) {
    // 10ya: the firmware exists; it comes with a copy — the same footer as the other pieces.
    return (
      <Screen top={<TopBar back={back} title={ITEM_LABELS.code} />} footer={<BuyFooter />} className="px-8 pb-8">
        <div className="flex flex-col gap-8">
          <p className={T.meta}>{`${name} · version ${version?.shown ?? 1} · files come with a copy`}</p>
          <PieceMissing title="The firmware comes with a copy" body={`Buy a copy of ${name} to read its code and download it.`} back={back} />
        </div>
      </Screen>
    );
  }
  if (!kind || !job || !bp || !shown) {
    return (
      <Screen top={<TopBar back={back} title={kind ? ITEM_LABELS[kind] : "Piece"} />} className="px-8 pb-8">
        <PieceMissing title="This piece isn’t in this build" body="Its link doesn’t match a piece of this product’s build." back={back} />
      </Screen>
    );
  }
  const state = isLeftOut(shown) ? "notBuilt" : shown.status;
  const ready = state === "ready";
  const sub = `${name} · version ${version?.shown ?? 1} · ${downloads ? "view only on a phone" : "files come with a copy"}`;
  return (
    <Screen top={<TopBar back={back} title={ITEM_LABELS[kind]} />} footer={<PieceFooter kind={kind} bp={bp} state={state} />}>
      <div className="flex flex-col gap-8 px-8 pb-12">
        <p className={T.meta}>{sub}</p>
        {state === "notBuilt" ? (
          <div className="flex flex-col items-center">
            <EmptyState icon={PIECE_ICON[kind]} title={notBuiltTitle(kind)} body={PIECES[kind].addsLater} className="pb-4" />
            <p className={cn(T.meta, "text-center")}>{notBuiltCostLine(kind)}</p>
          </div>
        ) : state === "failed" ? (
          <ErrorState
            title="This piece failed in this build"
            body={
              job.failure === "system"
                ? "The whole build stopped on our side — try it again from the chat."
                : "Rebuild it, or ask in the chat what went wrong. The other pieces are unaffected, and retrying costs no extra credits."
            }
          />
        ) : state === "building" ? (
          <div className="flex flex-col items-center gap-4">
            {/* 33c: the Build row's own sentence, then that the screen may be left. */}
            <EmptyState
              icon={Loading03Icon}
              title="Still being built"
              body={`This piece is still being built — ${Math.round(shown.progress)}%. You can leave this screen.`}
              className="pb-0"
            />
            <ProgressBar value={shown.progress} label={`${ITEM_LABELS[kind]} build`} className="w-full" />
          </div>
        ) : state === "pending" ? (
          <EmptyState icon={Clock01Icon} title="Waiting to be built" body={`This piece is waiting to be built. ${waitingLine(kind, bp)}`} />
        ) : (
          <ReadyPiece kind={kind} bp={bp} />
        )}
        {mode !== "owner" && !downloads && !ready ? null : <Covers kind={kind} bp={bp} />}
      </div>
    </Screen>
  );
}

/** What a waiting piece waits for: the pieces it is made from that aren't ready yet. */
function waitingLine(kind: BuildItemKind, bp: BuildProduct): string {
  const before = PIECES[kind].needs.filter((n) => n !== "parts" && bp.items.some((i) => i.kind === n && i.status !== "ready" && i.status !== "skipped"));
  return before.length ? `It starts once the ${before.map((k) => PIECES[k].name).join(" and ")} ${before.length === 1 ? "is" : "are"} done.` : "It starts once the build reaches it.";
}

function Covers({ kind, bp }: { kind: BuildItemKind; bp: BuildProduct }) {
  const { job } = useProduct();
  const lines = coversFor(kind, bp, isSampleModel(job?.modelGlbUrl), bp.id !== "primary");
  return (
    <section aria-labelledby="pc-covers" className="flex flex-col gap-4">
      <h2 id="pc-covers" className={T.section}>
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

// ─────────────────────────── a ready piece ───────────────────────────

function ReadyPiece({ kind, bp }: { kind: BuildItemKind; bp: BuildProduct }) {
  const { job } = useProduct();
  switch (kind) {
    case "pcb":
      return (
        <div className="flex flex-col gap-3">
          <Zoomable label="PCB layout, scrollable">
            <PcbPreview job={bp} />
          </Zoomable>
          <p className={T.meta}>Pinch to zoom.</p>
        </div>
      );
    case "wiring":
      return (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Zoomable label="Wiring map, scrollable">
              <WiringPreview job={bp} />
            </Zoomable>
            <p className={T.meta}>Pinch to zoom.</p>
          </div>
          <PinTable bp={bp} />
        </div>
      );
    case "code":
      return <CodeView bp={bp} />;
    case "parts":
      return <PartsTable bp={bp} />;
    case "3d":
    case "assembly":
      return job ? <ModelPiece job={job} product={bp} kind={kind} /> : null;
  }
}

/** A drawing that pinches to zoom (1×–3×) and scrolls inside its box; a double tap toggles 2×.
 *  The point between the fingers (or under the double tap) stays where it was. */
function Zoomable({ label, children }: { label: string; children: React.ReactNode }) {
  const [scale, setScale] = React.useState(1);
  const box = React.useRef<HTMLDivElement>(null);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const start = React.useRef<{ d: number; s: number } | null>(null);
  /** After a scale change: the scroll that keeps this content point under this screen point. */
  const anchor = React.useRef<{ fx: number; fy: number; cx: number; cy: number } | null>(null);
  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const zoomAt = (next: number, clientX: number, clientY: number) => {
    const el = box.current;
    if (!el || next === scale) return;
    const r = el.getBoundingClientRect();
    const cx = clientX - r.left;
    const cy = clientY - r.top;
    // The point under the fingers as a fraction of the content at today's scale.
    anchor.current = {
      fx: (el.scrollLeft + cx) / el.scrollWidth,
      fy: (el.scrollTop + cy) / el.scrollHeight,
      cx,
      cy,
    };
    setScale(next);
  };
  React.useLayoutEffect(() => {
    const el = box.current;
    const a = anchor.current;
    if (!el || !a) return;
    anchor.current = null;
    el.scrollLeft = a.fx * el.scrollWidth - a.cx;
    el.scrollTop = a.fy * el.scrollHeight - a.cy;
  }, [scale]);
  return (
    <div
      ref={box}
      role="region"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) start.current = { d: dist(), s: scale };
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2 && start.current && start.current.d > 0) {
          const [a, b] = [...pointers.current.values()];
          zoomAt(Math.min(3, Math.max(1, (start.current.s * dist()) / start.current.d)), (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) start.current = null;
      }}
      onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      onDoubleClick={(e) => zoomAt(scale > 1 ? 1 : 2, e.clientX, e.clientY)}
      className="max-h-[420px] touch-pan-x touch-pan-y overflow-auto rounded-xl border-[length:var(--border-width-1)] border-solid border-border outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <div style={{ width: `${scale * 100}%` }}>{children}</div>
    </div>
  );
}

function PinTable({ bp }: { bp: BuildProduct }) {
  const nets = netsFor(bp);
  const name = new Map(nets.nodes.map((n) => [n.id, n.label]));
  const short = (ref: string) => {
    const label = name.get(ref);
    return label && label !== ref ? `${ref} · ${label}` : ref;
  };
  return (
    <section aria-labelledby="pc-pins" className="flex flex-col gap-4">
      <h2 id="pc-pins" className={T.section}>
        Pin to pin
      </h2>
      {/* Each wire a row: its net, then from → to (the web table's Net · From · To). */}
      <ul aria-label="Pin to pin: net, from, to" className={CARD}>
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
      <p className={T.meta}>Scroll sideways for long lines. The code opens to edit on a computer.</p>
    </div>
  );
}

function PartsTable({ bp }: { bp: BuildProduct }) {
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
      <section aria-labelledby="pc-summary" className="flex flex-col gap-4">
        <h2 id="pc-summary" className={T.section}>
          Summary
        </h2>
        <FactGrid label="Summary" facts={summary} />
      </section>
      <section aria-labelledby="pc-parts" className="flex flex-col gap-4">
        <h2 id="pc-parts" className={T.section}>
          Parts
        </h2>
        {/* Each part a row (the web table's Ref · Part · Category · Qty). */}
        <ul aria-label="Parts list" className={CARD}>
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

// ─────────────────────────── the footer ───────────────────────────

/** The screen's one action, in the thumb zone: the ready piece's file (or Buy a copy to download),
 *  Rebuild this piece with Open chat for a failed one, Add pieces for one that isn't built. */
function PieceFooter({ kind, bp, state }: { kind: BuildItemKind; bp: BuildProduct; state: BuildItem["status"] | "notBuilt" }) {
  const { downloads, job, chat, canEdit } = useProduct();
  const { retryBuildItem } = useCreateHistory();
  const toast = useToast();
  const [adding, setAdding] = React.useState(false);
  const model = useModelDownload();
  if (state === "failed") {
    const rebuild = canEdit && job?.failure !== "system" && job;
    if (!rebuild && !chat) return null;
    return (
      <BottomBar>
        {rebuild && (
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              retryBuildItem(job.id, kind, bp.id);
              toast({ title: `Rebuilding ${ITEM_LABELS[kind]}` });
            }}
          >
            Rebuild this piece
          </Button>
        )}
        {chat && (
          <Link href={`/m/ai/chat/${encodeURIComponent(chat.id)}`} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full border-solid")}>
            Open chat
          </Link>
        )}
      </BottomBar>
    );
  }
  if (state === "notBuilt") {
    if (!canEdit) return null;
    return (
      <BottomBar>
        <Button size="xl" className="w-full" onClick={() => setAdding(true)}>
          Add pieces
        </Button>
        {adding && <AddPiecesSheet bp={bp} preselect={[kind]} onClose={() => setAdding(false)} />}
      </BottomBar>
    );
  }
  if (state !== "ready") return null;
  if (kind === "3d" && downloads && model.file) {
    return (
      <BottomBar>
        <Button size="xl" className="w-full" iconLeading={<Icon icon={Download04Icon} size={20} />} loading={model.state === "busy"} onClick={model.run}>
          {MODEL_LABEL}
        </Button>
        <p aria-live="polite" className={cn(T.meta, "text-text-error empty:hidden")}>
          {model.state === "failed" ? MODEL_FAILED : ""}
        </p>
      </BottomBar>
    );
  }
  const file = fileFor(kind, bp);
  if (!file) return null;
  if (downloads) {
    return (
      <BottomBar>
        <Button size="xl" className="w-full" iconLeading={<Icon icon={Download04Icon} size={20} />} onClick={() => save(file)}>
          {file.label}
        </Button>
      </BottomBar>
    );
  }
  return <BuyFooter />;
}

/** A buyer without a copy: Buy a copy to download · its lowest price, which opens Buy a copy right
 *  here (no navigation, so nothing reopens on a reload or Back); once bought, this screen shows the
 *  piece and its file. */
function BuyFooter() {
  const { mode, view } = useProduct();
  const tracks = useListedCopies();
  const [buying, setBuying] = React.useState(false);
  const from = copiesFromOf(tracks, (t) => trackCardOf(t, view.sales).soldOut);
  const preview = mode !== "market";
  return (
    <BottomBar className="gap-2">
      {from && (
        <div className="flex">
          <TestnetDemoBadge />
        </div>
      )}
      <Button
        hierarchy="secondary"
        size="xl"
        className="w-full"
        disabled={!from || preview}
        iconLeading={<Icon icon={SquareLock02Icon} size={20} />}
        onClick={() => setBuying(true)}
      >
        {from ? `Buy a copy to download · ${formatAmount(from.amount, from.token)}` : "Files come with a copy"}
      </Button>
      {from && preview && <p className={T.meta}>{PREVIEW_BUY_OFF}</p>}
      {!preview && <BuyCopy open={buying} onClose={() => setBuying(false)} onFiles={() => setBuying(false)} />}
    </BottomBar>
  );
}

// ─────────────────────────── a Feed sample's piece ───────────────────────────

function SamplePiece({ projectId, product, kind }: { projectId: string; product: PostProduct; kind: BuildItemKind }) {
  const back = `${phoneProductPath(projectId, product.id)}?tab=build`;
  return (
    <Screen top={<TopBar back={back} title={ITEM_LABELS[kind]} />}>
      <div className="flex flex-col gap-8 px-8 pb-12">
        <p className={T.meta}>{product.name} · files come with a copy</p>
        {kind === "parts" ? (
          <div role="region" aria-label="Parts list, scrollable" tabIndex={0} className="overflow-x-auto rounded-xl border-[length:var(--border-width-1)] border-solid border-border">
            <table className="w-full min-w-[360px] border-collapse text-left">
              <thead>
                <tr className="bg-bg-subtle">
                  {["Part", "Qty", "What it does"].map((h) => (
                    <th key={h} scope="col" className={cn(T.label, "px-6 py-4 text-text-secondary")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {product.parts.map((p) => (
                  <tr key={p.name} className="border-t-[length:var(--border-width-1)] border-solid border-border">
                    <td className={cn(T.meta, "px-6 py-4 text-text-primary")}>{p.name}</td>
                    <td className={cn(T.meta, "px-6 py-4")}>{p.qty}</td>
                    <td className={cn(T.meta, "px-6 py-4")}>{p.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : kind === "3d" ? (
          <div className={cn(LIST_CARD, "items-center gap-6 p-8 text-center")}>
            {product.image && (
              // eslint-disable-next-line @next/next/no-img-element -- a sample post's image
              <img src={product.image} alt={product.name} className="aspect-[4/3] w-full rounded-md bg-bg-surface-raised object-cover" />
            )}
            <p className={T.body}>This sample has no 3D file to open — its creator shares the image only.</p>
          </div>
        ) : (
          <Banner tone="info" title="Comes with a copy">
            {`${ITEM_LABELS[kind]} files come with a copy of ${product.name}.`}
          </Banner>
        )}
      </div>
    </Screen>
  );
}

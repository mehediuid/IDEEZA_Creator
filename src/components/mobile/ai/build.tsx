"use client";

// The build on a phone (create-flow round 2, the owner's approved sample
// QymWEbLugMwQEk7NpJVRy2): the Build sheet that confirms the spend (with Buy
// credits in place when short); while it runs, the approved concept stays big
// with one stage line and one bar — no percentage per piece; a product's
// pieces sit behind one Pieces button, and a failed piece stays on the page
// with its Retry (free). Once every piece is ready the result IS the page: a
// big 3D of the product (Assembly first, else the 3D Module) with one-tap
// Explode and Layers, the concept image a tap away, a switcher when the build
// has two or more products, and Save pinned at the foot (FinishedFoot).
// A build where a piece failed still opens on its result: the failed piece
// keeps its Retry and the foot saves what's ready (the piece stays "Not
// built"). A product the maker left out of the build sits in the switcher as
// "Drawn · not built", and builds into this build from its concept — no new
// drawing.

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CpuIcon,
  CodeIcon,
  CubeIcon,
  DashboardSquare01Icon,
  FloppyDiskIcon,
  PackageIcon,
  PlugSocketIcon,
  Refresh01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Tag } from "@/components/ideeza/tag";
import { CreditBadge } from "@/components/credits/credit-badge";
import { stateRowFor, useMinuteClock } from "@/components/create/build-status";
import { useCredits } from "@/lib/create/credits";
import {
  ITEM_LABELS,
  allItems,
  isOverrunning,
  jobCost,
  productsOf,
  queuedAhead,
  rollupBuild,
  statusOf,
  useCreateHistory,
  type BuildItemKind,
  type BuildJob,
} from "@/lib/create/history";
import { aboutTime, pickCost } from "@/lib/create/pieces";
import { failedPieceNote, pieceWord, type PieceLite } from "@/lib/mobile-ai/flow";
import { cn } from "@/lib/utils";
import { PickList } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { ProjectLimitCard } from "../plans/upsell";
import { BuyCreditsSheet } from "./buy-credits-sheet";
import { JobModel } from "./deliverables";
import { T } from "../type";
import { Chevron, LIST_CARD, LIST_DIVIDERS } from "../kit/list";
import { OFFLINE_REASON } from "./parts";
import type { ConceptFlow, Gate } from "./use-concept-flow";

export const PIECE_ICON: Record<BuildItemKind, IconValue> = {
  pcb: CpuIcon,
  code: CodeIcon,
  "3d": CubeIcon,
  assembly: Layers01Icon,
  wiring: PlugSocketIcon,
  parts: PackageIcon,
};

/** The piece rows' own labels: "Parts list" where the web's tab says Parts. */
export const PIECE_ROW_LABEL: Record<BuildItemKind, string> = { ...ITEM_LABELS, parts: "Parts list" };

type Product = ReturnType<typeof productsOf>[number];
type LeftOut = ConceptFlow["leftOutProducts"][number];

// ─────────────────────────── the Build sheet ───────────────────────────

// The plan's projects at Build (CL-034): when this build would start a new project and every one of the
// plan's projects is in use, the sheet keeps its title, says so ("… would start a new project, and every
// project on your plan is in use. Nothing has been charged."), and the plan's card takes the place of
// everything that leads to paying — no spend lines, no Buy credits, no Build. "Use a project I have" turns
// it into "Build it into" with the projects as pick rows; a pick points the build there and the usual
// sheet comes back. ✕, swipe and the scrim still close it. No credit moves.

export function BuildConfirmSheet({
  flow,
  gate,
  onClose,
  onBooked,
}: {
  flow: ConceptFlow;
  gate: Gate | null;
  onClose: () => void;
  onBooked: (blocked?: string) => void;
}) {
  const { hydrated, balance } = useCredits();
  const [buying, setBuying] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const limit = flow.gateLimit;
  // A closed sheet, or a project freed up, starts over at the card.
  if (picking && (!gate || !limit)) setPicking(false);
  const cost = flow.state.cost;
  const n = flow.state.selected.length;
  const short = hydrated && balance < cost;
  const rows = flow.state.selected.map((t) => {
    const id = t.companionOf ?? "primary";
    const pick = flow.state.picks.get(id);
    const row = flow.rail.rows.find((r) => r.productId === id);
    const pieces = pick ? Object.values(pick).filter((c) => c.on).length : 6;
    return { id, name: row?.name ?? "Product", pieces, cost: pick ? pickCost(pick) : 0 };
  });
  const listed = new Intl.ListFormat("en", { type: "conjunction" }).format(rows.map((r) => r.name));
  const build = async () => {
    if (!gate || short || limit) return;
    const result = await flow.confirmBuild(gate);
    if (result.booked) onBooked();
    else if (result.blocked) onBooked(result.blocked);
  };
  return (
    <>
      <Sheet
        open={!!gate && !buying}
        onClose={() => !flow.submitting && onClose()}
        title={`Build ${n} ${n === 1 ? "product" : "products"}?`}
        description={
          limit
            ? `${listed} would start a new project, and every project on your plan is in use. Nothing has been charged.`
            : short
              ? `You have ${balance} credits and this build needs ${cost}. Buy credits and the build starts — nothing is charged until it does.`
              : "The build runs in the background. You can leave and we will tell you when it is ready."
        }
        actions={
          limit ? undefined : short ? (
            <>
              <Button size="xl" className="w-full" onClick={() => setBuying(true)}>
                Buy credits
              </Button>
            </>
          ) : (
            <>
              <Button size="xl" className="w-full" loading={flow.submitting} disabled={!flow.online} onClick={build}>
                Build <CreditBadge credits={cost} onBrand={flow.online} />
              </Button>
              {!flow.online && (
                <p role="status" className={cn(T.meta, "text-center")}>
                  {OFFLINE_REASON}
                </p>
              )}
            </>
          )
        }
      >
        {limit ? (
          picking ? (
            <div className="flex flex-col gap-2 pb-4">
              <p className={T.rowTitle}>Build it into</p>
              <PickList
                label="Choose a project"
                value={null}
                options={limit.projects.map((p) => ({ value: p.id, label: p.name, helper: p.detail }))}
                onPick={(id) => {
                  setPicking(false);
                  limit.onUse(id);
                }}
              />
            </div>
          ) : (
            <ProjectLimitCard className="mb-4" onUseExisting={limit.projects.length > 0 ? () => setPicking(true) : undefined} onLeave={onClose} />
          )
        ) : (
          <>
            <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
              {rows.map((r, i) => (
                <li key={r.id} className="flex flex-col gap-1 px-6 py-5">
                  <span className="flex items-baseline justify-between gap-4">
                    <span className={T.rowTitle}>{r.name}</span>
                    <span className={cn(T.meta, "shrink-0")}>
                      {r.pieces} pieces · {r.cost} credits
                    </span>
                  </span>
                  {gate?.lines[i] && <span className={cn(T.meta, "text-text-tertiary")}>{gate.lines[i].replace(/^.*? — /, "")}</span>}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 rounded-xl bg-bg-subtle p-7">
              <p className={T.meta}>
                Your concept images are a visual reference. The engineered output may differ from them.
              </p>
              <p className={T.meta}>
                Automated design rule checks run on completion. If issues are found, you&apos;ll still receive the full output with a{" "}
                <span className={cn(T.label, "text-text-primary")}>Draft</span> label and a list of what needs review.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Tag>{hydrated ? (short ? `You have ${balance} — ${cost - balance} short` : `${cost} credits · ${balance} → ${balance - cost} after`) : `${cost} credits`}</Tag>
              <Tag>{aboutTime(flow.state.seconds).replace(/^about/, "About")}</Tag>
            </div>
          </>
        )}
      </Sheet>
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} need={cost} />
    </>
  );
}

// ─────────────────────────── shared bits ───────────────────────────

/** A product's state in one word: what the switcher chip says under its name. */
function productState(p: Product, systemFailure: boolean, queued: boolean): { text: string; tone: "brand" | "success" | "error" | "plain" } {
  const live = p.items.filter((i) => i.status !== "skipped");
  const ready = live.filter((i) => i.status === "ready").length;
  if (live.some((i) => i.status === "failed")) {
    const n = live.filter((i) => i.status === "failed").length;
    return { text: systemFailure ? "Stopped" : `${n} ${n === 1 ? "piece" : "pieces"} didn't finish`, tone: "error" };
  }
  if (live.length > 0 && ready === live.length) return { text: `Ready · ${live.length} pieces`, tone: "success" };
  if (queued) return { text: "Waiting", tone: "plain" };
  return { text: "Building", tone: "brand" };
}

function ProductChips({
  products,
  leftOut = [],
  shownId,
  onProduct,
  systemFailure,
  queued,
}: {
  products: Product[];
  leftOut?: LeftOut[];
  shownId: string;
  onProduct: (id: string) => void;
  systemFailure: boolean;
  queued: boolean;
}) {
  const chips = [
    ...products.map((p) => ({ id: p.id, name: p.name, image: p.conceptImageUrl, s: productState(p, systemFailure, queued) })),
    ...leftOut.map((l) => ({ id: l.id, name: l.name, image: l.imageUrl, s: { text: "Drawn · not built", tone: "plain" as const } })),
  ];
  return (
    <div role="tablist" aria-label="Products" className="-mx-8 flex gap-4 overflow-x-auto px-8 [scrollbar-width:none]">
      {chips.map((p) => {
        const on = p.id === shownId;
        const s = p.s;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onProduct(p.id)}
            className={cn(
              "relative flex min-h-[56px] min-w-[156px] flex-1 items-center gap-4 rounded-xl bg-bg-surface px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              on ? "border-[length:var(--border-width-2)] border-solid border-border-brand" : "border-[length:var(--border-width-1)] border-solid border-border-subtle",
            )}
          >
            <span className="relative size-[38px] shrink-0 overflow-hidden rounded-lg bg-bg-subtle">
              {p.image && <Image src={p.image} alt="" fill sizes="38px" className="object-cover" unoptimized />}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className={cn(T.label, "truncate text-text-primary")}>{p.name}</span>
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
            {s.tone === "error" && <span aria-hidden className="absolute right-3 top-3 size-[8px] rounded-full bg-bg-error" />}
          </button>
        );
      })}
    </div>
  );
}

/** A failed piece on the page, with its free Retry. */
function FailedPiece({ job, product, kind, pieces }: { job: BuildJob; product: Product; kind: BuildItemKind; pieces: PieceLite[] }) {
  const { retryBuildItem } = useCreateHistory();
  return (
    <div className="flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-error bg-bg-error-subtle p-6">
      <div className="flex items-start gap-4">
        <span className="shrink-0 text-[color:var(--color-icon-error)]">
          <Icon icon={PIECE_ICON[kind]} size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.rowTitle, "text-text-error")}>{PIECE_ROW_LABEL[kind]} didn&apos;t finish</span>
          <span className={T.meta}>{failedPieceNote(kind, pieces)}</span>
        </span>
      </div>
      <Button
        hierarchy="secondary"
        size="lg"
        className="w-full"
        iconLeading={<Icon icon={Refresh01Icon} size={16} />}
        onClick={() => retryBuildItem(job.id, kind, product.id)}
      >
        Retry {ITEM_LABELS[kind]} <CreditBadge credits={0} />
      </Button>
    </div>
  );
}

/** One product's pieces, behind one button: each opens its deliverable; a failed one retries free. */
function PiecesSheet({ job, product, open, onClose }: { job: BuildJob; product: Product; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { retryBuildItem } = useCreateHistory();
  const status = statusOf(job);
  const systemFailure = job.failure === "system";
  const pieces: PieceLite[] = product.items.map((i) => ({ kind: i.kind, status: i.status, progress: i.progress, omitted: i.omitted }));
  const live = product.items.filter((i) => i.status !== "skipped");
  const ready = live.filter((i) => i.status === "ready").length;
  return (
    <Sheet open={open} onClose={onClose} title="Pieces" description={`${product.name} · ${ready} of ${live.length} ready`}>
      <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
        {product.items
          .filter((i) => i.status !== "skipped" || i.omitted)
          .map((item) => {
            const word = pieceWord({ kind: item.kind, status: item.status, progress: item.progress, omitted: item.omitted }, pieces, { systemFailure, queued: status === "queued" });
            const failed = item.status === "failed" && !systemFailure;
            return (
              <li key={item.kind} className="flex min-h-[56px] items-center gap-5 px-6">
                <span className={cn("shrink-0", failed ? "text-[color:var(--color-icon-error)]" : "text-[color:var(--color-icon-brand)]")}>
                  <Icon icon={PIECE_ICON[item.kind]} size={20} />
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/m/ai/build/${job.id}?product=${product.id}&tab=${item.kind}`);
                  }}
                  className={cn(T.body, "min-h-[44px] min-w-0 flex-1 text-left text-text-primary outline-none focus-visible:underline")}
                >
                  {PIECE_ROW_LABEL[item.kind]}
                </button>
                <span
                  className={cn(
                    T.meta, "shrink-0",
                    word.tone === "done" && "text-text-success",
                    word.tone === "error" && "text-text-error",
                    word.tone === "working" && "text-text-brand",
                    (word.tone === "plain" || word.tone === "muted") && "text-text-secondary",
                  )}
                >
                  {item.status === "building" ? "Building" : word.word}
                </span>
                {failed ? (
                  <button
                    type="button"
                    onClick={() => retryBuildItem(job.id, item.kind, product.id)}
                    aria-label={`Retry ${ITEM_LABELS[item.kind]} — free`}
                    className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-full bg-bg-error text-[color:var(--color-icon-on-brand)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <Icon icon={Refresh01Icon} size={18} />
                  </button>
                ) : (
                  <Chevron />
                )}
              </li>
            );
          })}
      </ul>
    </Sheet>
  );
}

// ─────────────────────────── the build card ───────────────────────────

export function BuildCard({ job, product, onProduct }: { job: BuildJob; product: string; onProduct: (id: string) => void }) {
  const { builds, retryBuild, cancelBuild, failBuildSystem } = useCreateHistory();
  const now = useMinuteClock();
  const [buying, setBuying] = React.useState(false);
  const [piecesOpen, setPiecesOpen] = React.useState(false);
  const status = statusOf(job);
  const row = stateRowFor(job, now, queuedAhead(job, builds), true);
  const products = productsOf(job);
  const shown = products.find((p) => p.id === product) ?? products[0];
  const roll = rollupBuild(job);
  const percent = status === "ready" ? 100 : status === "queued" || status === "failed" ? 0 : roll.progress;
  const name = job.projectChoiceName?.trim() || job.title;
  const each = new Set(products.map((p) => p.items.filter((i) => i.status !== "skipped").length));
  const piecesLine = each.size === 1 ? `${[...each][0]} pieces${products.length > 1 ? " each" : ""}` : `${allItems(job).filter((i) => i.status !== "skipped").length} pieces`;
  const pieces: PieceLite[] = shown.items.map((i) => ({ kind: i.kind, status: i.status, progress: i.progress, omitted: i.omitted }));
  const systemFailure = job.failure === "system";
  const live = shown.items.filter((i) => i.status !== "skipped");
  const done = live.filter((i) => i.status === "ready").length;
  const current = live.find((i) => i.status === "building") ?? live.find((i) => i.status !== "ready" && i.status !== "failed");
  const stage =
    status === "queued"
      ? "Waiting in the build queue"
      : job.blocked
        ? "Paused"
        : current
          ? `Step ${Math.min(done + 1, live.length)} of ${live.length} · Building the ${PIECE_ROW_LABEL[current.kind]}`
          : `${done} of ${live.length} pieces ready`;
  const failed = systemFailure ? [] : shown.items.filter((i) => i.status === "failed");
  const tone = row.badge.tone === "success" ? "success" : row.badge.tone === "error" ? "error" : row.badge.tone === "warning" ? "warning" : row.badge.tone === "brand" ? "brand" : "neutral";

  return (
    <section aria-label={row.sectionLabel} className="flex flex-col gap-5">
      <div className={cn(LIST_CARD, "flex flex-col gap-5 p-4")}>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-bg-subtle">
          {shown.conceptImageUrl && <Image src={shown.conceptImageUrl} alt={`${shown.name}, the approved concept`} fill sizes="343px" className="object-cover" unoptimized />}
          <span className="absolute left-4 top-4">
            {/* One stage line says where the build is; the badge keeps only the state, no percentage. */}
            <Badge tone={tone}>● {row.badge.text.replace(/\s*·\s*\d+%$/, "")}</Badge>
          </span>
        </div>
        <div className="flex flex-col gap-5 px-2 pb-2">
          <div className="flex min-w-0 flex-col">
            <p className={cn(T.section, "truncate")}>{name}</p>
            <p className={T.meta}>
              {products.length} {products.length === 1 ? "product" : "products"} · {piecesLine}
            </p>
          </div>
          {products.length > 1 && <ProductChips products={products} shownId={shown.id} onProduct={onProduct} systemFailure={systemFailure} queued={status === "queued"} />}
          <div className="flex flex-col gap-3">
            <p className={T.rowTitle}>{stage}</p>
            <ProgressBar value={percent} label={`${name} build progress`} />
            <p className={T.meta}>
              {row.banner ? `${row.banner.title}. ${row.banner.body}` : "Runs in the background. You can leave, and we'll notify you when it's ready."}
            </p>
            {row.meta && <p className={cn(T.meta, "text-text-tertiary")}>{row.meta}</p>}
          </div>
          {job.blocked === "credits" && (
            <button type="button" onClick={() => setBuying(true)} className={cn(T.rowTitle, "-my-3 min-h-[40px] w-fit text-text-brand hover:underline")}>
              Buy credits
            </button>
          )}
          {row.actions === "cancelQueued" && (
            <button type="button" onClick={() => cancelBuild(job.id)} className={cn(T.rowTitle, "-my-3 min-h-[40px] w-fit text-text-brand hover:underline")}>
              Cancel this build
            </button>
          )}
          {row.actions === "retryAll" && (
            <button type="button" onClick={() => retryBuild(job.id)} className={cn(T.rowTitle, "-my-3 inline-flex min-h-[40px] w-fit items-center gap-2 text-text-brand hover:underline")}>
              Try this build again <CreditBadge credits={jobCost(job)} />
            </button>
          )}
          {isOverrunning(job, now) && (
            <button type="button" onClick={() => failBuildSystem(job.id)} className={cn(T.rowTitle, "-my-3 min-h-[40px] w-fit text-text-error hover:underline")}>
              Stop and refund
            </button>
          )}
          {failed.map((item) => (
            <FailedPiece key={item.kind} job={job} product={shown} kind={item.kind} pieces={pieces} />
          ))}
          <Button hierarchy="secondary" size="lg" className="w-full" onClick={() => setPiecesOpen(true)} iconLeading={<Icon icon={DashboardSquare01Icon} size={16} />}>
            Pieces · {done} of {live.length} ready
          </Button>
        </div>
      </div>
      <PiecesSheet job={job} product={shown} open={piecesOpen} onClose={() => setPiecesOpen(false)} />
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} need={jobCost(job)} />
    </section>
  );
}

// ─────────────────────────── finished: the result is the page ───────────────────────────

/** Is the build finished enough to show its result: every piece ready, or
 *  some failed and the rest ready (Save what's ready). */
export function isFinished(job: BuildJob): boolean {
  const status = statusOf(job);
  if (status === "ready") return true;
  return status === "partial" && job.failure !== "system" && allItems(job).some((i) => i.status === "ready");
}

export function FinishedCard({
  job,
  flow,
  product,
  onProduct,
  onSpec,
}: {
  job: BuildJob;
  flow: ConceptFlow;
  product: string;
  onProduct: (id: string) => void;
  onSpec: (productId: string) => void;
}) {
  const { setBuildModelFailed } = useCreateHistory();
  const [view, setView] = React.useState<"3d" | "image">("3d");
  const [piecesOpen, setPiecesOpen] = React.useState(false);
  const products = productsOf(job);
  const leftOut = flow.leftOutProducts;
  const total = products.length + leftOut.length;
  const projectName = flow.projectName || job.projectChoiceName?.trim() || job.title;
  const left = leftOut.find((l) => l.id === product);
  if (left) {
    return (
      <section aria-label="Not in this build" className="flex flex-col gap-5">
        <ProductChips products={products} leftOut={leftOut} shownId={left.id} onProduct={onProduct} systemFailure={false} queued={false} />
        <LeftOutCard flow={flow} item={left} projectName={projectName} index={products.length + leftOut.indexOf(left)} total={total} onSpec={onSpec} />
      </section>
    );
  }
  const shown = products.find((p) => p.id === product) ?? products[0];
  const index = products.findIndex((p) => p.id === shown.id);
  const live = shown.items.filter((i) => i.status !== "skipped");
  const ready = live.filter((i) => i.status === "ready").length;
  const failed = shown.items.filter((i) => i.status === "failed");
  const pieces: PieceLite[] = shown.items.map((i) => ({ kind: i.kind, status: i.status, progress: i.progress, omitted: i.omitted }));
  const hasAssembly = shown.items.some((i) => i.kind === "assembly" && i.status === "ready");
  const has3d = hasAssembly || shown.items.some((i) => i.kind === "3d" && i.status === "ready");
  const isPrimary = shown.id === "primary";
  const shellNote = !isPrimary ? null : job.modelFailed ? "failed" : !job.modelGlbUrl ? "pending" : null;
  const showing = has3d ? view : "image";
  const seg = (on: boolean) =>
    cn(
      T.rowTitle, "min-h-[40px] flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
      on ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-secondary",
    );
  return (
    <section aria-label="Build finished" className="flex flex-col gap-5">
      {total > 1 && <ProductChips products={products} leftOut={leftOut} shownId={shown.id} onProduct={onProduct} systemFailure={false} queued={false} />}
      <div className={cn(LIST_CARD, "flex flex-col gap-5 p-4")}>
        <div className="flex items-start justify-between gap-4 px-2 pt-1">
          <div className="flex min-w-0 flex-col">
            <p className={cn(T.section, "truncate")}>{shown.name}</p>
            <p className={cn(T.meta, "truncate")}>
              {total > 1
                ? `${projectName} · Product ${index + 1} of ${total}`
                : failed.length
                  ? `${projectName} · ${ready} of ${live.length} pieces ready`
                  : `${projectName} · All ${live.length} pieces ready`}
            </p>
          </div>
          {failed.length ? <Badge tone="warning">● {ready} of {live.length} ready</Badge> : <Badge tone="success">● Ready</Badge>}
        </div>
        {has3d && shown.conceptImageUrl && (
          <div role="group" aria-label="What to show" className="flex gap-2 rounded-xl bg-bg-subtle p-2">
            <button type="button" aria-pressed={showing === "3d"} onClick={() => setView("3d")} className={seg(showing === "3d")}>
              3D
            </button>
            <button type="button" aria-pressed={showing === "image"} onClick={() => setView("image")} className={seg(showing === "image")}>
              Concept image
            </button>
          </div>
        )}
        {showing === "3d" ? (
          <JobModel
            key={shown.id}
            job={job}
            productId={shown.id}
            enclosure={!hasAssembly}
            shellNote={shellNote}
            onRetryMesh={isPrimary ? () => setBuildModelFailed(job.id, false) : undefined}
            hero
          />
        ) : (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-bg-subtle">
            {shown.conceptImageUrl && <Image src={shown.conceptImageUrl} alt={`${shown.name}, the approved concept`} fill sizes="343px" className="object-cover" unoptimized />}
          </div>
        )}
      </div>
      {failed.map((item) => (
        <FailedPiece key={item.kind} job={job} product={shown} kind={item.kind} pieces={pieces} />
      ))}
      <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setPiecesOpen(true)} iconLeading={<Icon icon={DashboardSquare01Icon} size={18} />}>
        {failed.length ? `Pieces · ${ready} of ${live.length} ready` : `Pieces · ${live.length} ready`}
      </Button>
      <PiecesSheet job={job} product={shown} open={piecesOpen} onClose={() => setPiecesOpen(false)} />
    </section>
  );
}

/** A product drawn and left out of the build: its concept, and Build it now — no new drawing. */
function LeftOutCard({
  flow,
  item,
  projectName,
  index,
  total,
  onSpec,
}: {
  flow: ConceptFlow;
  item: LeftOut;
  projectName: string;
  index: number;
  total: number;
  onSpec: (productId: string) => void;
}) {
  const toast = useToast();
  const [buying, setBuying] = React.useState(false);
  const build = async () => {
    const result = await flow.buildLeftOut(item.id);
    if (result === "short") setBuying(true);
    else if (result === "booked") toast({ title: `Building ${item.name}. It runs in the background.`, lead: "success" });
    else if (result && "blocked" in result) {
      toast({ title: `${item.name} doesn't fit the size you set. Fix it in its spec.`, lead: "error" });
      onSpec(result.blocked);
    }
  };
  return (
    <div className={cn(LIST_CARD, "flex flex-col gap-5 p-4")}>
      <div className="flex items-start justify-between gap-4 px-2 pt-1">
        <div className="flex min-w-0 flex-col">
          <p className={cn(T.section, "truncate")}>{item.name}</p>
          <p className={cn(T.meta, "truncate")}>
            {projectName} · Product {index + 1} of {total}
          </p>
        </div>
        <Badge tone="neutral">Not in this build</Badge>
      </div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-bg-subtle">
        <Image src={item.imageUrl} alt={`${item.name}, the drawn concept`} fill sizes="343px" className="object-cover" unoptimized />
      </div>
      <div className="flex flex-col gap-1 px-2">
        <p className={T.rowTitle}>You left this one out</p>
        <p className={T.meta}>
          Its concept stays in {projectName}. Build it any time, no need to draw it again.
        </p>
      </div>
      <Button size="lg" className="w-full" loading={flow.preparing} disabled={!flow.online} onClick={build}>
        Build {item.name} <CreditBadge credits={item.cost} onBrand={flow.online} />
      </Button>
      {!flow.online && <p className={cn(T.meta, "text-center")}>{OFFLINE_REASON}</p>}
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} need={item.cost} />
    </div>
  );
}

/** Save, pinned at the foot once the build is finished — what's ready when a piece failed. */
export function FinishedFoot({ job, flow, onSave }: { job: BuildJob; flow: ConceptFlow; onSave: () => void }) {
  const products = productsOf(job);
  const name = flow.projectName || job.projectChoiceName?.trim() || job.title;
  const mode = flow.saveInfo?.mode;
  const saved = mode?.kind === "saved" ? mode.project : null;
  const live = allItems(job).filter((i) => i.status !== "skipped");
  const readyCount = live.filter((i) => i.status === "ready").length;
  const failed = products.flatMap((p) => p.items.filter((i) => i.status === "failed").map((i) => ({ product: p, kind: i.kind })));
  const partial = failed.length > 0;
  const leftOut = flow.leftOutProducts;
  const notBuilt =
    failed.length === 1
      ? products.length > 1
        ? `${failed[0].product.name}'s ${PIECE_ROW_LABEL[failed[0].kind].toLowerCase()} stays “Not built”. You can retry it after saving.`
        : `${PIECE_ROW_LABEL[failed[0].kind]} stays “Not built”. You can retry it after saving.`
      : `${failed.length} pieces stay “Not built”. You can retry them after saving.`;
  const builtNames = products.map((p) => p.name).join(" and ");
  const line = saved
    ? `Saved to ${saved.name}. Open the project for what's next.`
    : partial
      ? notBuilt
      : leftOut.length
        ? `Saves ${builtNames} and keeps the ${leftOut.map((l) => l.name).join(" and ")} concept in ${name}.`
        : mode?.kind === "join"
          ? `Adds ${products.length > 1 ? "these products" : job.title} to ${mode.project.name}, with every deliverable.`
          : products.length > 1
            ? `Keeps ${products.length === 2 ? "both" : "all"} products of “${name}” and every deliverable together.`
            : `Keeps the product and every deliverable together in “${name}”.`;
  const label =
    mode?.kind === "join"
      ? partial
        ? `Add what's ready to ${mode.project.name}`
        : `Add to ${mode.project.name}`
      : mode?.kind === "version"
        ? `Save version ${mode.version}`
        : partial
          ? products.length > 1
            ? `Save what's ready · ${readyCount} of ${live.length} pieces`
            : "Save what's ready"
          : products.length > 1
            ? `Save project · ${products.length} products`
            : "Save project";
  return (
    <div className="flex flex-col gap-3 px-8">
      {saved ? (
        <Link href={`/m/projects/${saved.id}`} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
          View project
        </Link>
      ) : (
        <Button size="xl" className="w-full" iconLeading={<Icon icon={FloppyDiskIcon} size={20} />} onClick={onSave}>
          {label}
        </Button>
      )}
      <p className={cn(T.micro, "text-center")}>{line}</p>
    </div>
  );
}

"use client";

// A build's pieces on a phone (19–25 · A7 · Switch product 26): the product
// above (its project and "Product 1 of 2", its build check, Switch product
// when there are more), the pieces as the kit's line tabs — PCB · Code ·
// 3D Module · Assembly · Wiring · Parts (the strip scrolls, so the Parts list
// is one tap from every piece). Each panel is the web's own artifact, derived
// from that product's parts (build-artifacts.ts): the board and the wiring
// (pinch to zoom), the firmware (wrapped to the phone), the bill of
// materials, the 3D assembly; and "What this covers", the web's lines. A
// piece still being made says so with its progress; a failed one is retried
// here, free.
//
// The tab and the product are client state kept in the address by
// replaceState (kit `useTabParam`): a tap never waits for the server and
// works offline.

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown01Icon, CheckmarkCircle02Icon, CpuIcon, Refresh01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { Tag } from "@/components/ideeza/tag";
import { ConfidenceBadge, ConfidenceIssuesPanel } from "@/components/create/confidence-badge";
import { FirmwarePreview, PcbPreview, WiringPreview, coversFor } from "@/components/create/deliverable-previews";
import { useBuildModel } from "@/components/create/use-build-model";
import { bomFor, isSampleModel } from "@/lib/create/build-artifacts";
import { checkBuild } from "@/lib/create/confidence";
import { ITEM_LABELS, productsOf, statusOf, useCreateHistory, type BuildItemKind, type BuildJob } from "@/lib/create/history";
import { isLeftOut } from "@/lib/create/pieces";
import { deriveAssembly, enclosureOnly } from "@/lib/three/assembly";
import { cn } from "@/lib/utils";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { Eyebrow } from "../kit/eyebrow";
import { LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { NotFoundState } from "../kit/state";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { ModelView } from "./model-view";
import { ProgressRing } from "./parts";

const TABS: BuildItemKind[] = ["pcb", "code", "3d", "assembly", "wiring", "parts"];
const TITLE: Record<BuildItemKind, string> = { ...ITEM_LABELS, parts: "Parts" };

export function AiDeliverables({ buildId }: { buildId: string }) {
  const { hydrated, getBuild, getChat } = useCreateHistory();
  const job = getBuild(buildId);
  if (!hydrated) {
    return (
      <Screen top={<TopBar back="/m/ai/history" title="Pieces" />}>
        <div role="status" aria-label="Loading" className="flex flex-col gap-6 p-8">
          <Skeleton className="h-[64px] w-full rounded-xl" />
          <Skeleton size="lg" className="w-full rounded-xl" />
        </div>
      </Screen>
    );
  }
  if (!job) {
    return (
      <Screen top={<TopBar back="/m/ai/history" title="Pieces" />} className="p-8">
        <NotFoundState thing="build" body="It may have been deleted with its chat, or it was made in another browser." action={{ label: "Open History", href: "/m/ai/history" }} />
      </Screen>
    );
  }
  return <Pieces job={job} back={getChat(job.chatId) ? `/m/ai/chat/${job.chatId}` : "/m/ai/history"} />;
}

function Pieces({ job, back }: { job: BuildJob; back: string }) {
  const { retryBuildItem, setBuildModelFailed } = useCreateHistory();
  const [switching, setSwitching] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const strip = React.useRef<HTMLDivElement>(null);
  useBuildModel(job);
  const products = productsOf(job);
  const [productId, setProductId] = useTabParam("product", products.map((p) => p.id), products[0].id);
  const index = Math.max(0, products.findIndex((p) => p.id === productId));
  const product = products[index];
  const made = product.items.filter((i) => i.status !== "skipped" || isLeftOut(i));
  const tabs = TABS.filter((k) => made.some((i) => i.kind === k));
  const [tab, setTab] = useTabParam<BuildItemKind>("tab", tabs, made.find((i) => i.status === "ready" && i.kind !== "parts")?.kind ?? tabs[0] ?? "parts");
  const item = product.items.find((i) => i.kind === tab);
  const projectName = job.projectChoiceName?.trim() || job.title;
  const isPrimary = product.id === "primary";
  const hasAssembly = product.items.some((i) => i.kind === "assembly" && (i.status !== "skipped" || isLeftOut(i)));
  const shellNote = !isPrimary ? null : job.modelFailed ? "failed" : !job.modelGlbUrl ? "pending" : null;
  const systemFailure = job.failure === "system";
  // The build check (the web's Checked / Draft badge): what the Build sheet promised, per product.
  const confidence = checkBuild(job, products).byProduct.find((c) => c.productId === product.id) ?? null;
  const checked = !!confidence && product.items.some((i) => i.status === "ready");

  // The strip holds six tabs: the chosen one is kept in view.
  React.useEffect(() => {
    strip.current?.querySelector(`[data-tab="${tab}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);

  return (
    <Screen top={<TopBar back={back} title={TITLE[tab]} />}>
      <div className="flex flex-col gap-6 px-8 pb-8 pt-2">
        <div className="flex flex-col gap-3 rounded-xl bg-bg-subtle px-7 py-5">
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className={cn(T.meta, "truncate")}>
                {projectName} • Product {index + 1} of {products.length}
              </p>
              <p className={cn(T.rowTitle, "truncate")}>{product.name}</p>
            </div>
            {products.length > 1 && (
              <IconButton hierarchy="secondary" size="lg" aria-label="Switch product" icon={<Icon icon={ArrowDown01Icon} size={18} />} onClick={() => setSwitching(true)} />
            )}
          </div>
          {checked && confidence && (
            <div className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
              <span>Build check:</span>
              <ConfidenceBadge confidence={confidence} open={reviewOpen} onOpenChange={setReviewOpen} />
            </div>
          )}
        </div>

        <div ref={strip} className="-mx-8 overflow-x-auto px-8 [scrollbar-width:none]">
          <MobileTabs
            label="Pieces"
            idBase="pieces"
            width="hug"
            className="w-max min-w-full"
            value={tab}
            onChange={setTab}
            tabs={tabs.map((k) => ({ value: k, label: TITLE[k] }))}
          />
        </div>

        <section {...tabPanelProps("pieces", tab)} className={cn(LIST_CARD, "gap-6 p-6 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
          {!item || isLeftOut(item) ? (
            <p className={cn(T.body, "p-4")}>This piece wasn&apos;t in this build.</p>
          ) : item.status !== "ready" ? (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              {item.status === "building" ? (
                <ProgressRing value={item.progress} label={`${TITLE[tab]} progress`} size={48} />
              ) : item.status === "failed" ? null : (
                <span className="text-[color:var(--color-icon-disabled)]">
                  <Icon icon={CpuIcon} size={28} />
                </span>
              )}
              <p className={T.rowTitle}>
                {item.status === "failed"
                  ? systemFailure
                    ? "This piece didn't run"
                    : "This piece couldn't be generated"
                  : item.status === "building"
                    ? `Generating · ${Math.round(item.progress)}%`
                    : "Waiting to start"}
              </p>
              <p className={T.meta}>
                {item.status === "failed"
                  ? systemFailure
                    ? "The whole build stopped on our side — try it again from the chat."
                    : "The other pieces are unaffected. Retrying costs no extra credits."
                  : "It appears here the moment it lands."}
              </p>
              {item.status === "failed" && !systemFailure && (
                <Button hierarchy="secondary" size="lg" iconLeading={<Icon icon={Refresh01Icon} size={16} />} onClick={() => retryBuildItem(job.id, tab, product.id)}>
                  Retry {ITEM_LABELS[tab]}
                </Button>
              )}
            </div>
          ) : tab === "3d" || tab === "assembly" ? (
            <JobModel
              key={`${product.id}-${tab}`}
              job={job}
              productId={product.id}
              enclosure={tab === "3d" && hasAssembly}
              shellNote={shellNote}
              onRetryMesh={isPrimary ? () => setBuildModelFailed(job.id, false) : undefined}
            />
          ) : tab === "parts" ? (
            <PartsList job={product} />
          ) : tab === "code" ? (
            // 23: the firmware wraps to the phone's width instead of running past the card.
            <div className="min-w-0 [&_span.block]:whitespace-pre-wrap [&_span.block]:break-words">
              <FirmwarePreview job={product} />
            </div>
          ) : (
            <>
              <Zoomable label={tab === "pcb" ? "PCB layout, scrollable" : "Wiring map, scrollable"}>
                {tab === "pcb" ? <PcbPreview job={product} /> : <WiringPreview job={product} />}
              </Zoomable>
              <p className={T.meta}>Pinch to zoom, or double-tap.</p>
            </>
          )}
        </section>

        {item && !isLeftOut(item) && (
          <section aria-labelledby="covers" className={cn(LIST_CARD, "gap-4 p-7")}>
            <Eyebrow as="h2" id="covers" tone="tertiary">
              What this covers
            </Eyebrow>
            <ul className="flex flex-col gap-3">
              {coversFor(tab, product, isSampleModel(job.modelGlbUrl), !isPrimary).map((line) => (
                <li key={line} className={cn(T.meta, "flex w-fit items-start gap-2 rounded-lg bg-bg-blue-subtle px-4 py-2 text-text-blue")}>
                  <span className="mt-[2px] shrink-0">
                    <Icon icon={CheckmarkCircle02Icon} size={14} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}
        {statusOf(job) !== "ready" && (
          <Link href={back} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}>
            Back to the build
          </Link>
        )}
      </div>
      <Sheet open={switching} onClose={() => setSwitching(false)} title="Switch product" description={`${products.length} in ${projectName}`}>
        <ul role="listbox" aria-label="Switch product" className={cn(LIST_CARD, LIST_DIVIDERS)}>
          {products.map((p) => {
            const on = p.id === product.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    setSwitching(false);
                    setProductId(p.id);
                  }}
                  className={LIST_ROW}
                >
                  <span className="relative size-[48px] shrink-0 overflow-hidden rounded-lg bg-bg-subtle">
                    {p.conceptImageUrl && <Image src={p.conceptImageUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={cn(T.rowTitle, "truncate")}>{p.name}</span>
                    <span className={T.meta}>
                      {p.items.filter((i) => i.status === "ready").length} of {p.items.filter((i) => i.status !== "skipped").length} pieces ready
                    </span>
                  </span>
                  {on && (
                    <span className="shrink-0 text-[color:var(--color-icon-brand)]">
                      <Icon icon={Tick02Icon} size={20} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
      <Sheet
        open={reviewOpen && !!confidence}
        onClose={() => setReviewOpen(false)}
        title="What needs review"
        description={product.name}
        actions={
          <Button size="xl" className="w-full" onClick={() => setReviewOpen(false)}>
            Done
          </Button>
        }
      >
        {confidence && <ConfidenceIssuesPanel confidence={confidence} />}
      </Sheet>
    </Screen>
  );
}

/** One product's assembly, from its own parts, spec and (the primary's) concept mesh. */
export function JobModel({
  job,
  productId,
  enclosure,
  shellNote,
  onRetryMesh,
  hero = false,
}: {
  job: BuildJob;
  productId: string;
  enclosure: boolean;
  shellNote: "pending" | "failed" | null;
  onRetryMesh?: () => void;
  hero?: boolean;
}) {
  const assembly = React.useMemo(() => {
    const p = productsOf(job).find((x) => x.id === productId) ?? productsOf(job)[0];
    const whole = deriveAssembly({ title: p.title, parts: p.parts, spec: p.spec, meshUrl: p.id === "primary" ? job.modelGlbUrl : undefined });
    return enclosure ? enclosureOnly(whole) : whole;
  }, [job, productId, enclosure]);
  return <ModelView assembly={assembly} shellNote={shellNote} onRetryMesh={onRetryMesh} hero={hero} />;
}

/** A drawing that pinches to zoom (1×–3×) and scrolls inside its box; a double tap toggles 2×
 *  (22 · 24 draw an expand on the board and the wiring; the product's piece screen zooms the same way). */
function Zoomable({ label, children }: { label: string; children: React.ReactNode }) {
  const [scale, setScale] = React.useState(1);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const start = React.useRef<{ d: number; s: number } | null>(null);
  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  return (
    <div
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
          setScale(Math.min(3, Math.max(1, (start.current.s * dist()) / start.current.d)));
        }
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) start.current = null;
      }}
      onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2))}
      className="max-h-[420px] min-w-0 touch-pan-x touch-pan-y overflow-auto rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <div style={{ width: `${scale * 100}%` }}>{children}</div>
    </div>
  );
}

/** Parts in this build (25): the counts, then every part — name, reference,
 *  category and quantity — grouped by function, from the build's own BOM. */
function PartsList({ job }: { job: Parameters<typeof bomFor>[0] }) {
  const bom = bomFor(job);
  const chips = [
    `${bom.unique} unique`,
    `${bom.units} units`,
    `${bom.active} active`,
    `${bom.passives} passives`,
    `${bom.connectors} conn & mech`,
  ];
  return (
    <div className="flex flex-col gap-5">
      <Eyebrow tone="tertiary">Parts in this build</Eyebrow>
      <ul className="flex flex-wrap gap-3">
        {chips.map((c, i) => (
          <li key={c}>
            <Tag selected={i === 0}>{c}</Tag>
          </li>
        ))}
      </ul>
      <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
        {bom.rows.map((r, i) => (
          <li key={`${r.ref}-${i}`} className="flex items-center gap-4 px-6 py-4">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn(T.body, "truncate text-text-primary")}>{r.name}</span>
              <span className={cn(T.meta, "truncate")}>
                <span className="font-mono">{r.ref}</span> • {r.category}
              </span>
            </span>
            <span className={cn(T.meta, "shrink-0 tabular-nums")}>×{r.qty}</span>
          </li>
        ))}
      </ul>
      <p className={cn(T.meta, "text-text-tertiary")}>Grouped by function · quantities are per board</p>
    </div>
  );
}

"use client";

// The product page's deliverable tabs (COR-32…34, COR-37): 3D model · PCB ·
// Firmware code · Wiring · Parts, in the app's order and with its labels, one
// panel at a time. Each panel is the build review's own preview component
// over this product at this version, with the review's "What this covers"
// aside beside it (artifact + a 260 px aside from a 640 px page), so the two
// surfaces say the same thing about the same product.
//
// No review controls live here (COR-36): no Retry, Save, Refine or spec edit.
// A failed piece says where it can be retried and links to the chat. The 3D
// viewer and three.js load only when the maker asks for the model (COR-33,
// COR-102), and only the primary product wears the generated mesh.

import * as React from "react";
import Link from "next/link";
import { ThreeDViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  coversFor,
  FirmwarePreview,
  PartsPreview,
  PartsSummary,
  PcbPreview,
  WiringPreview,
} from "@/components/create/deliverable-previews";
import { ModelPanelLazy } from "@/components/create/model-panel/model-panel-lazy";
import { Button, buttonVariants } from "@/components/ideeza";
import { isSampleModel } from "@/lib/create/build-artifacts";
import {
  ITEM_KINDS,
  ITEM_LABELS,
  type BuildItem,
  type BuildItemKind,
  type BuildJob,
  type BuildProduct,
} from "@/lib/create/history";
import { deliverableTabs, pickTab } from "@/lib/manual/product-page";
import { deriveAssembly } from "@/lib/three/assembly";
import { moveTab, revealDelta } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";
import { ConceptImage } from "./product-identity";

/** Each preview under its own h3, in a named scroll region the keyboard can
 *  reach (COR-34). The Parts table carries its own h3. */
const PREVIEW: Record<Exclude<BuildItemKind, "3d">, { heading: string | null; region: string }> = {
  pcb: { heading: "PCB layout", region: "PCB layout, scrollable" },
  code: { heading: "Firmware code", region: "Firmware code, scrollable" },
  wiring: { heading: "Wiring map", region: "Wiring map, scrollable" },
  parts: { heading: null, region: "Parts list, scrollable" },
};

// The project page's tab look (C1's TabStrip): neutral, the subtle fill plus
// a text-primary underline — never violet; 44 px on touch.
const TAB =
  "inline-flex h-[36px] shrink-0 items-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-8 text-md font-semibold leading-md outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:h-[var(--touch-min)]";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";

// A link dressed as the quiet button; the hover keeps the button's text colour.
const LINK_BUTTON = cn(
  buttonVariants({ hierarchy: "secondary", size: "md" }),
  "hover:text-[color:var(--color-button-secondary-text)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
);

export function ProductDeliverables({
  job,
  product,
  firmware,
  chatHref,
  tab,
  onTab,
}: {
  /** The build of the version on screen. */
  job: BuildJob;
  /** This product inside it. */
  product: BuildProduct;
  /** False in the buyer preview: the firmware source comes after purchase (PPL-7). */
  firmware: boolean;
  /** The chat a failed piece is retried in; null in the preview or when the chat is gone. */
  chatHref: string | null;
  /** `?tab=` as the URL has it. */
  tab: string | null;
  /** Writes `?tab=` (replace, not push — COR-32). */
  onTab: (kind: BuildItemKind) => void;
}) {
  const tabs = React.useMemo(
    () => deliverableTabs(product.items, ITEM_KINDS, { firmware }),
    [product.items, firmware],
  );
  // The pick shows at once; the URL follows it by replace. The parent keys
  // this component by version and product, so a new version starts over.
  const [picked, setPicked] = React.useState<BuildItemKind | null>(null);
  const shown = pickTab(tabs, picked ?? tab);
  const item = tabs.find((i) => i.kind === shown) ?? null;
  const uid = React.useId();
  const tabId = (kind: BuildItemKind) => `${uid}-tab-${kind}`;
  const panelId = `${uid}-panel`;
  const listRef = React.useRef<HTMLDivElement>(null);

  const select = (kind: BuildItemKind) => {
    setPicked(kind);
    onTab(kind);
  };

  // At phone width the strip is one row that scrolls sideways (COR-21): keep
  // the selected tab in view — only the strip moves, never the page.
  React.useEffect(() => {
    const list = listRef.current;
    const el = shown ? list?.querySelector<HTMLElement>(`[data-tab="${shown}"]`) : null;
    if (!list || !el) return;
    const delta = revealDelta(el.getBoundingClientRect(), list.getBoundingClientRect(), 8);
    if (delta === 0) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: delta, behavior: still ? "auto" : "smooth" });
  }, [shown]);

  if (!shown || !item) {
    return (
      <p className="rounded-xl border border-dashed border-border px-10 py-12 text-center text-md text-text-secondary">
        This build made no deliverables for this product.
      </p>
    );
  }

  return (
    <section aria-labelledby={`${uid}-heading`} className="flex flex-col gap-8">
      <h2 id={`${uid}-heading`} className="sr-only">
        Deliverables
      </h2>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Deliverables"
        onKeyDown={(e) => moveTab(e, tabs.map((i) => i.kind), shown, select)}
        className="flex flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden border-b border-solid border-border"
      >
        {tabs.map((i) => {
          const on = i.kind === shown;
          return (
            <button
              key={i.kind}
              id={tabId(i.kind)}
              role="tab"
              type="button"
              data-tab={i.kind}
              aria-selected={on}
              aria-controls={panelId}
              tabIndex={on ? 0 : -1}
              onClick={() => select(i.kind)}
              className={cn(TAB, on ? TAB_ON : TAB_OFF)}
            >
              {ITEM_LABELS[i.kind]}
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(shown)}>
        {item.status !== "ready" ? (
          <Split
            artifact={<PieceNotReady item={item} chatHref={chatHref} />}
            aside={<Covers kind={item.kind} job={job} product={product} />}
          />
        ) : item.kind === "3d" ? (
          <ModelTab job={job} product={product} />
        ) : (
          <Split
            artifact={<Preview kind={item.kind} product={product} />}
            aside={<Covers kind={item.kind} job={job} product={product} />}
          />
        )}
      </div>
    </section>
  );
}

/** The review's layout: the artifact, and the 260 px aside beside it once the
 *  page is 640 px wide; below that the aside stacks under it, full width. */
function Split({ artifact, aside }: { artifact: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="grid gap-8 [@container(min-width:640px)]:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">{artifact}</div>
      <div className="[@container(min-width:640px)]:border-l [@container(min-width:640px)]:border-solid [@container(min-width:640px)]:border-border [@container(min-width:640px)]:pl-8">
        {aside}
      </div>
    </div>
  );
}

function Preview({ kind, product }: { kind: Exclude<BuildItemKind, "3d">; product: BuildProduct }) {
  const { heading, region } = PREVIEW[kind];
  return (
    <>
      {heading && <h3 className="sr-only">{heading}</h3>}
      <div
        role="region"
        aria-label={region}
        tabIndex={0}
        className="max-h-[520px] overflow-auto rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {kind === "pcb" && <PcbPreview job={product} />}
        {kind === "code" && <FirmwarePreview job={product} />}
        {kind === "wiring" && <WiringPreview job={product} />}
        {kind === "parts" && <PartsPreview job={product} />}
      </div>
    </>
  );
}

/** "What this covers" — `coversFor` verbatim, the review's honesty rules
 *  with it: the sample mesh, a companion's borrowed shape, a booked spec or
 *  one worked out from the parts. */
function Covers({ kind, job, product }: { kind: BuildItemKind; job: BuildJob; product: BuildProduct }) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-8">
      {kind === "parts" && <PartsSummary job={product} />}
      <section aria-labelledby={id}>
        <h3 id={id} className="text-sm font-semibold text-text-primary">
          What this covers
        </h3>
        <ul
          role="list"
          className="mt-3 flex list-disc flex-col gap-2 pl-5 text-md leading-relaxed text-text-secondary marker:text-text-tertiary"
        >
          {coversFor(kind, product, isSampleModel(job.modelGlbUrl), product.id !== "primary").map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** A piece that isn't there to look at says what happened to it (COR-32). */
function PieceNotReady({ item, chatHref }: { item: BuildItem; chatHref: string | null }) {
  const text =
    item.status === "failed"
      ? `This piece failed in this build.${chatHref ? " Retry it in the chat." : ""}`
      : item.status === "building"
        ? `This piece is still being built — ${Math.round(item.progress)}%.`
        : "This piece is waiting to be built.";
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-6 rounded-xl border border-border bg-bg-subtle p-10 text-center">
      <p className="max-w-[44ch] text-md text-text-secondary">{text}</p>
      {item.status === "failed" && chatHref && (
        <Link href={chatHref} className={LINK_BUTTON}>
          Open chat
        </Link>
      )}
    </div>
  );
}

/** COR-33 — the resting state is the concept image and View in 3D; the viewer
 *  mounts only then. Only the primary gets the generated mesh: the job makes
 *  one, from the primary's concept image, so a companion wearing it would
 *  claim a shape it never had. No retry here (`onRetryMesh` is omitted). */
function ModelTab({ job, product }: { job: BuildJob; product: BuildProduct }) {
  const [open, setOpen] = React.useState(false);
  const viewerRef = React.useRef<HTMLDivElement>(null);
  const primary = product.id === "primary";
  const assembly = React.useMemo(
    () =>
      open
        ? deriveAssembly({
            title: product.title,
            parts: product.parts,
            spec: product.spec,
            meshUrl: primary ? job.modelGlbUrl : undefined,
          })
        : null,
    [open, product.title, product.parts, product.spec, primary, job.modelGlbUrl],
  );
  const shellNote = !primary ? null : job.modelFailed ? "failed" : !job.modelGlbUrl ? "pending" : null;

  // The button that opened it is gone; focus moves into the viewer's region.
  React.useEffect(() => {
    if (open) viewerRef.current?.focus();
  }, [open]);

  if (!open || !assembly) {
    return (
      <Split
        artifact={
          <div className="flex flex-col items-start gap-6">
            <h3 className="sr-only">3D model</h3>
            {product.conceptImageUrl ? (
              <ConceptImage
                key={product.conceptImageUrl}
                src={product.conceptImageUrl}
                alt={`${product.name} concept image`}
                className="aspect-[4/3] w-full max-w-[360px]"
              />
            ) : null}
            <p className="text-md text-text-secondary">The 3D model loads when you open it.</p>
            <Button
              hierarchy="secondary"
              size="md"
              onClick={() => setOpen(true)}
              iconLeading={<Icon icon={ThreeDViewIcon} size={16} />}
              className="[@media(pointer:coarse)]:min-h-[var(--touch-min)]"
            >
              View in 3D
            </Button>
          </div>
        }
        aside={<Covers kind="3d" job={job} product={product} />}
      />
    );
  }

  // The model carries its own rail, so it takes the whole width and the
  // aside follows it below.
  return (
    <div className="flex flex-col gap-10">
      <div ref={viewerRef} tabIndex={-1} role="region" aria-label={`3D model of ${product.name}`} className="outline-none">
        <h3 className="sr-only">3D model</h3>
        <ModelPanelLazy key={product.id} assembly={assembly} shellNote={shellNote} />
      </div>
      <Covers kind="3d" job={job} product={product} />
    </div>
  );
}

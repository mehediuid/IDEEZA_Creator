"use client";

// The product page's five piece panels (COR-32…34, COR-37; P2-EDITOR-16):
// 3D model · PCB · Firmware code · Wiring · Parts. The strip that picks one
// is the page's own (product-tabs.tsx), so this file draws one panel's body:
// the build review's own preview component over this product at this
// version, with the review's "What this covers" aside beside it (artifact +
// a 260 px aside from a 640 px page), so the two surfaces say the same thing
// about the same product. Each panel starts with its own (visually hidden)
// h2, the tab's name (COR-99).
//
// No review controls live here (COR-36): no Retry, Save, Refine or spec edit.
// The one thing a panel lets you take away is its file — the firmware
// source, the parts list or the netlist, made from this product's own parts
// in this browser — and only for a viewer `DeliverablesAccess` lets through:
// the owner, a contributor, a demo buyer who holds a share (O12,
// P2-MARKETPLACE-21). Everyone else reads "Firmware and downloads come with a
// purchase." in its place.
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
import { bomFor, firmwareFor, isSampleModel, netsFor, type ArtifactSource } from "@/lib/create/build-artifacts";
import { ITEM_LABELS, type BuildItem, type BuildItemKind, type BuildJob, type BuildProduct } from "@/lib/create/history";
import { deriveAssembly } from "@/lib/three/assembly";
import { cn } from "@/lib/utils";
import { ConceptImage } from "./product-identity";

/** Whether this viewer may take the firmware and the files away: the product page provides
 *  `can(viewer, "deliverables.download", view.canCtx)` (O12, P2-MARKETPLACE-21). */
export const DeliverablesAccess = React.createContext(false);

/** Each preview in a named scroll region the keyboard can reach (COR-34). */
const REGION: Record<Exclude<BuildItemKind, "3d">, string> = {
  pcb: "PCB layout, scrollable",
  code: "Firmware code, scrollable",
  wiring: "Wiring map, scrollable",
  parts: "Parts list, scrollable",
};

// A link dressed as the quiet button; the hover keeps the button's text colour.
const LINK_BUTTON = cn(
  buttonVariants({ hierarchy: "secondary", size: "md" }),
  "hover:text-[color:var(--color-button-secondary-text)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
);

/** One piece's panel. The page shows the tab only when the piece is in the build (H-5). */
export function ProductPiecePanel({
  job,
  product,
  kind,
  chatHref,
}: {
  /** The build of the version on screen. */
  job: BuildJob;
  /** This product inside it. */
  product: BuildProduct;
  kind: BuildItemKind;
  /** The chat a failed piece is retried in; null in a preview or when the chat is gone. */
  chatHref: string | null;
}) {
  const item = product.items.find((i) => i.kind === kind) ?? null;
  return (
    <>
      <h2 className="sr-only">{ITEM_LABELS[kind]}</h2>
      {!item ? null : item.status !== "ready" ? (
        <Split
          artifact={<PieceNotReady item={item} chatHref={chatHref} />}
          aside={<Covers kind={kind} job={job} product={product} ready={false} />}
        />
      ) : kind === "3d" ? (
        <ModelTab job={job} product={product} />
      ) : (
        <Split
          artifact={<Preview kind={kind} product={product} />}
          aside={<Covers kind={kind} job={job} product={product} ready />}
        />
      )}
    </>
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
  return (
    <div
      role="region"
      aria-label={REGION[kind]}
      tabIndex={0}
      className="max-h-[520px] overflow-auto rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {kind === "pcb" && <PcbPreview job={product} />}
      {kind === "code" && <FirmwarePreview job={product} />}
      {kind === "wiring" && <WiringPreview job={product} />}
      {kind === "parts" && <PartsPreview job={product} />}
    </div>
  );
}

/** "What this covers" — `coversFor` verbatim, the review's honesty rules
 *  with it: the sample mesh, a companion's borrowed shape, a booked spec or
 *  one worked out from the parts. */
function Covers({
  kind,
  job,
  product,
  ready,
}: {
  kind: BuildItemKind;
  job: BuildJob;
  product: BuildProduct;
  /** The piece was built: only then is there a file to take away. */
  ready: boolean;
}) {
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
      <Downloads kind={kind} product={product} ready={ready} />
    </div>
  );
}

// ───────────────────────── downloads ─────────────────────────

type DownloadFile = { label: string; filename: string; type: string; text: () => string };

function fileSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

function csv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const t = String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

/** The piece's file, made from this product's own parts — the same builders the previews draw from. */
function fileFor(kind: BuildItemKind, product: ArtifactSource): DownloadFile | null {
  const base = fileSlug(product.title);
  switch (kind) {
    case "code": {
      const fw = firmwareFor(product);
      return { label: `Download ${fw.filename}`, filename: fw.filename, type: "text/plain", text: () => fw.lines.join("\n") + "\n" };
    }
    case "parts":
      return {
        label: "Download parts list (CSV)",
        filename: `${base}-parts.csv`,
        type: "text/csv",
        text: () => csv([["Ref", "Part", "Category", "Qty"], ...bomFor(product).rows.map((r) => [r.ref, r.name, r.category, r.qty])]),
      };
    case "pcb":
    case "wiring":
      return {
        label: "Download netlist (CSV)",
        filename: `${base}-netlist.csv`,
        type: "text/csv",
        text: () => {
          const nets = netsFor(product);
          const name = new Map(nets.nodes.map((n) => [n.id, n.label]));
          return csv([
            ["Net", "From", "From part", "To", "To part", "Class"],
            ...nets.wires.map((w) => [w.label, w.from, name.get(w.from) ?? "", w.to, name.get(w.to) ?? "", w.cls]),
          ]);
        },
      };
    default:
      return null;
  }
}

function save(file: DownloadFile) {
  const url = URL.createObjectURL(new Blob([file.text()], { type: file.type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The panel's file, or — for a viewer who may not take it — where the files come from. */
function Downloads({ kind, product, ready }: { kind: BuildItemKind; product: BuildProduct; ready: boolean }) {
  const allowed = React.useContext(DeliverablesAccess);
  const id = React.useId();
  const file = allowed && ready ? fileFor(kind, product) : null;
  if (allowed && !file) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-sm font-semibold text-text-primary">
        Downloads
      </h3>
      {file ? (
        <Button
          type="button"
          hierarchy="secondary"
          size="md"
          onClick={() => save(file)}
          className="self-start [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
        >
          {file.label}
        </Button>
      ) : (
        <p className="text-md text-text-secondary">Firmware and downloads come with a purchase.</p>
      )}
    </section>
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
        aside={<Covers kind="3d" job={job} product={product} ready />}
      />
    );
  }

  // The model carries its own rail, so it takes the whole width and the
  // aside follows it below.
  return (
    <div className="flex flex-col gap-10">
      <div ref={viewerRef} tabIndex={-1} role="region" aria-label={`3D model of ${product.name}`} className="outline-none">
        <ModelPanelLazy key={product.id} assembly={assembly} shellNote={shellNote} />
      </div>
      <Covers kind="3d" job={job} product={product} ready />
    </div>
  );
}

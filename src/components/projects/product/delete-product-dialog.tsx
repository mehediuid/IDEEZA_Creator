"use client";

// Delete product — the dialog behind the product's ⋯ › Delete product…
// (owner, 2026-11-15), on the project delete's terms (delete-project-dialog.tsx).
// The menu item is owner-only and, while `productDeleteBlockOf` names a rule
// (the project's only product, its copies listed or sold, the Main NFT
// listed, in an auction or sold), aria-disabled with the reason under it
// (product-menu.tsx).
// - The dialog lists what goes and what stays (`productDeletePlanOf`, read
//   from this browser's stores when it opens) and asks for the typed product
//   name only when editor work or its NFT copies would be lost. Cancel has the
//   focus; the destructive button reads Delete product.
// - Confirm re-reads the market, the copies and the record from storage
//   first: a sale or listing that arrived while the dialog was open blocks it
//   there, with the reason said in the dialog. Otherwise the row and its
//   editor documents go (`deleteProduct`), then its copies, shipping plan,
//   activity entries and their files, video and snapshots, and the page moves
//   to the project in the same transition with "Deleted "{name}"" queued for
//   it, so this page never renders "We couldn't find this product" on the way out.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner, ConfirmDialog, TextInput } from "@/components/ideeza";
import { readBriefDraft } from "@/lib/brief/project-brief";
import { parseStored, readStoredKey, writeStoredKey } from "@/lib/key-store";
import { readEditions, writeEditions } from "@/lib/market/editions-store";
import { readMarketNow } from "@/lib/market/market-store";
import { normalizeSellTerms, SELL_TERMS_KEY } from "@/lib/market/sell-flow";
import {
  matchesTypedName,
  productDeleteBlockOf,
  productDeleteFactsOf,
  productDeletePlanOf,
  type ProductDeleteBlock,
} from "@/lib/manual/delete-plan";
import { editorWorkOf } from "@/lib/manual/editor-work";
import type { Activity } from "@/lib/manual/journey";
import { deleteMediaFiles, mediaKeysOfActivity, readJourney, writeJourney } from "@/lib/manual/journey-store";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { deleteFactsOf, productRowsOf, type ProjectView } from "@/lib/manual/project-read";
import { projectSummary } from "@/lib/manual/project-summary";
import { normalizeProjects, PROJECTS_KEY, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { readSnapshots, removeSnapshot } from "@/lib/manual/snapshots";
import { deleteClips } from "@/lib/video/clip-store";
import { readProjectVideos, writeProjectVideos } from "@/lib/video/store";
import { setProjectNotice } from "../project-notice";
import type { ProductSlotProps } from "./product-slots";

/** This browser's storage, or null when site data is blocked. */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The stored project, as another tab may have left it; null when unreadable. */
function storedProject(id: string): ManualProject | null {
  const parsed = parseStored(readStoredKey(PROJECTS_KEY));
  if (parsed.unreadable) return null;
  return normalizeProjects(parsed.value ?? []).find((p) => p.id === id) ?? null;
}

/** An activity entry about this product or one of its NFT copies. */
const ofProduct = (a: Activity, rowId: string) =>
  (a.target.kind === "product" && a.target.productId === rowId) ||
  ((a.target.kind === "physical" || a.target.kind === "virtual") && a.target.scope === rowId);

/** The block over what is stored now, not what the page last rendered: the market, the copies
 *  and the record, in memory and in storage — either one blocking blocks. */
export function blockNow(project: ManualProject, view: ProjectView, rowId: string): ProductDeleteBlock | null {
  const market = readMarketNow();
  const editions = readEditions(project.id);
  const builds = view.refs.flatMap((r) => (r.job ? [r.job] : []));
  const brief = readBriefDraft(project.id);
  const now = Date.now();
  const records = [project, storedProject(project.id)].filter((p): p is ManualProject => p !== null);
  for (const p of records) {
    const summary = projectSummary(p, { builds, brief, videoJobs: [], now, market });
    const sales = market.sales.filter((s) => s.projectId === p.id);
    const deleteFacts = deleteFactsOf({
      listing: summary.listing,
      sales,
      ownership: summary.ownership,
      marketUnreadable: market.unreadable,
      editions,
    });
    const block = productDeleteBlockOf(
      productDeleteFactsOf({ products: productRowsOf(p).length, deleteFacts, sales, editions }, rowId),
    );
    if (block) return block;
  }
  return null;
}

/** Everything of the product's outside the project record. Each store is read again and written
 *  once; a file store (activity files, video clips) is cleared only after its record let go of it. */
export function sweepProductRecords(projectId: string, rowId: string): void {
  const tracks = readEditions(projectId);
  const keptTracks = tracks.filter((t) => t.productId !== rowId);
  if (keptTracks.length !== tracks.length) writeEditions(projectId, keptTracks);

  const termsKey = SELL_TERMS_KEY(projectId);
  const parsed = parseStored(readStoredKey(termsKey));
  if (!parsed.unreadable && parsed.value !== undefined) {
    const terms = normalizeSellTerms(parsed.value);
    if (rowId in terms.physical) {
      writeStoredKey(termsKey, {
        ...terms,
        physical: Object.fromEntries(Object.entries(terms.physical).filter(([id]) => id !== rowId)),
      });
    }
  }

  const journey = readJourney(projectId);
  const entries = journey.activities.filter((a) => ofProduct(a, rowId));
  if (entries.length > 0) {
    const written = writeJourney(projectId, { ...journey, activities: journey.activities.filter((a) => !ofProduct(a, rowId)) });
    if (written.ok) void deleteMediaFiles(entries.flatMap(mediaKeysOfActivity));
  }

  const videos = readProjectVideos(projectId);
  const video = videos?.products[rowId];
  if (videos && video) {
    const products = Object.fromEntries(Object.entries(videos.products).filter(([id]) => id !== rowId));
    if (writeProjectVideos(projectId, { ...videos, products }).ok) void deleteClips(video.takes.map((t) => t.id)).catch(() => {});
  }

  const store = storage();
  if (store) {
    for (const s of readSnapshots(projectId, store)) if (s.productId === rowId) removeSnapshot(projectId, s.id, store);
  }
}

export function DeleteProductDialog({ slot, onClose }: { slot: ProductSlotProps; onClose: () => void }) {
  const { project, view, product } = slot;
  const router = useRouter();
  const { deleteProduct } = useManualProjects();
  const [entry, setEntry] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const fieldRef = React.useRef<HTMLInputElement>(null);
  const fieldId = React.useId();
  const errorId = React.useId();
  const name = displayProductName(product.name);

  // Read when the dialog opens: the editor documents, the activity, the video and the snapshots
  // are in this browser's storage, not in the page's derivation.
  const plan = React.useMemo(() => {
    const rows = productRowsOf(project);
    const source = rows.find((r) => r.id === product.id)?.source;
    const terms = normalizeSellTerms(parseStored(readStoredKey(SELL_TERMS_KEY(project.id))).value);
    const entries = readJourney(project.id).activities.filter((a) => ofProduct(a, product.id));
    const store = storage();
    return productDeletePlanOf({
      products: rows.length,
      work: editorWorkOf({ projectId: project.id, productId: product.id }, rows[0]?.id ?? product.id),
      copies: view.editions.filter((t) => t.productId === product.id).map((t) => ({ kind: t.kind, use: t.use })),
      shipping: product.id in terms.physical,
      activity: { entries: entries.length, files: entries.reduce((n, a) => n + a.media.length, 0) },
      takes: readProjectVideos(project.id)?.products[product.id]?.takes.length ?? 0,
      snapshots: store ? readSnapshots(project.id, store).filter((s) => s.productId === product.id).length : 0,
      cover: !!source && project.cover?.buildId === source.buildId && project.cover?.productId === source.productId,
      built: product.state === "built",
    });
  }, [project, product.id, product.state, view.editions]);

  const liveBlock = productDeleteBlockOf(
    productDeleteFactsOf(
      { products: productRowsOf(project).length, deleteFacts: view.deleteFacts, sales: view.sales, editions: view.editions },
      product.id,
    ),
  );
  const [lateBlock, setLateBlock] = React.useState<ProductDeleteBlock | null>(null);
  const block = liveBlock ?? lateBlock;

  const matched = !plan.typed || matchesTypedName(entry, name);
  const mismatch = plan.typed && tried && !matched;

  const confirm = () => {
    if (pending || block) return;
    if (!matched) {
      setTried(true);
      fieldRef.current?.focus();
      return;
    }
    const now = blockNow(project, view, product.id);
    if (now) {
      setLateBlock(now);
      return;
    }
    // One transition: the row goes as the project page arrives.
    startTransition(() => {
      if (!deleteProduct(project.id, product.id)) {
        setLateBlock(blockNow(project, view, product.id));
        return;
      }
      sweepProductRecords(project.id, product.id);
      setProjectNotice(`Deleted "${name}"`);
      router.replace(`/projects/${project.id}`);
    });
  };

  return (
    <ConfirmDialog
      open
      title={`Delete "${name}"?`}
      confirmLabel={pending ? "Deleting…" : "Delete product"}
      confirmUnavailable={!matched || pending || block !== null}
      onConfirm={confirm}
      onCancel={() => {
        if (!pending) onClose();
      }}
    >
      {/* Always on the page, so a block that arrives while it is open is read. */}
      <div aria-live="polite">{block && <Banner tone="attention" title={block.reason} className="mb-[16px]" />}</div>
      <h3 className="font-semibold text-text-primary">What goes</h3>
      {/* No role="list" on these: reset.css strips the bullets and the indent
          from ul[role="list"], and a bulleted list keeps its semantics. */}
      <ul className="mt-[4px] flex list-disc flex-col gap-[2px] pl-[20px]">
        {plan.goes.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <h3 className="mt-[16px] font-semibold text-text-primary">What stays</h3>
      <ul className="mt-[4px] flex list-disc flex-col gap-[2px] pl-[20px]">
        {plan.stays.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {plan.typed && (
        <div className="mt-[16px]">
          <label htmlFor={fieldId} className="block font-medium text-text-primary">
            Type the product name to confirm
          </label>
          <TextInput
            ref={fieldRef}
            id={fieldId}
            size="xl"
            value={entry}
            onValueChange={(v) => {
              setEntry(v);
              setTried(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirm();
              }
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            invalid={mismatch}
            aria-invalid={mismatch || undefined}
            aria-describedby={errorId}
            containerClassName="mt-[6px]"
          />
          {/* Always on the page, so the polite region speaks when it fills. */}
          <p id={errorId} aria-live="polite" className="mt-[6px] min-h-[20px] text-text-error">
            {mismatch ? `That doesn't match "${name}".` : ""}
          </p>
        </div>
      )}
    </ConfirmDialog>
  );
}

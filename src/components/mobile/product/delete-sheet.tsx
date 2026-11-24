"use client";

// Delete product on the phone — the web's DeleteProductDialog (CL-015) as the
// kit's confirm sheet: the question names the product; What goes and What
// stays (`productDeletePlanOf`, read from this browser's stores when it
// opens); the typed product name only when editor work or NFT copies would be
// lost (Delete product stays off-looking until it matches, and pressing it
// with a wrong name says `That doesn't match "{name}".`; the keyboard's Enter
// confirms); Cancel and Delete product in one row, the action on the right
// (Deleting… while it works).
// At confirm the rules are checked again over what is stored now (the web's
// `blockNow`): a sale or listing that arrived while the sheet was open blocks
// it, said in a banner at the top of the sheet, and nothing is deleted.
// Otherwise the row and its editor documents go (`deleteProduct`), then its
// copies, shipping plan, activity entries and files, video takes and
// snapshots (`sweepProductRecords`), and the phone goes back to the project's
// products with `Deleted "{name}"` as a toast.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { Field, errorProps } from "@/components/auth/auth-parts";
import { blockNow, sweepProductRecords } from "@/components/projects/product/delete-product-dialog";
import { parseStored, readStoredKey } from "@/lib/key-store";
import { normalizeSellTerms, SELL_TERMS_KEY } from "@/lib/market/sell-flow";
import { matchesTypedName, productDeletePlanOf, type ProductDeleteBlock } from "@/lib/manual/delete-plan";
import { editorWorkOf } from "@/lib/manual/editor-work";
import type { Activity } from "@/lib/manual/journey";
import { readJourney } from "@/lib/manual/journey-store";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { productRowsOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { readSnapshots } from "@/lib/manual/snapshots";
import { readProjectVideos } from "@/lib/video/store";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { useDeleteBlock } from "./menu";
import { useProduct } from "./use-product";

/** This browser's storage, or null when site data is blocked. */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** An activity entry about this product or one of its NFT copies (the web dialog's `ofProduct`). */
const ofProduct = (a: Activity, rowId: string) =>
  (a.target.kind === "product" && a.target.productId === rowId) ||
  ((a.target.kind === "physical" || a.target.kind === "virtual") && a.target.scope === rowId);

/** The most of a name the sheet's title shows before it is cut (two lines at 320 px), as Delete project does. */
const TITLE_NAME_MAX = 32;

export function DeleteProductSheet({ onClose }: { onClose: () => void }) {
  const { project, view, product, name } = useProduct();
  const router = useRouter();
  const toast = useToast();
  const { deleteProduct } = useManualProjects();
  const [entry, setEntry] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [lateBlock, setLateBlock] = React.useState<ProductDeleteBlock | null>(null);
  const [pending, startTransition] = React.useTransition();
  const fieldId = React.useId();
  const errorId = `${fieldId}-error`;

  // Read when the sheet opens: the editor documents, the activity, the video and the snapshots are
  // in this browser's storage, not in the page's derivation.
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

  const block = useDeleteBlock() ?? lateBlock;
  const matched = !plan.typed || matchesTypedName(entry, name);
  const mismatch = plan.typed && tried && !matched;
  const off = !matched || block !== null;

  const confirm = () => {
    if (pending || block) return;
    if (!matched) {
      setTried(true);
      document.getElementById(fieldId)?.focus();
      return;
    }
    const now = blockNow(project, view, product.id);
    if (now) {
      setLateBlock(now);
      return;
    }
    // One transition: the row goes as the project's products arrive.
    startTransition(() => {
      if (!deleteProduct(project.id, product.id)) {
        setLateBlock(blockNow(project, view, product.id));
        return;
      }
      sweepProductRecords(project.id, product.id);
      toast({ title: `Deleted "${name}"` });
      router.replace(phoneProjectHref(project.id, "products"));
    });
  };

  const longName = Array.from(name).length > TITLE_NAME_MAX;
  const titleName = longName ? `${Array.from(name).slice(0, TITLE_NAME_MAX).join("")}…` : name;

  return (
    <Sheet
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      title={`Delete "${titleName}"?`}
      actions={
        <div className="flex gap-4">
          <Button hierarchy="secondary" size="xl" className="min-w-0 flex-1" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            hierarchy="danger"
            size="xl"
            className={cn("min-w-0 flex-1", off && "cursor-not-allowed opacity-60")}
            aria-disabled={off || undefined}
            loading={pending}
            onClick={confirm}
          >
            {pending ? "Deleting…" : "Delete product"}
          </Button>
        </div>
      }
    >
      {/* Always on the sheet, so a block that arrives while it is open is read. */}
      <div aria-live="polite" className="empty:hidden">
        {block && <Banner tone="attention" title={block.reason} />}
      </div>
      {longName && <p className={cn(T.body, "break-words text-text-primary")}>“{name}”</p>}
      <div className={cn(T.body, "flex flex-col gap-2")}>
        <h3 className={T.rowTitle}>What goes</h3>
        <ul className="flex list-disc flex-col gap-1 pl-8">
          {plan.goes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <h3 className={cn(T.rowTitle, "pt-4")}>What stays</h3>
        <ul className="flex list-disc flex-col gap-1 pl-8">
          {plan.stays.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      {plan.typed && (
        <Field label="Type the product name to confirm" htmlFor={fieldId} error={mismatch ? `That doesn't match "${name}".` : null} errorId={errorId}>
          <TextInput
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
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            {...errorProps(mismatch ? "x" : null, errorId)}
          />
        </Field>
      )}
    </Sheet>
  );
}

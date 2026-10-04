"use client";

// Load version {m} into the editor (P2-BUILDLOAD-9) — opened from the
// product page's Editor block, the one home for Load and Restore (BUILDLOAD
// C5). One box per document version {m} supplies (`loadOfferOf`): ticked
// when the product's document is absent, untouched, or still what its seed
// wrote; unticked, with the reason, when the maker's own work is in it.
// Confirm replaces only the ticked documents, in order:
//   1. the PCB store lets go of this product if it holds it (its pending
//      save lands first), so an old board in memory can't be saved over the
//      new one;
//   2. each replaced document is kept in its `:prev` slot, for Restore;
//   3. version {m}'s documents are written, then the seed record.
// When the browser has no room for the copies, nothing has changed yet: the
// dialog says so, and its confirm becomes "Replace without keeping".

import * as React from "react";
import { Banner, Checkbox, ConfirmDialog } from "@/components/ideeza";
import {
  BACKUP_REFUSED_MESSAGE,
  PICK_ONE_REASON,
  REPLACE_WITHOUT_KEEPING,
  SEED_KEYS,
  loadOfferOf,
  replaceLabelOf,
  seedPlanOf,
  type EditorSeed,
  type SeedEditor,
  type SeedKey,
} from "@/lib/manual/build-load";
import { loadVersion, type SeedBuilt } from "@/lib/manual/build-load-io";
import { editorDocKey } from "@/lib/manual/editor-scope";
import type { EditorScope } from "@/lib/manual/p2-types";
import { WRITE_FAILED } from "@/lib/manual/project-header";
import { usePcbActions } from "@/lib/pcb/store";
import { cn } from "@/lib/utils";

const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function LoadVersionDialog({
  scope,
  built,
  record,
  onLoaded,
  onClose,
}: {
  scope: EditorScope;
  /** The row's build now — the version it offers (`built.ref.version`). */
  built: SeedBuilt;
  /** The product's seed record, as the Editor block read it. */
  record: EditorSeed | null;
  /** After the write: `message` is the polite announcement. */
  onLoaded: (message: string) => void;
  onClose: () => void;
}) {
  const pcb = usePcbActions();
  const job = built.ref.job;
  const version = built.ref.version;
  // What version {m} supplies, and each document as it is now — read once,
  // when the dialog opens.
  const plan = React.useMemo(
    () => (job ? seedPlanOf(job, built.product, version) : null),
    [job, built.product, version],
  );
  const [current] = React.useState<Partial<Record<SeedKey, string | null>>>(() => {
    const out: Partial<Record<SeedKey, string | null>> = {};
    try {
      for (const k of SEED_KEYS) out[k] = window.localStorage.getItem(editorDocKey(k, scope));
    } catch {
      // Unreadable storage: every box reads as absent, and the write says why it can't go ahead.
    }
    return out;
  });
  const offer = React.useMemo(() => (plan ? loadOfferOf(plan, record, current) : null), [plan, record, current]);
  const [ticked, setTicked] = React.useState<ReadonlySet<SeedEditor>>(
    () => new Set(offer?.rows.filter((r) => r.checked).map((r) => r.editor) ?? []),
  );
  const [noBackup, setNoBackup] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reasonId = React.useId();

  if (!plan || !offer) return null;
  const rows = offer.rows;
  const count = rows.filter((r) => ticked.has(r.editor)).length;

  const toggle = (editor: SeedEditor) =>
    setTicked((cur) => {
      const next = new Set(cur);
      if (next.has(editor)) next.delete(editor);
      else next.add(editor);
      return next;
    });

  const confirm = () => {
    const keys = rows.filter((r) => ticked.has(r.editor)).flatMap((r) => r.keys);
    if (!keys.length) return; // the reason is on screen beside the boxes
    pcb.releaseScope(scope);
    let result: ReturnType<typeof loadVersion>;
    try {
      result = loadVersion(scope, plan, keys, Date.now(), window.localStorage, { keep: !noBackup });
    } catch {
      result = { ok: false, reason: "write" };
    }
    if (result.ok) {
      onLoaded(result.message);
      return;
    }
    if (result.reason === "backup") {
      setNoBackup(true);
      setError(null);
    } else {
      setError(WRITE_FAILED);
    }
  };

  return (
    <ConfirmDialog
      open
      title={offer.title}
      tone={noBackup ? "danger" : "primary"}
      confirmLabel={noBackup ? REPLACE_WITHOUT_KEEPING : (replaceLabelOf(count) ?? "Replace documents")}
      confirmUnavailable={count === 0}
      onConfirm={confirm}
      onCancel={onClose}
    >
      <p className="max-w-[62ch]">{offer.intro}</p>
      <div role="group" aria-label={`Documents to replace with version ${offer.version}'s`} className="mt-[12px] flex flex-col gap-[4px]">
        {rows.map((r) => {
          const on = ticked.has(r.editor);
          const hintId = `${reasonId}-${r.editor}`;
          return (
            <button
              key={r.editor}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-describedby={r.hint ? hintId : undefined}
              onClick={() => toggle(r.editor)}
              className={cn(
                "flex min-h-[32px] items-start gap-[10px] rounded-md px-[4px] py-[4px] text-left outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
                TAP,
              )}
            >
              <span className="inline-flex h-[var(--line-height-md)] shrink-0 items-center">
                <Checkbox checked={on} decorative />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-text-primary">{r.label}</span>
                {r.hint && (
                  <span id={hintId} className="block text-text-secondary">
                    {r.hint}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className={cn("mt-[8px] font-medium text-text-primary", count > 0 && "sr-only")}>
        {count === 0 ? PICK_ONE_REASON : ""}
      </p>
      {noBackup && (
        <Banner tone="error" className="mt-[12px]">
          {BACKUP_REFUSED_MESSAGE}
        </Banner>
      )}
      {error && (
        <Banner tone="error" className="mt-[12px]">
          {error}
        </Banner>
      )}
    </ConfirmDialog>
  );
}

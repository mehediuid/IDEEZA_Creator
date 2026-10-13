"use client";

// The ladder's missing steps, each with its one-tap fix (Build and Earn P1-4).
// One row component for the Earn overview's track and every commit point, so
// a step reads and fixes the same wherever it's asked:
// - Open products, Go to mint, Set payout wallet: links to the one place that
//   step is done. Minting starts from Earn › Project NFT (the Brief entry, the
//   mint flow's home), and the payout wallet lives in its Outcome block.
// - Make videos: opens the products' videos in a dialog right here, where
//   each one is generated (make-videos.tsx; owner, 2026-10-12).
// - Connect wallet: opens the Demo wallet dialog.
// - Confirm ownership: writes `ownerConfirmedAt` at once, the readiness gate's
//   own write.
// - Choose a license, Verify identity: open their dialogs.
// Every fix is secondary: the page's one violet control stays its own.
// Inside a dialog, `onCover` tells it while a fix's own dialog sits on top,
// so the keyboard belongs to the top one (ModalFrame's `covered`).

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import type { StoredDraft } from "@/lib/brief/project-brief";
import type { LadderStep } from "@/lib/commerce/ladder";
import { earnHref } from "@/lib/manual/earn-route";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { MakeVideosButton } from "../../make-videos";
import { LicenseDialog } from "./license-dialog";
import { VerifyIdentityDialog } from "./verify-identity-dialog";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const FIX = cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "shrink-0 whitespace-nowrap max-sm:w-full", TAP);

type FixContext = {
  project: Pick<ManualProject, "id">;
  brief: StoredDraft | null;
  /** The page's polite live region, for a fix that changes state in place. */
  announce?: (message: string) => void;
  /** Called with true while a fix's dialog is open, false once it's gone. */
  onCover?: (covered: boolean) => void;
};

/** One missing step's fix control. */
export function StepFix({ step, project, brief, announce, onCover, describedBy }: FixContext & { step: LadderStep; describedBy?: string }) {
  const { openManage } = useWalletRequest();
  const { setOwnerConfirmed } = useManualProjects();
  const [dialog, setDialog] = React.useState<"license" | "identity" | null>(null);
  const label = step.fix.label;
  // Also uncovers when the fixed step's row goes away with its dialog.
  React.useEffect(() => {
    if (!dialog || !onCover) return;
    onCover(true);
    return () => onCover(false);
  }, [dialog, onCover]);

  switch (step.fix.kind) {
    case "products":
      return (
        <Link href={`/projects/${encodeURIComponent(project.id)}`} className={FIX} aria-describedby={describedBy}>
          {label}
        </Link>
      );
    case "media":
      return (
        <MakeVideosButton
          projectId={project.id}
          label={label}
          className={FIX}
          describedBy={describedBy}
          announce={announce}
          onOpenChange={onCover}
        />
      );
    case "mint":
    case "payout":
      return (
        <Link href={earnHref(project.id, "sell")} className={FIX} aria-describedby={describedBy}>
          {label}
        </Link>
      );
    case "wallet":
      return (
        <Button type="button" hierarchy="secondary" size="md" className={FIX} aria-describedby={describedBy} onClick={openManage}>
          {label}
        </Button>
      );
    case "ownership":
      return (
        <Button
          type="button"
          hierarchy="secondary"
          size="md"
          className={FIX}
          aria-describedby={describedBy}
          onClick={() => {
            setOwnerConfirmed(project.id, Date.now());
            announce?.("Ownership confirmed.");
          }}
        >
          {label}
        </Button>
      );
    case "license":
      return (
        <>
          <Button type="button" hierarchy="secondary" size="md" className={FIX} aria-describedby={describedBy} onClick={() => setDialog("license")}>
            {label}
          </Button>
          <LicenseDialog
            open={dialog === "license"}
            projectId={project.id}
            current={brief?.state.license ?? null}
            onClose={() => setDialog(null)}
            onSaved={announce}
          />
        </>
      );
    case "identity":
      return (
        <>
          <Button type="button" hierarchy="secondary" size="md" className={FIX} aria-describedby={describedBy} onClick={() => setDialog("identity")}>
            {label}
          </Button>
          <VerifyIdentityDialog open={dialog === "identity"} onClose={() => setDialog(null)} onVerified={announce} />
        </>
      );
  }
}

/**
 * Steps as rows: the glyph and its word (done or not done yet), the step,
 * and, while it's missing, why and its fix. A step without `ok` is missing.
 * Ruled rows, not a box: they sit inside cards and dialogs (no card in a card).
 */
export function MissingSteps({ steps, ...ctx }: FixContext & { steps: readonly (LadderStep & { ok?: boolean })[] }) {
  const base = React.useId();
  return (
    <ul role="list" className="m-0 flex list-none flex-col divide-y divide-border border-y border-solid border-border p-0">
      {steps.map((s) => {
        const reasonId = `${base}-${s.id}`;
        const done = s.ok === true;
        return (
          <li key={s.id} className="flex flex-wrap items-center gap-x-6 gap-y-4 py-5">
            <span aria-hidden className={cn("inline-flex shrink-0 self-start pt-px", done ? "text-text-success" : "text-text-tertiary")}>
              <Icon icon={done ? CheckmarkCircle02Icon : CircleIcon} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 basis-[200px] flex-col gap-1">
              <span className="text-md font-semibold text-text-primary">
                {s.label}
                <span className="sr-only">{done ? ", done" : ", not done yet"}</span>
              </span>
              {!done && (
                <span id={reasonId} className="max-w-[62ch] text-md leading-relaxed text-text-secondary">
                  {s.reason}
                </span>
              )}
            </span>
            {!done && <StepFix step={s} describedBy={reasonId} {...ctx} />}
          </li>
        );
      })}
    </ul>
  );
}

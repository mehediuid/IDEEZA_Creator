"use client";

// ReviewOutputs — Phase 2's final view, shown when all build items are
// ready. The user reviews each deliverable, then picks one of three
// outcomes (spec §6):
//   • Save as Private   — off-chain draft, no wallet, no KYC
//   • Give to community — showcase + mint (wallet/gas)
//   • Sell on marketplace — mint + KYC (KYC failure → retry)
//
// Wallet / KYC are stubbed inline. Real chain calls hook into
// /api/projects later; the route already accepts the outcome.

import * as React from "react";
import {
  Cancel01Icon,
  CheckListIcon,
  CheckmarkBadge01Icon,
  CodeIcon,
  CpuIcon,
  CubeIcon,
  HelpCircleIcon,
  ShoppingBag01Icon,
  User02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";
import { ModelViewer } from "@/components/3d/model-viewer";
import {
  ITEM_LABELS,
  useCreateHistory,
  type BuildItemKind,
  type BuildJob,
  type BuildOutcome,
} from "@/lib/create/history";

const KIND_ICON: Record<BuildItemKind, IconValue> = {
  "3d": CubeIcon,
  pcb: CpuIcon,
  code: CodeIcon,
};

const KIND_BLURB: Record<BuildItemKind, string> = {
  "3d":
    "The printable enclosure: where things mount, how it closes, the tolerances. Open it in your slicer.",
  pcb:
    "The circuit board: the schematic, layout, and the parts to buy. Send it to a fab as Gerbers.",
  code:
    "The firmware: starter code wired to the parts in the PCB, ready to flash and modify.",
};

export function ReviewOutputs({ job }: { job: BuildJob }) {
  const [active, setActive] = React.useState<BuildItemKind>(job.items[0].kind);
  const [picking, setPicking] = React.useState<BuildOutcome | null>(null);
  const { setBuildOutcome } = useCreateHistory();

  return (
    <div className="flex flex-col gap-[24px]">
      {/* Outputs panel */}
      <section
        aria-labelledby="outputs-heading"
        className="overflow-hidden rounded-2xl border border-border bg-bg-surface"
      >
        <header className="flex items-center justify-between gap-[16px] border-b border-border px-[20px] py-[14px]">
          <div>
            <p className="text-2xs font-bold uppercase tracking-wider text-text-brand">
              Build ready
            </p>
            <h2
              id="outputs-heading"
              className="mt-[2px] text-xl font-bold tracking-tight text-text-primary"
            >
              Review your deliverables
            </h2>
          </div>
        </header>

        {/* Tab strip */}
        <div
          role="tablist"
          aria-label="Deliverables"
          className="flex items-center gap-[4px] border-b border-border px-[12px] pt-[12px]"
        >
          {job.items.map((item) => {
            const isActive = active === item.kind;
            return (
              <button
                key={item.kind}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`output-panel-${item.kind}`}
                id={`output-tab-${item.kind}`}
                onClick={() => setActive(item.kind)}
                className={[
                  "inline-flex h-[36px] items-center gap-[8px] rounded-t-lg px-[14px] text-md font-medium outline-none transition-colors duration-fast",
                  "focus-visible:ring-2 focus-visible:ring-border-focus",
                  isActive
                    ? "bg-bg-page font-semibold text-text-primary"
                    : "text-text-secondary hover:text-text-primary",
                ].join(" ")}
              >
                <Icon icon={KIND_ICON[item.kind]} />
                {ITEM_LABELS[item.kind]}
              </button>
            );
          })}
        </div>

        {/* Active panel */}
        {job.items.map((item) => (
          <div
            key={item.kind}
            id={`output-panel-${item.kind}`}
            role="tabpanel"
            aria-labelledby={`output-tab-${item.kind}`}
            hidden={active !== item.kind}
            className="bg-bg-page p-[20px]"
          >
            <DeliverablePreview kind={item.kind} modelGlbUrl={job.modelGlbUrl} />
            <div className="mt-[16px] flex items-start gap-[10px] rounded-lg border border-border bg-bg-surface p-[14px]">
              <Icon icon={HelpCircleIcon} />
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">
                  What is this?{" "}
                </span>
                {KIND_BLURB[item.kind]}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Outcome picker */}
      <section
        aria-labelledby="outcome-heading"
        className="rounded-2xl border border-border bg-bg-surface p-[20px]"
      >
        <h2
          id="outcome-heading"
          className="text-md font-semibold text-text-primary"
        >
          What do you want to do with this build?
        </h2>
        <p className="mt-[4px] text-sm text-text-tertiary">
          Saving privately stays off-chain. Sharing or selling mints on-chain
          authorship; selling also requires KYC.
        </p>
        {job.outcome ? (
          <OutcomeBadge outcome={job.outcome} />
        ) : (
          <ul
            role="list"
            className="mt-[16px] grid gap-[12px] md:grid-cols-3"
          >
            <OutcomeCard
              icon={CheckListIcon}
              title="Save as Private"
              detail="Off-chain draft. No wallet, no KYC."
              requirementHint="Stays in your projects only."
              onClick={() => setPicking("private")}
            />
            <OutcomeCard
              icon={User02Icon}
              title="Give to community"
              detail="Showcase + mint authorship on-chain."
              requirementHint="Wallet needed · No KYC."
              onClick={() => setPicking("community")}
            />
            <OutcomeCard
              icon={ShoppingBag01Icon}
              title="Sell on marketplace"
              detail="List for sale with on-chain proof."
              requirementHint="Wallet + KYC needed."
              onClick={() => setPicking("sell")}
              primary
            />
          </ul>
        )}
      </section>

      {picking && (
        <OutcomeDialog
          outcome={picking}
          onCancel={() => setPicking(null)}
          onConfirm={async () => {
            await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ buildId: job.id, outcome: picking }),
            }).catch(() => null);
            setBuildOutcome(job.id, picking);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

function OutcomeCard({
  icon,
  title,
  detail,
  requirementHint,
  onClick,
  primary,
}: {
  icon: IconValue;
  title: string;
  detail: string;
  requirementHint: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          "flex h-full w-full flex-col items-start gap-[10px] rounded-xl border p-[16px] text-left outline-none transition-colors duration-fast",
          "focus-visible:ring-2 focus-visible:ring-border-focus",
          primary
            ? "border-border-brand bg-bg-brand-subtle hover:bg-bg-brand-subtle"
            : "border-border bg-bg-page hover:border-border-strong",
        ].join(" ")}
      >
        <span
          aria-hidden
          className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg bg-bg-surface text-text-brand"
        >
          <Icon icon={icon} />
        </span>
        <p className="text-md font-semibold text-text-primary">{title}</p>
        <p className="text-sm text-text-secondary">{detail}</p>
        <p className="mt-auto text-2xs font-bold uppercase tracking-wider text-text-tertiary">
          {requirementHint}
        </p>
      </button>
    </li>
  );
}

function OutcomeBadge({ outcome }: { outcome: BuildOutcome }) {
  const labels: Record<BuildOutcome, string> = {
    private: "Saved as Private",
    community: "Shared with community · Minted",
    sell: "Listed for sale · Minted",
  };
  return (
    <div className="mt-[16px] flex items-center gap-[12px] rounded-xl border border-border bg-bg-brand-subtle px-[16px] py-[14px]">
      <Icon icon={CheckmarkBadge01Icon} />
      <p className="text-md font-semibold text-text-brand">
        {labels[outcome]}
      </p>
      <Link
        href="/"
        className="ml-auto text-sm font-semibold text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
      >
        Back to Home
      </Link>
    </div>
  );
}

function DeliverablePreview({
  kind,
  modelGlbUrl,
}: {
  kind: BuildItemKind;
  modelGlbUrl?: string;
}) {
  return (
    <div className="grid gap-[12px] md:grid-cols-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-bg-surface-raised">
        {kind === "3d" && modelGlbUrl ? (
          <ModelViewer url={modelGlbUrl} />
        ) : kind === "3d" ? (
          <GeneratingModel />
        ) : (
          <div className="flex h-full items-center justify-center text-text-tertiary">
            <Icon icon={KIND_ICON[kind]} size={48} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-[10px] rounded-lg border border-border bg-bg-surface p-[16px]">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
          What ships
        </p>
        <ul role="list" className="flex flex-col gap-[6px] text-sm text-text-secondary">
          {kind === "3d" && (
            <>
              <PreviewLine>STL + STEP files</PreviewLine>
              <PreviewLine>Print settings: PETG, 0.2mm layer</PreviewLine>
              <PreviewLine>Mount points sized for the PCB</PreviewLine>
            </>
          )}
          {kind === "pcb" && (
            <>
              <PreviewLine>Schematic (PDF + KiCad)</PreviewLine>
              <PreviewLine>2-layer layout · Gerber bundle</PreviewLine>
              <PreviewLine>Bill of materials with stock links</PreviewLine>
            </>
          )}
          {kind === "code" && (
            <>
              <PreviewLine>Arduino-style sketch, fully commented</PreviewLine>
              <PreviewLine>Library list pinned to versions</PreviewLine>
              <PreviewLine>Wiring map to the PCB pins</PreviewLine>
            </>
          )}
        </ul>
        {kind === "3d" && modelGlbUrl && (
          <a
            href={modelGlbUrl}
            download
            className="mt-[2px] inline-flex h-[34px] w-fit items-center gap-[8px] rounded-lg border border-border bg-bg-page px-[12px] text-sm font-semibold text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12 M7 11l5 5 5-5 M5 21h14" />
            </svg>
            Download .glb
          </a>
        )}
      </div>
    </div>
  );
}

// Shown in the 3D tab while the enclosure mesh is still being generated from
// the concept image. The build can flip to "ready" before a slow provider
// finishes the mesh, so this keeps the panel honest until the model lands.
function GeneratingModel() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[10px] text-text-tertiary">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="ix-modelspin">
        <circle cx="12" cy="12" r="9" stroke="var(--color-border)" strokeWidth="2.5" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="var(--color-text-brand)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium text-text-secondary">Generating 3D model…</p>
      <style>{`.ix-modelspin{animation:ix-modelspin-kf 1s linear infinite}@keyframes ix-modelspin-kf{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.ix-modelspin{animation:none}}`}</style>
    </div>
  );
}

function PreviewLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-[8px]">
      <span aria-hidden className="mt-[3px] inline-flex text-text-brand">
        <Icon icon={CheckmarkBadge01Icon} size={14} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function OutcomeDialog({
  outcome,
  onCancel,
  onConfirm,
}: {
  outcome: BuildOutcome;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const config = OUTCOME_DIALOG[outcome];

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-dialog-title"
      onClick={onCancel}
      className="fixed inset-0 z-modal flex items-center justify-center px-[16px] py-[24px]"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-bg-page/60 backdrop-blur-sm"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-3"
      >
        <header className="flex items-start gap-[16px] border-b border-border px-[20px] py-[16px]">
          <span
            aria-hidden
            className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
          >
            <Icon icon={config.icon} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="outcome-dialog-title"
              className="text-lg font-bold tracking-tight text-text-primary"
            >
              {config.title}
            </h2>
            <p className="mt-[2px] text-sm text-text-secondary">
              {config.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Cancel01Icon} />
          </button>
        </header>

        <div className="flex flex-col gap-[10px] px-[20px] py-[16px]">
          {config.steps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-[12px] rounded-lg border border-border bg-bg-page p-[12px]"
            >
              <span
                aria-hidden
                className="inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-bg-surface-raised text-text-secondary"
              >
                <Icon icon={step.icon} size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary">
                  {step.title}
                </p>
                <p className="text-2xs text-text-tertiary">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <footer className="flex items-center justify-end gap-[12px] border-t border-border px-[20px] py-[14px]">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-[36px] items-center rounded-lg border border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Not yet
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex h-[36px] items-center gap-[8px] rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? "Working…" : config.confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

const OUTCOME_DIALOG: Record<
  BuildOutcome,
  {
    icon: IconValue;
    title: string;
    subtitle: string;
    confirmLabel: string;
    steps: Array<{ icon: IconValue; title: string; detail: string }>;
  }
> = {
  private: {
    icon: CheckListIcon,
    title: "Save this build as Private",
    subtitle:
      "Stays in your account. No wallet, no KYC, no marketplace listing.",
    confirmLabel: "Save as Private",
    steps: [
      {
        icon: CheckListIcon,
        title: "Saved off-chain",
        detail: "Keep iterating, share later if you want.",
      },
    ],
  },
  community: {
    icon: User02Icon,
    title: "Share with the community",
    subtitle:
      "Mints on-chain authorship so the work is provably yours. Gas paid by you.",
    confirmLabel: "Mint and share",
    steps: [
      {
        icon: Wallet01Icon,
        title: "Connect a wallet",
        detail: "Used to sign the mint and pay network gas.",
      },
      {
        icon: CheckmarkBadge01Icon,
        title: "Mint authorship",
        detail: "Your address is recorded as the creator. No buyer required.",
      },
    ],
  },
  sell: {
    icon: ShoppingBag01Icon,
    title: "List for sale",
    subtitle:
      "Mints authorship and lists for sale. KYC is required because money will change hands.",
    confirmLabel: "Start KYC and list",
    steps: [
      {
        icon: Wallet01Icon,
        title: "Connect a wallet",
        detail: "Used to sign the mint and receive payment.",
      },
      {
        icon: User02Icon,
        title: "Complete KYC",
        detail:
          "Identity check. If it fails you can retry; listing is blocked until it passes.",
      },
      {
        icon: ShoppingBag01Icon,
        title: "Mint and list",
        detail: "Listing appears on the IDEEZA marketplace.",
      },
    ],
  },
};

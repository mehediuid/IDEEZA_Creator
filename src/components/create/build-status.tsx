"use client";

// BuildStatus — Phase 2 progress view. Shows the locked concept, the
// per-item progress for each of the five artifacts, and a partial-retry
// on any failed item. Pure rendering: the worker that advances builds,
// promotes the queue and charges credits is <BuildSimulator />, mounted
// once beside the providers so a build keeps going after this page has
// swapped itself for the review screen.
//
// Spec rules respected:
//   • Background-friendly: the build advances whatever page is open, so
//     leaving and coming back just shows where it got to.
//   • Per-item retry — failed item only.
//   • Concept image is reference-only here; no edit affordance.

import Link from "next/link";
import {
  CodeIcon,
  CpuIcon,
  CubeIcon,
  ElectricWireIcon,
  LockIcon,
  PackageIcon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";
import {
  ITEM_LABELS,
  rollupBuild,
  useCreateHistory,
  type BuildItem,
  type BuildItemKind,
  type BuildJob,
} from "@/lib/create/history";

const KIND_ICON: Record<BuildItemKind, IconValue> = {
  "3d": CubeIcon,
  pcb: CpuIcon,
  code: CodeIcon,
  wiring: ElectricWireIcon,
  parts: PackageIcon,
};

export function BuildStatus({ job }: { job: BuildJob }) {
  const { updateBuildItem } = useCreateHistory();
  const rollup = rollupBuild(job);
  const blockedForCredits = job.blocked === "credits";
  const systemFailure = job.failure === "system";

  return (
    <div className="flex flex-col gap-[24px]">
      {/* Header strip */}
      <section
        aria-label="Build header"
        className="flex flex-wrap items-start justify-between gap-[16px] rounded-2xl border border-border bg-bg-surface p-[16px]"
      >
        <div className="flex min-w-0 items-start gap-[16px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={job.conceptImageUrl}
            alt={`Locked concept: ${job.conceptPrompt}`}
            className="h-[88px] w-[120px] shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="inline-flex items-center gap-[6px] text-2xs font-bold uppercase tracking-wider text-text-brand">
              <Icon icon={LockIcon} size={14} />
              Locked concept
            </p>
            <h2 className="mt-[4px] text-md font-semibold text-text-primary">
              {prettyTitle(job.conceptPrompt)}
            </h2>
            <p className="mt-[2px] line-clamp-2 max-w-[440px] text-sm text-text-tertiary">
              {job.conceptPrompt}
            </p>
          </div>
        </div>

        <StatusBadge rollup={rollup} blockedForCredits={blockedForCredits} />
      </section>

      {/* Per-item progress */}
      <ul role="list" className="flex flex-col gap-[12px]">
        {job.items.map((item) => (
          <BuildItemRow
            key={item.kind}
            item={item}
            blockedForCredits={blockedForCredits}
            systemFailure={systemFailure}
            onRetry={() => {
              updateBuildItem(job.id, item.kind, {
                status: "building",
                progress: 0,
              });
            }}
          />
        ))}
      </ul>

      {/* Leave hint */}
      {blockedForCredits ? (
        <p className="text-center text-sm text-text-tertiary">
          Not enough credits to start this build. Top up and it starts
          automatically.{" "}
          <Link
            href="/history#credits"
            className="font-semibold text-text-brand underline-offset-2 hover:underline"
          >
            Top up credits →
          </Link>
        </p>
      ) : (
        rollup.status !== "ready" && (
          <p className="text-center text-sm text-text-tertiary">
            You can leave — the build keeps running and we&apos;ll notify you
            when each piece is ready.{" "}
            <Link
              href="/"
              className="font-semibold text-text-brand underline-offset-2 hover:underline"
            >
              Back to Home
            </Link>
          </p>
        )
      )}
    </div>
  );
}

function BuildItemRow({
  item,
  blockedForCredits,
  systemFailure,
  onRetry,
}: {
  item: BuildItem;
  blockedForCredits: boolean;
  systemFailure: boolean;
  onRetry: () => void;
}) {
  const tone = toneFor(item.status);
  // An artifact this build never produced. It is listed so the five
  // rows stay honest, but it is not a deliverable in progress — no
  // progress bar, and the whole row steps back.
  const skipped = item.status === "skipped";
  return (
    <li
      className={[
        "flex items-center gap-[16px] rounded-xl border border-border bg-bg-surface p-[16px]",
        skipped ? "opacity-60" : "",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg",
          tone.iconBg,
          tone.iconFg,
        ].join(" ")}
      >
        <Icon icon={KIND_ICON[item.kind]} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-[12px]">
          <p
            className={[
              "text-md font-semibold",
              skipped ? "text-text-tertiary" : "text-text-primary",
            ].join(" ")}
          >
            {ITEM_LABELS[item.kind]}
          </p>
          <span className={["text-2xs font-bold uppercase tracking-wider", tone.text].join(" ")}>
            {statusLabel(item.status, item.progress, blockedForCredits)}
          </span>
        </div>
        {skipped ? (
          <p className="mt-[6px] text-sm text-text-tertiary">
            Not generated for this build.
          </p>
        ) : (
          <div
            role="progressbar"
            aria-label={`${ITEM_LABELS[item.kind]} progress`}
            aria-valuenow={item.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-[8px] h-[6px] w-full overflow-hidden rounded-full bg-bg-surface-raised"
          >
            <div
              className={["h-full transition-[width] duration-normal ease-decelerate", tone.bar].join(" ")}
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>
      {item.status === "failed" && (
        <button
          type="button"
          onClick={systemFailure ? undefined : onRetry}
          disabled={systemFailure}
          aria-disabled={systemFailure}
          title={
            systemFailure ? "Use Try this build again" : undefined
          }
          className={[
            "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
            systemFailure
              ? "cursor-not-allowed opacity-50"
              : "hover:bg-bg-surface-raised",
          ].join(" ")}
        >
          <Icon icon={Refresh01Icon} />
          Retry {ITEM_LABELS[item.kind]}
        </button>
      )}
    </li>
  );
}

function StatusBadge({
  rollup,
  blockedForCredits,
}: {
  rollup: ReturnType<typeof rollupBuild>;
  blockedForCredits: boolean;
}) {
  if (blockedForCredits) {
    return (
      <span className="inline-flex h-[32px] items-center gap-[8px] rounded-full bg-bg-warning-subtle px-[14px] text-2xs font-bold uppercase tracking-wider text-text-warning">
        Paused — needs credits
      </span>
    );
  }
  if (rollup.status === "ready") {
    return (
      <span className="inline-flex h-[32px] items-center gap-[8px] rounded-full bg-bg-brand-subtle px-[14px] text-2xs font-bold uppercase tracking-wider text-text-brand">
        Build ready
      </span>
    );
  }
  if (rollup.status === "partial") {
    return (
      <span className="inline-flex h-[32px] items-center gap-[8px] rounded-full bg-bg-warning-subtle px-[14px] text-2xs font-bold uppercase tracking-wider text-text-warning">
        Partial — retry needed
      </span>
    );
  }
  return (
    <span className="inline-flex h-[32px] items-center gap-[8px] rounded-full bg-bg-surface-raised px-[14px] text-2xs font-bold uppercase tracking-wider text-text-secondary">
      Building · {rollup.progress}%
    </span>
  );
}

function statusLabel(
  status: BuildItem["status"],
  progress: number,
  blockedForCredits: boolean,
): string {
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  // Not queued, not failed — an artifact this build never made.
  if (status === "skipped") return "Didn't run";
  if (status === "pending") return blockedForCredits ? "Waiting" : "Queued";
  return `${progress}%`;
}

function toneFor(status: BuildItem["status"]) {
  if (status === "skipped") {
    return {
      iconBg: "bg-bg-surface-raised",
      iconFg: "text-text-tertiary",
      text: "text-text-tertiary",
      bar: "bg-bg-surface-raised",
    };
  }
  if (status === "ready") {
    return {
      iconBg: "bg-bg-brand-subtle",
      iconFg: "text-text-brand",
      text: "text-text-brand",
      bar: "bg-violet-500",
    };
  }
  if (status === "failed") {
    return {
      iconBg: "bg-bg-error-subtle",
      iconFg: "text-text-error",
      text: "text-text-error",
      bar: "bg-bg-error",
    };
  }
  return {
    iconBg: "bg-bg-surface-raised",
    iconFg: "text-text-secondary",
    text: "text-text-secondary",
    bar: "bg-violet-500",
  };
}

function prettyTitle(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ");
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

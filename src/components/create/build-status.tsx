"use client";

// BuildStatus — Phase 2 progress view. Shows the locked concept, the
// per-item progress for 3D / PCB / firmware, and a partial-retry on
// any failed item. The simulated worker is co-located here so the UI
// has motion to render against today; when a real backend lands,
// replace it with a subscription to `/api/build/:id`.
//
// Spec rules respected:
//   • Background-friendly: leaving and coming back resumes from where
//     localStorage left off (the simulator only runs while mounted, but
//     items it advances are persisted by the provider).
//   • Per-item retry — failed item only.
//   • Concept image is reference-only here; no edit affordance.

import * as React from "react";
import Link from "next/link";
import {
  CodeIcon,
  CpuIcon,
  CubeIcon,
  LockIcon,
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
};

// Per-tick increment per item (synthetic; real backend will push real
// progress). 6% / tick * 800ms ≈ 13s per fresh item — close enough to
// the manifest's 8–12m estimate to feel cohesive without making the
// demo painful.
const TICK_MS = 800;
const TICK_PROGRESS = 6;
// A small randomness so items finish at different times.
const PER_ITEM_JITTER: Record<BuildItemKind, number> = {
  "3d": 0,
  pcb: 1,
  code: 2,
};
// Inject a deterministic failure on PCB at 60% the FIRST time a user
// sees a build — gives them a chance to see the partial-retry flow.
const FAIL_AT = 60;
const FAIL_KIND: BuildItemKind = "pcb";

export function BuildStatus({ job }: { job: BuildJob }) {
  const { updateBuildItem } = useCreateHistory();
  const rollup = rollupBuild(job);
  const reducedMotion = useReducedMotion();
  // Track whether we've already injected the demo failure on this
  // build so reloading doesn't re-fail a recovered item.
  const sawFailure = React.useRef(false);

  React.useEffect(() => {
    if (rollup.status === "ready") return;
    if (reducedMotion) return;
    const t = window.setInterval(() => {
      // Tick each item that's still building.
      for (const item of job.items) {
        if (item.status !== "building") continue;
        const next = Math.min(
          100,
          item.progress + TICK_PROGRESS - PER_ITEM_JITTER[item.kind],
        );
        if (
          !sawFailure.current &&
          item.kind === FAIL_KIND &&
          item.progress < FAIL_AT &&
          next >= FAIL_AT
        ) {
          sawFailure.current = true;
          updateBuildItem(job.id, item.kind, {
            status: "failed",
            progress: FAIL_AT,
          });
          continue;
        }
        if (next >= 100) {
          updateBuildItem(job.id, item.kind, {
            status: "ready",
            progress: 100,
          });
        } else {
          updateBuildItem(job.id, item.kind, { progress: next });
        }
      }
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, [job, rollup.status, reducedMotion, updateBuildItem]);

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

        <StatusBadge rollup={rollup} />
      </section>

      {/* Per-item progress */}
      <ul role="list" className="flex flex-col gap-[12px]">
        {job.items.map((item) => (
          <BuildItemRow
            key={item.kind}
            item={item}
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
      {rollup.status !== "ready" && (
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
      )}
    </div>
  );
}

function BuildItemRow({
  item,
  onRetry,
}: {
  item: BuildItem;
  onRetry: () => void;
}) {
  const tone = toneFor(item.status);
  return (
    <li className="flex items-center gap-[16px] rounded-xl border border-border bg-bg-surface p-[16px]">
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
          <p className="text-md font-semibold text-text-primary">
            {ITEM_LABELS[item.kind]}
          </p>
          <span className={["text-2xs font-bold uppercase tracking-wider", tone.text].join(" ")}>
            {statusLabel(item.status, item.progress)}
          </span>
        </div>
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
      </div>
      {item.status === "failed" && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
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
}: {
  rollup: ReturnType<typeof rollupBuild>;
}) {
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

function statusLabel(status: BuildItem["status"], progress: number): string {
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  if (status === "pending") return "Queued";
  return `${progress}%`;
}

function toneFor(status: BuildItem["status"]) {
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

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

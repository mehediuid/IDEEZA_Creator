"use client";

// BuildStatus — the build page's live states (Ai-Flow frames 11–14):
// queued, waiting on credits, running, partial failure and system
// failure. Every string the page shows comes from one table,
// `stateRowFor`, so a state can never be described one way in the badge
// and another way in the footer.
//
// Pure rendering: the worker that advances builds, promotes the queue
// and charges credits is <BuildSimulator />, mounted once beside the
// providers so a build keeps going after this page has swapped itself
// for the review screen.
//
// Spec rules respected:
//   • Background-friendly: the build advances whatever page is open, so
//     leaving and coming back just shows where it got to.
//   • Per-item retry — a row that couldn't generate. A system failure
//     took the whole build down, so it is retried as a whole instead.
//   • Concept image is reference-only here; no edit affordance.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cancel01Icon,
  Clock01Icon,
  CodeIcon,
  CpuIcon,
  CubeIcon,
  ElectricWireIcon,
  PackageIcon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";
import { Banner, type BannerTone } from "@/components/ideeza";
import { buildCost } from "@/lib/create/credits";
import {
  ITEM_LABELS,
  ITEM_SUBTITLES,
  allItems,
  elapsedMinutes,
  isOverrunning,
  productsOf,
  queuedAhead,
  rollupBuild,
  statusOf,
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

// ─────────────────────── the one state table ───────────────────────

export type StateTone = "neutral" | "brand" | "warning" | "error" | "success";

export type StateRow = {
  badge: { text: string; tone: StateTone };
  banner?: { tone: "info" | "warning" | "error"; title: string; body: string };
  // The section's aria-label — names what's on screen in this state,
  // so assistive tech never hears "Build progress" while looking at a
  // queue or a failure.
  sectionLabel: string;
  // The clock line under the rows.
  meta: string;
  footer: string;
  // The link that closes the footer — home everywhere except the
  // credits pause, where the one thing that moves the build on is a
  // top-up.
  footerLink: { label: string; href: string };
  // The whole-build action this state offers: the retry after a system
  // failure, or the cancel a queued build is allowed (Part 4 §4.6).
  actions?: "retryAll" | "cancelQueued";
};

const HOME_LINK = { label: "Back to home", href: "/" } as const;

// "PCB" · "PCB and Wiring" · "PCB, Wiring and Parts". Exported because
// the attention banner rolls the same failed-item list into a sentence.
export function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function minutes(n: number): string {
  return `${n} ${n === 1 ? "minute" : "minutes"}`;
}

// The artifacts in that state, named for the copy. On a multi-product
// build (§4.4) the product is named too, because "the PCB step failed"
// would not say whose — and §4.4.9's whole point is that the user should
// see where the problem is.
function labelsOf(job: BuildJob, status: BuildItem["status"]): string[] {
  const products = productsOf(job);
  const multi = products.length > 1;
  const out: string[] = [];
  for (const product of products) {
    for (const item of product.items) {
      if (item.status !== status) continue;
      out.push(
        multi
          ? `${product.name} ${ITEM_LABELS[item.kind]}`
          : ITEM_LABELS[item.kind],
      );
    }
  }
  return out;
}

// What this build is, said once. Everything the page renders — badge,
// banner, clock line, footer, whole-build action — reads from here.
// `ahead` is how many builds are really queued in front of this one, so
// the queue copy states the position instead of assuming it.
export function stateRowFor(
  job: BuildJob,
  now: number,
  ahead: number,
): StateRow {
  const status = statusOf(job);
  const elapsed = elapsedMinutes(job, now);
  // What this build was charged: one product's price per product.
  const cost = buildCost(productsOf(job).length);

  // Its turn came up and the balance couldn't cover it. Still queued,
  // but for a reason the user can act on.
  if (status === "queued" && job.blocked === "credits") {
    return {
      badge: { text: "Paused — needs credits", tone: "warning" },
      sectionLabel: "Build paused",
      banner: {
        tone: "warning",
        title: "Not enough credits to start this build",
        body: "Top up and it starts automatically. Nothing is charged until it does.",
      },
      meta: "Waiting for credits",
      actions: "cancelQueued",
      footer: "Your place in the queue is kept — nothing else is needed from you.",
      footerLink: { label: "Top up credits →", href: "/history#credits" },
    };
  }

  if (status === "queued") {
    const next = ahead === 0;
    return {
      badge: { text: "Queued", tone: "neutral" },
      sectionLabel: "Build queue",
      banner: {
        tone: "info",
        title: "Your build starts shortly",
        body: `${
          next
            ? "Yours is next — it starts when the current build finishes."
            : `${ahead} build${ahead === 1 ? "" : "s"} ahead of you.`
        } Credits are only charged once your build starts.`,
      },
      meta: "Free plan runs one build at a time",
      actions: "cancelQueued",
      footer: next
        ? "You're next in the queue. We'll start automatically and notify you — no need to wait here."
        : "We'll start it automatically and notify you — no need to wait here.",
      footerLink: HOME_LINK,
    };
  }

  if (status === "failed") {
    // What the ledger really did with the money, in three honest
    // states — the refund is a separate step from the failure, so the
    // banner can't announce one that hasn't happened.
    const credits = job.creditsRefunded
      ? `All ${cost} credits have been refunded automatically — your balance is unchanged.`
      : job.creditsCharged
        ? `The ${cost} credits this build was charged are being put back now.`
        : "Nothing was charged for this build.";
    // A piece that finished before the failure is still a piece that
    // finished — the rows say so, so the clock line can't say nothing
    // was delivered.
    const delivered = labelsOf(job, "ready");
    return {
      badge: { text: "Build failed", tone: "error" },
      sectionLabel: "Build failed",
      banner: {
        tone: "error",
        title: "A system error stopped this build",
        body: `This was our fault, not yours. ${credits}`,
      },
      meta: delivered.length
        ? `Stopped after ${minutes(elapsed)} · only your ${joinLabels(delivered)} ${
            delivered.length === 1 ? "was" : "were"
          } finished`
        : `Stopped after ${minutes(elapsed)} · nothing was delivered`,
      footer:
        "Nothing about your concept was lost — it stays in the chat exactly as you left it.",
      footerLink: HOME_LINK,
      actions: "retryAll",
    };
  }

  if (status === "partial") {
    const failed = labelsOf(job, "failed");
    const done = labelsOf(job, "ready");
    const failedList = joinLabels(failed);
    const safe = done.length
      ? `Your ${joinLabels(done)} ${done.length === 1 ? "is" : "are"} safe. `
      : "";
    return {
      badge: { text: "Partial — retry needed", tone: "warning" },
      sectionLabel: "Build results",
      banner: {
        tone: "warning",
        title: `The ${failedList} step${failed.length === 1 ? "" : "s"} failed`,
        body: `${safe}Retrying the ${failedList} will not cost additional credits.`,
      },
      meta: `${done.length} of ${
        allItems(job).filter((i) => i.status !== "skipped").length
      } pieces finished · retry costs no extra credits`,
      footer: `The finished pieces are saved. Only the ${failedList} ${
        failed.length === 1 ? "needs" : "need"
      } another attempt.`,
      footerLink: HOME_LINK,
    };
  }

  if (status === "ready") {
    return {
      badge: { text: "Ready", tone: "success" },
      sectionLabel: "Build results",
      meta: `Finished in ${minutes(elapsed)}`,
      footer: "Every piece is ready. Choose what happens to this build next.",
      footerLink: HOME_LINK,
    };
  }

  return {
    badge: { text: `Building · ${rollupBuild(job).progress}%`, tone: "brand" },
    sectionLabel: "Build progress",
    meta: `About 8–12 minutes · ${minutes(elapsed)} elapsed`,
    footer:
      "You can leave — the build keeps running and we'll notify you when each piece is ready.",
    footerLink: HOME_LINK,
  };
}

// ─────────────────────────── rendering ─────────────────────────────

const CARD = "rounded-2xl border border-border bg-bg-surface p-[16px]";

const BADGE_TONE: Record<StateTone, string> = {
  neutral: "border border-solid border-border bg-bg-surface text-text-secondary",
  brand: "bg-bg-brand-subtle text-text-brand",
  warning: "bg-bg-warning-subtle text-text-warning",
  error: "bg-bg-error-subtle text-text-error",
  success: "bg-bg-success-subtle text-text-success",
};

// The page's three banner states in the design system's own tones: the queue
// is information, a partial failure is the one that asks something of the user,
// a system failure is a failure. The page used to carry a second `Banner` of
// its own — its own tone table, its own padding — beside the DS atom; the atom
// is the one home now, and the state table keeps naming the states its way.
const BANNER_TONE: Record<NonNullable<StateRow["banner"]>["tone"], BannerTone> = {
  info: "info",
  warning: "attention",
  error: "error",
};

// The clock line is in whole minutes, so the page re-reads the clock on
// a slow tick instead of at render — a render must never depend on
// Date.now(), and a minute cannot turn over faster than this. Exported
// so every surface that prints a build's minutes reads the same clock.
export function useMinuteClock(): number {
  const [now, setNow] = React.useState(() =>
    typeof window === "undefined" ? 0 : Date.now(),
  );
  const bucketRef = React.useRef(Math.floor(now / 60_000));
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const next = Date.now();
      const bucket = Math.floor(next / 60_000);
      if (bucket === bucketRef.current) return;
      bucketRef.current = bucket;
      setNow(next);
    }, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function BuildStatus({
  job,
  statesOnly = false,
  inChat = false,
}: {
  job: BuildJob;
  /** Rendered in the build's own chat: the ways back to that chat (and to
   *  home, a page away from the work) are dropped, since the maker is
   *  already where they would lead. */
  inChat?: boolean;
  /** Drop the concept strip and the artifact rows, keeping the states that
   *  belong to the whole build — the banner, the queue notice, the cancel,
   *  the overrun stop and the retries. Set where the rail already lists
   *  every piece: two lists of the same five rows side by side is one list
   *  too many. */
  statesOnly?: boolean;
}) {
  const { builds, retryBuildItem, retryBuild, cancelBuild, failBuildSystem } =
    useCreateHistory();
  const router = useRouter();
  const products = productsOf(job);
  const now = useMinuteClock();
  const row = stateRowFor(job, now, queuedAhead(job, builds));
  // The whole build died, so no single row failed to generate — none of
  // them ran. The retry that makes sense is the whole build's.
  const systemFailure = statusOf(job) === "failed";

  return (
    <section
      aria-label={row.sectionLabel}
      className={[CARD, "flex flex-col gap-[12px]"].join(" ")}
    >
      {!statesOnly && <ConceptHeader job={job} row={row} />}

      {/* Part 4 §4.6 — past roughly twice the estimate the job has stopped
          looking like one that will finish. Unlike the queued cancel, this
          one IS owed a refund: the build is running, so it has been
          charged. Marking it a system failure is what returns the money —
          the simulator's own refund effect watches for exactly that, so
          there is one refund path rather than a second one here. */}
      {isOverrunning(job, now) && (
        <div className="flex flex-col gap-[10px] rounded-xl border border-solid border-[var(--color-border-warning)] bg-bg-warning-subtle p-[14px]">
          <div>
            <p className="text-md font-semibold text-text-primary">
              This build is taking much longer than expected
            </p>
            <p className="mt-[2px] text-sm text-text-secondary">
              It has run past twice its estimate. You can stop it and get your{" "}
              {buildCost(products.length)} credits back.
            </p>
          </div>
          <button
            type="button"
            onClick={() => failBuildSystem(job.id)}
            className="inline-flex h-[36px] w-fit items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Cancel01Icon} size={16} />
            Stop and refund
          </button>
        </div>
      )}

      {row.banner && (
        <Banner tone={BANNER_TONE[row.banner.tone]} title={row.banner.title}>
          {row.banner.body}
        </Banner>
      )}

      {/* §4.7 — one group per product. A single-product build is the
          bare list it has always been; a multi-product one names each
          product above its own five artifacts, because §4.4.9 wants the
          user to see *where* a problem is, not just that there is one. */}
      {statesOnly ? null : products.length === 1 ? (
        <ul role="list" className="flex flex-col gap-[10px]">
          {job.items.map((item) => (
            <BuildItemRow
              key={item.kind}
              item={item}
              systemFailure={systemFailure}
              onRetry={() => retryBuildItem(job.id, item.kind)}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-[16px]">
          {products.map((product) => (
            <section
              key={product.id}
              aria-label={product.name}
              data-testid="build-product"
              className="flex flex-col gap-[10px]"
            >
              {/* No glyph: PackageIcon already means the Parts artifact
                  two rows below, and one glyph may not carry two
                  meanings. The label alone is what names a product. */}
              <h3 className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">
                {product.name}
              </h3>
              <ul role="list" className="flex flex-col gap-[10px]">
                {product.items.map((item) => (
                  <BuildItemRow
                    key={item.kind}
                    item={item}
                    systemFailure={systemFailure}
                    onRetry={() =>
                      retryBuildItem(job.id, item.kind, product.id)
                    }
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="flex items-center gap-[8px] text-sm text-text-tertiary">
        <Icon icon={Clock01Icon} size={14} />
        {row.meta}
      </p>

      {/* Part 4 §4.6 — cancellation is offered in the queue and nowhere
          else. Nothing has been charged yet (credits are taken when a
          build starts), so the line says that instead of promising a
          refund there is no charge behind. */}
      {row.actions === "cancelQueued" && (
        <div className="flex flex-col items-center gap-[6px]">
          <button
            type="button"
            onClick={() => {
              cancelBuild(job.id);
              if (!inChat) router.push(`/chat/${job.chatId}`);
            }}
            className="inline-flex h-[40px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[16px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Cancel01Icon} size={16} />
            Cancel this build
          </button>
          <p className="text-sm text-text-tertiary">
            Nothing has been charged yet — credits are taken when a build
            starts.
          </p>
        </div>
      )}

      {row.actions === "retryAll" && (
        <div className="flex flex-wrap items-center justify-center gap-[12px]">
          <button
            type="button"
            onClick={() => retryBuild(job.id)}
            className="inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-sm font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Refresh01Icon} />
            Try this build again
          </button>
          {!inChat && (
            <Link
              href={`/chat/${job.chatId}`}
              className="inline-flex h-[40px] items-center rounded-lg border border-solid border-border bg-bg-surface px-[16px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Back to chat
            </Link>
          )}
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-text-tertiary">{row.footer}</p>
        {!(inChat && row.footerLink.href === HOME_LINK.href) && (
          <Link
            href={row.footerLink.href}
            className="mt-[4px] inline-block text-sm font-semibold text-text-link no-underline outline-none transition-colors duration-fast hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {row.footerLink.label}
          </Link>
        )}
      </div>
    </section>
  );
}

// The locked concept, its badge and nothing else — the review screen
// shows the same strip above its outputs, so the page reads the same
// whichever half of the build is on screen.
export function BuildConceptCard({ job }: { job: BuildJob }) {
  const { builds } = useCreateHistory();
  const now = useMinuteClock();
  const row = stateRowFor(job, now, queuedAhead(job, builds));
  return (
    <section aria-label="Build header" className={CARD}>
      <ConceptHeader job={job} row={row} />
    </section>
  );
}

function ConceptHeader({ job, row }: { job: BuildJob; row: StateRow }) {
  const done = statusOf(job) === "ready";
  return (
    <div className="flex items-start gap-[12px] rounded-xl bg-bg-subtle p-[12px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={job.conceptImageUrl}
        alt={`Locked concept: ${job.title}`}
        className="h-[56px] w-[56px] shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <span className="inline-flex h-[20px] items-center rounded-md border border-solid border-border-brand bg-bg-brand-subtle px-[6px] text-2xs font-bold uppercase tracking-wider text-text-brand">
          Concept {job.conceptNumber} · {done ? "Ready" : "In build"}
        </span>
        <h2 className="mt-[4px] text-lg font-semibold text-text-primary">
          {job.title}
        </h2>
        <p className="mt-[2px] text-sm text-text-tertiary">{job.summary}</p>
      </div>
      <span
        className={[
          "inline-flex h-[26px] shrink-0 items-center rounded-full px-[10px] text-2xs font-bold",
          BADGE_TONE[row.badge.tone],
        ].join(" ")}
      >
        {row.badge.text}
      </span>
    </div>
  );
}

function BuildItemRow({
  item,
  systemFailure,
  onRetry,
}: {
  item: BuildItem;
  systemFailure: boolean;
  onRetry: () => void;
}) {
  const label = ITEM_LABELS[item.kind];
  // A bar is a thing in motion, a thing finished, or a thing waiting
  // its turn — a pending row still has a place in line, drawn as the
  // rail with no fill. A row that couldn't generate, or never ran, has
  // no progress to show at all.
  const bar =
    item.status === "building" ||
    item.status === "ready" ||
    item.status === "pending";
  const canRetry = item.status === "failed" && !systemFailure;

  return (
    <li className="flex items-start gap-[12px] rounded-xl border border-border bg-bg-surface p-[12px]">
      <span
        aria-hidden
        className="inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-text-secondary"
      >
        <Icon icon={KIND_ICON[item.kind]} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-[12px]">
          <div className="min-w-0">
            <p className="text-md font-semibold text-text-primary">{label}</p>
            <p className="text-sm text-text-tertiary">
              {ITEM_SUBTITLES[item.kind]}
            </p>
          </div>
          <span
            className={[
              "shrink-0 text-sm font-semibold",
              statusTone(item.status, systemFailure),
            ].join(" ")}
          >
            {statusLabel(item.status, item.progress, systemFailure)}
          </span>
        </div>

        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-[8px] inline-flex h-[32px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Refresh01Icon} size={14} />
            Retry {label}
          </button>
        )}

        {bar && (
          <div
            role="progressbar"
            aria-label={`${label} progress`}
            aria-valuenow={item.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-[8px] h-[6px] w-full overflow-hidden rounded-full bg-bg-subtle"
          >
            <div
              className="h-full rounded-full bg-violet-600 transition-[width] duration-normal ease-decelerate"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>
    </li>
  );
}

function statusLabel(
  status: BuildItem["status"],
  progress: number,
  systemFailure: boolean,
): string {
  // The whole build died before it delivered anything — every row that
  // hadn't already finished is a thing that never ran, not a
  // generation failure. A row that had already reached "ready" is
  // still ready — the system failure didn't undo it.
  if (systemFailure && status !== "ready") return "Didn't run";
  if (status === "ready") return "Ready";
  if (status === "failed") return "Couldn't generate";
  if (status === "skipped") return "Didn't run";
  if (status === "pending") return "Waiting";
  return `${Math.round(progress)}%`;
}

function statusTone(
  status: BuildItem["status"],
  systemFailure: boolean,
): string {
  // A row that got to "ready" before the job died stays green — the
  // artifact really was produced; greying it would deny the work.
  if (status === "ready") return "text-text-success";
  if (systemFailure) return "text-text-tertiary";
  if (status === "failed") return "text-text-error";
  if (status === "skipped" || status === "pending") return "text-text-tertiary";
  return "text-text-secondary";
}

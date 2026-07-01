"use client";

// QuotaCard — the strip above the History tables (matches the design's
// "{Current Package Name}" / "Prompt left: 3/5 Daily" / countdown /
// Upgrade Now row). Reads everything live from the CreatePlanProvider.
//
// The countdown ticks once per second; it's marked aria-live=off so it
// doesn't spam screen readers — the screen reader sees the static
// "Next prompt in 12 hr 0 min" announcement, while sighted users see
// the running clock. `prefers-reduced-motion` is respected (no enter
// animations; the countdown still updates because that's information,
// not motion).

import * as React from "react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useCreatePlan } from "@/lib/create/plan";

export function QuotaCard() {
  const { hydrated, state } = useCreatePlan();
  const tick = useTickEverySecond();

  if (!hydrated) {
    return <Shell aria-hidden />;
  }

  const used = state.promptsUsedToday;
  const limit = state.dailyLimit;
  const left = Math.max(0, limit - used);
  const exhausted = left === 0;
  const fillPct = limit === 0 ? 0 : Math.min(100, (used / limit) * 100);
  const remainingMs = Math.max(0, state.nextResetAt - tick);

  return (
    <Shell>
      {/* Left: plan + usage + countdown */}
      <div className="min-w-0 flex-1">
        <p className="text-md font-semibold text-text-primary">
          {state.plan} plan
        </p>
        <p
          className="mt-[4px] text-sm text-text-secondary"
          aria-label={`${left} of ${limit} daily prompts remaining`}
        >
          <span className="font-semibold text-text-primary">
            Prompt left:{" "}
            <span className="tabular-nums">
              {String(left).padStart(2, "0")}/{String(limit).padStart(2, "0")}
            </span>{" "}
            Daily
          </span>{" "}
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>{" "}
          <span className="inline-flex items-center gap-[6px] rounded-full bg-bg-brand-subtle px-[10px] py-[2px] text-2xs font-bold uppercase tracking-wider text-text-brand">
            Next prompt in{" "}
            <span className="tabular-nums" aria-live="off">
              {formatCountdown(remainingMs)}
            </span>
          </span>
        </p>

        {/* Visual progress bar — never used as the sole signal. */}
        <div
          role="progressbar"
          aria-label="Daily prompt usage"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          className="mt-[12px] h-[4px] w-full max-w-[420px] overflow-hidden rounded-full bg-bg-surface-raised"
        >
          <div
            className={[
              "h-full transition-[width] duration-normal ease-decelerate",
              exhausted ? "bg-bg-error" : "bg-violet-500",
            ].join(" ")}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Right: upgrade affordance */}
      <div className="flex shrink-0 items-center gap-[16px]">
        <p className="hidden text-sm font-medium text-text-secondary sm:block">
          {exhausted
            ? "You've hit today's limit — upgrade for more."
            : "Get unlimited submissions by upgrading"}
        </p>
        <a
          href="/upgrade"
          className="inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-violet-600 px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Upgrade Now
          <Icon icon={ArrowUpRight01Icon} />
        </a>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  "aria-hidden": ariaHidden,
}: {
  children?: React.ReactNode;
  "aria-hidden"?: boolean;
}) {
  return (
    <section
      aria-label="Plan and daily prompt usage"
      aria-hidden={ariaHidden}
      className="flex items-center gap-[24px] rounded-2xl border border-border bg-bg-surface px-[20px] py-[16px]"
    >
      {children}
    </section>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const hr = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return `${pad(hr)}:${pad(min)}:${pad(sec)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Ticks state once per second so the countdown re-renders without
// re-reading the global plan state. Reduced-motion users still see the
// number update — the rate of change is information, not animation.
function useTickEverySecond(): number {
  const [now, setNow] = React.useState(() =>
    typeof window === "undefined" ? 0 : Date.now(),
  );
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

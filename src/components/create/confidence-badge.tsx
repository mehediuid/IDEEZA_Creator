"use client";

// The confidence badge and the issue list it opens — Part 4 spec §4.3.
//
// Two tiers only. `Verified` is reserved and deliberately not rendered
// (§4.3.2): an unreachable top tier only tells users something is being
// withheld.
//
// A `Draft` badge expands into the grouped list (§4.3.5), and the list
// separates the two reasons a check can leave a product on `Draft` — it
// ran and found something, or it could not run at all. Only the first is
// the user's to act on, so they must not read the same.
//
// The credit sentence (§4.3.4) sits inside the expanded list rather than
// beside the badge: the spec calls that copy the single most likely source
// of a refund dispute in this flow, so it belongs where someone reading
// about their issues will see it, not as a permanent aside.

import * as React from "react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  DRAFT_CREDIT_NOTE,
  TIER_LABEL,
  TIER_MEANING,
  type Issue,
  type IssueGroup,
  type ProductConfidence,
} from "@/lib/create/confidence";

const GROUP_LABEL: Record<IssueGroup, string> = {
  "design-rule": "Design rule issues",
  assembly: "Assembly issues",
  compatibility: "Works-with issues",
};

const GROUP_ORDER: IssueGroup[] = ["design-rule", "assembly", "compatibility"];

export function ConfidenceBadge({
  confidence,
  defaultOpen = false,
}: {
  confidence: ProductConfidence;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const draft = confidence.tier === "draft";
  const id = React.useId().replace(/:/g, "");

  const badge = (
    <span
      data-testid="confidence-badge"
      className={[
        "inline-flex h-[24px] items-center gap-[6px] rounded-full px-[10px] text-sm font-semibold",
        draft
          ? "bg-bg-warning-subtle text-[color:var(--color-text-warning)]"
          : "bg-bg-success-subtle text-text-success",
      ].join(" ")}
    >
      <Icon icon={draft ? Alert02Icon : CheckmarkCircle02Icon} size={13} />
      {TIER_LABEL[confidence.tier]}
    </span>
  );

  // A `Checked` product has nothing to open, so it is a label, not a
  // control — a button that expands an empty list is a dead affordance.
  if (!draft) {
    return <span title={TIER_MEANING.checked}>{badge}</span>;
  }

  const groups = GROUP_ORDER.map((group) => ({
    group,
    issues: confidence.issues.filter((i) => i.group === group),
  })).filter((g) => g.issues.length > 0);

  return (
    <div className="flex flex-col gap-[8px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`${id}-issues`}
        className="inline-flex w-fit items-center gap-[8px] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {badge}
        <span className="text-sm text-text-secondary">
          {confidence.issues.length} to review
        </span>
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          aria-hidden
          className={[
            "text-text-tertiary transition-transform duration-fast",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={`${id}-issues`}
          data-testid="confidence-issues"
          className="flex flex-col gap-[12px] rounded-xl border border-solid border-border bg-bg-subtle p-[14px]"
        >
          <p className="text-sm text-text-secondary">
            {TIER_MEANING.draft}
          </p>
          {groups.map(({ group, issues }) => (
            <section key={group} className="flex flex-col gap-[6px]">
              <h4 className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">
                {GROUP_LABEL[group]}
              </h4>
              <ul role="list" className="flex flex-col gap-[6px]">
                {issues.map((issue) => (
                  <IssueRow key={issue.text} issue={issue} />
                ))}
              </ul>
            </section>
          ))}
          <p className="flex items-start gap-[8px] border-t border-solid border-border pt-[12px] text-sm leading-relaxed text-text-tertiary">
            <span aria-hidden className="mt-[2px] shrink-0">
              <Icon icon={InformationCircleIcon} size={14} />
            </span>
            {DRAFT_CREDIT_NOTE}
          </p>
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <li className="flex items-start gap-[8px] text-sm leading-relaxed text-text-secondary">
      {/* A check that never ran and a check that failed are different
          things, and the row says which before it says what. */}
      <span
        className={[
          "mt-[2px] inline-flex h-[16px] shrink-0 items-center rounded-full px-[6px] text-2xs font-semibold uppercase tracking-caps",
          issue.notRun
            ? "bg-bg-surface-raised text-text-tertiary"
            : "bg-bg-warning-subtle text-[color:var(--color-text-warning)]",
        ].join(" ")}
      >
        {issue.notRun ? "not run" : "found"}
      </span>
      <span className="min-w-0">{issue.text}</span>
    </li>
  );
}

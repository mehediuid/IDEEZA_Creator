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
//
// The toggle and the list are two components now, not one (L1). The review
// card's header keeps its actions beside the heading, which left the list
// squeezed into the same narrow column as the toggle — ~135–190 px wide
// beside "Add Network" and "Create Mobile App" at every width tested.
// `ConfidenceBadge` stays a small toggle the header has room for; the caller
// owns the open state and renders `ConfidenceIssuesPanel` wherever the card
// actually has full width to give it (review-outputs.tsx puts it in its own
// row below the header).

import * as React from "react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  DRAFT_CREDIT_NOTE,
  DRAFT_PARTLY_CHECKED_MEANING,
  DRAFT_UNCHECKED_MEANING,
  TIER_LABEL,
  TIER_MEANING,
  type Issue,
  type IssueGroup,
  type ProductConfidence,
} from "@/lib/create/confidence";

const GROUP_LABEL: Record<IssueGroup, string> = {
  "design-rule": "Design rule issues",
  assembly: "Assembly checks",
  compatibility: "Works-with issues",
};

const GROUP_ORDER: IssueGroup[] = ["design-rule", "assembly", "compatibility"];

/** One id, shared by the toggle's `aria-controls` and the panel's own `id`.
 *  The two render in different places in the tree now (L1), so neither can
 *  hand the other a `React.useId()` — a stable key both already have. */
function issuesPanelId(productId: string): string {
  return `confidence-issues-${productId}`;
}

export function ConfidenceBadge({
  confidence,
  open,
  onOpenChange,
  defaultOpen = false,
}: {
  confidence: ProductConfidence;
  /** Controlled: pass this (with `onOpenChange`) when the caller renders
   *  `ConfidenceIssuesPanel` itself, elsewhere in the layout (L1). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Uncontrolled fallback for a caller that renders no separate panel;
   *  unused once `open` is passed. */
  defaultOpen?: boolean;
}) {
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen);
  const isOpen = open ?? ownOpen;
  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    onOpenChange?.(next);
  };

  const draft = confidence.tier === "draft";
  // A check that ran and found something is a warning; a check that could not
  // run is a fact about the build, not a fault in it. Every build today is the
  // second kind, and painting it amber made the moment a build finished read
  // as a problem.
  const total = confidence.issues.length;
  const found = confidence.issues.filter((i) => !i.notRun).length;
  const unchecked = draft && found === 0;
  const passed = confidence.passed;

  const badge = (
    <span
      data-testid="confidence-badge"
      className={[
        "inline-flex h-[24px] items-center gap-[6px] rounded-full px-[10px] text-sm font-semibold",
        !draft
          ? "bg-bg-success-subtle text-text-success"
          : unchecked
            ? "bg-bg-subtle text-text-secondary"
            : "bg-bg-warning-subtle text-[color:var(--color-text-warning)]",
      ].join(" ")}
    >
      <Icon
        icon={draft ? (unchecked ? InformationCircleIcon : Alert02Icon) : CheckmarkCircle02Icon}
        size={13}
      />
      {TIER_LABEL[confidence.tier]}
    </span>
  );

  // A `Checked` product has nothing to open, so it is a label, not a
  // control — a button that expands an empty list is a dead affordance.
  if (!draft) {
    return <span title={TIER_MEANING.checked}>{badge}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        // Set whenever the panel is actually open, controlled or not (Minor
        // 19) — in controlled mode the caller mounts `ConfidenceIssuesPanel`
        // with this same id only while `open` is true, so pointing at it
        // sooner would name an element that isn't in the DOM yet.
        aria-controls={isOpen ? issuesPanelId(confidence.productId) : undefined}
        className="inline-flex w-fit flex-wrap items-center gap-[8px] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {badge}
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {[
            passed.length ? `${passed.length} passed` : null,
            found ? `${found} to review` : null,
            total - found ? `${total - found} not run` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
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
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open === undefined && (
        <div hidden={!isOpen}>
          <ConfidenceIssuesPanel confidence={confidence} />
        </div>
      )}
    </>
  );
}

/** The list a `Draft` toggle opens — grouped issues, passes, and the credit
 *  note (§4.3.4). The caller renders this wherever the layout actually has
 *  full width (L1), only while its `ConfidenceBadge` is open; this component
 *  never renders it on its own, and a `Checked` product has nothing here for
 *  the caller to render at all. */
export function ConfidenceIssuesPanel({
  confidence,
}: {
  confidence: ProductConfidence;
}) {
  const found = confidence.issues.filter((i) => !i.notRun).length;
  const unchecked = confidence.tier === "draft" && found === 0;
  const passed = confidence.passed;

  const groups = GROUP_ORDER.map((group) => ({
    group,
    issues: confidence.issues.filter((i) => i.group === group),
    passes: group === "assembly" ? passed : [],
  })).filter((g) => g.issues.length > 0 || g.passes.length > 0);

  return (
    <div
      id={issuesPanelId(confidence.productId)}
      data-testid="confidence-issues"
      className="flex flex-col gap-[12px] rounded-xl border border-solid border-border bg-bg-subtle p-[14px]"
    >
      <p className="text-sm text-text-secondary">
        {unchecked
          ? passed.length
            ? DRAFT_PARTLY_CHECKED_MEANING
            : DRAFT_UNCHECKED_MEANING
          : TIER_MEANING.draft}
      </p>
      {groups.map(({ group, issues, passes }) => (
        <section key={group} className="flex flex-col gap-[6px]">
          <h3 className="text-sm font-semibold text-text-primary">
            {GROUP_LABEL[group]}
          </h3>
          <ul role="list" className="flex flex-col gap-[6px]">
            {issues.map((issue) => (
              <IssueRow key={issue.text} issue={issue} />
            ))}
            {passes.map((text) => (
              <PassRow key={text} text={text} />
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
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <li className="flex items-start gap-[8px] text-sm leading-relaxed text-text-secondary">
      {/* A check that never ran and a check that failed are different
          things, and the row says which before it says what. */}
      <span
        className={[
          "mt-[1px] inline-flex h-[20px] shrink-0 items-center rounded-full px-[8px] text-xs font-semibold",
          issue.notRun
            ? "bg-bg-surface-raised text-text-tertiary"
            : "bg-bg-warning-subtle text-[color:var(--color-text-warning)]",
        ].join(" ")}
      >
        {issue.notRun ? "Not run" : "Found"}
      </span>
      <span className="min-w-0">{issue.text}</span>
    </li>
  );
}

function PassRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-[8px] text-sm leading-relaxed text-text-secondary">
      <span className="mt-[1px] inline-flex h-[20px] shrink-0 items-center rounded-full bg-bg-success-subtle px-[8px] text-xs font-semibold text-text-success">
        Passed
      </span>
      <span className="min-w-0">{text}</span>
    </li>
  );
}

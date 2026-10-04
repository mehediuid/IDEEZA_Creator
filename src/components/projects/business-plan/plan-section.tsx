"use client";

// One business-plan section, read-only (P2-TABS-17, CNT-71/72). Shared display
// helpers (titles, field labels, flattening) live here too, since plan-runner.tsx
// (the section API caller) and plan-edit.tsx (the editor) both need the exact
// same field vocabulary as this view — one place decides what a field is called
// and how it renders, so the three can't drift.
//
// business-plan.ts (T08) owns the section *shape* (kinds, required headings);
// this file owns none of that — it only decides how a shape already validated
// there is labelled and laid out.

import * as React from "react";
import { Badge } from "@/components/ideeza";
import { Spinner } from "@/components/ideeza";
import type { PlanSection, PricingTier, SectionKind } from "@/lib/manual/business-plan";

/** The seven sections' display titles (CNT-70/71). A custom section keeps
 *  whatever title the maker gave it (P2-TABS-18), so this is only the fixed
 *  seven's fallback. */
export const SECTION_TITLE: Record<SectionKind, string> = {
  identity: "Identity",
  brand: "Brand",
  market: "Market research",
  swot: "SWOT analysis",
  pricing: "Pricing",
  problem: "Problem & solution",
  landing: "Landing page",
};

/** Field key → display label. Keys the model didn't use fall back to
 *  `labelize`, so an unexpected heading still renders instead of vanishing. */
const FIELD_LABEL: Record<string, string> = {
  tagline: "Tagline",
  mission: "Mission",
  audience: "Audience",
  voice: "Voice",
  values: "Values",
  personality: "Personality",
  size: "Market size",
  trends: "Trends",
  competitors: "Competitors",
  strengths: "Strengths",
  weaknesses: "Weaknesses",
  opportunities: "Opportunities",
  threats: "Threats",
  tiers: "Pricing tiers",
  problem: "The problem",
  solution: "The solution",
  headline: "Headline",
  subheadline: "Subheadline",
  cta: "Call to action",
  body: "Overview",
};

export function labelize(key: string): string {
  return FIELD_LABEL[key] ?? key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Sections whose figures are an AI guess, never a researched number
 *  (CNT-72's third provenance line). */
const ESTIMATE_KINDS: ReadonlySet<SectionKind | "custom"> = new Set(["market", "pricing"]);
export const ESTIMATE_NOTE = "AI estimate — not researched. Check before you use it.";

function isPricingTiers(v: unknown): v is PricingTier[] {
  return Array.isArray(v) && (v.length === 0 || (typeof v[0] === "object" && v[0] !== null && "name" in (v[0] as object)));
}

/** One field's value, flattened to plain text — for the section API's
 *  `context` and for anywhere a field needs one line instead of markup. */
export function fieldText(value: PlanSection["fields"][string]): string {
  if (typeof value === "string") return value;
  if (isPricingTiers(value)) {
    return value.map((t) => `${t.name} — ${t.price}/${t.cadence}${t.features.length ? ` (${t.features.join(", ")})` : ""}`).join("; ");
  }
  return value.join("; ");
}

/** Earlier sections, flattened into the ≤2,000-character `context` the
 *  section API takes (P2-TABS-20). Only finished (`done`) sections count —
 *  a pending or failed one has nothing worth reading back to the model. */
export function sectionContextText(sections: readonly PlanSection[]): string {
  const text = sections
    .filter((s) => s.state === "done")
    .map((s) => {
      const body = Object.entries(s.fields)
        .map(([k, v]) => `${labelize(k)}: ${fieldText(v)}`)
        .join("\n");
      return `${s.title}\n${body}`;
    })
    .join("\n\n");
  return text.slice(0, 2000);
}

/** CNT-72: what the maker sees under a section's title. "added" isn't one of
 *  the two the spec quotes, but the type has three origins and each needs a
 *  word — "Added by you" reads the same as the compose-flow's own badge. */
export function provenanceLabel(origin: PlanSection["origin"]): string {
  if (origin === "edited") return "Edited by you";
  if (origin === "added") return "Added by you";
  return "Written by AI";
}

function FieldBlock({ label, value }: { label: string; value: PlanSection["fields"][string] }) {
  if (typeof value === "string") {
    return (
      <div>
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{value}</p>
      </div>
    );
  }
  if (isPricingTiers(value)) {
    return (
      <div>
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {value.map((tier, i) => (
            <div
              key={`${tier.name}-${i}`}
              className="rounded-xl border border-solid border-border px-4 py-3 text-sm"
              style={tier.recommended ? { borderColor: "var(--color-border-brand)" } : undefined}
            >
              <p className="font-semibold text-text-primary">{tier.name}</p>
              <p className="text-text-secondary">
                {tier.price}
                {tier.cadence ? ` / ${tier.cadence}` : ""}
              </p>
              {tier.features.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-text-tertiary">
                  {tier.features.map((f, j) => (
                    <li key={j}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-semibold text-text-primary">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-secondary">
        {value.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function PlanSectionView({
  section,
  headingId,
  retry,
}: {
  section: PlanSection;
  /** Anchors "Jump to section" and the sticky index (P2-TABS-17). */
  headingId?: string;
  /** Rendered beside a failed section (CNT-68's "Try again"). Omitted once
   *  there is nothing left to retry with (the plan page after a run ends
   *  without a live runner, for instance). */
  retry?: React.ReactNode;
}) {
  const showEstimate = ESTIMATE_KINDS.has(section.kind) && section.state === "done";
  return (
    <section aria-labelledby={headingId} className="scroll-mt-24 border-b border-solid border-border-subtle py-8 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-xl font-semibold text-text-primary">
          {section.title}
        </h2>
        {section.state === "done" && (
          <Badge tone={section.origin === "ai" ? "neutral" : "info"} className="shrink-0">
            {provenanceLabel(section.origin)}
          </Badge>
        )}
      </div>
      {showEstimate && <p className="mt-2 text-xs text-text-tertiary">{ESTIMATE_NOTE}</p>}
      {section.state === "pending" && (
        <div className="mt-4 flex items-center gap-3 text-sm text-text-tertiary">
          <Spinner size={16} />
          Writing…
        </div>
      )}
      {section.state === "failed" && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-text-error">
          <span>Couldn&apos;t write {section.title}.</span>
          {retry}
        </div>
      )}
      {section.state === "done" && (
        <div className="mt-4 flex flex-col gap-5">
          {Object.entries(section.fields).map(([key, value]) => (
            <FieldBlock key={key} label={labelize(key)} value={value} />
          ))}
        </div>
      )}
    </section>
  );
}

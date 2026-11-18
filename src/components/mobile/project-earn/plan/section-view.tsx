"use client";

// One business-plan section on the phone (Figma 16d, 16f, 16o; the web's
// plan-section.tsx, its field names and provenance words): a card with the
// title (Heading/H6) and its "Written by AI" / "Edited by you" badge (A17
// Subtle MD), each field's label (Label/SM, secondary) over its text
// (Body/MD), a list as its lines, pricing tiers as one line each; the
// AI-estimate note under Market research and Pricing. While a run writes it,
// "Writing…"; when it failed, "Couldn't write {Section}." and, when the run
// isn't live, Try again.

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { Spinner } from "@/components/ideeza/spinner";
import { ESTIMATE_NOTE, labelize, provenanceLabel } from "@/components/projects/business-plan/plan-section";
import type { PlanSection, PricingTier } from "@/lib/manual/business-plan";
import { cn } from "@/lib/utils";
import { EARN_CARD } from "../parts";
import { T } from "../../type";

export const FIELD_LABEL = T.meta;
const FIELD_TEXT = cn(T.body, "text-text-primary");

function isTiers(v: unknown): v is PricingTier[] {
  return Array.isArray(v) && (v.length === 0 || (typeof v[0] === "object" && v[0] !== null && "name" in (v[0] as object)));
}

function FieldValue({ value }: { value: PlanSection["fields"][string] }) {
  if (typeof value === "string") return <p className={cn(FIELD_TEXT, "whitespace-pre-wrap break-words")}>{value}</p>;
  if (isTiers(value)) {
    return (
      <ul className="flex flex-col gap-2">
        {value.map((t, i) => (
          <li key={`${t.name}-${i}`} className="flex flex-col">
            <span className={FIELD_TEXT}>
              {t.name} · {t.price}
              {t.cadence ? ` / ${t.cadence}` : ""}
            </span>
            {t.features.length > 0 && <span className={T.meta}>{t.features.join(" · ")}</span>}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex list-disc flex-col gap-1 pl-8">
      {value.map((line, i) => (
        <li key={i} className={cn(FIELD_TEXT, "break-words")}>
          {line}
        </li>
      ))}
    </ul>
  );
}

export function SectionCard({
  section,
  headingId,
  retry,
  className,
}: {
  section: PlanSection;
  headingId?: string;
  /** Try again beside a failed section; left out while a run is live or the project is locked. */
  retry?: React.ReactNode;
  className?: string;
}) {
  const estimate = (section.kind === "market" || section.kind === "pricing") && section.state === "done";
  return (
    <section aria-labelledby={headingId} id={headingId ? `${headingId}-card` : undefined} className={cn(EARN_CARD, "scroll-mt-40", className)}>
      <div className="flex items-start justify-between gap-4">
        <h3 id={headingId} className={cn(T.section, "min-w-0 break-words")}>
          {section.title}
        </h3>
        {section.state === "done" && (
          <Badge tone={section.origin === "ai" ? "neutral" : "info"} className="shrink-0">
            {provenanceLabel(section.origin)}
          </Badge>
        )}
      </div>
      {section.state === "pending" && (
        <p className={cn(T.body, "flex items-center gap-4 text-text-tertiary")}>
          <Spinner size={16} />
          Writing…
        </p>
      )}
      {section.state === "failed" && (
        <div className="flex flex-col items-start gap-4">
          <p className={cn(T.body, "text-text-error")}>{`Couldn't write ${section.title}.`}</p>
          {retry}
        </div>
      )}
      {section.state === "done" &&
        Object.entries(section.fields).map(([key, value]) => (
          <div key={key} className="flex flex-col gap-2">
            <p className={FIELD_LABEL}>{labelize(key)}</p>
            <FieldValue value={value} />
          </div>
        ))}
      {estimate && <p className={cn(T.meta, "text-text-tertiary")}>{ESTIMATE_NOTE}</p>}
    </section>
  );
}

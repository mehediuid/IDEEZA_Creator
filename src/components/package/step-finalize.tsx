"use client";

// Step 5 — Finalize.
//
// One name, one category, one visibility decision — made after the part already
// exists, not before. Every new package starts private; publishing is a
// deliberate, separate choice made here, and a published package is locked at
// version 1 so a later edit becomes a new version rather than changing what
// other people's designs depend on.
//
// The Save / Publish action itself lives in the flow footer, where Next sits on
// every other step, so the primary action never moves.

import * as React from "react";
import { Radio, Select, Textarea, TextInput } from "@/components/ideeza";
import { usePackageActions, usePackageDraft } from "@/lib/package/store";
import { CATEGORIES, type Category, type Visibility, electricalPads, symPins } from "@/lib/package/types";
import { nextVersion } from "@/lib/package/library";
import { Field, StepHeading } from "./editor-chrome";

const VIS: { id: Visibility; title: string; body: string }[] = [
  {
    id: "private",
    title: "Save privately",
    body: "Stays in your personal library. You can publish it later from the confirmation screen.",
  },
  {
    id: "community",
    title: "Publish to community",
    body: "Listed for anyone to reuse, and locked at version 1 — a later edit creates a new version instead.",
  },
];

export function StepFinalize() {
  const draft = usePackageDraft();
  const actions = usePackageActions();
  const pins = symPins(draft).length;
  const pads = electricalPads(draft).length;
  const version = draft.name.trim() ? nextVersion(draft.name) : 1;

  return (
    <div className="flex flex-col gap-[var(--spacing-10)]">
      <StepHeading title="Finalize">
        Name it, file it, and decide who can see it. Everything below is about the library entry — the part itself is
        already built.
      </StepHeading>

      <div className="grid grid-cols-1 gap-[var(--spacing-8)] lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex flex-col gap-[var(--spacing-7)]">
          <Field label="Package name" htmlFor="pkg-name" hint="e.g. SOIC-8_3.9x4.9mm_P1.27mm">
            <TextInput
              id="pkg-name"
              value={draft.name}
              onValueChange={(v) => actions.patch({ name: v })}
              placeholder="SOIC-8_3.9x4.9mm_P1.27mm"
              required
            />
          </Field>

          <Field label="Category" htmlFor="pkg-category" hint="One functional taxonomy — this is what search and filters use later.">
            <Select
              value={draft.category}
              placeholder="Choose a category…"
              options={CATEGORIES.map((c) => ({ label: c, value: c }))}
              onChange={(v) => actions.patch({ category: v as Category })}
            />
          </Field>

          <Field label="Description" htmlFor="pkg-description">
            <Textarea
              id="pkg-description"
              value={draft.description}
              onValueChange={(v) => actions.patch({ description: v })}
              placeholder="What it is, where it came from, anything the next person should know."
              rows={4}
            />
          </Field>

          {/* The whole card is the radio, with the DS Radio as the picture
              inside it (`decorative`) — a <label> can't name a <span role=radio>,
              so putting the role on the button is what actually gives the
              control its accessible name, and it makes the target the card. */}
          <div className="flex flex-col gap-[var(--spacing-4)]">
            <span id="pkg-visibility-label" className="font-display text-sm font-medium text-text-secondary">
              Visibility
            </span>
            <div role="radiogroup" aria-labelledby="pkg-visibility-label" className="flex flex-col gap-[var(--spacing-4)]">
              {VIS.map((v) => {
                const on = draft.visibility === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => actions.patch({ visibility: v.id })}
                    className={[
                      "flex cursor-pointer items-start gap-[var(--spacing-5)] rounded-[var(--radius-xl)] border p-[var(--spacing-6)] text-left outline-none",
                      "transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                      on ? "border-border-brand bg-bg-brand-subtle" : "border-border-default bg-bg-surface hover:border-border-strong",
                    ].join(" ")}
                    style={{ borderWidth: "var(--border-width-1)" }}
                  >
                    <span className="mt-[2px]">
                      <Radio decorative checked={on} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-[var(--spacing-1)]">
                      <span className="font-display text-md font-semibold text-text-primary">{v.title}</span>
                      <span className="font-display text-sm font-regular leading-relaxed text-text-secondary">{v.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* What is about to be filed — read from the model, not retyped */}
        <aside className="flex h-fit flex-col gap-[var(--spacing-5)] rounded-[var(--radius-xl)] border border-border-default bg-bg-surface p-[var(--spacing-6)]">
          <h3 className="font-display text-2xs font-semibold uppercase tracking-caps text-text-tertiary">This package</h3>
          {[
            ["Pins", String(pins)],
            ["Pads", String(pads)],
            ["Mount", draft.mounting],
            ["Reference", `${draft.prefix || "U"}?`],
            ["Value", draft.value || "—"],
            ["Path", draft.path === "wizard" ? "Part Wizard" : draft.path === "import" ? "Import" : "Custom"],
            ["Version", `v${version}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-[var(--spacing-4)]">
              <span className="font-display text-sm font-regular text-text-tertiary">{k}</span>
              <span className="font-mono text-xs text-text-primary">{v}</span>
            </div>
          ))}
          {version > 1 ? (
            <p className="font-display text-2xs font-regular leading-2xs text-text-tertiary">
              A package with this name already exists — saving files this as a new version rather than replacing it.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

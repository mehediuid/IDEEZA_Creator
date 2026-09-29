"use client";

// Step 1 — "What's your idea?"
// The project, read back (P2-SAVE-12: it was chosen and named before the
// Brief opened, so it is never asked a second time), the two product fields
// and the 3 intent cards, inside the shared BriefCard frame.

import * as React from "react";
import { BRIEF_DESC_MAX as MAX_DESC } from "@/lib/brief/types";
import { BriefCard, type Intent } from "./brief-app";

const INTENTS: {
  id: Intent;
  label: string;
  sub: string;
  requirement: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "sell",
    label: "Sell Your Idea",
    sub: "Mint as NFT and list",
    requirement: "Wallet + identity check",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10 M9 9.5h4.5a2 2 0 0 1 0 4H9h4.5a2 2 0 0 1 0 4H9" />
      </svg>
    ),
  },
  {
    id: "give",
    label: "Give to Community",
    sub: "Free distribute / drop",
    requirement: "Wallet needed · no KYC",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.4" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6 M14 20c0-2.5 1.6-4.5 3-4.5s3 2 3 4.5" />
      </svg>
    ),
  },
  {
    id: "save",
    label: "Save as Private",
    sub: "Keep in your library",
    requirement: "Free signature · no KYC",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M12 11v5 M10 13l2-2 2 2" />
      </svg>
    ),
  },
];

// Shared look for every text field in this step: the visible chrome lives here
// as classes, and `.ix-brief-field` (defined in brief-app.tsx) carries the
// focus ring + placeholder colour that can't be expressed as a static class.
// Height and vertical padding are deliberately left off — they differ between
// a single-line input and a multi-line textarea, and are added at each call
// site so no two classes in one list ever fight over the same property.
const FIELD_CLASS =
  "ix-brief-field w-full rounded-lg border border-solid border-border bg-[var(--color-input-bg)] px-[12px] text-md text-text-primary outline-none [font-family:inherit]";

export type Step1Patch = {
  productName?: string;
  productDescription?: string;
  otherProducts?: { name: string; description: string }[];
  intent?: Intent;
};

export function Step1Idea({
  project,
  productName,
  productDescription,
  otherProducts,
  fromBuild,
  intent,
  onChange,
  onBack,
  onContinue,
}: {
  /** The project this brief belongs to, read back: its name and "{k} products"
   *  (plus " · version {n}" on a build's brief). */
  project: { name: string; detail: string };
  productName: string;
  productDescription: string;
  /** The other products this build made — a system goes into one project
   *  (§4.4.8), so a drone's remote and its charger are saved alongside it.
   *  Named and described by the model; empty on a single-product build and
   *  on every hand-made project. */
  otherProducts?: { name: string; description: string }[];
  /** Opened from a finished AI build: the idea has been built already, so the
   *  step is not asking for one — it checks what the brief will say. */
  fromBuild?: boolean;
  intent: Intent | null;
  onChange: (patch: Step1Patch) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const reasonId = React.useId();
  const intentLabelId = React.useId();

  // The first thing still missing, top-down through the form — it is both what
  // disables Continue and what its tooltip says. The project is never on it:
  // the Brief always has one before this step renders (P2-SAVE-12).
  const missing = !productName.trim()
    ? "Add a product name to continue."
    : !productDescription.trim()
      ? "Add the one-line description to continue."
      : !intent
        ? "Pick how you want to share it."
        : null;
  const canContinue = !missing;

  return (
    <BriefCard onBack={onBack}>
      <div className="flex flex-col gap-[20px]">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-text-primary">
            {fromBuild ? "Add a brief" : "What’s your idea?"}
          </h1>
          <p className="mt-[6px] text-sm text-text-secondary">
            {fromBuild
              ? "Check the names and one-liners the build wrote, then choose how it goes out."
              : "A name and one line. Quick — you can edit everything later."}
          </p>
        </div>

        <div className="flex flex-col gap-[16px]">
          <ProjectRow name={project.name} detail={project.detail} />

          <FieldLabel label="Product name">
            <input
              value={productName}
              onChange={(e) => onChange({ productName: e.target.value })}
              placeholder="Smart plant waterer"
              autoFocus
              className={`${FIELD_CLASS} h-[42px] py-0`}
            />
          </FieldLabel>

          <FieldLabel label="One line · what does it do?">
            <>
              <textarea
                value={productDescription}
                onChange={(e) =>
                  onChange({ productDescription: e.target.value.slice(0, MAX_DESC) })
                }
                placeholder="Waters a houseplant when its soil runs dry."
                rows={3}
                className={`${FIELD_CLASS} h-[76px] resize-y py-[12px] leading-relaxed`}
              />
              <span className="tabular-nums text-sm text-text-secondary">
                {productDescription.length}/{MAX_DESC}
              </span>
            </>
          </FieldLabel>

          {/* A system is one project holding several products, so the rest of
              them are part of what is being saved — and the maker should see
              what that is before they save it. The fields above are the
              headline product; these came back named and described from the
              concept work, and are stored on the project with it. */}
          {otherProducts && otherProducts.length > 0 ? (
            <OtherProducts
              products={otherProducts}
              onSave={(i, next) =>
                onChange({
                  otherProducts: otherProducts.map((x, n) => (n === i ? next : x)),
                })
              }
            />
          ) : null}
        </div>

        <div className="border-t border-solid border-border-subtle pt-[18px]">
          <div
            id={intentLabelId}
            className="mb-[12px] text-md font-semibold text-text-primary"
          >
            How do you want to share it?
          </div>
          <div
            role="group"
            aria-labelledby={intentLabelId}
            // Stacked at phone width: three columns there cut the
            // requirement chips off mid-word ("Wallet + identity c…").
            className="grid grid-cols-1 gap-[12px] sm:grid-cols-3"
          >
            {INTENTS.map((i) => {
              const sel = intent === i.id;
              return (
                <button
                  key={i.id}
                  onClick={() => onChange({ intent: i.id })}
                  aria-pressed={sel}
                  className={[
                    "flex cursor-pointer flex-col items-start gap-[8px] rounded-xl border border-solid px-[12px] py-[14px] text-left transition-colors duration-fast",
                    sel ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex h-[32px] w-[32px] items-center justify-center rounded-lg",
                      sel ? "bg-bg-brand text-text-on-brand" : "bg-bg-subtle text-text-secondary",
                    ].join(" ")}
                  >
                    {i.icon}
                  </span>
                  <span className="text-md font-semibold text-text-primary">{i.label}</span>
                  <span className="text-sm text-text-secondary">{i.sub}</span>
                  <span className="whitespace-nowrap rounded-sm bg-bg-info-subtle px-[7px] py-[2px] text-xs font-medium text-[var(--color-text-blue)]">
                    {i.requirement}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-[12px]">
          {/* The reason Continue is off is text on the page, not a tooltip —
              so a screen reader reaches it through aria-describedby. */}
          {missing ? (
            <span id={reasonId} className="text-right text-sm text-text-secondary">
              {missing}
            </span>
          ) : null}
          <span title={missing ?? undefined} className="inline-flex">
            <button
              onClick={onContinue}
              disabled={!canContinue}
              title={missing ?? undefined}
              aria-describedby={missing ? reasonId : undefined}
              className={[
                "inline-flex items-center gap-[8px] rounded-lg border-none px-[22px] py-[11px] text-md font-semibold transition-colors duration-fast",
                canContinue
                  ? "cursor-pointer bg-bg-brand text-text-on-brand"
                  : "cursor-not-allowed bg-bg-subtle text-text-disabled",
              ].join(" ")}
            >
              Continue
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </span>
        </div>
      </div>
    </BriefCard>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-md font-medium text-[var(--color-input-label)]">{label}</span>
      {children}
    </label>
  );
}

/** The products saved alongside the headline one — each editable in place.
 *  They were named by the model from concepts the maker approved, which makes
 *  them a good first draft and nothing more: a name read back wrong is one
 *  the maker should be able to fix here, beside the one they are already
 *  editing, rather than after the project exists. */
function OtherProducts({
  products,
  onSave,
}: {
  products: { name: string; description: string }[];
  onSave: (index: number, next: { name: string; description: string }) => void;
}) {
  const [editing, setEditing] = React.useState<number | null>(null);
  return (
    <div>
      <p className="mx-0 mt-0 mb-[8px] text-md font-semibold text-text-primary">
        Also in this project
      </p>
      {/* A list divided by hairlines, not a bordered card inside the card. */}
      <ul className="m-0 flex list-none flex-col divide-y divide-solid divide-border-subtle border-y border-solid border-border-subtle p-0">
        {products.map((x, i) => (
          <li
            key={`${i}-${x.name}`}
            className="py-[10px]"
          >
            {editing === i ? (
              <ProductEditor
                value={x}
                onCancel={() => setEditing(null)}
                onSave={(next) => {
                  onSave(i, next);
                  setEditing(null);
                }}
              />
            ) : (
              <div className="flex items-center gap-[12px]">
                <span className="min-w-0 flex-1">
                  <span className="block text-md font-semibold text-text-primary">
                    {x.name}
                  </span>
                  {x.description ? (
                    <span className="mt-[2px] block text-sm leading-relaxed text-text-secondary">
                      {x.description}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(i)}
                  aria-label={`Edit ${x.name}`}
                  className="h-[30px] shrink-0 cursor-pointer rounded-md border border-solid border-border bg-transparent px-[12px] text-md font-semibold text-text-brand"
                >
                  Edit
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-[8px] text-sm text-text-secondary">
        Saved with the project.
      </p>
    </div>
  );
}

/** One product's two fields, open in place. Save writes to the draft, so it
 *  survives a reload and a step back; Cancel leaves the row as it was. */
function ProductEditor({
  value,
  onSave,
  onCancel,
}: {
  value: { name: string; description: string };
  onSave: (next: { name: string; description: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(value.name);
  const [description, setDescription] = React.useState(value.description);
  const clean = name.trim();
  return (
    <div className="flex flex-col gap-[10px]">
      <input
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder="Product name"
        aria-label="Product name"
        className={`${FIELD_CLASS} h-[42px] py-0`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
        placeholder="One line · what does it do?"
        aria-label="One line description"
        rows={2}
        className={`${FIELD_CLASS} h-[60px] resize-y py-[10px] leading-relaxed`}
      />
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          disabled={!clean}
          title={clean ? undefined : "A product needs a name."}
          onClick={() => onSave({ name: clean, description: description.trim() })}
          className={[
            "h-[30px] rounded-md border-none px-[14px] text-md font-semibold",
            clean
              ? "cursor-pointer bg-bg-brand text-text-on-brand"
              : "cursor-not-allowed bg-bg-subtle text-text-disabled",
          ].join(" ")}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-[30px] cursor-pointer rounded-md border border-solid border-border bg-transparent px-[12px] text-md font-semibold text-text-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** The project, read back (P2-SAVE-12). It was chosen at the setup question
 *  and named in the save step, or it is the project this Brief was opened
 *  from, so this step states it and offers nothing to change: a build lives
 *  in one project, and the project page owns its name. */
function ProjectRow({ name, detail }: { name: string; detail: string }) {
  return (
    <div>
      <p className="mx-0 mt-0 mb-[8px] text-md font-semibold text-text-primary">
        Project
      </p>
      <div className="flex min-w-0 flex-col rounded-lg bg-bg-subtle px-[14px] py-[12px]">
        <span className="block truncate text-md font-semibold text-text-primary">
          {name}
        </span>
        <span className="mt-[2px] block text-sm text-text-secondary">
          {detail}
        </span>
      </div>
    </div>
  );
}

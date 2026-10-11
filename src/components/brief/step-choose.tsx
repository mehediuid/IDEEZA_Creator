"use client";

// Choose — how the project goes out: Keep private, Give to the community, or
// Sell (the intent chooser, out of the old Step 1). The project's name, its
// description and its products are read back from the engineering record and
// never edited here: the project page owns them, and says so with a link.

import * as React from "react";
import Link from "next/link";
import type { Intent } from "@/lib/brief/types";
import { BriefCard, TAP, primaryCta } from "./brief-card";

const INTENTS: { id: Intent; label: string; sub: string; requirement: string; icon: React.ReactNode }[] = [
  {
    id: "save",
    label: "Keep private",
    sub: "Mint it to your name. Only you can see it.",
    requirement: "Free signature · no KYC",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    ),
  },
  {
    id: "give",
    label: "Give to the community",
    sub: "Free for anyone to use and build on.",
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
    id: "sell",
    label: "Sell",
    sub: "Mint it and list it on Explore marketplace.",
    requirement: "Wallet needed · no KYC",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10 M9 9.5h4.5a2 2 0 0 1 0 4H9h4.5a2 2 0 0 1 0 4H9" />
      </svg>
    ),
  },
];

const PICK_REASON = "Pick how you want to share it.";

export function StepChoose({
  project,
  intent,
  onPick,
  onBack,
  onContinue,
}: {
  /** The engineering record, read back: the name, the description and "{k} products". */
  project: { id: string; name: string; description: string; detail: string };
  intent: Intent | null;
  onPick: (intent: Intent) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const reasonId = React.useId();
  const labelId = React.useId();
  const [tried, setTried] = React.useState(false);
  const missing = intent ? null : PICK_REASON;

  return (
    <BriefCard onBack={onBack}>
      <div className="flex flex-col gap-[20px]">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-text-primary">Mint your project</h1>
          <p className="mt-[6px] max-w-[62ch] text-sm text-text-secondary">
            Minting records that you made it first. Choose how it goes out — you can still list a private project later.
          </p>
        </div>

        <section aria-label="Project" className="flex min-w-0 flex-col gap-[6px] rounded-lg bg-bg-subtle px-[14px] py-[12px]">
          <span className="block truncate text-md font-semibold text-text-primary">{project.name}</span>
          <p className="m-0 line-clamp-3 max-w-[62ch] text-sm text-text-secondary">
            {project.description.trim() || "No description yet."}
          </p>
          <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px] text-sm text-text-tertiary">
            <span>{project.detail}</span>
            <Link
              href={`/projects/${encodeURIComponent(project.id)}`}
              className={`inline-flex items-center rounded-md font-medium text-text-secondary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${TAP}`}
            >
              Edit on the project page
            </Link>
          </div>
        </section>

        <div>
          <p id={labelId} className="mx-0 mb-[12px] mt-0 text-md font-semibold text-text-primary">
            How do you want to share it?
          </p>
          <div role="group" aria-labelledby={labelId} className="grid grid-cols-1 gap-[12px] sm:grid-cols-3">
            {INTENTS.map((i) => {
              const sel = intent === i.id;
              return (
                <button
                  key={i.id}
                  type="button"
                  data-intent={i.id}
                  onClick={() => onPick(i.id)}
                  aria-pressed={sel}
                  className={[
                    "flex min-w-0 cursor-pointer flex-col items-start gap-[8px] rounded-xl border border-solid px-[12px] py-[14px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                    sel ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-surface-raised",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex h-[32px] w-[32px] items-center justify-center rounded-lg",
                      sel ? "bg-bg-surface text-text-brand" : "bg-bg-subtle text-text-secondary",
                    ].join(" ")}
                  >
                    {i.icon}
                  </span>
                  <span className="text-md font-semibold text-text-primary">{i.label}</span>
                  <span className="text-sm text-text-secondary">{i.sub}</span>
                  <span className="rounded-sm bg-bg-info-subtle px-[7px] py-[2px] text-xs font-medium text-[var(--color-text-blue)]">
                    {i.requirement}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-[8px]">
          <button
            type="button"
            onClick={() => (missing ? setTried(true) : onContinue())}
            aria-disabled={missing ? true : undefined}
            aria-describedby={missing ? reasonId : undefined}
            className={primaryCta(!missing)}
          >
            Continue
          </button>
          {missing ? (
            <p id={reasonId} role={tried ? "alert" : undefined} className="m-0 text-center text-sm text-text-secondary">
              {missing}
            </p>
          ) : null}
        </div>
      </div>
    </BriefCard>
  );
}

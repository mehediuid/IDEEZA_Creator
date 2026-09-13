"use client";

// Confirmation — the last screen in the flow, not a redirect elsewhere.
//
// A short summary of what was filed, phrased by visibility: a private package
// is told it can still be published, a public one is told it is now locked at
// version 1. From here you can start another package or go to the library.

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza";
import { Icon } from "@/components/dashboard/icon";
import { usePackageActions } from "@/lib/package/store";
import { type SavedPackage } from "@/lib/package/library";

export function StepConfirm({ saved }: { saved: SavedPackage }) {
  const actions = usePackageActions();
  const published = saved.visibility === "community";

  return (
    <div className="flex flex-col gap-[var(--spacing-10)]">
      <div className="flex flex-col gap-[var(--spacing-5)]">
        <span className="text-text-success">
          <Icon icon={CheckmarkCircle02Icon} size={30} strokeWidth={1.8} />
        </span>
        <h2 className="font-display text-2xl font-semibold leading-2xl tracking-tight text-text-primary">
          {published ? `${saved.name} is published` : `${saved.name} is saved`}
        </h2>
        <p className="max-w-[620px] font-display text-md font-regular leading-relaxed text-text-secondary">
          {published
            ? "It is listed in the community library for anyone to reuse, and locked at version 1 — editing it later creates a new version rather than changing what other designs depend on."
            : "It is in your personal library and shows up under Personal when you place a part. You can publish it to the community later."}
        </p>
      </div>

      <dl className="grid max-w-[560px] grid-cols-2 gap-[var(--spacing-6)] rounded-[var(--radius-xl)] border border-border bg-bg-surface p-[var(--spacing-8)] sm:grid-cols-4">
        {[
          ["Pins", String(saved.pins)],
          ["Mount", saved.mounting],
          ["Path", saved.path === "wizard" ? "Part Wizard" : saved.path === "import" ? "Import" : "Custom"],
          ["Visibility", published ? "Community" : "Private"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-[var(--spacing-2)]">
            <dt className="font-display text-2xs font-semibold uppercase tracking-caps text-text-tertiary">{k}</dt>
            <dd className="font-display text-md font-semibold text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-[var(--spacing-5)]">
        <Button hierarchy="primary" size="lg" onClick={actions.reset}>
          Create another package
        </Button>
        <Link
          href="/parts"
          className="inline-flex h-[40px] items-center rounded-[var(--radius-xl)] border border-border bg-bg-surface px-[var(--spacing-8)] font-display text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Go to Parts &amp; Agile Module
        </Link>
      </div>
    </div>
  );
}

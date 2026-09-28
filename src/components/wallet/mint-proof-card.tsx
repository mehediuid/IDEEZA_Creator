"use client";

// The ownership proof (P2-MINT-10's rows, from `mintProofRows`, T02): the
// mint and when, the token, and — for the owner only — the signature or the
// transaction and the payout wallet. A demo record, so it carries
// TestnetDemoBadge; no hash is a link (§3.1: nothing links to an explorer).
// The Outcome block (T24) and the Brief's success step (T26) render it.

import * as React from "react";
import { TestnetDemoBadge } from "@/components/ideeza";
import type { Intent } from "@/lib/brief/types";
import type { MetaPart } from "@/lib/manual/project-summary";
import { mintProofRows } from "@/lib/wallet/mint";
import type { MintRecord } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";

function Parts({ parts }: { parts: MetaPart[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && " · "}
          {p.kind === "text" ? (
            p.text
          ) : (
            <time dateTime={p.time.dateTime} title={p.time.title}>
              {p.time.text}
            </time>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

export function MintProofCard({
  record,
  owner,
  intent,
  title = "Ownership proof",
  className,
}: {
  record: MintRecord;
  /** The owner sees the signature / transaction and the payout wallet; anyone else, the mint and token. */
  owner: boolean;
  intent?: Intent;
  title?: string;
  className?: string;
}) {
  const headingId = React.useId();
  const rows = mintProofRows(record, { owner }, intent);
  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-[10px] rounded-lg border border-solid border-border bg-bg-surface p-[16px]", className)}
    >
      <div className="flex flex-wrap items-center gap-[8px]">
        <h3 id={headingId} className="text-md font-semibold text-text-primary">
          {title}
        </h3>
        <TestnetDemoBadge />
      </div>
      <dl className="flex flex-col gap-[10px] text-sm">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-col gap-[2px]">
            <dt className="text-xs font-medium text-text-tertiary">{r.label}</dt>
            <dd className="font-medium text-text-primary tabular-nums">
              <Parts parts={r.value} />
            </dd>
            {r.note && <dd className="text-xs leading-relaxed text-text-secondary">{r.note}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

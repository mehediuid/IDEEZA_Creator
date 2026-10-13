"use client";

// The Outcome (COM-3…22): what the Brief made of this project, read-only.
// It has no chip of its own and no Brief control — the outcome, its terms and
// the mint are chosen only in the Brief (COM-18). Owner-only: a buyer's
// preview never sees it (PPL-7). Its page shows its skeleton until the Brief
// draft is read, so it never waits.
//
// Build and Earn P0: the block left the engineering page's rail for Earn, and
// its Showcase row stayed behind as the rail's own Showcase block
// (rail-showcase.tsx) — Showcase needs no wallet. Since the Earn redesign
// (owner, 2026-10-11) Earn › Sell's "Your project" card shows only its mint
// proof, quiet, behind "Mint details" (`MintDetails`).
//
// Phase 2 (T24, P2-MINT-10/11): the mint rows carry T02's proof (token,
// signature or transaction, payout wallet), each demo fact labelled
// [Testnet demo]; the Payout wallet row gets its P2-MINT-11 change control
// while the mint is lazy, through T13's `useMint().changePayoutWallet`. `view`
// (the page's one derivation, COR-74) is read only for its precomputed
// `videos.readiness.showcase`, which the block's words still take.

import * as React from "react";
import { ArrowDown01Icon, Copy01Icon, HexagonIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton, TestnetDemoBadge } from "@/components/ideeza";
import { useMint } from "@/components/wallet/use-mint";
import type { ProjectCommerce } from "@/lib/brief/project-brief";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import type { ProjectSummary } from "@/lib/manual/project-summary";
import { outcomeView, type OutcomeRow } from "@/lib/manual/rail-copy";
import { makerId } from "@/lib/wallet/demo-wallet";
import { DEMO_ACCOUNTS } from "@/lib/wallet/identities";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import type { MintRecord, MintStatus } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { RailFact, RailFacts, RailValue, useRailStacked } from "./rail-block";

/** "Mint details": the mint's proof rows (the Testnet demo badge on the Mint row, the payout
 *  wallet and its change control), its footnote and the caller's `children`, behind a native
 *  disclosure, closed. Owner-only; null until something is minted. */
export function MintDetails({
  summary,
  commerce,
  viewer,
  view,
  announce,
  children,
}: {
  summary: ProjectSummary;
  commerce: ProjectCommerce;
  viewer: Viewer;
  view: ProjectView;
  announce: (message: string) => void;
  children?: React.ReactNode;
}) {
  if (!can(viewer, "facts.seeOwnerOnly")) return null;
  const outcome = outcomeView(commerce, summary, view.videos.readiness.showcase);
  const minted = outcome.minted;
  if (!minted) return null;
  return (
    <details className="group">
      <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-3 rounded-md text-md font-semibold text-text-primary outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus [&::-webkit-details-marker]:hidden">
        Mint details
        <span
          aria-hidden
          className="inline-flex text-text-tertiary transition-transform duration-normal ease-decelerate group-open:rotate-180 motion-reduce:transition-none"
        >
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </summary>
      <div className="flex flex-col gap-6 pt-4">
        {minted.rows.length ? (
          <RailFacts>
            {minted.rows.map((row) => (
              <OutcomeFact
                key={row.key}
                row={row}
                mintStatus={outcome.mint}
                demo={outcome.demo}
                record={commerce.record}
                projectId={summary.id}
                announce={announce}
              />
            ))}
          </RailFacts>
        ) : (
          <p className="m-0 text-md leading-relaxed text-text-secondary">{outcome.subline}</p>
        )}
        <p className="m-0 text-sm leading-relaxed text-text-tertiary">{minted.footnote}</p>
        {children}
      </div>
    </details>
  );
}

/** One Outcome fact. The Mint row's glyph is outline/neutral while lazy and success-toned once
 *  on chain (P2-MINT-10) — the installed Hugeicons free set has no filled Hexagon, so only the
 *  tone changes; the word beside it ("Lazy minted" / "Minted on chain") carries the state.
 *  The Mint row also carries [Testnet demo] for any record-backed mint, and any row with a
 *  `copy` fact gets its IconButton (P2-MINT-10). The Payout wallet row's change control
 *  (P2-MINT-11) renders only while the mint is lazy. */
function OutcomeFact({
  row,
  mintStatus,
  demo,
  record,
  projectId,
  announce,
}: {
  row: OutcomeRow;
  mintStatus: MintStatus;
  demo: boolean;
  record: MintRecord | null;
  projectId: string;
  announce: (message: string) => void;
}) {
  const stacked = useRailStacked();
  const isMint = row.key === "mint";
  const tone: "neutral" | "success" = isMint && mintStatus === "onChain" ? "success" : "neutral";
  return (
    <RailFact label={row.label} icon={isMint ? HexagonIcon : undefined} tone={tone}>
      <span className="flex flex-wrap items-center gap-2">
        <span className="break-words">
          <RailValue parts={row.value} />
        </span>
        {isMint && demo && <TestnetDemoBadge />}
        {row.copy && <CopyValueButton label={row.copy.label} value={row.copy.value} announce={announce} stacked={stacked} />}
      </span>
      {row.note && <span className="mt-1 block text-sm font-regular text-text-secondary">{row.note}</span>}
      {row.key === "wallet" && mintStatus === "lazyMinted" && record && (
        <PayoutWalletControl projectId={projectId} record={record} />
      )}
    </RailFact>
  );
}

/** P2-MINT-10's copy IconButton, 32 px (≥ the 24 px floor) and 44 px once the rail is stacked,
 *  after a short hash or address. Copying announces "Copied" in the shell's one live region. */
function CopyValueButton({
  label,
  value,
  announce,
  stacked,
}: {
  label: "Copy signature" | "Copy transaction hash" | "Copy address";
  value: string;
  announce: (message: string) => void;
  stacked: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <IconButton
      type="button"
      hierarchy="ghost"
      size={stacked ? "xl" : "sm"}
      aria-label={label}
      icon={<Icon icon={copied ? Tick02Icon : Copy01Icon} size={stacked ? 18 : 14} />}
      onClick={() => {
        if (typeof navigator === "undefined" || !navigator.clipboard) return;
        navigator.clipboard
          .writeText(value)
          .then(() => {
            announce("Copied");
            setCopied(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
    />
  );
}

/** P2-MINT-11: the Payout wallet row's change control, shown only while `lazyMinted` — once
 *  the token is on chain, `mintProofRows`' own lock note is the whole story, and there is
 *  nothing here to disable or explain. The connected demo account decides what shows: a
 *  different one gets a quiet re-sign button; the record's own account or a disconnected
 *  wallet gets a note naming what to do first. `useMint().changePayoutWallet` opens T13's
 *  wallet-request dialog for the signature and writes the repointed record on Sign. */
function PayoutWalletControl({ projectId, record }: { projectId: string; record: MintRecord }) {
  const wallet = useDemoWallet();
  const { changePayoutWallet } = useMint();
  const stacked = useRailStacked();
  const [pending, setPending] = React.useState(false);
  // Not read yet (P2-MINT-1's three states): nothing extra until the wallet hydrates.
  if (!wallet) return null;

  const active = wallet.account;
  const connected = wallet.identities[makerId(active)]?.connected === true;
  const noteClass = "mt-1 block text-sm font-regular text-text-secondary";

  if (!connected || active === record.wallet.account) {
    const verb = connected ? "switch account in your wallet" : "connect your wallet";
    return <span className={noteClass}>{`You can change it until the token is on chain — ${verb} first.`}</span>;
  }

  const label = DEMO_ACCOUNTS.find((a) => a.index === active)?.label ?? "Demo account";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await changePayoutWallet(projectId);
        } finally {
          setPending(false);
        }
      }}
      className={cn(
        "mt-1 inline-flex items-center rounded-md text-md font-medium text-text-brand outline-none transition-colors duration-normal ease-decelerate hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60",
        stacked ? "min-h-[44px]" : "min-h-[32px]",
      )}
    >
      {`Use ${label} instead`}
    </button>
  );
}

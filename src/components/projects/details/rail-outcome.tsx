"use client";

// The rail's Outcome block (COM-3…22, COM-55): what the Brief made of this
// project, read-only, first in the rail. It has no chip of its own and no
// Brief control — the outcome, its terms and the mint are chosen only in the
// Brief, whose one door on this page is the header (COM-18). Its one control
// is Showcase, a flag on the project rather than a Brief term (owner
// decision O5), and this row is that control's only home on the page.
// Owner-only: a buyer's preview drops the whole block (PPL-7). The page shows
// its skeleton until the Brief draft is read, so this block never waits.
// What Showcase changes is said in the page's one live region (COR-101).
//
// Phase 2 (T24, P2-MINT-10/11, P2-VIDEO-14/15): the mint rows now carry T02's
// proof (token, signature or transaction, payout wallet), each demo fact
// labelled [Testnet demo]; the Payout wallet row gets its P2-MINT-11 change
// control while the mint is lazy, through T13's `useMint().changePayoutWallet`;
// and Showcase now runs T06's `readinessOf` first, opening T14's
// `ReadinessDialog` (its first caller) when a current product still needs a
// video. `view` (the page's one derivation, COR-74) is read only for its
// precomputed `videos.readiness.showcase` and to hand the dialog what it
// needs — nothing here re-derives project state of its own.

import * as React from "react";
import { ArrowDown01Icon, Copy01Icon, EyeIcon, EyeOffIcon, HexagonIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton, Link, TestnetDemoBadge } from "@/components/ideeza";
import { useMint } from "@/components/wallet/use-mint";
import { useProjectBrief, type ProjectCommerce } from "@/lib/brief/project-brief";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { Readiness } from "@/lib/manual/p2-types";
import type { ProjectView } from "@/lib/manual/project-read";
import type { ProjectSummary } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { outcomeView, type OutcomeRow, type OutcomeView } from "@/lib/manual/rail-copy";
import { showcaseAnnouncement, type ShowcaseRowCopy } from "@/lib/manual/showcase-copy";
import { makerId } from "@/lib/wallet/demo-wallet";
import { DEMO_ACCOUNTS } from "@/lib/wallet/identities";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import type { MintRecord, MintStatus } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { RailBlock, RailFact, RailFacts, RailValue, useRailStacked } from "./rail-block";
import { ReadinessDialog } from "./readiness-dialog";

export function RailOutcome({
  summary,
  commerce,
  viewer,
  view,
  announce,
}: {
  summary: ProjectSummary;
  commerce: ProjectCommerce;
  viewer: Viewer;
  /** The page's one derivation (COR-74). Only `videos.readiness.showcase` is read directly
   *  here; the object itself is handed to the readiness gate dialog when it opens. */
  view: ProjectView;
  /** The shell's one polite live region (SlotProps.announce). */
  announce: (message: string) => void;
}) {
  if (!can(viewer, "facts.seeOwnerOnly")) return null;
  const readiness = view.videos.readiness.showcase;
  const outcome = outcomeView(commerce, summary, readiness);
  return (
    <RailBlock title="Outcome" meta={outcome.meta}>
      <OutcomeBody
        outcome={outcome}
        commerce={commerce}
        projectId={summary.id}
        name={summary.name}
        canShowcase={can(viewer, "project.showcase", view.canCtx)}
        readiness={readiness}
        view={view}
        announce={announce}
      />
    </RailBlock>
  );
}

function OutcomeBody({
  outcome,
  commerce,
  projectId,
  name,
  canShowcase,
  readiness,
  view,
  announce,
}: {
  outcome: OutcomeView;
  commerce: ProjectCommerce;
  projectId: string;
  name: string;
  canShowcase: boolean;
  readiness: Readiness;
  view: ProjectView;
  announce: (message: string) => void;
}) {
  const stacked = useRailStacked();
  const minted = outcome.minted;
  const facts = minted ? (
    <RailFacts>
      {minted.rows.map((row) => (
        <OutcomeFact
          key={row.key}
          row={row}
          mintStatus={outcome.mint}
          demo={outcome.demo}
          record={commerce.record}
          projectId={projectId}
          announce={announce}
        />
      ))}
      <ShowcaseFact
        copy={minted.showcase}
        projectId={projectId}
        name={name}
        allowed={canShowcase}
        readiness={readiness}
        view={view}
        announce={announce}
      />
    </RailFacts>
  ) : null;
  return (
    <>
      <p className="m-0 text-md leading-relaxed text-text-secondary">{outcome.subline}</p>
      {outcome.clipLine && <p className="m-0 text-sm leading-relaxed text-text-secondary">{outcome.clipLine}</p>}
      {facts &&
        (stacked ? (
          <details className="group">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-4 rounded-md text-md font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus [&::-webkit-details-marker]:hidden">
              Minted details
              <span
                aria-hidden
                className="inline-flex text-text-tertiary transition-transform duration-normal ease-decelerate group-open:rotate-180 motion-reduce:transition-none"
              >
                <Icon icon={ArrowDown01Icon} size={16} />
              </span>
            </summary>
            <div className="pt-4">{facts}</div>
          </details>
        ) : (
          facts
        ))}
      {minted && <p className="m-0 text-sm leading-relaxed text-text-tertiary">{minted.footnote}</p>}
    </>
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
        "mt-1 inline-flex items-center rounded-md text-sm font-medium text-text-brand outline-none transition-colors duration-normal ease-decelerate hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60",
        stacked ? "min-h-[44px]" : "min-h-[32px]",
      )}
    >
      {`Use ${label} instead`}
    </button>
  );
}

/** The Showcase row's note (COM-12), with P2-VIDEO-15's one-product link spliced in. */
function ShowcaseNote({ note, link }: { note: string; link?: { text: string; href: string } }) {
  const i = link ? note.indexOf(link.text) : -1;
  if (!link || i < 0) return <>{note}</>;
  return (
    <>
      {note.slice(0, i)}
      <Link href={link.href} color="brand" size="sm" className="font-medium">
        {link.text}
      </Link>
      {note.slice(i + link.text.length)}
    </>
  );
}

/** COM-12's row with COM-55's control. The button stays the same element as its label flips,
 *  so focus stays on it; the change is said politely in the page's one live region.
 *
 *  P2-VIDEO-15: "Showcase project" first runs `readinessOf(…, "showcase")` (`readiness`, the
 *  page's own `view.videos.readiness.showcase`). Ready, it flips at once, as v1 did. Blocked,
 *  it opens T14's `ReadinessDialog` — this is that dialog's first caller (P2-VIDEO-14) — and
 *  closing it by any means returns focus to this button. "Stop showcasing" is never gated. */
function ShowcaseFact({
  copy,
  projectId,
  name,
  allowed,
  readiness,
  view,
  announce,
}: {
  copy: ShowcaseRowCopy;
  projectId: string;
  name: string;
  allowed: boolean;
  readiness: Readiness;
  view: ProjectView;
  announce: (message: string) => void;
}) {
  const { projects, setShowcase } = useManualProjects();
  const brief = useProjectBrief(projectId);
  const stacked = useRailStacked();
  const noteId = React.useId();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [gateOpen, setGateOpen] = React.useState(false);
  const project = projects.find((p) => p.id === projectId) ?? null;

  const doShowcase = () => {
    setShowcase(projectId, true);
    announce(showcaseAnnouncement(true, name));
  };

  const press = () => {
    if (copy.on) {
      setShowcase(projectId, false);
      announce(showcaseAnnouncement(false, name));
      return;
    }
    if (readiness.ok || !project) {
      doShowcase();
      return;
    }
    setGateOpen(true);
  };

  return (
    <RailFact label={copy.label} icon={EyeIcon}>
      <span className="block">
        <RailValue parts={copy.value} />
      </span>
      <span id={noteId} className="mt-1 block text-sm font-regular text-text-secondary">
        <ShowcaseNote note={copy.note} link={copy.noteLink} />
      </span>
      {allowed && (
        <button
          ref={buttonRef}
          type="button"
          onClick={press}
          aria-describedby={noteId}
          className={cn(
            "mt-4 inline-flex items-center gap-4 rounded-lg border border-solid border-border bg-bg-surface px-8 text-md font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
            stacked ? "min-h-[44px]" : "min-h-[40px]",
          )}
        >
          <Icon icon={copy.on ? EyeOffIcon : EyeIcon} size={18} />
          {copy.action}
        </button>
      )}
      {allowed && gateOpen && project && (
        <ReadinessDialog
          purpose="showcase"
          project={project}
          view={view}
          brief={brief ?? null}
          onPass={() => {
            doShowcase();
            setGateOpen(false);
          }}
          onClose={() => {
            setGateOpen(false);
            buttonRef.current?.focus();
          }}
        />
      )}
    </RailFact>
  );
}

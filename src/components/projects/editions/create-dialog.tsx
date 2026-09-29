"use client";

// "Create Physical NFT" / "Create Virtual NFT" (Figma 41505:138210, 139690;
// P2-TABS-25). A track is a lazy-minted batch: nothing is minted or charged
// now, each NFT is minted by its own sale.
//
// - Blockchain and Collection are the project's (the mint record's), read-only.
// - Use is a radiogroup; a use this product already has for this kind is
//   disabled with "Already created".
// - Number of NFTs is a whole number from 1 to 10,000 (default 10), then the
//   lazy-mint box and Mint. Mint validates on press (`checkCreateTrack`) and
//   says the first problem under the button.
// - Mint makes ONE wallet request (§3.9): the maker's free signature "Create
//   {n} lazy NFTs — no charge". Connecting the demo wallet is that dialog's
//   first step. Its `commit` re-reads the tracks and writes the new one once.
//
// The file also holds what every edition dialog shares: the read-only field,
// the "?" help, the demo line and the tracks writer.

import * as React from "react";
import { HelpCircleIcon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, Checkbox, ModalFrame, Radio, Spinner, TestnetDemoBadge, TextInput, Tooltip } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import type { Network } from "@/lib/brief/types";
import { parseStored, readStoredKey } from "@/lib/key-store";
import { canCreate, checkCreateTrack, createTrack, KIND_WORD, USE_WORD, wholeNumberOf } from "@/lib/market/editions";
import { decodeEditions, writeEditions } from "@/lib/market/editions-store";
import { EDITIONS_KEY, type EditionKind, type EditionTrack, type EditionUse } from "@/lib/market/types";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { RequestResult, WalletRequest } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";

export const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
export const LABEL = "w-fit text-md text-[color:var(--color-input-label)]";
export const HINT = "text-sm text-[color:var(--color-input-helper)]";
export const ERROR = "text-sm text-[color:var(--color-input-error-text)]";
export const EDITION_DEMO_LINE = "Testnet demo — nothing is minted or listed on a real blockchain.";

const UNREADABLE = "This browser's NFT records couldn't be read, so nothing was changed.";
const CHANGED = "These NFTs changed in another tab — close this and look again.";
const STORAGE_FULL = "This browser's storage is full — nothing was saved.";

/** The tracks' one write: re-read, apply, write once. A key that can't be read is never overwritten. */
export function writeTracks(
  projectId: string,
  apply: (tracks: EditionTrack[]) => EditionTrack[] | null,
): { ok: true; tracks: EditionTrack[] } | { ok: false; message: string } {
  const raw = readStoredKey(EDITIONS_KEY(projectId));
  const parsed = parseStored(raw);
  if (parsed.unreadable || (parsed.value !== undefined && !Array.isArray(parsed.value)))
    return { ok: false, message: UNREADABLE };
  const next = apply(decodeEditions(raw));
  if (!next) return { ok: false, message: CHANGED };
  return writeEditions(projectId, next).ok ? { ok: true, tracks: next } : { ok: false, message: STORAGE_FULL };
}

/** What a wallet request that didn't go through says here; null when the maker cancelled. */
export function failureCopy(result: RequestResult): string | null {
  if (result.ok || result.reason === "rejected") return null;
  return result.message || STORAGE_FULL;
}

/** Focuses `id` once it's on the page — the next render may be the one that draws it. */
export function focusSoon(id: string, tries = 12): void {
  const step = (left: number) =>
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.focus();
      else if (left > 0) step(left - 1);
    });
  step(tries);
}

/** "Testnet demo — nothing is minted or listed on a real blockchain." with its pill. */
export function DemoLine() {
  return (
    <p className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
      <TestnetDemoBadge />
      {EDITION_DEMO_LINE}
    </p>
  );
}

/** A fixed fact of the track or its project: read-only, with a lock glyph. */
export function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const id = React.useId();
  const hintId = React.useId();
  return (
    <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <TextInput
        id={id}
        size="xl"
        value={value}
        readOnly
        aria-describedby={hint ? hintId : undefined}
        containerClassName="bg-bg-surface-raised"
        suffix={<Icon icon={LockIcon} size={16} />}
      />
      {hint && (
        <span id={hintId} className={HINT}>
          {hint}
        </span>
      )}
    </div>
  );
}

/** "?" beside a label: the help shows on hover, focus and tap, and Escape hides it. */
export function InfoTip({ label, text }: { label: string; text: string }) {
  const [show, setShow] = React.useState(false);
  const tipId = React.useId();
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={show ? tipId : undefined}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && show) {
            e.preventDefault();
            e.stopPropagation();
            setShow(false);
          }
        }}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
      >
        <Icon icon={HelpCircleIcon} size={16} />
      </button>
      {show && (
        <span id={tipId} className="pointer-events-none absolute bottom-full left-1/2 z-popover mb-1 -translate-x-1/2">
          <Tooltip label={text} />
        </span>
      )}
    </span>
  );
}

/** A labelled checkbox row — the whole row is the control. */
export function CheckRow({
  checked,
  onToggle,
  invalid,
  describedBy,
  id,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  invalid?: boolean;
  describedBy?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onClick={onToggle}
      className={cn(
        "flex items-start gap-4 rounded-md p-1 text-left text-sm font-medium leading-relaxed text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        TAP,
      )}
    >
      <Checkbox checked={checked} decorative className="mt-[2px]" />
      <span>{children}</span>
    </button>
  );
}

/** The dialog footer every edition dialog shares: Cancel, the CTA, and the first problem under it. */
export function DialogFooter({
  cta,
  busyCta,
  busy,
  reason,
  reasonId,
  onCancel,
  onSubmit,
}: {
  cta: string;
  busyCta: string;
  busy: boolean;
  reason: string | null;
  reasonId: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="ml-auto flex w-full flex-col items-stretch gap-3 [@media(min-width:480px)]:w-auto [@media(min-width:480px)]:items-end">
      <div className="flex flex-col-reverse gap-4 [@media(min-width:480px)]:flex-row [@media(min-width:480px)]:justify-end">
        <Button type="button" hierarchy="secondary" size="lg" disabled={busy} className={TAP} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          hierarchy="primary"
          size="lg"
          aria-busy={busy || undefined}
          aria-describedby={reason ? reasonId : undefined}
          className={TAP}
          onClick={onSubmit}
        >
          {busy && <Spinner size={16} />}
          {busy ? busyCta : cta}
        </Button>
      </div>
      {reason && (
        <p
          id={reasonId}
          role="alert"
          className="max-w-[40ch] text-sm text-[color:var(--color-input-error-text)] [@media(min-width:480px)]:text-right"
        >
          {reason}
        </p>
      )}
    </div>
  );
}

const USE_SUB: Record<EditionUse, string> = {
  private: "For the buyer's own, non-commercial builds.",
  commercial: "The buyer may build and sell it.",
};
const USES: EditionUse[] = ["private", "commercial"];

/** "10 Private use Physical NFTs created — Testnet demo". */
export function createdLine(n: number, use: EditionUse, kind: EditionKind): string {
  return `${n} ${USE_WORD[use]} ${KIND_WORD[kind]} NFT${n === 1 ? "" : "s"} created — Testnet demo`;
}

/** The maker's free signature for `n` new lazy NFTs (§3.9 "Create editions"). */
export function createRequestOf(f: {
  projectName: string;
  productName: string;
  kind: EditionKind;
  use: EditionUse;
  n: number;
  network: Network;
  collection: string;
  doneLine: string;
}): WalletRequest {
  return {
    kind: "signature",
    purpose: "createEditions",
    identity: "maker",
    network: f.network,
    title: `Create ${f.n} lazy NFT${f.n === 1 ? "" : "s"} — no charge`,
    summary: [
      { label: "Product", value: `${f.productName} · ${f.projectName}` },
      { label: "NFT", value: `${KIND_WORD[f.kind]} NFT · ${USE_WORD[f.use]}` },
      { label: "Number of NFTs", value: String(f.n) },
      { label: "Collection", value: f.collection },
      { label: "Network", value: networkLabelOf(f.network) },
    ],
    note: "Each NFT is minted only when it's bought, so nothing is charged now.",
    doneLine: f.doneLine,
  };
}

export function CreateDialog({
  projectId,
  projectName,
  productId,
  productName,
  kind,
  chain,
  tracks,
  onClose,
  onDone,
}: {
  projectId: string;
  projectName: string;
  productId: string;
  productName: string;
  kind: EditionKind;
  chain: { network: Network; collection: string };
  /** The tracks as the page read them: which uses are taken. */
  tracks: EditionTrack[];
  onClose: () => void;
  /** After the write: the new track and the sentence the page says. */
  onDone: (track: EditionTrack, message: string) => void;
}) {
  const { request } = useWalletRequest();
  const open = canCreate(tracks, productId, kind).availableUses;
  const taken = new Set(USES.filter((u) => !open.includes(u)));
  const [use, setUse] = React.useState<EditionUse | null>(() => USES.find((u) => !taken.has(u)) ?? null);
  const [count, setCount] = React.useState("10");
  const [confirmed, setConfirmed] = React.useState(false);
  const [reason, setReason] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const titleRef = React.useRef<HTMLSpanElement>(null);
  const ids = { use: React.useId(), count: React.useId(), countErr: React.useId(), box: React.useId(), reason: React.useId() };
  const title = `Create ${KIND_WORD[kind]} NFT`;

  const pick = (u: EditionUse) => {
    if (taken.has(u)) return;
    setUse(u);
    setReason(null);
  };
  const move = (from: number, dir: 1 | -1) => {
    for (let step = 1; step <= USES.length; step++) {
      const i = (from + dir * step + USES.length) % USES.length;
      if (!taken.has(USES[i])) {
        pick(USES[i]);
        refs.current[i]?.focus();
        return;
      }
    }
  };

  const close = () => {
    if (!busy) onClose();
  };

  const submit = async () => {
    if (busy) return;
    const n = wholeNumberOf(count);
    const problem = checkCreateTrack({ use, count: n, confirmed });
    setReason(problem);
    setError(null);
    if (problem || !use || n === null) {
      requestAnimationFrame(() => {
        if (problem === "Choose a use.") refs.current.find(Boolean)?.focus();
        else if (problem?.startsWith("Enter")) document.getElementById(ids.count)?.focus();
        else document.getElementById(ids.box)?.focus();
      });
      return;
    }
    const doneLine = createdLine(n, use, kind);
    let written: EditionTrack | null = null;
    setBusy(true);
    const result = await request(
      createRequestOf({ projectName, productName, kind, use, n, network: chain.network, collection: chain.collection, doneLine }),
      {
        recheck: () => {
          const now = decodeEditions(readStoredKey(EDITIONS_KEY(projectId)));
          return canCreate(now, productId, kind).availableUses.includes(use) ? null : `${USE_WORD[use]} is already created.`;
        },
        commit: (proof) => {
          const track = createTrack({ projectId, productId, kind, use, count: n, now: proof.at });
          const w = writeTracks(projectId, (tracks) =>
            canCreate(tracks, productId, kind).availableUses.includes(use) ? [...tracks, track] : null,
          );
          if (!w.ok) return { ok: false, message: w.message };
          written = track;
          return { ok: true };
        },
      },
    );
    setBusy(false);
    if (result.ok && written) {
      onDone(written, doneLine);
      return;
    }
    const failed = failureCopy(result);
    if (failed) setError(failed);
  };

  const countProblem = reason?.startsWith("Enter") ? reason : null;
  const boxProblem = reason?.startsWith("Tick") ? reason : null;

  return (
    <ModalFrame
      open
      onClose={close}
      covered={busy}
      size="sm"
      initialFocus={titleRef}
      title={
        <span ref={titleRef} tabIndex={-1} className="outline-none">
          {title}
        </span>
      }
      description={`${productName} · ${projectName}`}
      footer={
        <DialogFooter
          cta="Mint"
          busyCta="Minting…"
          busy={busy}
          reason={reason}
          reasonId={ids.reason}
          onCancel={close}
          onSubmit={() => void submit()}
        />
      }
    >
      <div inert={busy || undefined} className="flex flex-col gap-8">
        <DemoLine />
        {error && <Banner tone="error">{error}</Banner>}
        <ReadOnlyField
          label="Blockchain"
          value={networkLabelOf(chain.network)}
          hint="The project's own, set when it was minted."
        />
        <ReadOnlyField label="Collection" value={chain.collection} />

        <div className="flex flex-col gap-[var(--spacing-3)]">
          <span id={ids.use} className={LABEL}>
            Use
          </span>
          <div
            role="radiogroup"
            aria-labelledby={ids.use}
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-[12px]"
          >
            {USES.map((u, i) => {
              const on = use === u;
              const off = taken.has(u);
              const focusable = on || (use === null && !off && USES.findIndex((x) => !taken.has(x)) === i);
              return (
                <button
                  key={u}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={off || undefined}
                  tabIndex={focusable ? 0 : -1}
                  onClick={() => pick(u)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault();
                      move(i, 1);
                    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      move(i, -1);
                    }
                  }}
                  className={cn(
                    "flex min-h-[var(--touch-min)] items-start gap-[10px] rounded-lg border border-solid p-[14px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                    off
                      ? "cursor-not-allowed border-border bg-bg-surface-raised"
                      : on
                        ? "border-border-brand bg-bg-brand-subtle"
                        : "border-border bg-bg-surface hover:bg-bg-subtle",
                  )}
                >
                  <Radio checked={on} disabled={off} decorative size="sm" className="mt-[2px]" />
                  <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
                    <span className={cn("text-md font-semibold", off ? "text-text-secondary" : "text-text-primary")}>
                      {USE_WORD[u]}
                    </span>
                    <span className="text-sm leading-relaxed text-text-secondary">{off ? "Already created" : USE_SUB[u]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
          <label htmlFor={ids.count} className={LABEL}>
            Number of NFTs
          </label>
          <TextInput
            id={ids.count}
            size="xl"
            value={count}
            onValueChange={(v) => {
              setCount(v.replace(/[^\d]/g, "").slice(0, 6));
              setReason(null);
            }}
            inputMode="numeric"
            invalid={!!countProblem}
            aria-invalid={!!countProblem || undefined}
            aria-describedby={countProblem ? ids.countErr : undefined}
          />
          {countProblem ? (
            <span id={ids.countErr} className={ERROR}>
              {countProblem}
            </span>
          ) : (
            <span className={HINT}>A whole number from 1 to 10,000.</span>
          )}
        </div>

        <CheckRow
          id={ids.box}
          checked={confirmed}
          invalid={!!boxProblem}
          describedBy={boxProblem ? ids.reason : undefined}
          onToggle={() => {
            setConfirmed((c) => !c);
            setReason(null);
          }}
        >
          I understand these NFTs are lazy minted: each one is minted only when it&apos;s bought, so nothing is charged now.
        </CheckRow>
      </div>
    </ModalFrame>
  );
}

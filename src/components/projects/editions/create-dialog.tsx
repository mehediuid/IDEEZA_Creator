"use client";

// What every edition dialog shares — the read-only field, the "?" help, the
// checkbox row, the footer, the demo line and the tracks writer — and the
// "Create editions" wallet request (§3.9; P2-TABS-25). A track is a
// lazy-minted batch: nothing is minted or charged now, each NFT is minted by
// its own sale. Since Build and Earn P1-3 a track is created by the Sell
// copies flow (earn/sell/sell-flow-dialog.tsx), which makes
// this request and writes through `writeTracks`, as the Create dialog did.

import * as React from "react";
import { HelpCircleIcon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Checkbox, Spinner, TestnetDemoBadge, TextInput, Tooltip } from "@/components/ideeza";
import type { Network } from "@/lib/brief/types";
import { parseStored, readStoredKey } from "@/lib/key-store";
import { KIND_WORD, USE_WORD } from "@/lib/market/editions";
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

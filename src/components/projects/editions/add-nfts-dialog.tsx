"use client";

// "Add {Use} {Kind} NFTs" (Figma 41505:141624, "Increase"; P2-TABS-27). More
// lazy NFTs on a listed track, sold at the listing's current prices: "Number
// to add" (1–10,000) and the box that says so, then Add NFTs. ONE free
// signature, like Create's; its `commit` re-reads the track and writes the new
// supply once, remembered as the card's "+{n} new" until the next sale.

import * as React from "react";
import { Banner, ModalFrame, TextInput } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import type { Network } from "@/lib/brief/types";
import { addToSupply, checkAddNfts, KIND_WORD, USE_WORD, wholeNumberOf } from "@/lib/market/editions";
import type { EditionTrack } from "@/lib/market/types";
import {
  CheckRow,
  createRequestOf,
  DemoLine,
  DialogFooter,
  ERROR,
  failureCopy,
  HINT,
  LABEL,
  ReadOnlyField,
  writeTracks,
} from "./create-dialog";

/** "20 Private use Physical NFTs added — Testnet demo". */
export function addedLine(n: number, track: EditionTrack): string {
  return `${n} ${USE_WORD[track.use]} ${KIND_WORD[track.kind]} NFT${n === 1 ? "" : "s"} added — Testnet demo`;
}

export function AddNftsDialog({
  projectId,
  projectName,
  productName,
  track,
  chain,
  onClose,
  onDone,
}: {
  projectId: string;
  projectName: string;
  productName: string;
  track: EditionTrack;
  chain: { network: Network; collection: string };
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { request } = useWalletRequest();
  const [count, setCount] = React.useState("10");
  const [confirmed, setConfirmed] = React.useState(false);
  const [reason, setReason] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const titleRef = React.useRef<HTMLSpanElement>(null);
  const ids = { count: React.useId(), countErr: React.useId(), box: React.useId(), reason: React.useId() };

  const close = () => {
    if (!busy) onClose();
  };

  const submit = async () => {
    if (busy) return;
    const n = wholeNumberOf(count);
    const problem = checkAddNfts({ count: n, confirmed });
    setReason(problem);
    setError(null);
    if (problem || n === null) {
      requestAnimationFrame(() => document.getElementById(problem?.startsWith("Enter") ? ids.count : ids.box)?.focus());
      return;
    }
    const doneLine = addedLine(n, track);
    setBusy(true);
    const result = await request(
      createRequestOf({
        projectName,
        productName,
        kind: track.kind,
        use: track.use,
        n,
        network: chain.network,
        collection: chain.collection,
        doneLine,
      }),
      {
        commit: (proof) => {
          const w = writeTracks(projectId, (tracks) => addToSupply(tracks, track.id, n, proof.at));
          return w.ok ? { ok: true } : { ok: false, message: w.message };
        },
      },
    );
    setBusy(false);
    if (result.ok) {
      onDone(doneLine);
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
          {`Add ${USE_WORD[track.use]} ${KIND_WORD[track.kind]} NFTs`}
        </span>
      }
      description={`${productName} · ${projectName}`}
      footer={
        <DialogFooter
          cta="Add NFTs"
          busyCta="Adding…"
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
        <ReadOnlyField label="Number of NFTs now" value={String(track.supply.total)} />
        <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
          <label htmlFor={ids.count} className={LABEL}>
            Number to add
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
            <span className={HINT}>A whole number from 1 to 10,000. They&apos;re lazy minted, so nothing is charged now.</span>
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
          Add them to the live listing at its current prices.
        </CheckRow>
      </div>
    </ModalFrame>
  );
}

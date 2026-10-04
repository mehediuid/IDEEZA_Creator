"use client";

// "Edit {Kind} NFT listing" (Figma 41505:140339; P2-TABS-27). Use and supply
// are locked; the token, both prices and the royalties are editable, with
// Add's own fields and rules (list-dialog.tsx). Update makes ONE free
// signature, and its `commit` re-reads the track and writes once. The page
// then says "Listing updated".

import * as React from "react";
import { Banner, ModalFrame } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import type { Network } from "@/lib/brief/types";
import { editTrackListing, KIND_WORD, USE_WORD } from "@/lib/market/editions";
import type { EditionTrack } from "@/lib/market/types";
import { DemoLine, DialogFooter, failureCopy, ReadOnlyField, writeTracks } from "./create-dialog";
import {
  EachSale,
  EditionTermsFields,
  focusProblem,
  listRequestOf,
  termsOf,
  termsProblem,
  type TermsField,
  type TermsInput,
} from "./list-dialog";

export const UPDATED_LINE = "Listing updated";

export function EditDialog({
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
  /** A listed track. */
  track: EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };
  chain: { network: Network; collection: string };
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { request } = useWalletRequest();
  const [input, setInput] = React.useState<TermsInput>(() => ({
    token: track.listing.token,
    regular: track.listing.regular,
    extended: track.listing.extended,
    royalties: String(track.listing.royaltyPct),
  }));
  const [problem, setProblem] = React.useState<{ field: TermsField; message: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const titleRef = React.useRef<HTMLSpanElement>(null);
  const prefix = React.useId().replace(/:/g, "");
  const reasonId = `${prefix}-reason`;

  const change = (patch: Partial<TermsInput>) => {
    setInput((i) => ({ ...i, ...patch }));
    setProblem(null);
    setError(null);
  };
  const close = () => {
    if (!busy) onClose();
  };

  const submit = async () => {
    if (busy) return;
    const p = termsProblem(input, { confirmed: true, askOwner: false, owner: true });
    setProblem(p);
    setError(null);
    if (p) {
      focusProblem(prefix, p.field);
      return;
    }
    const terms = termsOf(input);
    const req = listRequestOf({
      track,
      projectName,
      productName,
      terms,
      network: chain.network,
      collection: chain.collection,
      editing: true,
    });
    setBusy(true);
    const result = await request(req, {
      commit: (proof) => {
        const w = writeTracks(projectId, (tracks) => editTrackListing(tracks, track.id, terms, proof.at));
        return w.ok ? { ok: true } : { ok: false, message: w.message };
      },
    });
    setBusy(false);
    if (result.ok) {
      onDone(UPDATED_LINE);
      return;
    }
    const failed = failureCopy(result);
    if (failed) setError(failed);
  };

  return (
    <ModalFrame
      open
      onClose={close}
      covered={busy}
      size="sm"
      initialFocus={titleRef}
      title={
        <span ref={titleRef} tabIndex={-1} className="outline-none">
          {`Edit ${KIND_WORD[track.kind]} NFT listing`}
        </span>
      }
      description={`${productName} · ${USE_WORD[track.use]}`}
      footer={
        <DialogFooter
          cta="Update"
          busyCta="Updating…"
          busy={busy}
          reason={problem?.message ?? null}
          reasonId={reasonId}
          onCancel={close}
          onSubmit={() => void submit()}
        />
      }
    >
      <div inert={busy || undefined} className="flex flex-col gap-8">
        <DemoLine />
        {error && <Banner tone="error">{error}</Banner>}
        <div className="grid grid-cols-1 gap-8 [@media(min-width:480px)]:grid-cols-2 [@media(min-width:480px)]:gap-6">
          <ReadOnlyField label="Use" value={USE_WORD[track.use]} />
          <ReadOnlyField label="Number of NFTs" value={String(track.supply.total)} />
        </div>
        <EditionTermsFields network={chain.network} value={input} onChange={change} problem={problem} idPrefix={prefix} />
        <EachSale input={input} />
      </div>
    </ModalFrame>
  );
}

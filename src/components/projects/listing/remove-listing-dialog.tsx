"use client";

// "Remove this listing?" (P2-LISTING-9). A danger confirm: the way out
// ("Keep it listed") first and focused, then "Remove listing".
// - A lazy listing is removed at once: `removeListing` in one write.
// - An on-chain listing then asks the wallet for the network fee (§3.9
//   "Listing · Remove"); the same write is its `commit`, so a cancelled
//   payment removes nothing.
// Its terms are kept on the record, so "Add to marketplace" can list it
// again with them (P2-LISTING-15).

import * as React from "react";
import { Banner, Button, ModalFrame, Spinner } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { removeListing } from "@/lib/market/listing";
import { REMOVED_ANNOUNCEMENT, removeRequestOf } from "@/lib/market/listing-flow";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import type { Listing } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { refusedCopy } from "./listing-dialog";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function RemoveListingDialog({
  projectName,
  listing,
  extra,
  onClose,
  onDone,
}: {
  projectName: string;
  listing: Listing;
  /** What else the removal takes with it (T27: the project's edition listings). */
  extra?: React.ReactNode;
  onClose: () => void;
  /** After the write: what the page's live region says. */
  onDone: (message: string) => void;
}) {
  const { writeListings } = useMarket();
  const { request } = useWalletRequest();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const onChain = listing.mintingType === "instant";

  /** The one write; null when it went through. */
  const write = (at: number): string | null => {
    const m = readMarketNow();
    if (m.sales.some((s) => s.listingId === listing.id && s.item.nft === "main")) return "It has just sold, so it can't be removed.";
    const next = removeListing(m.listings, listing.id, at);
    if (!next.ok) return next.reason;
    const w = writeListings(next.listings);
    return w.ok ? null : refusedCopy(w.reason);
  };

  const confirm = async () => {
    if (busy) return;
    setError(null);
    const req = removeRequestOf(listing, projectName);
    if (!req) {
      const failed = write(Date.now());
      if (failed) setError(failed);
      else onDone(REMOVED_ANNOUNCEMENT);
      return;
    }
    setBusy(true);
    const result = await request(req, {
      commit: (proof) => {
        const failed = write(proof.at);
        return failed ? { ok: false, message: failed } : { ok: true };
      },
    });
    setBusy(false);
    if (result.ok) onDone(REMOVED_ANNOUNCEMENT);
    else if (result.reason !== "rejected") setError(result.message || refusedCopy("storage"));
  };

  return (
    <ModalFrame
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      covered={busy}
      size="sm"
      title="Remove this listing?"
      initialFocus={keepRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button ref={keepRef} type="button" hierarchy="secondary" size="lg" disabled={busy} className={TAP} onClick={onClose}>
            Keep it listed
          </Button>
          <Button
            type="button"
            hierarchy="danger"
            size="lg"
            aria-busy={busy || undefined}
            className={cn(TAP)}
            onClick={() => void confirm()}
          >
            {busy && <Spinner size={16} />}
            Remove listing
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 text-sm leading-relaxed text-text-secondary">
        <p>Buyers can no longer see or buy it. Its terms are kept, so you can list it again.</p>
        {extra}
        {onChain && <p>Removing an on-chain listing costs a network fee (test tokens — no real cost).</p>}
        {error && <Banner tone="error">{error}</Banner>}
      </div>
    </ModalFrame>
  );
}

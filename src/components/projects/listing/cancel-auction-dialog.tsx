"use client";

// "Cancel the auction?" — an auction nobody has bid on yet comes down before it
// ends. The Remove dialog's shape: the way out ("Keep it") first and focused,
// then the danger "Cancel auction".
// - The write is `cancelAuction`: the listing becomes a removed one, so the Main
//   NFT is not listed again and the mint stays; its terms are kept for the next
//   listing. Everything is read again at the press: another tab may have bid,
//   bought or taken it down meanwhile, and then nothing is written.
// - An on-chain listing then asks the wallet for the network fee, as Remove
//   does (§3.9 "Listing · Remove"); the same write is its `commit`, so a
//   cancelled payment changes nothing.

import * as React from "react";
import { Banner, Button, ModalFrame, Spinner } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { cancelAuction } from "@/lib/market/listing";
import { AUCTION_CANCELLED_ANNOUNCEMENT, removeRequestOf } from "@/lib/market/listing-flow";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import type { Listing } from "@/lib/market/types";
import { refusedCopy } from "./listing-dialog";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function CancelAuctionDialog({
  projectName,
  listing,
  onClose,
  onDone,
}: {
  projectName: string;
  listing: Listing;
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
    if (m.sales.some((s) => s.listingId === listing.id && s.item.nft === "main")) return "It has just sold, so it can't be cancelled.";
    const next = cancelAuction(m.listings, listing.id, m.bids, at);
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
      else onDone(AUCTION_CANCELLED_ANNOUNCEMENT);
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
    if (result.ok) onDone(AUCTION_CANCELLED_ANNOUNCEMENT);
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
      title="Cancel the auction?"
      initialFocus={keepRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button ref={keepRef} type="button" hierarchy="secondary" size="lg" disabled={busy} className={TAP} onClick={onClose}>
            Keep it
          </Button>
          <Button type="button" hierarchy="danger" size="lg" aria-busy={busy || undefined} className={TAP} onClick={() => void confirm()}>
            {busy && <Spinner size={16} />}
            Cancel auction
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 text-md leading-relaxed text-text-secondary">
        <p>Nobody has bid yet. The listing comes down and you can list it again.</p>
        {onChain && <p>Removing an on-chain listing costs a network fee (test tokens — no real cost).</p>}
        {error && <Banner tone="error">{error}</Banner>}
      </div>
    </ModalFrame>
  );
}

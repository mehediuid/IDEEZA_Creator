"use client";

// Bidding History (P2-LISTING-11, Figma 41505:142256 / 142375): a real table
// of MARKETPLACE's bids — Bid · Bidder · Time, highest (so newest) first.
// The Figma's USD column is dropped: test tokens have no dollar value.
// Bidders read "Mira (demo buyer)". On a narrow dialog the time wraps under
// its date, so each row reads as two lines.

import * as React from "react";
import { Button, ModalFrame, TestnetDemoBadge } from "@/components/ideeza";
import { bidRowsOf } from "@/lib/market/listing-flow";
import type { Bid, Listing } from "@/lib/market/types";

export function BiddingHistoryDialog({
  projectName,
  listing,
  bids,
  onClose,
}: {
  projectName: string;
  listing: Listing;
  bids: Bid[];
  onClose: () => void;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const rows = bidRowsOf(listing, bids);
  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      title="Bidding History"
      initialFocus={closeRef}
      footer={
        <Button ref={closeRef} type="button" hierarchy="secondary" size="lg" className="ml-auto max-md:min-h-[var(--touch-min)]" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-6 [container-type:inline-size]">
        <TestnetDemoBadge className="self-start" />
        {rows.length === 0 ? (
          <p className="text-sm text-text-secondary">No bids yet.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">{`Bids on ${projectName}, newest first`}</caption>
            <thead>
              <tr className="border-b border-solid border-border text-xs font-semibold text-text-tertiary">
                <th scope="col" className="py-4 pr-6 font-semibold">
                  Bid
                </th>
                <th scope="col" className="py-4 pr-6 font-semibold">
                  Bidder
                </th>
                <th scope="col" className="py-4 font-semibold">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-solid border-border last:border-b-0">
                  <td className="py-5 pr-6 align-top font-semibold tabular-nums text-text-primary">{r.bid}</td>
                  <td className="py-5 pr-6 align-top text-text-primary">{r.bidder}</td>
                  <td className="py-5 align-top text-text-secondary">
                    <time dateTime={new Date(r.at).toISOString()} title={r.time}>
                      <span className="[@container(max-width:439px)]:block">{r.date}</span>
                      <span className="[@container(max-width:439px)]:hidden"> · </span>
                      <span className="[@container(max-width:439px)]:block">{r.clock}</span>
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModalFrame>
  );
}

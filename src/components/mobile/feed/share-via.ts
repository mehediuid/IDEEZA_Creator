"use client";

// Share via… (SOC-5): sharing outside IDEEZA from the phone. The web's Share menus list the networks
// one by one after Copy link ("Share on Facebook", "Share on LinkedIn", "Share on X", "Share on
// WhatsApp", lib/innovations/share-links.ts); a phone has its own share sheet that holds all of them
// (and Messages, Mail…), so the phone offers one row that opens it with the item's title and address,
// as Share profile does. A browser with no share sheet copies the address instead and says so; closing
// the share sheet without picking anything does nothing.

import * as React from "react";
import { useToast } from "../kit/toast";

/** What a share hands the phone's share sheet: the address (a path of this site, or a full URL),
 *  the title it goes with, and the toast once the address was copied instead. */
export type ShareViaInput = { url: string; title: string; copied: string };

export function useShareVia(): (input: ShareViaInput) => void {
  const toast = useToast();
  return React.useCallback(
    ({ url: raw, title, copied }: ShareViaInput) => {
      const url = new URL(raw, window.location.origin).toString();
      const copy = () => {
        if (!navigator.clipboard) return toast({ title: "Couldn’t copy the link", lead: "error" });
        navigator.clipboard.writeText(url).then(
          () => toast({ title: copied }),
          () => toast({ title: "Couldn’t copy the link", lead: "error" }),
        );
      };
      if (typeof navigator.share !== "function") return copy();
      navigator.share({ title, url }).catch((e: unknown) => {
        // Closing the share sheet is a choice, not a failure.
        if (!(e instanceof DOMException && e.name === "AbortError")) copy();
      });
    },
    [toast],
  );
}

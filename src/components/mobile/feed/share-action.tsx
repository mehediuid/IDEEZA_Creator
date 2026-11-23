"use client";

// The Share icon of a marketplace screen on the phone (owner 2026-11-22: "I see a good product or
// project on the marketplace — whether I can buy it or not, I want others to see it"): in the top bar
// of a project's or a product's screen whenever it is on Innovations or on the Marketplace, anyone's
// or your own, bought or not. It opens the M12 menu:
// · Share to your Feed — the Feed's own share sheet (clip-share.tsx): your words over the item, with
//   its creator, on your Timeline; on the Feed too while it is on the Marketplace (a Facebook-style
//   re-share);
// · Copy link — the item's public web page (SOC-19: its marketplace page while it is on the
//   Marketplace, as the web's marketplace Share copies its page, else its Innovations post), never
//   this phone screen's own /m address;
// · Share via… — the phone's own share sheet with the item's title and that address (the web's
//   Share on Facebook / LinkedIn / X / WhatsApp, in one row, SOC-5); copied where there is none.
// A private project (a draft, minted and never shared or listed) has no icon.

import * as React from "react";
import { Link01Icon, Share01Icon, Share08Icon, SentIcon } from "@hugeicons/core-free-icons";
import { useShareItems } from "@/components/shares/use-share-items";
import type { ShareItem } from "@/lib/innovations/share-items";
import { ActionSheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import type { TopBarAction } from "../top-bar";
import { useWebLinkOf } from "./clip-menu";
import { ClipShare, type ShareTarget } from "./clip-share";
import { useShareVia } from "./share-via";
import { useFeedClips } from "./use-clips";

const COPY_FAILED = "Couldn’t copy. Copy the address from your browser instead.";

/** The top bar's Share action for an item and the sheets it opens; no action while the item isn't live. */
export function useShareAction(itemId: string | null): { action: TopBarAction | null; sheets: React.ReactNode } {
  const items = useShareItems();
  const { byId } = useFeedClips();
  const toast = useToast();
  const shareVia = useShareVia();
  const webLinkOf = useWebLinkOf();
  const [open, setOpen] = React.useState<"menu" | "share" | null>(null);
  const item: ShareItem | null = itemId && items.hydrated ? items.itemOf(itemId) : null;
  const shareable = !!itemId && items.publicOf(itemId);
  if (!item || !shareable) return { action: null, sheets: null };

  const target: ShareTarget = {
    id: item.id,
    kind: item.kind,
    title: item.title,
    projectTitle: item.projectTitle,
    cover: item.cover,
    by: item.creator.name,
    plays: byId(item.id) !== null,
  };
  const link = webLinkOf(item.id, items.liveOf(item.id));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(link, window.location.origin).toString());
      toast({ title: `Link to ${item.kind} copied to clipboard` });
    } catch {
      toast({ title: COPY_FAILED, lead: "error" });
    }
  };
  return {
    action: { icon: Share08Icon, label: `Share ${item.title}`, onClick: () => setOpen("menu") },
    sheets: (
      <>
        <ActionSheet
          open={open === "menu"}
          onClose={() => setOpen(null)}
          title={item.title}
          items={[
            { label: "Share to your Feed", icon: Share01Icon, onSelect: () => setOpen("share") },
            { label: "Copy link", icon: Link01Icon, onSelect: () => void copy() },
            {
              label: "Share via…",
              icon: SentIcon,
              onSelect: () => shareVia({ url: link, title: item.title, copied: `Link to ${item.kind} copied to clipboard` }),
            },
          ]}
        />
        <ClipShare item={target} open={open === "share"} onClose={() => setOpen(null)} />
      </>
    ),
  };
}

"use client";

// The Share icon of a marketplace screen on the phone (owner 2026-11-22: "I see a good product or
// project on the marketplace — whether I can buy it or not, I want others to see it"): in the top bar
// of a project's or a product's screen while it is live on the Marketplace, anyone's, bought or not.
// It opens the M12 menu:
// · Share to your Feed — someone else's item only: the Feed's own share sheet (clip-share.tsx), your
//   words over the item, with its creator, on your Timeline and your Feed (a Facebook-style re-share).
//   Your own item goes out as your own post (the project ⋯ › Share to Feed), as on the web, where your
//   own marketplace page's Share offers the outside share only;
// · Copy link — this screen's address.
// Off the Marketplace (sold out, delisted, a draft), there is no icon: nothing is offered that can't go.

import * as React from "react";
import { Link01Icon, Share01Icon, Share08Icon } from "@hugeicons/core-free-icons";
import { useShareItems } from "@/components/shares/use-share-items";
import type { ShareItem } from "@/lib/innovations/share-items";
import { ActionSheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import type { TopBarAction } from "../top-bar";
import { ClipShare, type ShareTarget } from "./clip-share";
import { useFeedClips } from "./use-clips";

const COPY_FAILED = "Couldn’t copy. Copy the address from your browser instead.";

/** The top bar's Share action for an item and the sheets it opens; no action while the item isn't live. */
export function useShareAction(itemId: string | null): { action: TopBarAction | null; sheets: React.ReactNode } {
  const items = useShareItems();
  const { byId } = useFeedClips();
  const toast = useToast();
  const [open, setOpen] = React.useState<"menu" | "share" | null>(null);
  const item: ShareItem | null = itemId && items.hydrated ? items.itemOf(itemId) : null;
  const live = !!itemId && items.liveOf(itemId);
  if (!item || !live) return { action: null, sheets: null };

  const target: ShareTarget = { id: item.id, title: item.title, cover: item.cover, by: item.creator.name, plays: byId(item.id) !== null };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
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
            ...(item.source === "mine" ? [] : [{ label: "Share to your Feed", icon: Share01Icon, onSelect: () => setOpen("share") }]),
            { label: "Copy link", icon: Link01Icon, onSelect: () => void copy() },
          ]}
        />
        <ClipShare item={target} open={open === "share"} onClose={() => setOpen(null)} />
      </>
    ),
  };
}

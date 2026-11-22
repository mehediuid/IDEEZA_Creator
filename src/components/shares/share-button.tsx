"use client";

// Share on a web marketplace page (owner, 2026-11-22): a quiet secondary button in the page header,
// beside the title, never in the buy box. It opens the post page's Share menu (post-rail.tsx):
// - someone else's item that is live on the Marketplace: Share to Innovations first (the re-share,
//   share-item-dialog.tsx), then Copy link and the four networks;
// - your own item: Copy link and the networks only. Your own project's Share to Innovations is its
//   ⋯ menu's (your post), so the outside share is all this button offers you.
// The link is the page's own address. The page around it gives the toast (PostToastProvider).

import * as React from "react";
import { usePathname } from "next/navigation";
import { Share08Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza";
import { useCopyLink } from "@/components/innovations/post-bits";
import { ShareMenu } from "@/components/innovations/post-rail";
import { ME } from "@/lib/innovations/people";
import { shareIntentUrl } from "@/lib/innovations/share-links";
import { parseShareItemId } from "@/lib/innovations/share-items";
import { cn } from "@/lib/utils";
import { ShareItemDialog } from "./share-item-dialog";
import { useShareItems } from "./use-share-items";

export function MarketShareButton({ itemId, title, className }: { itemId: string; title: string; className?: string }) {
  const pathname = usePathname();
  const copyLink = useCopyLink(pathname);
  const { hydrated, itemOf, liveOf } = useShareItems();
  const [sharing, setSharing] = React.useState(false);
  const at = parseShareItemId(itemId);
  const item = itemOf(itemId);
  const yours = at?.source === "mine" || item?.creator.id === ME.id;
  const offered = !yours && (at?.source === "sample" || hydrated) && liveOf(itemId);
  const what = at?.productId ? "product" : "project";

  return (
    <>
      <ShareMenu
        label={`Share this ${what}`}
        actions={{
          copyLink,
          shareTo: (network) => {
            const url = new URL(pathname, window.location.origin).toString();
            window.open(shareIntentUrl(network, url, title), "_blank", "noopener,noreferrer");
          },
          shareToInnovations: offered ? () => setSharing(true) : undefined,
        }}
        trigger={(props) => (
          <Button
            {...props}
            type="button"
            hierarchy="secondary"
            size="md"
            iconLeading={<Icon icon={Share08Icon} size={16} />}
            className={cn("shrink-0", className)}
          >
            Share
          </Button>
        )}
      />
      {offered && <ShareItemDialog itemId={itemId} open={sharing} onClose={() => setSharing(false)} />}
    </>
  );
}

// Sharing a post outside IDEEZA (owner, 2026-11-15): each network's public
// share-intent address, opened in a new tab. Nothing is posted for the maker;
// the network's own page asks them to. Pure, so node:test covers it.

export type ShareNetwork = "facebook" | "linkedin" | "x" | "whatsapp";

/** The Share menu's rows after Copy link, in order. */
export const SHARE_NETWORKS: readonly { id: ShareNetwork; label: string }[] = [
  { id: "facebook", label: "Share on Facebook" },
  { id: "linkedin", label: "Share on LinkedIn" },
  { id: "x", label: "Share on X" },
  { id: "whatsapp", label: "Share on WhatsApp" },
];

/** The address that opens `network`'s share page for `url`; X and WhatsApp carry the title too. */
export function shareIntentUrl(network: ShareNetwork, url: string, title: string): string {
  const u = encodeURIComponent(url);
  switch (network) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "x":
      return `https://x.com/intent/tweet?url=${u}&text=${encodeURIComponent(title)}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(title ? `${title} ${url}` : url)}`;
  }
}

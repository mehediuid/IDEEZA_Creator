// The Earn layer's routes (docs/superpowers/specs/2026-10-11-build-earn-p0-design.md).
// Engineering lives on /projects/<id>; everything that makes money from the
// project lives under /projects/<id>/earn, reached by the page's one
// "Earn from this project" button. This file is the only place that spells
// those paths, so the page, the button, the redirects and the Earn layout
// can't disagree.

export const EARN_SECTIONS = ["overview", "sell", "editions", "plan", "splits", "customers", "rights"] as const;
export type EarnSection = (typeof EARN_SECTIONS)[number];

export const EARN_SECTION_LABEL: Record<EarnSection, string> = {
  overview: "Overview",
  sell: "Project NFT",
  editions: "Editions",
  plan: "Business plan",
  splits: "Splits",
  customers: "Customers",
  rights: "Rights",
};

/** The Earn sub-navigation, in order. A null label is an ungrouped row. */
export const EARN_GROUPS: readonly { label: string | null; sections: readonly EarnSection[] }[] = [
  { label: null, sections: ["overview"] },
  { label: "Sell", sections: ["sell", "editions"] },
  { label: "Plan", sections: ["plan"] },
  { label: "Money", sections: ["splits", "customers", "rights"] },
];

export function isEarnSection(s: string | null | undefined): s is EarnSection {
  return typeof s === "string" && (EARN_SECTIONS as readonly string[]).includes(s);
}

/** `/projects/<id>/earn` for the overview, `/projects/<id>/earn/<section>`
 *  otherwise, with an optional query (e.g. `{ list: "1" }`). */
export function earnHref(projectId: string, section: EarnSection = "overview", query?: Record<string, string>): string {
  const base = `/projects/${encodeURIComponent(projectId)}/earn${section === "overview" ? "" : `/${section}`}`;
  const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
  return base + qs;
}

/** `/projects/<id>/earn/mint` — the mint flow (the Brief, Build and Earn P1-2), opened from
 *  Earn › Project NFT. A static segment, so it wins over `earn/[section]`. */
export function earnMintHref(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/earn/mint`;
}

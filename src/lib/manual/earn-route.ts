// The Earn layer's routes (docs/superpowers/specs/2026-10-11-build-earn-p0-design.md).
// Engineering lives on /projects/<id>; everything that makes money from the
// project lives under /projects/<id>/earn, reached by the page's one
// "Earn from this project" button. This file is the only place that spells
// those paths, so the page, the button, the redirects and the Earn layout
// can't disagree.
//
// Four tabs (owner, 2026-10-11): Overview · Sell · Business plan · Money. A
// part of a tab has an address of its own, the tab's path with the part's id
// as the hash (`earnHref(id, "customers")` → `/earn/money#customers`), and
// the old section addresses redirect there (`earnSectionRedirectOf`).

export const EARN_SECTIONS = ["overview", "sell", "plan", "money"] as const;
export type EarnSection = (typeof EARN_SECTIONS)[number];

export const EARN_SECTION_LABEL: Record<EarnSection, string> = {
  overview: "Overview",
  sell: "Sell",
  plan: "Business plan",
  money: "Money",
};

/** The parts of a tab an address can name, each the id of its section on the page. */
export const EARN_PARTS = {
  copies: "sell",
  splits: "money",
  customers: "money",
  rights: "money",
} as const satisfies Record<string, EarnSection>;
export type EarnPart = keyof typeof EARN_PARTS;

/** Where an Earn link can point: a tab, or a part of one. */
export type EarnPlace = EarnSection | EarnPart;

export function isEarnSection(s: string | null | undefined): s is EarnSection {
  return typeof s === "string" && (EARN_SECTIONS as readonly string[]).includes(s);
}

/** `/projects/<id>/earn` for the overview, `/projects/<id>/earn/<section>` otherwise, with an
 *  optional query (e.g. `{ list: "1" }`); a part adds its hash (`/earn/money?sale=s#customers`). */
export function earnHref(projectId: string, place: EarnPlace = "overview", query?: Record<string, string>): string {
  const section = isEarnSection(place) ? place : EARN_PARTS[place];
  const base = `/projects/${encodeURIComponent(projectId)}/earn${section === "overview" ? "" : `/${section}`}`;
  const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
  return base + qs + (isEarnSection(place) ? "" : `#${place}`);
}

/** The section addresses before the four tabs, and the part each one is now. */
const MOVED_SECTIONS: Readonly<Record<string, EarnPart>> = {
  editions: "copies",
  splits: "splits",
  customers: "customers",
  rights: "rights",
};

/**
 * An old `/earn/<section>` address → where it lives now, or null when the segment is not one
 * of them: `editions` → Sell's copies; `splits`, `customers` and `rights` → their part of
 * Money. Customers keeps a `sale=` deep link, which its panel opens on arrival. Takes the
 * route's `searchParams` as Next hands them.
 */
export function earnSectionRedirectOf(
  projectId: string,
  segment: string,
  query: Readonly<Record<string, string | string[] | undefined>> = {},
): string | null {
  const part = Object.hasOwn(MOVED_SECTIONS, segment) ? MOVED_SECTIONS[segment] : null;
  if (!part) return null;
  const raw = query.sale;
  const sale = Array.isArray(raw) ? raw[0] : raw;
  return earnHref(projectId, part, part === "customers" && sale ? { sale } : undefined);
}

/** How a project goes out — the mint flow's Choose, made before the flow opens. */
export type PublishIntent = "save" | "give" | "sell";

/** `/projects/<id>/earn/mint` — the mint flow (the Brief, Build and Earn P1-2). A static
 *  segment, so it wins over `earn/[section]`. With `intent` (owner, 2026-10-12: Publish, Sell,
 *  Start mint) the flow opens on Details with that choice made, never asking it again. */
export function earnMintHref(projectId: string, intent?: PublishIntent): string {
  return `/projects/${encodeURIComponent(projectId)}/earn/mint${intent ? `?intent=${intent}` : ""}`;
}

/** The intent a mint link carries, when it is one. */
export function publishIntentOf(raw: string | null): PublishIntent | null {
  return raw === "save" || raw === "give" || raw === "sell" ? raw : null;
}

/** What Publish offers a project in `status` (owner, 2026-10-12); null when it is out already:
 *  a Draft keeps it private, gives it or sells it; a Private one gives it (only when its mint came
 *  through the flow, which can carry it on) or sells it. */
export function publishOptionsOf(status: string, mintedInFlow: boolean): PublishIntent[] | null {
  if (status === "draft") return ["save", "give", "sell"];
  if (status === "private") return mintedInFlow ? ["give", "sell"] : ["sell"];
  return null;
}

/** Where a Publish pick goes: the mint flow on Details, or — a Private project's Sell — Earn ›
 *  Sell's listing flow, the way a minted project is listed. */
export function publishHrefOf(projectId: string, status: string, intent: PublishIntent): string {
  if (status === "private" && intent === "sell") return earnHref(projectId, "sell", { list: "1" });
  return earnMintHref(projectId, intent);
}

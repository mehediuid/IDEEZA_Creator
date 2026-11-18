// The project's Earn side on the phone (mobile Figma "Project Details · 2026
// update" rows 11–19): where each Earn screen, the buyer's view, the previews
// and a product's video and AR screens live under /m. The web's Earn logic,
// words and rules stay theirs (earn-route, earn-view, commerce, market); this
// spells only the phone's addresses and small choices.
//
// Pure. Value imports are relative, so node:test loads the compiled module.

import { EARN_SECTIONS, EARN_SECTION_LABEL, type EarnSection, type PublishIntent } from "./earn-route";

const enc = encodeURIComponent;

/** Earn's tabs on the phone, in the web's order: Overview · Sell · Business plan · Money. */
export const PHONE_EARN_TABS: readonly { id: EarnSection; label: string }[] = EARN_SECTIONS.map((id) => ({ id, label: EARN_SECTION_LABEL[id] }));

/** `/m/projects/<id>/earn` for the Overview, `/m/projects/<id>/earn/<section>` for the others. */
export function phoneEarnHref(projectId: string, section: EarnSection = "overview", query?: Record<string, string>): string {
  const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
  return `/m/projects/${enc(projectId)}/earn${section === "overview" ? "" : `/${section}`}${qs}`;
}

/** The address's section segment, when it is one of the phone's tabs (the Overview has none). */
export function parsePhoneEarnSection(segment: string | null | undefined): Exclude<EarnSection, "overview"> | null {
  return segment === "sell" || segment === "plan" || segment === "money" ? segment : null;
}

/** The mint flow on the phone. `private` is read as `save`, the web's Keep private. */
export function phoneMintHref(projectId: string, intent?: PublishIntent): string {
  return `/m/projects/${enc(projectId)}/earn/mint${intent ? `?intent=${intent}` : ""}`;
}

/** `?intent=` as the phone's mint reads it: the web's three, and `private` for Keep private. */
export function phoneMintIntentOf(raw: string | null | undefined): PublishIntent | null {
  if (raw === "private") return "save";
  return raw === "save" || raw === "give" || raw === "sell" ? raw : null;
}

/** The project on Explore marketplace, as a demo buyer shops it (Figma 18b–18l). */
export function phoneMarketHref(projectId: string): string {
  return `/m/projects/${enc(projectId)}/market`;
}

/** The owner's preview of the project page: as others see it (18) or as one contributor (19). */
export function phonePreviewHref(projectId: string, as: "buyer" | { contributor: string }): string {
  const q = as === "buyer" ? "view=buyer" : `view=contributor&as=${enc(as.contributor)}`;
  return `/m/projects/${enc(projectId)}/preview?${q}`;
}

/** A product's Generate video screen (11) and its AR camera (11c). */
export function phoneProductVideoHref(projectId: string, productId: string): string {
  return `/m/projects/${enc(projectId)}/products/${enc(productId)}/video`;
}

export function phoneProductArHref(projectId: string, productId: string): string {
  return `/m/projects/${enc(projectId)}/products/${enc(productId)}/ar`;
}

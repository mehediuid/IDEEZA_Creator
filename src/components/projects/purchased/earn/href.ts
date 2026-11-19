// Earn's addresses for a project the active demo creator bought copies of (purchased-earn.tsx).

export type PurchasedEarnSection = "overview" | "sell";

/** `/projects/purchased/<id>/earn[/sell][#copy-<key>]`: a copy's key opens that copy on Sell. */
export const purchasedEarnHref = (id: string, section: PurchasedEarnSection = "overview", copyKey?: string) =>
  `/projects/purchased/${encodeURIComponent(id)}/earn${section === "sell" ? "/sell" : ""}${copyKey ? `#copy-${encodeURIComponent(copyKey)}` : ""}`;

"use client";

// What every screen of the phone's product page reads: the web's one
// derivation (`useProjectPageData`, the product page's own read), and the
// product at the version on screen (`productVersionView`), placed for a phone.
// Who is looking decides the page (owner decisions on the Product Details
// rows 6 and 12):
// - "owner": the maker's own page (10–10g, 10n–10s);
// - "contributor": the web's contributor preview (`?view=contributor&as=`,
//   31b) — no editing, the activity in the header;
// - "preview": the owner's Preview as others see it (`?view=buyer`, 31a) —
//   the buyer's page with the buy bar switched off;
// - "market": Explore marketplace's demo buyer (`?view=market`, the web's
//   `/marketplace/[id]/products/[productId]`, 10h, 10x–10z, 23a–23d).
// The build behind the version on screen stays read-only (the build-lock
// rule); a phone never edits a design (D3).

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { checkBuild, type ProductConfidence } from "@/lib/create/confidence";
import { partChangesOf, partChangesText } from "@/lib/create/build-artifacts";
import { productsOf, useCreateHistory, type BuildJob, type BuildProduct } from "@/lib/create/history";
import { useProjectPageData, type ProjectPageData } from "@/components/projects/details/use-project-page-data";
import { can } from "@/lib/manual/permissions";
import { productPiecesOf, productVersionView, type ProductVersionView } from "@/lib/manual/product-page";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { canCtxOf, conceptOf, type ProjectProduct } from "@/lib/manual/project-read";
import { holdingOf } from "@/lib/market/sales";
import type { Sale } from "@/lib/market/types";
import { keptQuery, MARKET_VIEW, phoneProductPath } from "@/lib/manual/phone-product";
import type { DemoBuyerId } from "@/lib/wallet/types";

export type Ready = Extract<ProjectPageData, { state: "ready" }>;
export type ProductMode = "owner" | "contributor" | "preview" | "market";

export type ProductCtx = Ready & {
  product: ProjectProduct;
  /** The product's name as every surface says it. */
  name: string;
  mode: ProductMode;
  /** The buyer's side: Media first, the Marketplace block, the buy bar (market and preview). */
  buyer: boolean;
  /** The marketplace's active demo buyer; null otherwise. */
  buyerId: DemoBuyerId | null;
  /** The version on screen; null for a product no build stands behind. */
  version: ProductVersionView | null;
  job: BuildJob | null;
  /** This product inside the build of the version on screen. */
  bp: BuildProduct | null;
  pieces: { ready: number; total: number; leftOut: number } | null;
  confidence: ProductConfidence | null;
  /** The owner's "Built with your part changes: …" (PPL-7). */
  partChanges: string | null;
  /** The chat this version was built in, while this browser has it (the owner's). */
  chat: { id: string; title: string } | null;
  /** can(viewer, "product.openEditor"): the owner's build and edit controls; false in every preview
   *  and once the project is sold in full. */
  canEdit: boolean;
  /** The firmware and the files (O12, R5-20): the owner, a contributor, a holder of a copy. */
  downloads: boolean;
  /** This demo buyer's copies of this product (market). */
  copies: Sale[];
  /** The query every link inside the product keeps ("?view=market"). */
  query: string;
  /** The product page or a screen under it, the query kept. */
  path: (rest?: string, patch?: Record<string, string | null>) => string;
};

export type ProductData =
  | { state: "loading" }
  | { state: "missing"; market: boolean }
  /** The project is here, but none of its products has this id (10v). */
  | { state: "no-product"; projectId: string; projectName: string }
  | { state: "ready"; ctx: ProductCtx };

function modeOf(market: boolean, viewer: Ready["viewer"]): ProductMode {
  if (market) return "market";
  if (viewer.kind === "owner-preview") return "preview";
  if (viewer.kind === "contributor-preview") return "contributor";
  return "owner";
}

export function useProductData(id: string, productId: string): ProductData {
  const search = useSearchParams();
  const market = search.get("view") === MARKET_VIEW;
  const data = useProjectPageData(id, market ? "market" : "project");
  const { chats } = useCreateHistory();
  const searchText = search.toString();

  const ready = data.state === "ready" ? data : null;
  const product = ready?.view.products.find((p) => p.id === productId) ?? null;
  const viewer = ready?.viewer ?? null;
  const ownerFacts = viewer ? can(viewer, "facts.seeOwnerOnly") : false;
  // Older versions are the owner's history (PPL-7): anyone else sees the version on offer.
  const asked = ownerFacts ? search.get("v") : null;
  const version = React.useMemo(
    () => (product && ready ? productVersionView(product, ready.view.versions, asked) : null),
    [product, ready, asked],
  );
  const job = version?.build.job ?? null;
  const shownId = version?.productId ?? null;
  const bp = React.useMemo(() => (job && shownId ? (productsOf(job).find((x) => x.id === shownId) ?? null) : null), [job, shownId]);
  const confidence = React.useMemo(
    () => (job && bp ? (checkBuild(job, productsOf(job)).byProduct.find((c) => c.productId === bp.id) ?? null) : null),
    [job, bp],
  );
  const partChanges = React.useMemo(() => {
    if (!job || !bp || !ownerFacts) return null;
    const concept = conceptOf(chats.find((c) => c.id === job.chatId), job, bp);
    const changes = concept ? partChangesOf(bp, concept) : null;
    return changes ? partChangesText(changes) : null;
  }, [job, bp, chats, ownerFacts]);

  if (data.state === "loading") return { state: "loading" };
  if (data.state === "missing" || !ready || !viewer) return { state: "missing", market };
  if (!product) return { state: "no-product", projectId: ready.project.id, projectName: ready.project.name };

  const { project, view } = ready;
  const mode = modeOf(market, viewer);
  const buyerId = viewer.kind === "demo-buyer" ? viewer.buyerId : null;
  const chatRow = ownerFacts && job ? (chats.find((c) => c.id === job.chatId) ?? null) : null;
  const query = keptQuery(searchText);
  const copies = buyerId ? (holdingOf(project.id, buyerId, view.sales, { productId: product.id })?.editions ?? []) : [];
  const ctx: ProductCtx = {
    ...ready,
    product,
    name: displayProductName(product.name),
    mode,
    buyer: mode === "market" || mode === "preview",
    buyerId,
    version,
    job,
    bp,
    pieces: bp ? productPiecesOf(bp.items) : null,
    confidence,
    partChanges,
    chat: chatRow ? { id: chatRow.id, title: chatRow.title.trim() || "Untitled chat" } : null,
    canEdit: can(viewer, "product.openEditor", view.canCtx),
    downloads: can(viewer, "deliverables.download", canCtxOf(view, viewer, { productId: product.id })),
    copies,
    query,
    path: (rest = "", patch = {}) => `${phoneProductPath(project.id, product.id, rest)}${keptQuery(searchText, patch)}`,
  };
  return { state: "ready", ctx };
}

const Ctx = React.createContext<ProductCtx | null>(null);
export const ProductProvider = Ctx.Provider;

export function useProduct(): ProductCtx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useProduct outside the product page");
  return v;
}

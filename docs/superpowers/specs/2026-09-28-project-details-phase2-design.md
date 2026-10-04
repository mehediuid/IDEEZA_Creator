# Project details, Phase 2: consolidated design

**Date** 2026-09-28 · **Branch** `feat/project-details` · **Status** consolidated from all ten area specs.

This spec merges the area specs in `.superpowers/pd2/spec/`:
- `save.md`, `editor.md`, `video.md`, `mint.md`, `listing.md`, `marketplace.md`, `contributors.md`, `customers.md`, `tabs.md`;
- `buildload.md` (the editor loads the build's own deliverables).

It supersedes the parts of the v1 spec (`2026-09-26-project-details-and-my-projects-design.md`) that it names.

**How to read it.**
- The area files remain the detail source for every requirement: its copy, states and acceptance checks.
- This file holds four things:
  1. the owner decisions (§1);
  2. the final IA (§2);
  3. the **one shared data contract** (§3), which wins over any area file's type sketch;
  4. the status of every `P2-*` requirement (§4), with full text for anything changed while resolving conflicts (§5).
- Where this file and an area file disagree, this file wins.

---

## 1. Owner decisions

### 1.1 v1 decisions (2026-09-26), as they stand now

| # | Decision | P2 status |
|---|---|---|
| O1 | Both pages: My projects and Project details, one shared derivation (LST-32). | Kept |
| O2 | A rebuild of the same chat becomes the same project, version *n*. | Kept. Save's version mode enforces it (P2-SAVE-6). |
| O3 | Real now, no fake data. | Kept. The demo wallet, demo buyers and the browser-made clip are real local data, each labelled "Testnet demo" or with the honesty line. |
| O4 | Editor progress comes from the editor documents. | Kept, now per product (P2-EDITOR-8). |
| O5 | Showcase is an action and a flag (`showcasedAt`), not a Brief intent. | Kept. Showcase is now gated by the readiness rules (decision 6). |
| O6 | "Listed" is the word for a minted sale. | Kept. **Amended:** the subline "Goes on sale when the marketplace opens" is retired, because a marketplace exists now (P2-LISTING-23). |
| O7 | Network is its own tab. | Kept |
| O8 | Each product has its own page. | Kept; the page grows tabs and a rail (§2.3). |
| O9 | A dropped product stays in the list, and version history is kept. | Kept |
| O10 | No delete while Listed or Sold, or while another owner holds a share. | Kept. The full rule set is in §3.8.4. |
| O11 | "New project" is a header button that goes to Home. | Kept |
| O12 | The buyer view shows previews only; firmware and downloads come after purchase. | Kept. **Amended:** a holder (a demo buyer with a share) now gets firmware and downloads (P2-MARKETPLACE-21), and the preview shows the listing's real price (P2-MARKETPLACE-10). |
| — | **Build-lock rule:** a built product's spec is read-only; it changes only through the editor. | Kept |
| — | D10 (no kebab), D12 (one network per project), H-1…H-7 (history's must-not-undo list). | Kept |

### 1.2 Phase 2 decisions (2026-09-28), binding

| # | Decision |
|---|---|
| 1 | **Wallet:** a DEMO wallet, now. The full flow (connect, address, balance, charge estimate, confirm) runs locally and is labelled "Testnet demo". Nothing touches a chain. |
| 2 | **Contributors:** the owner adds them (name, role, ownership %). |
| 3 | **Customers** come from marketplace sales, with an empty state until the first sale. |
| 4 | **Marketplace:** the Figma "Add To Main NFT Marketplace" form. Submitting it lists the project on a real **Explore marketplace** page, where a buyer view and a demo purchase create Customers. |
| 5 | **Save:** a name/details step comes before Save on the build review. |
| 6 | **Showcase** needs a video for EVERY product. Its rules are the same as Sell and Give. |
| 7 | **Open in editor** moves to the product. The editor opens a product. |
| 8 | **The Figma's missing tabs come back:** Contributors, Customers and the others. |
| 9 | **Video:** a browser-made clip, now: a real file rendered locally from the product's image and its text, and labelled that the AI video model isn't connected yet. |
| 10 | **Editor:** it loads the build's OWN deliverables (sub-project B is in scope, area BUILDLOAD). |
| 11 | **Fee:** IDEEZA takes a fee on every sale: **2.5 %** by default, held in ONE constant (`IDEEZA_FEE_BPS`, §3.5.2). The owner is told it can be changed. |
| 12 | **After a 100 % sale the project LOCKS.** Name, description, products and listing become read-only, and delete stays blocked (§3.8.5). |

---

## 2. Final IA

### 2.1 Routes

| Route | What it is | New in P2 |
|---|---|---|
| `/projects` | My projects | Sold tab (§2.5) |
| `/projects/[id]` | Project page (owner, `?view=buyer`, `?view=contributor&as=<id>`) | tabs, rail block, header states |
| `/projects/[id]/products/[productId]` | Product page | tabs, rail, Open in editor |
| `/projects/[id]/business-plan` | Business plan page (owner) | ✓ (P2-TABS-17) |
| `/project/<slug>/products/<productId>/<step>` | The product-scoped editor: pcb · code · 3d · assembly · wiring · preview | ✓ (P2-EDITOR-1) |
| `/project/<slug>/<step>`, `/pcb`, `/code`, `/3d`, `/preview`, `/wiring` | Legacy editor addresses. Each redirects to the resumed product. | changed (P2-EDITOR-2) |
| `/project/<slug>/brief` | The Brief (project-level) | kept |
| `/marketplace` | Explore marketplace: For sale · Sold · Purchased | ✓ |
| `/marketplace/[id]`, `/marketplace/[id]/products/[productId]` | The buyer view (viewer `demo-buyer`) | ✓ |
| `/build/<id>/brief` on an unsaved build | Redirects to the review with `?save=1` | ✓ (P2-SAVE-13) |
| `/?addTo=<projectId>` | Home with "Adding to {project}": the new build joins that project | ✓ (P2-TABS-29, SAVE owns) |

### 2.2 Project page (`/projects/[id]`)

**Header.** Reading order:
1. The title row: the h1 and its rename pencil, the Activity chip, "?", then the Business plan chip, right-aligned.
2. The status row: the status chip, the Showcase badge, the "Utility NFT" pill and, in a contributor preview, the role chip.
3. The status line, then the lock line when the project is locked.
4. The meta line: [Created by you · Owned by X] · … · Stage {short}.
5. The description and its coachmark.
6. The action pair, then Preview as buyer (quiet, last).

**The action pair, per state (owner).** `nextAction()` v2 (§3.6.3). ★ marks the page's one violet.

| State | Pair `first` | `second` | Rail Marketplace block | The page's ★ | My projects card button |
|---|---|---|---|---|---|
| Draft, a newer version ready | ★ Review version *n* | — | absent | header | Review version *n* |
| Draft, Brief started | ★ Continue Brief | — | absent | header | Continue Brief |
| Draft, no Brief (a build **or by hand**) | ★ Add Brief | — | absent | header | Add Brief |
| Private: never listed, removed, or an auction closed with no bids | ★ **Add to marketplace** (opens the listing flow in place) | View brief | `none` / `ended` facts, no button | header | Add to marketplace → `/projects/<id>?list=1` |
| Private, and the maker holds 0 % (co-owners hold everything) | Add to marketplace, `aria-disabled`: "You hold no share of this project to sell." | View brief | facts | none | none |
| Given | View brief (quiet) | — | absent | none | none |
| Listed · Buy now | View brief (quiet) | — | live card: Edit · Remove · View on marketplace ↗ | none | none |
| Listed · Auction running | View brief (quiet) | — | auction card: Bidding History · Close (`aria-disabled`) | none | none |
| Listed · Auction ended, not yet closed | View brief (quiet) | — | ★ **Close auction** · Bidding History | rail | none |
| Paused | View brief (quiet) | — | ★ **Relist** · Edit · Remove listing | rail | none |
| Sold, and the maker still holds a share | List another share (quiet, kind `add-to-marketplace`) | View brief | Sold card | none | none |
| Sold in full (locked) | View brief (quiet) | — | Sold card | none | none |
| Minted, record unreadable | — | — | absent | none | none |

**The tabs.** In this order, and stable in every state. Only the viewer changes which appear.

| Tab | Owner | Buyer preview / demo buyer | Contributor preview |
|---|---|---|---|
| Products (default) | ● | ● | ● |
| Media | ● | ● (ready videos and images only) | ● |
| Network | ● | ● only when a network exists | ● |
| Contributors | ● roster | ● team credit, only with ≥ 1 contributor | ● roster, read-only |
| Customers | ● | — | — |

**The rail, in order** (`RAIL_ORDER`):
- `marketplace` · `outcome` · `details` · `legal` · `versions` · `log` · `manage`. The v1 `editor` block moves to the product page.
- **Previews:**
  - `marketplace` is the read-only buyer rail, and absent if the project was never listed;
  - `details` and `log` show their preview lines;
  - `legal` shows only when it is filled.
- **Below a 1024 px page container:** the header comes first, then the **Marketplace block** (when present, open), then the tab strip and panel, then the rest of the rail (collapsible, closed at 400 px). This keeps Close auction and Relist above the fold on a phone (C21).

### 2.3 Product page (`/projects/[id]/products/[productId]`)

**Header.** In reading order:
- the breadcrumb "My projects › {project} › {product}";
- the h1 and the Activity chip (scoped to this product);
- the build check and the version select;
- ★ **Open in editor** (or "Open in editor · {Step}"). It is always the page's violet (C16).
- There is no sample-board hint: it is deleted (P2-BUILDLOAD-14).
- When the project is locked, the button is absent and the lock line shows.

**Tabs.** **Media** (the default) · 3D model · PCB · Firmware code · Wiring · Parts ┆ **Contributors** · **Customers**.
- The ┆ is an `aria-hidden` hairline, never a tab stop.
- A build piece the build never made has no tab (H-5).
- A hand-made, build-gone or unmatched product has **Media · Contributors · Customers** only.

| Viewer | Tabs |
|---|---|
| Owner | all |
| Buyer preview | Media · 3D · PCB · Wiring · Parts · [Contributors credit, with ≥ 1 contributor]. No Firmware (O12). |
| Demo buyer, not holding | as buyer preview |
| Demo buyer, holding | + Firmware code, and downloads |
| Contributor preview | all, except Customers |

**The Media panel** is VIDEO's `ProductVideoSection` (the player, Regenerate, Takes), followed by the product's images (C17).
**The Contributors panel** is a read-only credit (P2-TABS-4).
**The Customers panel** shows this product's edition sales (P2-CUSTOMERS-10).

**The rail, in order.**
1. **Marketplace**: Physical NFT · Virtual NFT editions (P2-TABS-24…27). Buttons in it are quiet.
2. **Editor**: six rows linking into `editorHref` (P2-EDITOR-11), then the seed caption: "Opens with version {n}'s …" / "Loaded from version {n}." (P2-BUILDLOAD-13). It holds the only **Load version {m}…** and **Restore version {b}** buttons (P2-BUILDLOAD-9, 10).

In a preview, the Marketplace block shows only listed tracks and is otherwise absent, and the Editor block is absent.

### 2.4 Explore marketplace

`/marketplace` (P2-MARKETPLACE-2…7):
- the "Testnet demo · shopping as {buyer}" banner, with the **Shopping as** switch (Mira · Leo · Sam);
- tabs **For sale · Sold · Purchased**;
- search, Type and Sort;
- cards laid out like the My projects card.

`/marketplace/[id]` reuses `ProjectShell` with `MARKET_SLOTS`:
- breadcrumb "Explore marketplace › {project}";
- a read-only header with "Created by you · Listed {date}";
- tabs as a buyer sees them (§2.2);
- the rail's `marketplace` block is the buyer rail: Buy now card, Auction bid card, Purchased Summary with Get creator support for a holder, and edition offers (W3);
- then `details`, `legal` and `log` (public lines only).

A project that was never listed shows "This project isn't on the marketplace".

### 2.5 My projects tabs

**All · Draft · Private · Given · Listed · Sold │ Showcase.**
- **Listed** holds live and paused listings; the chip says which.
- **Sold** holds projects with a Main sale and no live listing.
- "Minted" (unreadable) appears under All only, as in v1.
- **The card's button** is the pair's violet step only (`ActionPair.card`). A card never shows "View …".

### 2.6 Brief step order

| Intent | Steps | Commit CTA (lazy / instant) |
|---|---|---|
| Sell | idea → preview → form → success | "Sign and list" / "Pay and list" |
| Give | idea → **preview** → form → success (changed, P2-VIDEO-17) | "Sign and give" / "Pay and give" |
| Save | idea → form → preview → success | "Sign and save" (always lazy, a free signature) |

Step 1 never asks for the project (P2-SAVE-12). A Sell commit writes the mint record and the listing (P2-LISTING-22).

### 2.7 One home per control

| Control | Its one home | Not also in |
|---|---|---|
| Add to marketplace / List another share | Project header pair (and the card, through `ActionPair.card`) | the rail block |
| Edit · Remove · Close auction · Relist · Bidding History · View on marketplace | Rail Marketplace block | the header, the card |
| Open in editor | Product page header | project page, product cards (C16) |
| Editor step rows | Product page rail Editor block | project page |
| Load version {m}… · Restore version {b} | Product page rail Editor block (P2-BUILDLOAD-9, 10) | the editor (it shows a notice only) |
| Wallet connect / disconnect / account / network (maker and buyers) | Demo wallet dialog, from the account menu | every page (pages show a fact line) |
| Shopping as (demo buyer identity) | Marketplace demo banner | — |
| Showcase / Stop showcasing | Rail Outcome block (+ the Brief success step, v1 O5) | header |
| Generate / Regenerate video | Readiness dialog rows, the Media tab tiles, the product Media panel, the failed toast (all open one dialog) | — |
| Add / edit / remove contributor, Preview as contributor | Project Contributors tab | product Contributors credit |
| Physical / Virtual NFT create, list, edit | Product page rail Marketplace block | project page (read-only summary) |
| Legal details | Rail Legal block | the Brief |
| Business plan | Header chip → `/projects/[id]/business-plan` | rail |
| Payout wallet change | Outcome block, Payout wallet row | — |
| Delete project | Rail Manage block | — |

---

## 3. Shared data contract

Every item has **one owning file and one owning task** (task ids are in `.superpowers/pd2/tasks.md`). Pure modules use relative imports so node:test can load them (`tests/projects/tsconfig.json` includes `src/lib/{manual,brief,wallet,market,video}/**`, T01).

### 3.1 Conventions

- **Money** is `bigint` micros (1 unit = 1,000,000n) for every coin, IDZ included. It is stored in JSON as a decimal string of **units** (for example `"0.05"`), exactly as typed and normalized, and parsed with `toMicros`. There is no float arithmetic anywhere: `0.05 + 0.021` never drifts (T01, `money.ts`).
- **Every demo money surface** carries `TestnetDemoBadge`: the neutral "Testnet demo" pill, which uses `warning` only if its contrast is ≥ 4.5 : 1 in both themes.
- **Nothing links to an explorer**, and no hash is a link.
- **Ids.** `prd_`, `ctb_`, `lst_`, `sale_`, `bid_`, `sup_`, `take_`, `ed_`, `ben_` + 8 base-36. Ids never contain `:`.
- **Dates** use the page's `formatDate` / `formatDateTime`. Status text never relies on colour alone.
- **Deletion.** `deleteProject` dispatches `window` event `ideeza:project-deleted` (`{ id }`). Each IndexedDB or market store purges its own records on that event (§3.4). localStorage keys are swept by `projectStorageKeys(id, rowIds)`.

### 3.2 The status model (one precedence, one set)

```ts
// src/lib/manual/project-summary.ts (types T01; logic T10)
export type ProjectStatus = "draft" | "private" | "given" | "listed" | "paused" | "sold" | "minted";
// STATUS_WORD: Draft · Private · Given · Listed · Paused · Sold · Minted
// STATUS_ICON: circle · lock · hand-heart · tag · pause · badge-check · hexagon   (IconName += "pause" | "badge-check")
```

`projectStatus(p, draft, { listing, sales })` checks these in order, and the first match wins:

| # | Rule | Status |
|---|---|---|
| 1 | The latest Main listing is `live` (Buy now, auction running, or auction ended and not yet closed) | `listed` |
| 2 | The latest Main listing is `paused` | `paused` |
| 3 | Any Main `Sale` exists for the project | `sold` |
| 4 | The project is minted (`p.mint`, or the draft's `mintedAt`) with intent give | `given` |
| 5 | The project is minted, with intent sell or save, or with only removed or closed listings | `private` |
| 6 | `p.status === "completed"` and no readable mint | `minted` (unreadable, v1) |
| 7 | otherwise | `draft` |

**Chip words.**
- "Listed" is the chip for any live listing, Buy now or auction. The status line says which.
- The buyer header also reads "Listed", so MARKETPLACE's "Auction" chip is dropped.
- A Sold project that is relisted reads "Listed" again.

**The status line** (`statusLineOf`, T10). Its first segment is the mint phrase (`mintPhrase`, T02): "Lazy minted Sep 28", "Minted on chain Sep 28" or "Minted Sep 28".

| Status | Line |
|---|---|
| draft | v1 |
| private | "{mint} · kept private" (v1). Removed: "{mint} · removed from the marketplace {d2}". Closed: "{mint} · auction ended with no bids". |
| given | v1 tail |
| listed, Buy now | "Listed {d} · Buy now · 0.05 MATIC" |
| listed, auction | "Auction · top bid 0.04 MATIC · 2h 14m left" / "Auction · no bids yet · 2h 14m left" / "Auction ended · close it to settle" |
| paused | "Paused {d} · relist it from the Marketplace block" |
| sold | one sale: "Sold 10% to Mira (demo buyer) · Sep 28, 2026". 100 %: "Sold to Mira (demo buyer) · Sep 28, 2026". Several: "Sold 30% in 3 sales · last Sep 28". The buyer name links to `?tab=customers&sale=<id>` in the owner's header only. A visitor reads "Sold · Sep 28, 2026". |

**The mint axis** (separate from `ProjectStatus`, T02):

```ts
export type MintStatus = "notMinted" | "lazyMinted" | "onChain" | "legacy";
// mintViewOf(p, draft, sales): MintView — onChain if record.onChain OR (record && any Main sale):
// settlement at the first sale is DERIVED from the sale, never written (C12).
```

**The listing axis.** `ListingView` (§3.3.2) is derived from listings, sales and bids by `listingViewOf` (T03).

**The lock.** `lockOf(ownership, sales)` (T08) returns a `ProjectLock` when at least one Main sale exists **and** the maker's share is 0. This is decision 12; see §3.8.5.

### 3.3 Types, by owning file

#### 3.3.1 `src/lib/wallet/types.ts` (new, T01)

```ts
import type { Network, Token } from "../brief/types";
export type AccountIndex = 1 | 2 | 3;
export type MakerId = `maker-${AccountIndex}`;
export type DemoBuyerId = "buyer-mira" | "buyer-leo" | "buyer-sam";
export type IdentityId = MakerId | DemoBuyerId;
export type Coin = Token | "IDZ";
export type Amount = string;                                  // decimal units, ≤ 6 dp, e.g. "0.00104"
export type ChargeLine = { coin: Coin; amount: Amount };
export type Charge = { network: Network; lines: ChargeLine[] };
export type WalletActivity = {
  id: string; at: number; identity: IdentityId; network: Network;
  kind: "signature" | "transaction"; title: string;           // "Minted on chain · Car"
  projectId?: string; txHash?: string; signature?: string; charge?: Charge;
};
export type DemoWallet = {
  v: 2;
  account: AccountIndex;                                      // the maker's chosen account
  identities: Record<IdentityId, { connected: boolean; network: Network }>;
  activity: WalletActivity[];                                 // newest first; NEVER pruned (balances read it)
};
export type MintType = "lazy" | "instant";
export type MintStatus = "notMinted" | "lazyMinted" | "onChain" | "legacy";
export type MintRecord = {
  v: 1; demo: true; type: MintType; network: Network; collection: string; tokenId: number;
  wallet: { account: AccountIndex; address: string };        // payout wallet
  at: number; signedAt?: number; signature?: string;
  onChain?: { at: number; txHash: string; via: "instant" | "upgrade"; charge?: Charge };
  walletChanges?: { at: number; from: string; to: string }[];
};
export type MintView = {
  status: MintStatus; record: MintRecord | null; tokenId: number | null;
  settled: { at: number; txHash: string; via: "sale" } | null; // derived from the first Main sale
};
export type SummaryRow = { label: string; value: string };
export type RequestPurpose =
  | "lazyMint" | "instantMint" | "upgradeMint" | "list" | "editListing" | "removeListing" | "relist"
  | "changePayout" | "purchase" | "bid" | "createEditions" | "listEdition";
export type WalletRequest = {
  kind: "signature" | "transaction"; purpose: RequestPurpose;
  identity: "maker" | DemoBuyerId;                            // "maker" = the maker's current account
  network: Network; title: string; summary: SummaryRow[]; note: string; doneLine: string;
  charge?: Charge;                                            // transaction only
  account?: AccountIndex;                                     // a required signer (changePayout)
};
export type RequestPhase = "connect" | "connecting" | "wrongNetwork" | "switching" | "review"
  | "signing" | "pending" | "confirmed" | "rejected" | "failed";
export type FailReason = "walletDisconnected" | "networkChanged" | "accountChanged"
  | "insufficientFunds" | "storageFailed" | "recheck";
export type Proof = { identity: IdentityId; address: string; at: number; signature?: string; txHash?: string };
export type RequestOptions = {
  recheck?: () => string | null;                  // run just before confirming; a string fails with that copy
  commit?: (proof: Proof) => { ok: true } | { ok: false; message: string }; // the caller's writes, in order
  onUseLazy?: () => void;
};
export type RequestResult = { ok: true; proof: Proof } | { ok: false; reason: "rejected" | FailReason; message?: string };
```

#### 3.3.2 `src/lib/market/types.ts` (new, T01)

```ts
import type { Network, Token } from "../brief/types";
import type { ProductSource } from "../manual/projects";
import type { Amount, Coin, DemoBuyerId, MintType } from "../wallet/types";
export const LISTINGS_KEY = "ideeza:market:listings";  export const SALES_KEY = "ideeza:market:sales";
export const BIDS_KEY = "ideeza:market:bids";          export const SUPPORT_KEY = "ideeza:market:support";
export const ACTIVE_BUYER_KEY = "ideeza:market:buyer";
export const EDITIONS_KEY = (projectId: string) => `ideeza:project:editions:${projectId}`;

export type UtilityBenefit = { id: string; name: string; duration: { months: 1 | 3 | 6 | 12 } | { whileHeld: true } };
export type ListingChange = "rename" | "description" | "cover" | "addProduct" | "editProduct" | "dropProduct";
export type ListingMetadata = { name: string; description: string; products: { id: string; name: string }[];
  cover: ProductSource | null; at: number };
export type ListingEvent = { kind: "listed" | "relisted" | "removed" | "closed"; at: number }
  | { kind: "updated"; at: number; price?: string } | { kind: "paused"; at: number; changes: ListingChange[] };
export type Listing = {
  id: string; projectId: string; slot: "main"; source: "page" | "brief";
  listedAt: number; updatedAt: number; type: "buyNow" | "auction"; token: Token;
  price?: Amount; minBid?: Amount; auctionBuyNow?: Amount; endsAt?: number;
  percentSelling: number; royaltiesPct: number; mintingType: MintType;
  network: Network; collection: string; benefits: UtilityBenefit[]; metadata: ListingMetadata;
  status: "live" | "paused" | "removed" | "closed";           // stored; a Sale naming it reads "sold"
  pause?: { at: number; changes: ListingChange[] }; endedAt?: number; events: ListingEvent[];
};
export type AuctionPhase = "running" | "endingSoon" | "ended";
export type AuctionState = { phase: AuctionPhase; top: Bid | null; minNext: Amount; msLeft: number };
export type ListingView =
  | { kind: "none" }
  | { kind: "live"; listing: Listing; auction: AuctionState | null }  // no onMarket (C5)
  | { kind: "paused"; listing: Listing; changed: string[] }
  | { kind: "ended"; listing: Listing; why: "removed" | "noBids" }
  | { kind: "sold"; listing: Listing; sale: Sale };
export type EditionKind = "physical" | "virtual";  export type EditionUse = "private" | "commercial";
export type EditionTrack = {                                   // TABS P2-TABS-24…27
  id: string; projectId: string; productId: string; kind: EditionKind; use: EditionUse;
  supply: { total: number; lastAdded?: { n: number; at: number } }; createdAt: number; lazy: true;
  listing: null | { token: Token; regular: Amount; extended: Amount; royaltyPct: number; listedAt: number; updatedAt: number };
  demo: true;
};
export type SaleItem =
  | { nft: "main"; sharePct: number }
  | { nft: EditionKind; trackId: string; productId: string; productName: string; use: EditionUse;
      tier: "regular" | "extended"; serial: number };
export type Sale = {                                           // ONE record per purchase (C11)
  id: string; listingId: string;                              // Main: Listing.id; edition: EditionTrack.id
  projectId: string; at: number; buyerId: DemoBuyerId; buyerAddress: string; sellerAddress: string;
  item: SaleItem; via: "buyNow" | "auctionBuyNow" | "auctionWin"; token: Token; price: Amount;
  fees: { ideezaBps: number; ideeza: Amount; network: { coin: Coin; amount: Amount } };
  payout: Amount;                                             // price − fees.ideeza, to sellerAddress
  royaltiesPct: number; mint: MintType; mintedAtSale: boolean; tokenId: number | null;
  network: Network; collection: string; benefits: UtilityBenefit[]; txHash: string; demo: true;
};
export type Bid = { id: string; listingId: string; bidderId: DemoBuyerId; amount: Amount; token: Token; at: number };
export type SupportRequest = { id: string; saleId: string; projectId: string; buyerId: DemoBuyerId; message: string; at: number };
export type MarketData = { listings: Listing[]; sales: Sale[]; bids: Bid[]; support: SupportRequest[];
  unreadable: boolean };                                      // any market key present but unparsable
```

#### 3.3.3 `src/lib/video/types.ts` (new, T01)

These are VIDEO §3 exactly:
- `VideoQuality`, `VIDEO_QUALITY`, `OnScreenLines`, `VideoFailureKind`, `TAKES_MAX`;
- `VideoTake`, `ProductVideo`, `ProjectVideos` (key `ideeza:video:<projectId>`), `ProductVideoStatus`.

`VideoJob` (`src/lib/video/jobs.ts`, T06) gains:
- `projectId`, `productId` and `render` (each `null` on a legacy job);
- `acknowledged?: boolean`.

#### 3.3.4 `src/lib/manual/p2-types.ts` (new, T01)

```ts
export type ContributorRole = "viewer" | "editor" | "coOwner";
export type Contributor = { id: string; name: string; role: ContributorRole; share: number; addedAt: number; updatedAt?: number };
export type Holder = { kind: "maker" } | { kind: "coOwner"; id: string; name: string } | { kind: "buyer"; saleId: string; buyerId: DemoBuyerId; name: string };
export type Holding = { holder: Holder; percent: number; since: number };
export type OwnershipSplit = { holdings: Holding[]; maker: number; reserved: number; sellable: number;
  total: number; overAllocated: boolean; split: boolean; majority: Holding | null };
export type OtherOwner = { kind: "coOwner"; name: string; percent: number };   // buyers are covered by the "sold" rule
export type EditorStep = Exclude<ProjectStep, "brief">;
export type EditorScope = { projectId: string; productId: string };        // productId = a row id, incl. virtual "p1"
export type EditorDoc = "pcb" | "wiring" | "assembly" | "three.ai" | "three.shapes" | "three.right"
  | "three.sketches" | "code.files" | "code.blockly" | "preview.canvas" | "preview.mates";
export type ReadinessPurpose = "showcase" | "sell" | "give" | "relist" | "edition";
export type ReadinessRuleId = "minted" | "videos" | "ownership" | "license";
export type ProductReadiness = { productId: string; name: string; thumb: string | null; video: ProductVideoStatus };
export type ReadinessRule = { id: ReadinessRuleId; ok: boolean; fixedIn: "gate" | "form" | "brief"; reason: string | null };
export type Readiness = { purpose: ReadinessPurpose; ok: boolean; rules: ReadinessRule[]; products: ProductReadiness[];
  counts: { total: number; ready: number; rendering: number; missing: number }; blocker: string | null; gateBlocker: string | null };
export type ProjectLock = { kind: "soldInFull"; at: number; buyers: string[]; line: string };
export type EditGate = { kind: "free" } | { kind: "confirm"; listingId: string }
  | { kind: "blocked"; reason: string } | { kind: "locked"; reason: string };
export type DeleteFacts = { marketUnreadable: boolean; sold: { sharePct: number; editions: number };
  auction: { endsAt: number } | null; listed: boolean; otherOwners: OtherOwner[] };
export type ProjectLegal = { patent?: string; copyright?: { text: string; url?: string };
  trademark?: { mark?: string; attorney?: string; url?: string }; updatedAt: number };
export type DescriptionHint = { dismissedAt: number; productCount: number };
```

#### 3.3.5 Changed existing types (T01)

- **`ManualProject`** (`projects.tsx`) gains:
  - `lastOpened?: { step; at; productId?: string }`;
  - `editorOpened?: Record<string, { step: EditorStep; at: number }>`;
  - `mint?: MintRecord`;
  - `contributors?: Contributor[]`;
  - `ownerConfirmedAt?: number`;
  - `legal?: ProjectLegal`;
  - `descriptionHint?: DescriptionHint`.

  `normalizeProjects` keeps each field through its own normalizer (T09).
- **`BriefState`** (`brief/types.ts`) gains:
  - `mintType: MintType` (default `"lazy"`);
  - `sellingPct: string` (default `"10"`);
  - `benefits: UtilityBenefit[]` (default `[]`).

  `stepsFor("give")` becomes idea → preview → form → success. `understandGas` stays parseable and is ignored.
- **`WalletCollection`** (`brief/wallet.ts`, T02) gains `minted?: number`.
- **`NextAction` / `ActionPair`** (`project-summary.ts`) take the shape in §3.6.3.
- **`ProjectLogEntry`** (`project-read.ts`) gains:
  - `lazyMinted`, `mintedOnChain` and `payoutChanged` (MINT);
  - `listing { event }` (LISTING);
  - `sold { sale }` and `support { request }` (MARKETPLACE);
  - `editions { at; productId; kind; use; n; event: "created" | "listed" }` and `businessPlan { at }` (TABS).
- **`MintStatus`** in `brief/project-brief.ts` becomes a re-export of `wallet/types`.
- **`OutcomeRow.key`** gains `mint | token | signature | tx | wallet`, and `minted` is retired (T10).

### 3.4 Store keys, stores and events

| Key / store | Shape | Normalizer (task) | Reader / writer hook (task) | Swept on delete |
|---|---|---|---|---|
| `ideeza:manual:projects` | `ManualProject[]` (+ §3.3.5) | `normalizeProjects` (T09) | `useManualProjects` (T09) | the record itself |
| `ideeza:wallet:demo` | `DemoWallet` v2 (a v1 or corrupt record → default) | `normalizeWallet` (T02) | `useDemoWallet` (T02) | never (a wallet's history outlives a project) |
| `ideeza:brief:wallet` | `WalletCollection[]` + `minted` counters | `brief/wallet.ts` (T02) | — | never |
| `ideeza:brief:draft:<id>` | `StoredDraft` (+ §3.3.5) | `normalizeBrief` (T01) | `useProjectBrief` (v1) | `projectStorageKeys` |
| `ideeza:market:listings` | `Listing[]` | `normalizeListings` (T03) | `useMarket` (T11) | `dropProjectListings` on the event |
| `ideeza:market:sales` / `:bids` / `:support` | `Sale[]` / `Bid[]` / `SupportRequest[]` | `normalizeSales` / `normalizeBids` / `normalizeSupport` (T04) | `useMarket` (T11) | never. A project with sales can't be deleted; bids and support are dropped on the event. |
| `ideeza:market:buyer` | `DemoBuyerId` (unknown → Mira) | `activeBuyerOf` (T02) | `useActiveBuyer` (T02) | never |
| `ideeza:video:<projectId>` | `ProjectVideos` | `sanitizeProjectVideos` (T06) | `useProjectVideos` (T11) | `projectStorageKeys` |
| IndexedDB `ideeza-video` / `clips` (index `projectId`) | clip + poster blobs | — | `clip-store.ts` (T14) | on the event (T14) |
| `ideeza:video:jobs` (v1) | `VideoJob[]` (+ fields) | `jobs.ts` (T06) | `VideoJobsProvider` (T14) | running jobs cancelled on the event (T14) |
| `ideeza:project:journey:<id>` | `ProjectJourney` | `normalizeJourney` (T08) | `useJourney` (T11) | `projectStorageKeys` |
| IndexedDB `ideeza-media` / `files` | activity attachments | — | `journey-store.ts` (T11) | on the event (T11) |
| `ideeza:project:bizplan:<id>` | `BusinessPlan` | `normalizePlan` (T08) | `useBusinessPlan` (T11) | `projectStorageKeys` |
| `ideeza:project:editions:<id>` | `EditionTrack[]` | `normalizeEditions` (T04) | `useEditions` (T11) | `projectStorageKeys` |
| Editor documents `<base>:<projectId>:<rowId>` | per `EditorDoc` (EDITOR §3.2) | the editors (T15) | the editors (T15); seeding, Load and Restore (TB1 / TB2) | `projectStorageKeys(id, rowIds)` sweeps the exact keys, plus the 4 legacy per-project keys |
| `<document key>:prev` | one backup slot per seeded document | — | `loadVersion` / `restoreBackup` (TB1) | `editorKeysOf` (T07) |
| `ideeza:editor:seed:<projectId>:<rowId>` | `EditorSeed` (BUILDLOAD §3.2) | `normalizeSeed` (TB1); a corrupt record reads as absent and is never rewritten | `ensureSeeded` (TB1, called by TB2) | `editorKeysOf` (T07) |
| `?list=1` · `?saved=<buildId>` · `?save=1` · `?sale=<id>` · `?view=contributor&as=<id>` | one-shot or URL state | — | the page reading it | — |

**Events.** `PROJECT_DELETED_EVENT = "ideeza:project-deleted"` lives in `src/lib/manual/events.ts` (T01). It is dispatched by `deleteProject` (T09). The listeners are:
- `MarketProvider`, which drops listings, bids and support (T11);
- `journey-store`, which drops blobs (T11);
- the clip store and `VideoJobsProvider`, which cancel jobs and delete clips (T14).

Every store hook uses `useSyncExternalStore` plus `storage` and `focus` listeners, so another tab's write shows without a reload. Every write goes through `reportWrite` (COR-93).

### 3.5 Pure functions, by owning file

Signatures are as in the area files unless changed here.

#### 3.5.1 `src/lib/wallet/money.ts` (T01)

- `toMicros(s: string): bigint | null`: digits and one dot, at most 6 decimals, > 0 not required.
- `fromMicros(n: bigint): Amount`, and `formatAmount(a: Amount, coin: Coin): string`, e.g. "0.05 MATIC".
- `addAmounts`, `subAmounts`, `compareAmounts`: every sum runs in bigint.

#### 3.5.2 `src/lib/market/fee.ts` (T01)

```ts
/** IDEEZA's cut of every marketplace sale, in basis points. Owner decision 11: 2.5 %, changeable here only. */
export const IDEEZA_FEE_BPS = 250;
export function ideezaFeeOf(price: Amount, bps = IDEEZA_FEE_BPS): Amount;   // floor to the micro, in favour of the creator
export function payoutOf(price: Amount, bps = IDEEZA_FEE_BPS): Amount;      // price − fee
export function feePercentText(bps = IDEEZA_FEE_BPS): string;               // "2.5%"
export const FEE_LABEL: string;                                             // "IDEEZA fee (2.5%)"
```

The seller pays the fee out of the price. It is never added to what the buyer pays.

#### 3.5.3 `src/lib/wallet/*` (T02)

- **`demo-wallet.ts`:**
  - `demoHex`, `demoAddress(id: IdentityId)`. The maker vectors are MINT's. A buyer's seed is `"ideeza:testnet-demo:buyer:" + name`.
  - `shortAddress`, `normalizeWallet`.
  - `walletConnect(w, id)`, `walletDisconnect(w, id)`, `walletSwitchAccount`, `walletSwitchNetwork(w, id, n)`, `pushActivity`.
- **`identities.ts`:**
  - `DEMO_ACCOUNTS` ("Demo account 1–3");
  - `DEMO_BUYERS` (Mira, Leo, Sam: `id`, `name`, `initials`);
  - `buyerLabel` ("Mira (demo buyer)"), `activeBuyerOf`;
  - `SEED_BALANCES`:
    - maker: 40 IDZ, 0.05 ETH on Base Sepolia, 0.5 MATIC on Mumbai, 0 of the others;
    - buyer: 0 IDZ, 1 ETH, 1 WETH, 500 USDC and 500 USDT on Base Sepolia; 10 MATIC, 1 WETH, 500 USDC and 500 USDT on Mumbai.
- **`balances.ts`:**
  - `balancesOf(id, { wallet, market, now })` = seed − Σ activity charges of `id` − Σ purchases by `id` (price + network fee) + Σ payouts to `id`'s address − `heldBy(id)`, where holds are the buyer's top bids on live auctions;
  - `affordOf(id, charge, data)`;
  - `heldBy`, `availableOf`.

  Balances are **derived, never stored** (C4).
- **`request.ts`:** `TIMING`, `gateOf(req, wallet)`, `failureOf(before, after, identity)`, `requestCopy(phase, req, wallet, reason?)`.
- **`mint.ts`:**
  - `MINT_FEE_IDZ`;
  - `mintViewOf(p, draft, sales)`, `mintChargeOf`, `mintTypeOptions`, `mintCostRows`, `walletFactOf`, `commitCtaLabel`;
  - `mintPlanOf(current, chosen, ctx) → { request: WalletRequest | null; nextRecord: (proof) => MintRecord | null }` (§3.9);
  - `nextTokenId`, `lazyRecord`, `instantRecord`, `upgradeRecord`, `repointRecord`, `normalizeMintRecord`, `mintPhrase`, `mintProofRows`.

  `settleRecord` and `settleLazyMint` are **removed** (C12).
- **`use-demo-wallet.ts`** (a store hook): `useDemoWallet(): DemoWallet | undefined`, with writers; and `useActiveBuyer()`.

#### 3.5.4 `src/lib/market/listing.ts`, `listing-form.ts` (T03)

- **`listing.ts`:**
  - `normalizeListings`;
  - `listingViewOf(projectId, { listings, sales, bids, now, current })`. It has no `ready` input: readiness is checked by callers (C5).
  - `createListing`, `editListing`, `removeListing`, `pauseForEdit`, `relistListing`, `closeListing` (pure transitions, `Result`);
  - `dropProjectListings`, `metadataDiff`;
  - `relistChecklist(readiness, diff)`: videos plus the metadata note only (C5);
  - `listingStatusLine`, `listingLogOf`.
- **`listing-form.ts`:**
  - `ListingInput`, `ListingCtx`, `listingProblems`;
  - `listingInputFromBrief` (Brief, and the legacy prefill, C13), `listingInputFromListing`;
  - `sellingSteps`, `AUCTION_MIN_MS`, `AUCTION_MAX_MS`;
  - **`listingSummaryRows(input, ctx)`**: the form's summary, including `FEE_LABEL` and "You receive {payout} per sale", or "IDEEZA's 2.5% comes out of the winning bid" for an auction (C10).

#### 3.5.5 `src/lib/market/{sales,auction,purchase,market-list,market-log,editions}.ts` (T04)

- **`sales.ts`:** `normalizeSales` (one Sale per **Main** `listingId`, earliest wins; editions allow up to supply), `normalizeBids`, `normalizeSupport`, `salesOfProject`, `mainSalesOf`, `holdingOf`.
- **`auction.ts`:** `auctionStateOf`, `timeLeftLabel`, `bidsOf`, `validateBid`, `settleAuction`, `makeBid`.
- **`purchase.ts`:**
  - `purchaseQuote(listing | track, via, tier?)` returns `{ price, ideezaFee, networkFee, payout, lines }`, the confirm dialog's rows;
  - `makeSale(input, { sales, mint, ownership, now })` returns `Sale | SaleRefusal`. Its `tokenId` is `mint.tokenId` (C12). `txHash` is `demoHex("ideeza:testnet-demo:sale:" + id, 64)`.
- **`market-list.ts`:** `marketItemsOf`, `filterMarket`, `listingCardText`, `parseMarketQuery`, `marketQueryString`.
- **`market-log.ts`:** `marketLogOf(projectId, sales, support, { owner })`.
- **`editions.ts`:** `normalizeEditions`, `tracksOf`, `canCreate`, `editionGate`, `listGate` (Main live or paused), `soldOf`, `checkEditionListing`, `editionsHiddenWith(mainView)` (T3: pausing or removing Main hides or removes its editions).

#### 3.5.6 `src/lib/manual/{ownership,contributors,customers,buyer-preview}.ts` (T05)

- **`ownership.ts`:** `ownershipOf({ createdAt, contributors, sales: mainSales, listedPercent })`, `maxShareFor`, `sellableShareOf`, `otherOwnersOf`, `otherOwnersDetail` (co-owner rows only), `ownershipRow`, `ownedBySegment`, `MAJORITY`. `OwnershipSale` is **dropped**; it reads `Sale` (C11).
- **`contributors.ts`:**
  - `contributorsIn`, `checkContributor`, `withContributor`, `withoutContributor`;
  - `rosterOf`, where a buyer row's name is `buyerLabel` plus the Testnet demo badge;
  - `teamOf`, `contributorsTabVisible(viewer, list)`, `roleChipOf(viewer)`;
  - the copy helpers.
- **`customers.ts`:**
  - `customersOf(project, sales, { scope })`, with the buyer counted by `buyerId`;
  - `customerRowText`, which gives the Price sub-line "{payout} to you" and disclosure rows for the IDEEZA fee and the payout (C10);
  - `benefitStateOf`, `benefitDurationText`, `addMonths`, `customersSummaryText`, `customersEmptyCopy`, `pageOfSale`, `soldLineOf`.
- **`buyer-preview.ts`:**
  - `viewerFromParams(view, as, contributors)`, `withView`;
  - `isBuyerPreview` (the banner only), `isPreview` (owner-preview | contributor-preview), `isVisitorLike` (owner-preview | demo-buyer);
  - `networkTabVisible`.

#### 3.5.7 `src/lib/video/*`, `src/lib/manual/readiness.ts` (T06)

- **`product-video.ts`:** `productVideoStatus`, `defaultLines`, `startTake`, `finishTake`, `failTake`, `useTake`, `deleteTake`, `markLost`, `migrateLegacyClip`, `sanitizeProjectVideos`, `featuredVideoOf`.
- **`frames.ts`:** `framePlan`, `describeClip`.
- **`readiness.ts`:** `readinessOf(facts, purpose)`, `currentProductsOf`, `readinessFactsOf`.
  - `relist` and `edition` use the `sell` rules; `edition` reads a single product.
  - **A rendering video never counts** (C5).

#### 3.5.8 `src/lib/manual/{editor-scope,editor-work,project-storage,product-page}.ts` (T07)

- **`editor-scope.ts`:** `EDITOR_STEPS`, `editorHref`, `parseEditorPath`, `resumeProductOf`, `productResumeOf`, `openInEditorOf`, `stampEditorOpened`, `renameProduct`, `rowOfBuildProduct`, `editorDocKey`, `legacyDocKey`, `docReadKeys`, `seedRecordKey(scope)` (`ideeza:editor:seed:<pid>:<row>`), `prevKey(key)` (`<key>:prev`), and `editorKeysOf`, which also returns every seed and `:prev` key (BUILDLOAD C6).

  The read order for a scoped document is:
  1. the scoped key (which `ensureSeeded` may already have written, before the mount);
  2. else the legacy key, when this is the first row **and the legacy doc isn't pristine** (BUILDLOAD C6);
  3. else the editor's own default.
- **`editor-work.ts`:** `editorWorkOf(scope, headRowId)`. `EDITOR_GLOBAL_NOTE` is removed.
- **`project-storage.ts`:** `projectStorageKeys(id, rowIds)` covers the brief draft, the legacy and scoped editor keys, the video, journey, bizplan and editions keys. `sweepProjectKeys`.
- **`product-page.ts`:**
  - `PRODUCT_TABS = ["media","3d","pcb","code","wiring","parts","contributors","customers"]`;
  - `productTabsOf(product, items, { firmware, contributors, customers })`;
  - `pickProductTab` (unknown → `"media"`).

  This replaces `deliverableTabs` / `pickTab` (C2).

#### 3.5.9 `src/lib/manual/{save-step,edit-gate,journey,business-plan,legal}.ts` (T08)

- **`save-step.ts`:** SAVE §3, unchanged. It adds `saveBlockOf(mode, gate)`, which gives the lock and auction copy for join and version modes (P2-SAVE-5/6 as changed).
- **`edit-gate.ts`:**
  - `listingEditGate(view, change)` (LISTING's table);
  - `lockOf(split, sales): ProjectLock | null`;
  - `editGateOf({ listing, lock }, change): EditGate`. The lock wins; then the listing gate.
- **`journey.ts`**, **`business-plan.ts`:** TABS §4. `snapshotPrices(listing view, editions)` reads `ListingView` and `EditionTrack`.
- **`legal.ts`:** `checkLegal`, `normalizeLegal`.

#### 3.5.10 The derivation (T10)

`project-summary.ts`, `project-read.ts`, `project-brief.ts` (`commerceOf`), `rail-copy.ts`, `rail-rows.ts`, `project-list.ts`, `project-route.ts`, `delete-plan.ts`, `products-tab-view.ts`, `showcase-copy.ts`.

- `projectStatus` (§3.2).
- `nextAction` (§3.6.3).
- `statusLineOf`.
- `headerText`, which gains:
  - `ownedBy` (P2-CONTRIB-10);
  - `stage` (P2-TABS-10);
  - `lockLine`;
  - `soldBuyerLink`;
  - `createdBy` (market).
- `cardText`, with a nullable action.
- `projectView` (§3.7), `canCtxOf(view)`, `deleteFactsOf(view)`.
- `projectLogOf`, which merges `listingLogOf`, `marketLogOf`, the mint entries, editions and the business plan.
- `commerceOf`:
  - its `mint` field is `MintStatus`, plus the record;
  - `sale`, `royaltiesPct` and `clip` are removed (P2-LISTING-23, VIDEO).
- `outcomeView` gives mint rows by status (P2-MINT-10). `detailsRows` gives the ownership row.
- `logLinesOf` covers every new kind.
- `project-list.ts`:
  - `LIST_TABS` + `sold`;
  - `inTab("listed") = listed | paused`.
- `project-route.ts`:
  - `PROJECT_TABS = ["products","media","network","contributors","customers"]`;
  - `parseProjectTab`, `projectTabsFor(viewer, { networkReadable, contributors })`;
  - `marketDocTitle`.
- `deletePlanOf` gains:
  - contributors — "The contributors list — {n} people";
  - activity files;
  - ended listings;
  - the on-chain note.
- `productsTabView` gives the video line (P2-VIDEO-12) and the stage pill (P2-TABS-10).

#### 3.5.11 BUILDLOAD's transforms (TB1)

BUILDLOAD §3.3, unchanged:
- `lib/pcb/from-build.ts`: `schematicFromBuild`, `netNameOf`, `symbolKindOf`, `IC_SLOTS`, and `WIRING_ROLES`, which moves here from `deliverable-previews.tsx`.
- `lib/pcb/schematic-to-pcb.ts`: Convert merges same-named net labels into one net. This is the one library change, and it fixes hand-drawn sheets too.
- `lib/three/scene.ts`: `SceneShape` gains an optional `name` and moves here, re-exported from its old home.
- `lib/three/from-build.ts`, `lib/code/files.ts` (`FileEntry`, `DEFAULT_FILES`, `langForFile` with `ino → cpp`, `firmwareFilesOf`), `lib/wiring/from-build.ts`.
- `lib/manual/build-load.ts`: the types of BUILDLOAD §3.2, and `seedPlanOf`, `piecesOf`, `isPristine`, `fingerprintOf`, `decideSeed`, `loadOfferOf`, `seedCaptionOf`, `importNoticeOf`, `normalizeSeed`.
- `lib/manual/build-load-io.ts`: `ensureSeeded`, `loadVersion`, `restoreBackup`, each over an injected `Storage`.
- `lib/create/build-artifacts.ts`: the firmware comment becomes "// pin numbers are placeholders: match them to your board". The review's Firmware preview reads the same text (C7).

### 3.6 Context writers, providers and hooks

#### 3.6.1 `ManualProjectsProvider` (`projects.tsx`, T09)

| Writer | Replaces / new | Rules |
|---|---|---|
| `saveBuild(job, lineage, input: SaveInput) → { project, revert }` | replaces `projectFromBuild` | One `setProjects` write; `revert` undoes it (P2-SAVE-15). The pure core is `saveRecord`. |
| `setMint(id, record)` | new | Called only by the mint and listing commits. Bumps `updatedAt`. |
| `addContributor` / `updateContributor` / `removeContributor` | new | Re-checks the ownership invariant and refuses a total over 100. |
| `selectEditorScope(projectId, productId)`, `activeProductId` | new | In memory |
| `touchOpened(projectId, productId, step)` | changes the signature | One-minute throttle. Never bumps `updatedAt`. |
| `renameProduct(id, rowId, name)` | generalises `renameHeadline` | EDITOR §3.1 |
| `setOwnerConfirmed(id, at)` | new | VIDEO |
| `setLegal(id, legal)`, `setDescriptionHint(id, hint)` | new | TABS |
| `deleteProject(id)` | changed | Sweeps `projectStorageKeys(id, rowIds)`, then dispatches `ideeza:project-deleted` |

`attach()` keeps the virtual row `p1` when `productName.trim() || editorOpened?.p1` (EDITOR §3.1).

#### 3.6.2 Other providers and hooks

| Hook / component | File | Task | Contract |
|---|---|---|---|
| `MarketProvider`, `useMarket()` | `src/lib/market/market-store.tsx` | T11 | `{ hydrated, data: MarketData, writeListings(next), appendSale(s), appendBid(b), appendSupport(r) }`. Each writer returns `{ ok } \| { ok:false }`. It is mounted in `layout.tsx` inside `ManualProjectsProvider`. |
| `useProjectVideos(projectId)` | `src/lib/video/store.ts` | T11 | `{ hydrated, record, write(next) }` |
| `useJourney(id)`, `useEditions(id)`, `useBusinessPlan(id)` | `src/lib/manual/journey-store.ts`, `src/lib/market/editions-store.ts`, `src/lib/manual/business-plan-store.ts` | T11 | the same shape |
| `useProjectEditGate(projectId)` + `EditPauseDialog` | `src/components/projects/use-edit-gate.tsx` | T11 | `guard(change, run)`: `free` runs; `confirm` shows the P2-LISTING-13 dialog, then `pauseForEdit` and `run`; `blocked` and `locked` refuse, and return the reason for the control's `aria-describedby`. |
| `WalletProvider`, `useWalletRequest()` | `src/components/wallet/wallet-provider.tsx` | T13 | `request(req, opts?: RequestOptions): Promise<RequestResult>` and `openManage()`. It renders the one `WalletDialog`. The caller's `commit` runs at `confirmed`, inside the dialog. A failed commit becomes `failed` / `storageFailed` with nothing else written. |
| `useMint()` | `src/components/wallet/use-mint.ts` | T13 | `plan(args)` (wraps `mintPlanOf`) and `changePayoutWallet(projectId)`. The listing and the Brief compose their own request from `plan()` (§3.9). |
| `useProjectPageData(id, context)` | `src/components/projects/details/use-project-page-data.ts` | T12 | Every store read the page needs, then `projectView`. It is shared by `/projects/[id]` and `/marketplace/[id]`. |

#### 3.6.3 `nextAction()` v2 (`project-summary.ts`, T10)

```ts
export type NextAction =
  | { kind: "review-version"; label: string; href: string }
  | { kind: "continue-brief"; label: "Continue Brief"; href: string }
  | { kind: "add-brief"; label: "Add Brief"; href: string }
  | { kind: "view-brief"; label: "View brief"; href: string }
  | { kind: "add-to-marketplace"; label: "Add to marketplace" | "List another share"; href: string; blocked?: string };
export type ActionPair = { first: NextAction | null; second: NextAction | null; violet: boolean; card: NextAction | null };
export function nextAction(p: ManualProject, facts: { status: ProjectStatus; brief: StoredDraft | null;
  source: ProjectSource; pending: PendingVersion | null; listing: ListingView; creatorPct: number; locked: boolean }): ActionPair;
```

- It implements §2.2's table.
- `card` equals `first` when `violet`, and is otherwise `null`.
- `add-to-marketplace.href` is `/projects/<id>?list=1`. On the project page the header renders `slots.actions["add-to-marketplace"]` (T22) in its place. That component opens the flow in place and reads `?list=1` once on arrival.
- The `open-editor`, `relist` and `view-listing` kinds do not exist.

### 3.7 `ProjectView` and the summary context (T10)

```ts
ProjectView += {
  mint: MintView; listing: ListingView; sales: Sale[]; bids: Bid[];     // this project's
  ownership: OwnershipSplit; customers: Customers;
  videos: { record: ProjectVideos | null; readiness: Record<ReadinessPurpose, Readiness> };
  editions: EditionTrack[]; stage: StageDef | null; activityCount: number;
  lock: ProjectLock | null; deleteFacts: DeleteFacts; canCtx: CanContext;
};
projectView(p, ctx) ctx += { market: MarketData; videos: ProjectVideos | null; journey: ProjectJourney | null; editions: EditionTrack[] };
projectSummary(p, ctx) ctx += { market: MarketData };   // My projects reads useMarket() (T25)
```

- The page keeps its skeleton until the market, videos, journey and editions stores hydrate (COR-2).
- Slots never derive these facts themselves (COR-74).
- Every `can()` call passes `view.canCtx`, which already holds `locked`, `status`, `mint`, `listing`, `auction`, `creatorPct`, `listingLive` and `holding`.

### 3.8 Permissions (`src/lib/manual/permissions.ts`, T01, complete)

#### 3.8.1 Viewer

```ts
export type Viewer =
  | { kind: "local-owner" }                                                    // role owner
  | { kind: "owner-preview" }                                                  // ?view=buyer — role visitor
  | { kind: "contributor-preview"; contributorId: string; name: string; role: ContributorRole; share: number } // role member
  | { kind: "demo-buyer"; buyerId: DemoBuyerId };                              // /marketplace/* — role buyer
export type CanContext = { status?: ProjectStatus; mint?: MintStatus; listing?: ListingView["kind"];
  auction?: AuctionPhase; creatorPct?: number; listingLive?: boolean; holding?: boolean; locked?: boolean };
```

**The rule for callers.** A control that hides for any non-owner asks `can()`; code that only needs "is this a preview" uses `isPreview()`; `isBuyerPreview()` survives only to choose the buyer-preview banner. The current callers convert in T12 (`header.tsx`, `network-tab.tsx`, `project-page.tsx` `linkQuery`, `rail-editor.tsx`, `product-page.tsx`) and T14 (`media-tab.tsx:120`).

#### 3.8.2 Actions and grants

✓ means granted. **L** means refused while `ctx.locked`.

| Action | owner | visitor | member | buyer | Needs (`NEEDS`) |
|---|---|---|---|---|---|
| project.rename · project.editDescription | ✓ | | | | L |
| project.delete | ✓ | | | | (the block comes from `deleteBlockOf`) |
| project.brief | ✓ | | | | — |
| project.showcase | ✓ | | | | `status !== "draft"` (v1) |
| product.add · product.edit · product.openEditor (was project.openEditor) | ✓ | | | | L |
| network.manage · app.manage · activity.write | ✓ | | | | L |
| video.generate | ✓ | | | | L |
| mint.run | ✓ | | | | L |
| mint.changeWallet | ✓ | | | | `mint === "lazyMinted"` · L |
| listing.create | ✓ | | | | `status ∈ {private, sold}` · `listing ∈ {none, ended, sold}` · `creatorPct > 0` · L |
| listing.manage | ✓ | | | | `listing ∈ {live, paused}` |
| listing.seePublic | ✓ | ✓ | ✓ (editor, coOwner) | ✓ | — |
| listing.buy | | | | ✓ | `listingLive` |
| listing.bid | | | | ✓ | `listingLive` · `auction ∈ {running, endingSoon}` |
| purchase.seeSummary · creator.support | | | | ✓ | `holding` |
| deliverables.download | ✓ | | ✓ | ✓ | buyer: `holding` |
| facts.seeOwnerOnly · preview.enter · customers.see | ✓ | | | | — |
| people.seeTeam | ✓ | ✓ | ✓ | ✓ | — |
| people.seeRoster · ownership.see | ✓ | | ✓ | | — |
| people.invite · people.manage | ✓ | | | | L |
| editions.manage · businessPlan.manage · legal.edit | ✓ | | | | L |
| activity.seeListedMarker | as v1 | | | | |
| **NOT_YET:** ownership.listShare · project.report · share.newsfeed · premiumParts.manage | — | — | — | — | |

`hasAudience` is unchanged.

#### 3.8.3 The Preview entries

- Preview as buyer stays in the header (v1).
- Preview as a contributor is the row's **Preview** button (P2-CONTRIB-12).
- Both use `withView`, and Back exits.

#### 3.8.4 `deleteBlockOf(facts: DeleteFacts): DeleteBlock | null`

The first rule that applies wins. The facts come from `deleteFactsOf(view)` (T10).

| # | id | Applies when | Reason | Detail (the way out) |
|---|---|---|---|---|
| 0 | marketUnreadable | a market key exists but can't be parsed | "This project can't be deleted right now." | "This browser's marketplace records couldn't be read, so we can't tell whether it's listed or sold." |
| 1 | sold | any Sale for the project | "A sold project can't be deleted." | "A buyer owns 10% of it." · "Buyers own 30% of it." · "Buyers hold 3 of its NFTs." · "Buyers own 10% of it and hold 3 of its NFTs." |
| 2 | auction | a live auction | "A project in an auction can't be deleted." | "Close the auction after it ends on {date}, in the Marketplace block." |
| 3 | listed | a live or paused Buy-now listing (edition listings are live only with Main) | "A listed project can't be deleted." | "Remove the listing first — it's in the Marketplace block." |
| 4 | otherOwners | a co-owner share > 0 | "Someone else owns part of this project, so it can't be deleted." | `otherOwnersDetail` (co-owner rows), plus the link "Open Contributors" |

The control keeps COR-67's blocked pattern: it is `aria-disabled` and focusable, the reason sits beside it, and pressing it opens nothing. A project with only removed or closed listings is deletable, and its plan lists "Its marketplace history — {n} ended listings".

#### 3.8.5 The lock (decision 12)

- **When:** `lockOf` returns a lock when the maker's share is 0 after at least one Main sale.
- **What `can()` refuses:** every action marked **L** above. That is rename and description; adding, editing and dropping a product; Open in editor, so the editor route, Load and Restore refuse too; video; mint and listing; contributors; editions, legal, activity, business plan, network and app.
- **What stays:** View brief, Showcase and Stop showcasing, Preview, and every read. Delete stays blocked by the `sold` rule.
- **The copy:**
  - the header lock line (owner): "Sold in full to Mira (demo buyer) on Sep 28, 2026 — it's theirs now, so this project is read-only."
  - the editor route (P2-EDITOR-1, locked state): h1 "{project} was sold in full", body "Its products are read-only now — the buyer owns them.", with **Back to the project**.
  - the save step (P2-SAVE-6 as changed): "{project} was sold in full, so it can't take a new version. Save this build as a new project."

### 3.9 Wallet requests: one request per commit (T13 dialog; callers own the plans)

| Caller (task) | Mint now | Chosen | Request | `commit` writes, in order |
|---|---|---|---|---|
| Listing · Add (T22) | notMinted / legacy | lazy | signature "Sign to mint and list — no fee" | MintRecord (lazy) → Listing; if the listing write fails, the record is reverted |
| | notMinted / legacy | instant | transaction: 4 IDZ + gas | MintRecord (on chain, instant) → Listing |
| | lazyMinted | lazy | signature "Sign the listing — no fee" | Listing |
| | lazyMinted | instant | transaction "Mint on chain now" | MintRecord (upgrade) → Listing |
| | onChain | — | signature "Sign the listing — no fee" | Listing |
| Listing · Edit / Relist (T22) | lazy / on chain | — | signature / transaction (gas) | Listing |
| Listing · Remove (T22) | on chain only | — | transaction (gas) after the confirm; a lazy Remove has no wallet step | Listing |
| Close auction (T22) | — | — | none (owner confirm dialog) | `appendSale` (one write) |
| Brief commit (T26) | per P2-MINT-6 | | P2-MINT-6 CTAs | MintRecord → (Sell) Listing → the v1 draft writes |
| Change payout (T24) | lazyMinted | — | signature "Re-sign with Demo account 2" | MintRecord |
| Purchase (T23) | any | — | buyer transaction: price + network fee (`recheck`: still live, still affordable) | `appendSale` |
| Bid (T23) | — | — | buyer signature "Place bid — no fee" (`recheck`: not outbid, not ended) | `appendBid` |
| Create editions / List edition (T27) | Main minted | — | signature "Create {n} lazy NFTs — no charge" / "Sign the listing — no fee" | EditionTrack |

Each debit is a `WalletActivity.charge` written after the record, as the last write. Balances are derived, so a sale needs no wallet write (C4).

### 3.10 Slots, and the controller merge points

`details/slots.ts` gets its final shape in T01 (every new key optional, so v1 compiles):

```ts
export const RAIL_ORDER = ["marketplace","outcome","details","legal","versions","log","manage"] as const;
export type ProjectSlots = {
  banner?: ComponentType<SlotProps>;                          // v1
  banners?: ComponentType<SlotProps>[];                       // each returns null unless it applies (buyer, contributor, demo buyer)
  notice?: ComponentType<SlotProps>;                          // above the tab strip: SAVE's "Saved to My projects"
  header: ComponentType<HeaderSlotProps>;
  headerParts?: { titleRow?: ComponentType<SlotProps>[]; statusRow?: ComponentType<SlotProps>[]; afterDescription?: ComponentType<SlotProps>[] };
  actions?: { "add-to-marketplace"?: ComponentType<ActionSlotProps> };
  tabs: { products: PanelSlot; media?: PanelSlot; network?: PanelSlot; contributors?: PanelSlot; customers?: PanelSlot };
  rail: Partial<Record<RailBlockId, ComponentType<SlotProps>>>;
};
export type ActionSlotProps = SlotProps & { action: Extract<NextAction, { kind: "add-to-marketplace" }>; violet: boolean; className: string };
// product/product-slots.tsx (created by T01, empty maps):
export type ProductSlotProps = { project; view; product: ProjectProduct; version: ProductVersionView; viewer; now; announce };
export type ProductSlots = {
  panels: Partial<Record<"media" | "contributors" | "customers", ComponentType<ProductSlotProps>>>;
  rail: Partial<Record<"marketplace", ComponentType<ProductSlotProps>>>;
  headerParts?: { titleRow?: ComponentType<ProductSlotProps>[] };
};
export const PRODUCT_SLOTS: ProductSlots;
```

**Merge points.** Only these files are shared within one wave. In each, a task may add its import, one adapter named `<Area>Slot` placed directly above the object, and its key(s). It never reorders or edits another entry. The controller merges in task-id order.

| File | Owner (whole file) | Entries added by |
|---|---|---|
| `src/components/projects/details/project-page.tsx` (the `SLOTS` object) | T12 (W1) | W1: T16 notice, headerParts.afterDescription (coachmark) · T17 tabs.contributors, banners (contributor) · T18 tabs.customers · T19 rail.legal · T20 headerParts.titleRow (Activity) · T21 headerParts.titleRow (plan). W2: T22 rail.marketplace (owner branch), actions, headerParts.statusRow · T23 rail.marketplace non-owner branch. |
| `src/components/projects/product/product-slots.tsx` | T01 creates it | W1: T14 panels.media · T17 panels.contributors · T18 panels.customers · T20 headerParts.titleRow. W3: T27 rail.marketplace. |
| `src/app/layout.tsx` | — | W0c: T11 MarketProvider. W1: T13 WalletProvider · T21 `<PlanRunner/>`. |
| `src/components/ideeza/index.ts` | — | W0a: T01 (TestnetDemoBadge, the Badge tone). W1: T20 (Drawer). |

---

## 4. Per-area requirements

Each area file stays the detail source. **K** = kept as written. **C** = changed (the new text is here). **D** = dropped. The task column names the implementer.

### 4.1 SAVE (`save.md`)

| Req | Status | Task | Note |
|---|---|---|---|
| P2-SAVE-1…4, 7, 9, 10, 13, 15, 16 | K | T16 | — |
| P2-SAVE-5 | C | T16 | See the text below |
| P2-SAVE-6 | C | T16 | See the text below |
| P2-SAVE-8 | K | T16 | It is also P2-TABS-21's implementation (C15). |
| P2-SAVE-11 | K | T16 | No editor door on the review (C16). The contract stays for later. |
| P2-SAVE-12 | K | T26 | Brief Step 1 |
| P2-SAVE-14 | C | T16 | "Choose Project" lands on `editorHref(p, resumeProductOf(p), step)`; a new hand-made project → `editorHref(p, "p1", "pcb")`. |
| P2-SAVE-17 | K | T08 | The node tests, plus `saveBlockOf` |

**P2-SAVE-5 (changed).**
- The join chooser ("Change" → `SelectMenu`) lists only projects where `can(owner, "product.add", ctxOf(target))`. A locked project isn't offered.
- On submit, the target runs `useProjectEditGate(target).guard("addProduct", save)`:
  - a live Buy-now listing shows the pause confirm first;
  - a running auction blocks with LISTING's reason under the primary.
- For a minted target that isn't listed, `mintNoticeOf` stays.

**P2-SAVE-6 (changed).** Version mode runs the same gate.
- When the lineage's project is **locked**, the dialog shows `saveBlockOf`'s line ("{project} was sold in full, so it can't take a new version. Save this build as a new project.") and switches to new mode with the P2-SAVE-4 defaults. The link to that project is broken for this build.
- When a running auction blocks, the primary is `aria-disabled` with the reason.

### 4.2 EDITOR (`editor.md`)

| Req | Status | Task |
|---|---|---|
| P2-EDITOR-2, 7, 8 | K | T15 |
| P2-EDITOR-12, 14 | K | T12 |
| P2-EDITOR-1, 3, 4, 5, 6 | C | T15 |
| P2-EDITOR-9, 10, 11, 16, 17, 18, 19 | C | T12 (11 also TB2; 16–17 also T07) |
| P2-EDITOR-13, 15 | C | T10 (logic), T12 / T25 (render) |

- **1 (C).** Adds the **locked** state, with §3.8.5's editor copy. The gate order is: not hydrated → unknown slug → locked → unknown product → scope pending.
- **3 (C, BUILDLOAD C6).** Adopt-once skips a **pristine** legacy doc (`isPristine`, TB1). The seed takes that key, and the legacy key is removed.
- **4 (C, BUILDLOAD C6).** `PcbProvider` gains `releaseScope(scope)`, which flushes and clears only when the store holds that scope. Load and Restore (TB2) call it.
- **5 (C, BUILDLOAD C6).** The banner shows when the globals exist and the product's doc is absent, pristine, or still equal to its seed fingerprint. "Bring it in" **appends**: Code adds files, and a clashing name becomes "{name} (earlier).{ext}"; 3D appends shapes. It never replaces the build's. An import notice shows first (P2-BUILDLOAD-12). The 3D shape list shows and searches `SceneShape.name`.
- **6 (C).** `ProductNameField`'s save runs `useProjectEditGate(projectId).guard("editProduct", …)`.
- **9 (C).** The button is the page's violet in every state (C16), and absent when `can(viewer, "product.openEditor", view.canCtx)` is false. **The hint is deleted** (P2-BUILDLOAD-14): T12 ships none, and TB2 removes `EDITOR_HINT` from `project-header.ts`.
- **11 (C).** The block gains the seed-caption slot under its rows, which TB2 fills (P2-BUILDLOAD-13).
- **10 (C).** Every card is a stretched link to its page, with each state's note as a line on the card. The card's "Open in editor" button is **dropped** (C16).
- **13 (C).** Replaced by §2.2 and §3.6.3. There is no Relist and no View listing in the pair.
- **15 (C).** The card shows `ActionPair.card`.
- **16 (C).** The strip is Media · 3D model · PCB · Firmware code · Wiring · Parts ┆ Contributors · Customers. Media is the default and is never written. `?tab=` accepts `PRODUCT_TABS`. ArrowRight from Parts moves to Contributors.
- **17 (C).** Replaced by §2.3's viewer table.
- **18 (C).** Panels come from `PRODUCT_SLOTS.panels`: `media` is VIDEO's `ProductMediaPanel` (the video section, then the images); `contributors` is T17's and `customers` is T18's. A missing panel means a missing tab.
- **19 (C).** The rail is `PRODUCT_SLOTS.rail.marketplace` (T27), then Editor (T12). It is absent when empty.

### 4.3 VIDEO (`video.md`)

| Req | Status | Task |
|---|---|---|
| P2-VIDEO-1, 3, 4 | K | T06 (pure), T14 |
| P2-VIDEO-2, 5, 6, 8, 9, 10, 19 | K | T14 |
| P2-VIDEO-12 | K | T10 (line), T12 (render) |
| P2-VIDEO-15 | K | T24 |
| P2-VIDEO-16, 17 | K | T26 |
| P2-VIDEO-20 | K | T01 |
| P2-VIDEO-7, 11, 14 | C | T14 |
| P2-VIDEO-13 | C | T06 |
| P2-VIDEO-18 | C | T07, T09, T14 |

- **7 (C).** "Product page, Video section" becomes "Product page, **Media tab**".
- **11 (C).** `ProductVideoSection` is the first part of the product page's Media panel (`ProductMediaPanel`), followed by the concept images in v1's tile grid. There is no section above the tabs, and COR-36 isn't amended.
- **13 (C).** The purposes are `showcase | sell | give | relist | edition`. `relist` and `edition` take `sell`'s rules; `edition` reads one product. "A rendering video is not yet a video" binds every caller, the listing included (C5).
- **14 (C).** Two purposes are added to the copy table:
  - `relist`: "Relist on the marketplace" / "To relist, every product needs an AI video." / **Relist**, plus LISTING's metadata row.
  - `edition`: "Add {product} NFTs to the marketplace" / "{product} needs an AI video first." / **Continue**.

  For sell, relist and edition, callers open the dialog **only when the gate fails**; otherwise they go straight to their form.
- **18 (C).** The delete runs through `projectStorageKeys` (T07) and the `ideeza:project-deleted` event (T09 dispatches; T14 cancels jobs and deletes clips).

### 4.4 MINT (`mint.md`)

| Req | Status | Task |
|---|---|---|
| P2-MINT-4, 5 | K | T02 (pure), T13 |
| P2-MINT-6 | K | T26 |
| P2-MINT-10, 12 | K | T10 (rows, log), T24 (UI) |
| P2-MINT-11 | K | T13 (hook), T24 (row) |
| P2-MINT-1, 3, 7, 8, 9 | C | T02 (3 also T13; 7 also T22; 8 also T09; 9 also T04) |
| P2-MINT-2 | C | T13 |

- **1 (C).** The store is `DemoWallet` v2; a v1 record normalizes to the default. Balances are **derived** (`balancesOf`), and a debit becomes an activity entry with a `charge`. Amounts use `money.ts`. Activity is never pruned, and the dialog shows the newest 3. "36 IDZ after an instant mint" still holds, derived.
- **2 (C).** The Demo wallet dialog gains **"Demo buyers (for Explore marketplace)"**: one row per buyer ("Mira · 0x… · 10 test MATIC") with Connect / Disconnect. It is the one home for every identity's connection (C20).
- **3 (C).** `request(req, RequestOptions)`:
  - `recheck` runs before `confirmed`, and a string fails with `reason: "recheck"` and that copy;
  - `commit` does the caller's writes inside the dialog;
  - `req.identity` picks the signer.

  The phases and copy are otherwise unchanged.
- **7 (C).** Replaced by §3.9.
- **8 (C).** Sales use `MintRecord.tokenId`; the `#1001` numbering is dropped. `projectStatus` counts `p.mint` (§3.2 rule 5).
- **9 (C).** There is no writer. `mintViewOf` reads the first Main sale as the settlement ("Minted on chain at its first sale", with the sale's `txHash`). The buyer's confirm shows "Network fee (includes minting the token)". A Give "claim" is LATER.
- **Q1** (Save needs a free signature) and **Q2** (no fee on a lazy mint): defaults taken (§6).

### 4.5 LISTING (`listing.md`)

| Req | Status | Task |
|---|---|---|
| P2-LISTING-5, 7, 9, 10, 11, 12, 20, 21, 23 | K | T03 (pure), T22 |
| P2-LISTING-18 | K | T10, T25 |
| P2-LISTING-1…4, 6, 8, 14…16 | C | T22 (1 also T12; 4, 14 also T03) |
| P2-LISTING-13 | C | T08, T11 |
| P2-LISTING-17 | C | T10 |
| P2-LISTING-19 | C | T01, T10 |
| P2-LISTING-22 | C | T26 |
| P2-LISTING-24 | C | T03, T22 |
| P2-LISTING-25 | C | T03, T11 |

- **1 (C).** The rail Marketplace block is the home of the listing's **state** and of every operation on an **existing** listing. **Starting** a listing is the header pair's first action (§2.2), rendered through `slots.actions["add-to-marketplace"]`. `RAIL_ORDER` is as in §3.10, and below 1024 px the block renders above the tabs (T12). The block is absent for Draft, Given and unreadable. The checks change: in the `none` state the header **contains** "Add to marketplace", and the block contains "Not on the marketplace yet." and no button.
- **2 (C).** The block's table:
  - `none`: "Not on the marketplace yet." / "Add it from the button at the top of the page — it stays yours until someone buys it." No button.
  - `ended`: P2-LISTING-15's facts, no button.
  - `live` Buy now: Edit · Remove · View on marketplace ↗.
  - Auction running: Bidding History · Close (`aria-disabled`).
  - Auction ended: ★ Close auction.
  - `paused`: ★ Relist · Edit · Remove listing.
  - `sold`: P2-LISTING-16's facts and "See customers".
- **3 (C).** Add to marketplace (from the header, or `?list=1` on arrival) reads `readinessOf(…, "sell")`. When `ok`, the form opens with "Videos · every product is ready ✓". Otherwise `ReadinessDialog purpose="sell"` opens, and its **Continue to listing** replaces it with the form once `ok`. A rendering video blocks: there is no `rendering` branch and no `onMarket` (C5).
- **4 (C).** Blockchain and Collection are locked to the mint record, or, for a legacy mint, to the draft's values. Minting type follows `mintTypeOptions`. After the cost box come `listingSummaryRows`:
  - Buy now: "IDEEZA fee (2.5%) · 0.00125 MATIC per sale" and "You receive · 0.04875 MATIC";
  - Auction: "IDEEZA fee (2.5%) · taken from the winning bid" and "You receive the winning bid minus 2.5%".
- **6 (C).** Submitting makes the one request of §3.9. Its `commit` writes the record (if it changes) and then the listing, and reverts the record if the listing write is refused. The busy, refused and cancelled states are kept.
- **8 (C).** "Waiting for videos" and the hidden link are dropped. The card adds "You receive · {payout} per sale".
- **13 (C).** The gate is `editGateOf`: the lock wins, then this table. The hook is `useProjectEditGate` (T11). The wrapped writes are:
  - rename: `title-editor.tsx` (T16);
  - description: `description-editor.tsx` (T16);
  - cover: `media-tab.tsx` (T14);
  - addProduct: SAVE join and version (T16), and the "Add a product" tile (T12);
  - editProduct: `product-name-field.tsx` (T15);
  - dropProduct: no P2 control.

  Video takes and editor work never pause.
- **14 (C).** The checklist is "An AI video for every product" (Ready / Missing → "Generate videos") and "Updated NFT metadata — updated when you relist". The image and project-video rows are dropped. Relist opens `ReadinessDialog purpose="relist"` only when blocked.
- **15 (C).** The card shows the facts and "Your last terms…" with no button. The header ★ prefills from the ended listing (`listingInputFromListing`).
- **16 (C).** "List another share" moves to the header (quiet). The card adds "IDEEZA fee · 2.5% · {x}" and "You received · {payout}".
- **17 (C).** Replaced by §3.2. The Utility NFT pill is kept (T22, `headerParts.statusRow`).
- **19 (C).** Replaced by §3.8.4. `dropProjectListings` runs on the delete event (T11).
- **22 (C).** The Brief Sell uses the strict rule. The success copy has only the live variant ("Your project is listed on Explore marketplace — a testnet demo." and "View on marketplace"); the pending variants are dropped.
- **24 (C).** No backfill (C13). A v1 sell with `mintedAt` and no listing reads **Private** ("{mint} · not on the marketplace yet"). Its ★ Add to marketplace opens a form prefilled by `listingInputFromBrief`, and submitting mints for real (legacy counts as notMinted). The node checks become: the prefill is correct, and nothing is written on read.
- **25 (C).** The store is read and written only through `useMarket()` (T11).
- **Q1** (Percent Selling is a share of ownership) and **Q2** (a rename pauses): defaults taken (§6).

### 4.6 MARKETPLACE (`marketplace.md`)

| Req | Status | Task |
|---|---|---|
| P2-MARKETPLACE-1 | K | T13 (sidebar) |
| P2-MARKETPLACE-2, 4–7, 10–12, 17, 19–21, 23 | K | T04 (pure), T23 |
| P2-MARKETPLACE-3 | C | T02, T23 |
| P2-MARKETPLACE-8 | C | T12, T23 |
| P2-MARKETPLACE-9, 13, 15, 18 | C | T23 (13 also T13) |
| P2-MARKETPLACE-14 | C | T04, T23 |
| P2-MARKETPLACE-16 | C | T04 |
| P2-MARKETPLACE-22 | C | T10 |

- **3 (C).** The buyers are `DEMO_BUYERS` (`wallet/identities.ts`). The switch and its key are unchanged.
- **8 (C).** The viewer is `{ kind: "demo-buyer", buyerId }`, with `holding` in `CanContext`. The page is `MarketProjectPage`: `ProjectShell` with `trail` and `MARKET_SLOTS`, fed by `useProjectPageData(id, "market")`. The tabs follow §2.2, and `isVisitorLike` replaces the proposed checks.
- **9 (C).** The chip is "Listed" for any live listing; the line names Auction.
- **13 (C).** There is no chip menu and no Disconnect. Under Buy now / Place bid, a fact line reads "Paying from Mira's demo wallet · 0x68f4…c94e · 10 test MATIC" with `[Testnet demo]`, or "Mira's demo wallet isn't connected — you'll connect it when you buy.", then a quiet **Manage demo wallets** (`openManage()`). Connecting happens inside the request dialog.
- **14 (C).** `useWalletRequest` with `identity: buyerId` and `purpose: "purchase"`. `recheck` covers the listing still being live and the funds; `commit` is `appendSale`. The rows are `purchaseQuote(...).lines`, which **add** "Includes IDEEZA fee (2.5%) · 0.00125 MATIC — taken from the price, not added to it". The success copy reads "Token #{tokenId}".
- **15 (C).** The same request with `kind: "signature"` and `purpose: "bid"`.
- **16 (C).** The `Sale` is §3.3.2 (`fees`, `payout`). `tokenId` comes from the MintRecord. The settlement is derived (C12), and wallet effects through `balancesOf`.
- **18 (C).** "Token ID · #{record.tokenId}"; "Price paid · 0.05 MATIC (+ 0.021 MATIC network fee)".
- **22 (C).** The sold line and delete rules follow §3.2 and §3.8.4. `customersOf` is T05's, on `Sale`.
- **Q1** is answered by decision 12, **Q3** by decision 11. **Q2** (are sales public?): default private (§6).

### 4.7 CONTRIB (`contributors.md`)

| Req | Status | Task |
|---|---|---|
| P2-CONTRIB-1, 3, 5–10, 12, 13 | K | T05 (pure), T17 |
| P2-CONTRIB-2, 4, 11 | C | T05, T17 |
| P2-CONTRIB-14 | C | T01, T19 |
| P2-CONTRIB-15 | C | T10, T17 |

- **2 (C).** A buyer row shows `buyerLabel` ("Mira (demo buyer)") with the Testnet demo badge, read from `view.sales`.
- **4 (C).** Add, Edit and Remove are absent when `can(…, view.canCtx)` is false, which covers the lock.
- **11 (C).** `OwnershipSale` is dropped; `ownershipOf` reads Main `Sale`s. Rule e adds: when the maker reaches 0 % through sales, the project locks (§3.8.5).
- **14 (C).** The order is §3.8.4. The buyer-holding detail rows are dropped (the `sold` rule fires first).
- **15 (C).** The delete-plan line is kept. **The product page DOES get a Contributors tab**: TABS' read-only credit (P2-TABS-4), with "Manage contributors" for the owner (C2).
- **Q1–Q3:** defaults taken (§6).

### 4.8 CUSTOMERS (`customers.md`)

| Req | Status | Task |
|---|---|---|
| P2-CUSTOMERS-1, 4–7, 9, 11, 13, 18, 19 | K | T05 (pure), T18 |
| P2-CUSTOMERS-14 | K | T10 |
| P2-CUSTOMERS-10 | K | T18 (panel); editions ship in T27 |
| P2-CUSTOMERS-16, 17 | K | T22 (LISTING builds them) |
| P2-CUSTOMERS-2, 3, 8, 20 | C | T05, T18 |
| P2-CUSTOMERS-12 | C | T10 |
| P2-CUSTOMERS-15 | C | T01 |

- **2 (C).** Buyers are counted by `buyerId`.
- **3 (C).** Buyer shows `buyerLabel`. Price shows "0.05 ETH" with the sub-line "0.04875 ETH to you" (`sale.payout`). Fixture F is rewritten on `Sale`, with Mira and Leo.
- **8 (C).** The `<dl>` gains "IDEEZA fee · 2.5% · 0.00125 ETH" and "You received · 0.04875 ETH". Wallet = `sale.buyerAddress`. The optional buyer-name field (X9) is dropped.
- **12 (C).** The sold line follows §3.2, with the buyer link in the owner's header.
- **15 (C).** Replaced by §3.8.4. `marketUnreadable` covers unreadable sales.
- **20 (C).** The tests follow the consolidated types.
- The owner question (lock) is answered by decision 12.

### 4.9 TABS (`tabs.md`)

| Req | Status | Task |
|---|---|---|
| P2-TABS-5…8 | K | T08 (pure), T11 (store), T20 |
| P2-TABS-10, 11, 12 | K | T08, T10, T12 / T19 |
| P2-TABS-13…20 | K | T08, T11, T21 |
| P2-TABS-22 | K | T16 (`description-coachmark.tsx`) |
| P2-TABS-23 | K | T08, T19 |
| P2-TABS-25, 27, 28 | K | T04, T27 |
| P2-TABS-29 | K | T12 (tile), T16 (`addTo`) |
| P2-TABS-30 | K | T12 |
| P2-TABS-1, 2, 3 | C | T07, T10, T12 |
| P2-TABS-4 | C | T17 (Contributors credit), T18 (Customers), T14 (Media) |
| P2-TABS-9 | C | T11 |
| P2-TABS-21 | C | T16 |
| P2-TABS-24, 26 | C | T27 |

- **1 (C).** Visibility follows §2.2; Contributors is a team credit in previews when there are ≥ 1 contributors. `projectTabsFor(viewer, { networkReadable, contributors })` replaces `hiddenTabs`.
- **2 (C).** The order is P2-EDITOR-16's as changed. The ACs become:
  1. `[Media, 3D model, PCB, Firmware code, Wiring, Parts, Contributors, Customers]`, with Media selected;
  2. End → Customers;
  3. buyer → `[Media, 3D model, PCB, Wiring, Parts]`, plus Contributors when there are ≥ 1;
  4. hand → `[Media, Contributors, Customers]`;
  5. one divider.
- **3 (C).** The rail is Marketplace (T27), then Editor (P2-EDITOR-11).
- **4 (C).** Contributors shows name · role · share to the owner (`people.seeRoster`) and name · role in previews (`people.seeTeam`), with no controls. Customers is P2-CUSTOMERS-10; Media is `ProductMediaPanel`.
- **9 (C).** `ideeza-media` holds activity files only; VIDEO keeps `ideeza-video` (C24). The blobs are swept on the delete event.
- **21 (C).** Built once, as SAVE's `DescriptionAiAssist`: one press with Undo, on `/api/refine` mode `"project"`, with the honest join fallback. `/api/projects/describe` is not built (C15).
- **24 (C).** Every edition button is **quiet** (C16). The gates are Draft → Given → **locked** ("{project} was sold in full — its NFTs can't be changed.") → the tracks.
- **26 (C).** The readiness is `readinessOf(…, "edition")`: strict, with the dialog only when blocked. The wallet step is §3.9, and the listing gate is `listGate` (Main live or paused). The summary adds `FEE_LABEL` and "You receive {payout} per NFT (Regular)".
- **Q1–Q4:** defaults taken (§6).

### 4.10 BUILDLOAD (`buildload.md`)

| Req | Status | Task |
|---|---|---|
| P2-BUILDLOAD-1…5, 8 | K | TB1 (the transforms, `decideSeed`, `isPristine`) |
| P2-BUILDLOAD-6 | K | follows from TB1 / TB2; no code of its own |
| P2-BUILDLOAD-7, 9…15 | K | TB1 (pure and IO), TB2 (the UI and wiring) |

- **Carried into EDITOR** (BUILDLOAD C6): P2-EDITOR-3, 4, 5, 9 and 11, as changed in §4.2. `editorKeysOf` covers the seed and `:prev` keys (T07). `SceneShape.name` is shown by T15.
- **Seeding** runs in `ProjectWorkspace` after the gate and before `setDocScope` (TB2). It is not done at Save (BUILDLOAD C1), so SAVE is unchanged.
- **Load and Restore** follow Open in editor's gate, so they are absent on a locked project (BUILDLOAD C8).
- **C7:** the firmware comment fix also changes the build review's Firmware preview text. It lives in `build-artifacts.ts`, owned by TB1.
- **Q1** (real packages per part) and **Q2** (a Main board part in the wiring library): defaults taken (§6).

---

## 5. Conflicts resolved

| # | Conflict | Decision | Why |
|---|---|---|---|
| C1 | Where "Add to marketplace" lives: EDITOR says the header primary, LISTING says the rail block with every listing operation | **Starting** a listing is the header pair's `first` (§2.2), shared with the card through `ActionPair.card`. Every operation on a listing that **exists** (Edit, Remove, Close auction, Relist, Bidding History, View on marketplace) lives in the rail block. The `none` card says where the button is. | `nextAction()` is the one derivation the card and header share (COR-11, LST-32); a rail-only start leaves the card with nothing, or with a duplicate. The next step sits in one place in every state, first on a phone. Relist and Close are gated by facts shown only in the block (the checklist, the countdown). One violet holds: the header's in `none`/`ended`, the rail's in `paused` and ended-auction. |
| C2 | Product tabs: EDITOR has Media first, TABS has the deliverables first, CONTRIB has no Contributors tab | Media · 3D · PCB · Firmware · Wiring · Parts ┆ Contributors · Customers, with Media the default | The Figma selects Media (41505:137261, re-checked). The owner said the video can't be seen. Media is the one tab every product has, and `?tab=pcb` still works. The people tabs follow the project strip's order, so the two pages agree. Owner decision 8 beats "no Contributors tab"; CONTRIB's concern is met by a read-only credit that links to the project tab. |
| C3 | Status sets across MINT, LISTING, MARKETPLACE and CUSTOMERS | One `ProjectStatus` (7 words) and one precedence (§3.2). The mint status is a second axis in the line; the lock is a fact, not a status. "Listed" covers Buy now and auction everywhere. My projects adds Sold; Listed includes Paused. | One word per state, one tab per word (O6), no churn in chips |
| C4 | MINT's stored balances vs MARKETPLACE's ledger; 3 accounts vs 3 buyers | One store (`ideeza:wallet:demo` v2) with 6 identities. **Balances are derived** from seeds, mint charges and sales. One `money.ts` in bigint micros, with IDZ a coin like any other. Buyers are separate identities, so there is no self-purchase. | A purchase or an auction close is one write (MARKETPLACE's atomicity); no float drift |
| C5 | Readiness: VIDEO says a rendering video doesn't count, LISTING lists while rendering | **Strict** for every purpose. `onMarket` is dropped. A dialog shows only when a gate fails. The Brief renders while the form is filled: the preview step needs `rendering`, the commit needs `ready`. | The owner's "must". One rule for every gate. A live-but-hidden listing makes "Listed" untrue |
| C6 | Delete-block order and copy | marketUnreadable → sold → auction → listed → otherOwners (§3.8.4) | An unreadable purchase record must not allow an irreversible delete (CUSTOMERS C12, extended). CONTRIB's buyer detail is unreachable. |
| C7 | The `Viewer` union and new actions | Four viewer kinds, four roles, and every action declared in T01 (§3.8). `isBuyerPreview` survives for the banner only. | No later task edits `permissions.ts`, and a contributor preview can't leak write controls |
| C8 | The edit lock (LISTING's pause and the owner's 100 % lock) | One gate, `editGateOf` (the lock, then the listing), and one hook, `useProjectEditGate` (T11). The wrapped writes are listed in §4.5 P2-LISTING-13. A rename pauses per the Figma. Videos and editor work never pause; the lock covers them through `can()`. | One rule for every write that changes what buyers see |
| C9 | Brief Step 1: SAVE vs MINT | One owner (T26). SAVE's read-only project row plus MINT's Save chip "Free signature · no KYC". | Two areas, one file |
| C10 | Where the fee shows | `IDEEZA_FEE_BPS` in one file, taken out of the price and floored to the micro. It shows in the listing summary, the purchase confirm, the `Sale` (`fees`, `payout`), the Customers row and disclosure, the Sold card and the edition summary. | Decision 11 |
| C11 | Three sale shapes | One `Sale` (§3.3.2). Ownership, customers, the sold status, the settlement and balances all derive from it. | One write, no disagreement |
| C12 | Token ids and lazy settlement | The id is reserved at mint (MINT). `settleLazyMint` is removed; the first Main sale is the on-chain event (`mintViewOf`). | Keeps a sale one write |
| C13 | LISTING's backfill of v1 sells | No backfill. A v1 sell reads Private with a prefilled form. | v1 never listed anything; no write on read; no listing without a mint record |
| C14 | Mint and listing prompts | One wallet request per submit (§3.9) | No double signing |
| C15 | "Update with AI": SAVE-8 vs TABS-21 | SAVE's one press with Undo on `/api/refine` mode `"project"`, with the labelled join fallback; built once. The TABS coachmark opens it. | The fallback is the products' own text, not invented |
| C16 | Product page violet; Open in editor on product cards | Open in editor is always the product page's violet, and edition buttons are quiet. The cards' extra "Open in editor" is dropped. | Several tracks can't all be violet. The owner's one-home rule: the card opens the page one click away, and the editor has a product switcher. |
| C17 | VIDEO's product "Video section" | It is the product **Media tab** panel | It would duplicate the first, default tab |
| C18 | Contributors in previews: CONTRIB-8 vs TABS-1 | A team credit (names and roles) when there are ≥ 1 contributors | A buyer learns who made it, not the cap table |
| C19 | Get creator support: MARKETPLACE-20 vs CUSTOMERS-9 | Built (buyer side); still no "Message buyer" (owner side) | It has a real write and a real reader, the owner's log, and says so |
| C20 | The buyer wallet chip's Disconnect | It moves into the one Demo wallet dialog; the page shows a fact line and "Manage demo wallets" | MINT D3, one home |
| C21 | Phone order | Below 1024 px the Marketplace block renders above the tab strip: one DOM instance, CSS grid areas | It holds the rail's only possible violet |
| C22 | "View listing" in the header | Dropped; the rail's "View on marketplace ↗" is the one link | The link belongs beside the facts it opens |
| C23 | Editions: TABS says NOW, MARKETPLACE says LATER | NOW, in the last wave (W3), lazy only. They need Main live or paused. Pausing Main hides them; removing Main removes their listings. | They are the Figma's product rail and the only source of product-scoped customers. They drop cleanly (§6). |
| C24 | IndexedDB | Two databases: `ideeza-video` (VIDEO) and `ideeza-media` (activity) | One owner and one sweep each |
| C25 | Are customers public? | Private to the owner | CUSTOMERS C1 over MARKETPLACE Q2 |
| C26 | The delete sweep | An `ideeza:project-deleted` event; each store purges itself | The provider can't import the browser stores built later |
| C27 | BUILDLOAD in scope; the EDITOR rules it changes | Seeding writes every document on a product's first open, but only where a document is absent or pristine. A later version loads only through the Editor block's per-document confirm, with a one-slot backup and Restore. The sample hint is deleted, and the Editor block's caption replaces it. P2-EDITOR-3/4/5/9/11 change as listed in §4.2. | Decision 10. The block keeps one home for Load and Restore, and the maker's work is never replaced without asking. |

---

## 6. Defaults taken on open questions (for the owner's review)

**Blocking: none.** Two are worth a glance: the lock scope (6.3) and editions (6.6).

1. **Fee** is 2.5 %, held in `IDEEZA_FEE_BPS` (`src/lib/market/fee.ts`). Change that one number to change it everywhere. The seller pays it out of the price.
2. **Mint.**
   - Save as Private is a free lazy signature, not wallet-free (MINT Q1).
   - A lazy mint itself carries no 4 IDZ fee; only the 2.5 % sale fee applies (MINT Q2).
   - There is no faucet (MINT D7).
3. **Lock scope** after a 100 % sale. Everything that changes what the buyer owns is refused: name, description, products, the editor, videos, listing, contributors, editions, legal, activity, business plan and network. View brief, Showcase and Preview stay.
4. **Listing.**
   - Percent Selling sells a share of the maker's ownership (LISTING Q1).
   - A rename or description edit pauses a live Buy-now listing, per the Figma (LISTING Q2).
5. **Video.**
   - 720p is shown locked ("Builder plan, not on sale yet").
   - The clip is silent.
   - It is rendered by the local renderer, with the prompt kept for a future model (VIDEO Q1–Q3).
6. **Editions** (Physical / Virtual) ship last (W3). They drop cleanly if the owner prefers Main-only for P2.
7. **Customers** are private to the owner. Buyers see only "{n} sold" (MARKETPLACE Q2).
8. **Contributors.** Vesting is LATER, the 70/30 rule doesn't apply, and 51 % is display-only (CONTRIB Q1–Q3).
9. **No project Category** (SAVE Q1).
10. **Premium Parts, Comments and social Share stay LATER** (TABS Q1–Q3). The stage labels and the Physical/Virtual copy ship as drafts for the owner to edit (TABS Q4).
11. **"Mumbai Testnet"** stays as the network label; Amoy replaced it in 2024 (MINT D10).
12. **Build load.**
    - Real footprints are LATER: the AI build doesn't yet pick a package per part, so ICs land on a SOIC-8 placeholder, and the notice says so (BUILDLOAD Q1).
    - A "Main board" wiring part is NEXT: until it exists, the build's wires aren't drawn in Wiring, and the notice says so (BUILDLOAD Q2).

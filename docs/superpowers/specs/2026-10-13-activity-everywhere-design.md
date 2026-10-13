# Activity everywhere: a proof-backed journey for the project, its products and its NFTs

**Status:** designed with the owner on 2026-10-13 (brainstorming, three sections approved). Branch `feat/activity-everywhere`, cut from `feat/build-log-name` (which renamed the chat rail's history to "Build log", so "Activity" now means only this).

**Goal:** Activity becomes the public, proof-backed journey of everything a maker sells.
- Every project and every product starts at **Planning**. After that, only the maker adds entries.
- Every entry carries proof: at least one file.
- Entries can be added to the project, to each product, and to the Main, Physical and Virtual NFTs.
- An outside viewer sees each one's **current activity**, and opens the earlier ones below it.

## Owner rules (2026-10-13)
1. A new project starts at a default activity, Planning. After that, nothing is added automatically. The user adds every update.
2. The same applies to each product.
3. Every activity needs proof: an image, a video, a PDF or a similar document.
4. Each place has its own activity types. The lists in §2 were approved as proposed.
5. Activities can be added on the project, the product, the Main NFT, the Physical NFT and the Virtual NFT.
6. Outside viewers see the current activity, and a dropdown that opens the earlier ones.

Decisions taken in the session:
- **Where the owner adds:** "Where it belongs". The project ⋯ adds the project's, the product ⋯ adds the product's, and Earn › Sell's rows add each NFT's. There is no "For" picker.
- **Earlier activities:** they open inline, below the current one. No floating menu, no drawer.
- **The Innovations post status:** it reads the project's current activity. The share flow stops asking for it.

## 1. Terms
- **Target:** whose activity an entry is. There are four kinds:
  - the project;
  - one product;
  - the Main NFT;
  - the Physical or the Virtual NFT of one scope (the whole project, or one product).

  Personal use and Business use share one target. It is the same unit or the same files, sold under two licences.
- **Catalogue:** the activity types a target offers (§2).
- **Default Planning:** the entry every project and product starts with. It is synthesized, never stored (§4).
- **Current activity:** a target's newest entry, the default included. Ties are broken by id. "Others" counts like any other type, and shows under its custom name.

## 2. Catalogues

Each type has an `id`, a `label` (the form and timeline), a `short` (pills and chips) and a `help` (the "?" and the option's info). "Others" ends every catalogue and asks for a custom name of 1–40 characters, as today.

### 2.1 Project and product (the same list)

| id | label | short | help |
|---|---|---|---|
| `planning` | Planning | Planning | What it is, who it's for, and what it must do. |
| `design` | Design | Design | The board, the case and the firmware are drawn up. |
| `prototype` | Prototype | Prototype | A first working unit is built. |
| `testing` | Testing | Testing | It's been tried out, and problems were found and fixed. |
| `certification` | Certification | Certified | Safety and radio approvals, such as CE, FCC or RoHS. |
| `ready-for-manufacture` | Ready for manufacture | Mfg ready | Files are final; parts and a factory are lined up. |
| `pilot-run` | Pilot run | Pilot run | A small first batch, made the way every later one will be. |
| `manufacturing` | Manufacturing | Manufacturing | It's being made at volume. |
| `launched` | Launched | Launched | It's on sale and reaching buyers. |
| `improvement` | Improvement | Improved | A new version or a fix after launch. |
| `others` | Others | (custom name) | Something that doesn't fit the types above. |

### 2.2 Main NFT (the project itself, so buyers watch its value)

| id | label | short | help |
|---|---|---|---|
| `ip` | IP / Patent | IP | A patent, trademark or design right was filed or granted. |
| `partnership` | Partnership | Partnership | A deal with a factory, distributor or partner. |
| `sales-report` | Sales report | Sales | What sold and what it earned. |
| `milestone` | Milestone | Milestone | An award, press, or a goal reached. |
| `roadmap` | Roadmap | Roadmap | What's coming next. |
| `others` | Others | (custom name) | Something that doesn't fit the types above. |

### 2.3 Physical NFT (a real unit, made and shipped)

| id | label | short | help |
|---|---|---|---|
| `making` | Making | Making | Units for this batch are being made. |
| `quality-check` | Quality check | QC | Units were tested before packing. |
| `shipped` | Shipped | Shipped | Units were handed to the courier. |
| `delivered` | Delivered | Delivered | Buyers have their units. |
| `delay-notice` | Delay notice | Delayed | Something is late, and here's the new date. |
| `fix-notice` | Fix notice | Fix | A problem was found in shipped units, and here's the fix. |
| `others` | Others | (custom name) | Something that doesn't fit the types above. |

### 2.4 Virtual NFT (the design files, and their updates)

| id | label | short | help |
|---|---|---|---|
| `files-released` | Files released | Released | The first version of the files is out. |
| `update-released` | Update released | Updated | A new version, and what changed. |
| `bug-fix` | Bug fix | Fix | A problem in the files was fixed. |
| `guide-added` | Guide added | Guide | A build guide, video or document was added. |
| `licence-change` | Licence change | Licence | What buyers may do with the files changed. |
| `others` | Others | (custom name) | Something that doesn't fit the types above. |

### 2.5 Legacy types (stored v1 entries)

Read-time mapping. Nothing is lost.

| v1 id | becomes |
|---|---|
| `concept-definition`, `requirement-gathering` | `planning` |
| `preliminary-architecture`, `digital-design`, `integration-review` | `design` |
| `prototype-development` | `prototype` |
| `testing-refinement` | `testing` |
| `manufacturing-preparation` | `ready-for-manufacture` |
| `pilot-production-run` | `pilot-run` |
| `mass-production` | `manufacturing` |
| `product-launch-feedback` | `launched` |
| `others` | `others` |

## 3. Data (`src/lib/manual/journey.ts`)

There is still **one journey per project**, at `ideeza:project:journey:<id>`. Each entry is now tagged with its target:

```ts
export type ActivityTarget =
  | { kind: "project" }
  | { kind: "product"; productId: string }
  | { kind: "main" }
  | { kind: "physical" | "virtual"; scope: "project" | string /* a product id */ };

export type Activity = {
  v: 2;
  id: string;
  projectId: string;
  target: ActivityTarget;
  type: string;            // an id from the target's catalogue (§2)
  customName?: string;     // Others only
  description: string;
  urls: string[];
  media: MediaRef[];
  pricing?: PriceSnapshot; // unchanged (P2-TABS-11)
  createdAt: number;
  updatedAt: number;
};
```

**Reading v1 entries:**
- `productId` present → `{ kind: "product", productId }`; absent → `{ kind: "project" }`.
- `type` is mapped through §2.5.
- An entry whose type isn't in its target's catalogue is dropped, as a malformed entry is today.

**Writing:** writes are always v2.

**The scope literal:** `"project"` matches `PROJECT_SCOPE` in `lib/market/types.ts`. It is written as a literal so `lib/manual` gains no new `lib/market` import, and the commerce-boundary test's exceptions don't grow.

**The catalogues** are `CATALOGUES: Record<TargetKind, readonly TypeDef[]>`, where `physical` and `virtual` have their own lists. They replace `STAGES`, which `step-details.tsx` and `share-post.ts` stop reading (§6.4).

## 4. Default Planning

- **Synthesized, never stored.** Every project gets one for the `project` target, and every product gets one for its `product` target.
  - `type: "planning"`, no media, no ⋮.
  - Description: "Project created." or "Product added."
- **Dates:**
  - the project's: `project.createdAt`;
  - a product's: the `savedAt` of the build that first brought it in, or the project's `createdAt` when there is none (a hand-made product, or a legacy build ref).
- **Every existing project gets it** with no migration. NFT targets have no default.
- It can't be edited or deleted. A maker who wants to show planning work adds a Planning entry of their own, with proof.

## 5. Rules

- **Proof (`checkActivity`):**
  - `attachments ≥ 1` is required on Add and on Edit, with the message "Add at least one photo, video, PDF or document." under Attach Media. Removing the last file on Edit therefore blocks Update.
  - URLs stay optional, https only, as today.
  - A stored legacy entry with links and no file keeps showing. It only has to gain a file to be saved again.
- **Permissions are unchanged:**
  - `activity.write` is owner only, and absent while the project is locked (sold in full).
  - Previews and buyers read only. They get no Add and no ⋮.
- **The price snapshot is unchanged:** it is taken on Add while the Main listing is live, it is never re-taken on Edit, and it is never shown to buyers.

**Reads:**
- `activitiesOf(journey, target)`: the target's stored entries, newest first, by exact target match.
- `historyOf(journey, target, ctx)`: those, plus the default Planning for a project or product target.
- `currentOf(journey, target, ctx)`: the first of `historyOf`, or `null` for an NFT with no entries.

These replace `activitiesFor` and `currentStage`. The product page no longer mixes in project entries, and the project no longer counts its products'.

## 6. Owner surfaces

### 6.1 Entry points
- **Project page ⋯ → Activity:** the drawer with target `project`. The item's sub-line reads "Now: {label}" instead of "{n} notes".
- **Product page ⋯ → Activity:** target `product`, with the same sub-line.
- **Earn › Sell rows:** each NFT row gains an **Activity line** under its state lines, inside the row: "Activity · {label} · {date} ›", or "Activity · Add the first one ›" before any. It opens the drawer for that row's target.
  - **Main NFT row:** shown once the project is minted (Lazy or Instant).
  - **Physical / Virtual row** (whole project, and each product): shown once that scope has a track of that kind.

  *Placement note:* the session said "inside Manage". But the Main row has no Manage until it's listed, so the line sits under the row, where it is visible in every row state. Raise it with the owner if this should move.

### 6.2 The drawer (`details/activity/drawer.tsx`)
- **Header:** the title stays "Activity History". The subtitle names the target, for example "Smart Lamp", "VoxLamp", "Main NFT", "VoxLamp · Physical NFT" or "Whole project · Virtual NFT", then "newest first". The "Use ⋮ to edit" hint stays only when an entry exists (from `feat/build-log-name`).
- **The list:** `historyOf(target)`. The default Planning row has no ⋮.
- **The form:**
  - Activity Type lists only the target's catalogue.
  - The Product select is removed, because the target is fixed by where the drawer opened.
  - Attach Media is marked required, with the error under the field and focus moving to the first invalid field on submit.
  - Attach URLs stays optional.
- **The announcer:** "{label} added to {target name}'s journey."

### 6.3 The owner's page header
The engineering meta line's "Stage {short}" becomes **"Now: {label}"**, from `currentOf(project)`. The Earn header reads the same.

### 6.4 The share flow
The share dialog (`projects/share-dialog.tsx`) and the Brief's details step (`brief/step-details.tsx`) drop the "Project status" field.
- `sharePostBlocker` asks only for the story.
- A stored `post.stage` is still parsed, and ignored.

## 6.5 Change after review (owner, 2026-10-13)

The owner found Activity hidden in the ⋯ menus and couldn't find the NFTs' activity in Earn › Sell. Both entry points moved to one **Activity card**: the rail's lead block on the owner's project page (above the tabs on a phone) and the first block of a product page's rail. It has a row per target, with its current activity, and each row opens that target's drawer. §6.1's ⋯ items and Earn › Sell lines are removed.

A second review the same day said that mixing the project's and its products' activity in one card confuses, and that the NFTs still couldn't be found. The final layout has two blocks at the top of the rail, each the page's own:
- **Activity:** this page's journey only. It reads as a buyer reads it, with + Add activity and Edit history.
- **NFT activity:** a tab per NFT the page sells. The project page has Main, Physical and Virtual (the whole project's copies); a product page has Physical and Virtual (its own). A tab is always shown; before its NFT exists it says so and links to Earn › Sell.

**Final layout, after the UX study (owner decisions, 2026-10-13):** https://claude.ai/artifact/SwMDKAjNaGyP7q42qHEuEt
- The name stays Activity.
- The engineering pages show only their own Activity, plus an owner link to Earn › Sell.
- NFT activity sits on each NFT row in Earn › Sell (D2).
- The sale lock still stops all writes.
- Buyer blocks get headings, Now/Latest with an age, and an empty note.

## 7. Viewer surfaces (buyer, owner preview, Innovations)

### 7.1 The "Now" block (one shared component)
- **The current entry:**
  - "Now" plus a pill with the type's label and the date;
  - the description, clamped to 4 lines with Show more;
  - proof tiles: 44 px tap targets, images open the lightbox, videos play in it, PDF and DOC download;
  - link cards, through the existing link-confirm dialog.
- **"Earlier ({n}) ▾":** a disclosure button (`aria-expanded`, `aria-controls`). It reveals an `<ol>` of the earlier entries, newest first, each the same shape and compact, inline below. There is no floating menu and no nested scroller. The default Planning is the last entry.
- **No owner controls,** and no price snapshot.
- **Screen readers:** each tile is named, for example "Open photo 1 of 3"; the disclosure states open or closed. On a phone it's full width.

### 7.2 Placements
- **Buyer project page** (`/marketplace/[id]`, `MARKET_SLOTS`): the block sits under the description, with target `project`.
- **Buyer product page** (`/marketplace/[id]/products/[productId]`): target `product`.
- **The buyer rail's Main NFT card:** a compact block above the price and Buy now, with target `main`. It is absent when Main has no entries.
- **The buyer rail's edition offers:** they are grouped by scope. The block appears once per (scope, kind), above that kind's first card, so a Personal and a Business card don't repeat it. It is absent when there are no entries.
- **Owner "Preview as buyer":** the same as the buyer, as today.
- **Products tab card pill:** `currentOf(product)`'s short, which is "Planning" before any entry, so every product now has a pill.
- **Innovations:** "Shared by you" (`newsfeed/shared-by-you.tsx`) and any other post-status reader show `currentOf(project)`'s label. It updates as entries are added, existing posts included.

## 8. Edge cases
- **A product removed or dropped from the project:** its entries stay stored. They show wherever that product's page still renders, and nowhere else.
- **A track removed or a listing ended:** the entries stay. The owner's row line still opens them; the buyer card is gone with its offer.
- **A project deleted:** its journey key and media are swept, as today. NFT entries live in the same journey, so they go with it.
- **A sold-in-full (locked) project:** it reads as above, with no Add anywhere.
- **Equal `createdAt`:** ordered by id, so "current" is stable.

## 9. Testing
- **Unit tests** (`tests/projects/journey.test.mjs` and others):
  - each catalogue's shape;
  - the v1 → v2 read, covering the target and the type map, with an unknown type dropped;
  - the default Planning, its dates and its absence for NFTs;
  - `checkActivity`'s proof rule on Add and Edit;
  - `currentOf` and `historyOf`, covering ties, Others and the exact target match;
  - `sharePostBlocker` without a stage;
  - the products-tab pill;
  - the commerce-boundary test unchanged.
- **Browser, on the dev server:**
  - As the owner, add entries to the project, a product, Main and one Physical scope, and check that a file is required.
  - In Preview as buyer and on `/marketplace/[id]`, check Now, Earlier, the tiles and the links.
  - Check that the Physical block appears once per scope.
  - Check that the Innovations status follows the newest project entry.
  - Check a phone width at 375 px.

## 10. Out of scope
- Server-side media: files stay in this browser's IndexedDB, as today.
- Notifying buyers of a new entry.
- Editing or hiding the default Planning.
- Per-licence (Personal / Business) activities.
- An activity block on the Innovations post page beyond its status label.

# Messages — design (2026-10-13)

The platform's one place for people to talk to people. Built on the demo identities (no accounts or server exist), behind a store interface a real backend can replace later without touching the UI.

- **Plan the owner approved:** https://claude.ai/artifact/GEezBYDQhL7V3YHjN7hs8i. Owner, 2026-10-13: "Figma is a totally different style — don't look at it; go with your plan, we'll correct after. Finalize everything and start. There's no real backend, so work with demo users." Every decision D1–D10 takes the recommended option.
- **Branch:** `feat/messages`, cut from `feat/activity-everywhere` (b55030c).

## 1. Decisions (final)

| # | Decision | Final |
|---|---|---|
| D1 | Build order | Demo-local first, behind `MessagesStore`; a server adapter later (Phase 4) |
| D2 | What a conversation is | Two people + one subject (a project, or an Innovations post). A project's team has one group conversation |
| D3 | Who can start | A known relationship (listing, purchase, team) → the recipient's Inbox; anyone else → their Requests |
| D4 | Free "New message" | None. Conversations start from a context |
| D5 | Offers or price in Messages | None. Buying stays on the marketplace; a card links to it |
| D6 | Message all holders | None. That is Activity's job; Customers links there |
| D7 | Where unread shows | Only the sidebar's Messages badge. The bell never counts messages |
| D8 | Files | Images (JPEG, PNG, WebP, GIF) and PDF, ≤ 10 MB each, ≤ 5 per message |
| D9 | Edit / delete | Own message, within 15 minutes; a delete leaves "Message deleted" |
| D10 | Friend vs Follow | Follow only. Messages adds no friend request |

Out of scope, said plainly: real accounts, email/push, a moderation queue, reading a report, translation, read receipts, typing, voice notes, offers, Gerber/zip files, IDEEZA Support inbox. **Restricted accounts** (the plan's M3 row) are not built: the app has no restriction model to read, and inventing one would be a stub.

## 2. Boundaries — one home each

- Messages = people only. The AI concept chat is never called "Chat" or "Messages" here, and Messages never says "chat".
- System events (sold, bid, build ready) stay in the bell. Holder-wide updates stay in Activity. Buying, bidding and prices stay on the marketplace; a conversation's card has **Open**, never Buy.
- Each entry point below is the only messaging control on its surface. The buyer rail's "Get creator support" dialog (`support-dialog.tsx`) is replaced, not kept beside the new entry.

## 3. People in the demo

A person is a `PersonId` plus a display name, resolved live from the stores that already exist, with a name snapshot kept on the conversation for when the source is gone:

| PersonId | Who | Source | Role tag shown to others |
|---|---|---|---|
| `me` | You, the maker (owns every project in this browser) | — | **Creator** |
| `buyer-mira` · `buyer-leo` · `buyer-sam` | The three demo buyers | `DEMO_BUYERS` | **Customer** when they hold any sale of the subject project, else **Buyer** |
| `ctb_…` | A project's team member | `project.contributors` | **Team · {Role}** |
| `feed:<creatorId>` | A creator of a sample Innovations post | `PROJECTS` in `lib/feed.ts` | **Creator** |

**Acting as (demo only, per tab).** `/messages` carries a switch: You · Mira · Leo · Sam · each team member (named with their project) · each Innovations creator someone has written to. The choice lives in `sessionStorage` (`ideeza:messages:as`), so two tabs can be two people; any `/messages…?as=<id>` link sets it. Acting as anyone but You shows a line: "You're acting as Mira (demo buyer). What you send now is from Mira." with **Back to you**. The switch is a demo affordance and leaves at the production cut (`demo-only-items`).

## 4. Data

One localStorage key, `ideeza:messages`, through `key-store.ts` (live across tabs through its `storage` subscription; every write reports to `reportWrite`; an unreadable key is never overwritten). Files go to IndexedDB `ideeza-messages` / `files`, indexed by `conversationId` (not `ideeza-media`: a project's delete sweep must not take a buyer's attachments).

```ts
type Subject =
  | { kind: "project"; projectId: string; name: string }   // name: snapshot
  | { kind: "post"; slug: string; title: string };
type ContextRef =
  | { kind: "listing" }                 // asked from the marketplace before buying
  | { kind: "purchase"; saleId: string } // a holder's support, or the creator writing to a customer
  | { kind: "team" }
  | { kind: "post" };
type Participant = { id: PersonId; name: string };
type MemberState = { folder: "inbox" | "requests"; lastReadAt: number; archived: boolean; muted: boolean; declined: boolean };
type Conversation = {
  id: string;                           // "cnv_…"
  kind: "direct" | "team";
  key: string;                          // threadKeyOf(...) — unique
  subject: Subject;
  participants: Participant[];          // direct: the two; team: creator only (members are read live from the project)
  startedBy: PersonId;
  createdAt: number;
  lastAt: number;
  state: Record<string, MemberState>;   // by PersonId, written lazily
};
type FileRef = { key: string; name: string; type: string; size: number };
type CardRef = { kind: "project"; projectId: string; name: string };
type Entry =
  | { id: string; conversationId: string; kind: "message"; from: PersonId; at: number; text: string;
      files: FileRef[]; cards: CardRef[]; editedAt?: number; deletedAt?: number; sourceId?: string }
  | { id: string; conversationId: string; kind: "context"; from: PersonId; at: number; context: ContextRef };
type MessagesData = {
  v: 1;
  conversations: Conversation[];
  entries: Entry[];
  blocks: { by: PersonId; who: PersonId; at: number }[];
  reports: { id: string; by: PersonId; conversationId: string; entryId?: string; reason: ReportReason; note: string; at: number }[];
  settings: Record<string, { allowNew: "everyone" | "known" }>;
};
```

Every read is normalized (bad rows dropped, never repaired); a write is read-modify-write on the freshest stored value, so two tabs don't drop each other's messages.

## 5. Rules (pure, `src/lib/messages/`, node:test)

- **Thread key:** direct = `d|<subjectKey>|<a>|<b>` with the two ids sorted; team = `t|<projectId>`. Opening an entry point for an existing key opens that conversation.
- **Folder for the recipient** when a conversation starts: `inbox` if the opening context is `listing`, `purchase` or `team`, or the two already share a conversation the recipient answered; else `requests`. The starter's own folder is `inbox`.
- **Can start:** no if either blocked the other; no if the recipient's `allowNew` is `known` and the relationship isn't known (the entry control then reads disabled with "{Name} only takes messages from people they work with."). Default `allowNew` is `everyone`.
- **Requests:** **Accept** moves it to Inbox; replying accepts; **Delete** sets `declined` (hidden from the recipient; the sender isn't told); **Block** blocks. A declined conversation reopens for the recipient only if they start one.
- **Block:** the blocked person's composer reads "You can't reply to this conversation."; the blocker's reads "You blocked {Name}." with **Unblock**. Team conversations have no Block.
- **Send:** text trimmed, ≤ 2,000 characters; a message needs text, a file or a card. Files per D8. A sender's pending context (the entry point's `about`) is written as a context entry just before the message when it differs from the conversation's latest context.
- **Edit / delete (D9):** own, not deleted, within 15 minutes of `at`. Delete clears text, files and cards and sets `deletedAt`.
- **Unread:** a conversation is unread for a person when an entry from someone else is newer than their `lastReadAt`. The sidebar badge = unread Inbox conversations, not archived, not muted. Requests show their own count on the Requests tab only. Archive is undone by a new entry from someone else.
- **Risk warning:** a received message whose text names a wallet address (`0x` + 40 hex), a seed or recovery phrase, a private key, or paying or sending money outside the marketplace (bank transfer, PayPal, "send to my wallet", WhatsApp/Telegram for payment) shows, to the reader only: "Careful — this message mentions a wallet or paying outside IDEEZA. Pay only through the marketplace." Rule list in one function with tests.
- **Team conversation:** members = `me` + the project's current contributors. A removed contributor can no longer see it. A deleted project leaves it read-only.
- **A deleted project:** direct conversations stay and can continue; the card reads "Project deleted" with no link.
- **Migration:** each `ideeza:market:support` record becomes a buyer → creator conversation about its project with a `purchase` context and the request as the buyer's first message (`sourceId` = the request id, so running it twice adds nothing). Runs once per tab when the messages store first reads.

## 6. Screens

All new text is ≥ 14 px (`text-md`; owner, type scale), tokens only, light + dark, 44 px targets at phone width.

### `/messages` and `/messages/[conversationId]` (the `(create)` shell)

- **Width ≥ 1024 px:** two panes — the list (320 px) and the open conversation (or "Choose a conversation" on `/messages`). **Below:** one pane — `/messages` is the list, a conversation is full width with **‹ Messages** back.
- **List pane header:** h1 "Messages", the **Acting as** select, a settings icon button ("Message settings"). Under it, one quiet line: "Demo · messages stay in this browser."
- **Tabs** (`ButtonGroup`, a view switch): **Inbox** (unread count) · **Requests** (count).
- **Search** (people, subject and message text) and filter chips **All · Unread · Archived** (`aria-pressed`) plus a **Project** select (the subjects present).
- **Row** (a link; `aria-current` on the open one): initials avatar, name, role tag, the subject's name, the last message's first line ("You: …" when it is yours; "Sent a file" or "Shared a project" when it has no text), short time (now · 5m · 2h · Mon · 12 Oct), and an unread dot with the name in bold. A muted conversation shows a muted icon.
- **Empty Inbox:** "No messages yet" + "Conversations start from a project: buyers ask from your listing, and you can message a customer from Earn › Money › Customers or a teammate from the project's Team tab." **Empty Requests:** "No requests" + "Messages from people you haven't worked with land here first."
- **Conversation header:** the person (or "{Project} team" with the member count), the role tag, and ⋯ (portalled menu): Mute/Unmute · Archive/Unarchive · Block/Unblock (direct only) · Report…
- **Request bar** (when it is in my Requests): "{Name} wants to message you about {subject}." **Accept** · **Delete** · **Block**.
- **Context card** under the header, for the latest context: the project's cover (`coverOf`) or an initials tile, the subject name, a line ("Main NFT listing" / "Physical copy · bought 12 Oct" / "Team · Editor" / "Innovations post"), and **Open** when the reader may open it (the maker → `/projects/<id>`; anyone else → `/marketplace/<id>` while the project has a live Main listing or live copies; a post → `/innovations/<slug>`). Otherwise: "Only the creator can open this project." / "Project deleted".
- **Timeline** (`role="log"`): a safety line at the top ("IDEEZA never asks you to pay or share your wallet phrase in Messages."); day dividers; bubbles — mine right (brand-subtle), others left (subtle), the sender's name above in a team conversation; time under each group; "Edited"; "Message deleted"; context entries as a centred line ("Mira bought a Physical copy of Smart Lamp", "Leo asked about the Main NFT listing"); images as thumbnails that open full size, PDFs as a file row (name, size) that opens; project cards like the context card. The risk warning sits under a received risky message. Own messages within 15 minutes get ⋯ → Edit · Delete; others' get ⋯ → Report message.
- **Composer:** the pending-context chip ("About: Physical copy of Smart Lamp"), an autosizing textarea ("Write a message…", labelled "Message to {Name}"), **+** (Photo or PDF · Project — Project only for the maker), chips for attached files and cards with remove, **Send** (primary). Enter sends, Shift+Enter adds a line; a counter from 1,800 characters; errors inline ("This browser's storage is full — your message wasn't sent."). Replaced by the block / read-only line when sending isn't possible.
- **Live:** another tab's write updates this one; a new entry from someone else in the open conversation is announced politely and marks it read while the page is visible.
- **`/messages/new`** resolves an entry point: `?to=<personId>&project=<id>&about=listing|purchase:<saleId>|team` or `?to=feed:<id>&post=<slug>` or `?team=<projectId>`, plus `?as=`. An existing conversation → replace the URL with it (the `about` becomes its pending context). None → a draft view of the same screen; the first Send creates it. An impossible start (blocked, `known` only, missing project) says why with a link back.
- **Message settings** (dialog): "Who can start a conversation with you" — **Anyone** (new people go to Requests) · **Only people you work with** (buyers, customers and your team); the blocked list with **Unblock**. Per acting person.
- **Report** (dialog): Spam · Scam or asks to pay outside IDEEZA · Harassment · Something else, an optional note, and "Also block {Name}". Confirmation: "Report saved. In this demo nobody reviews reports yet."

### Entry points

| Surface | Control | Opens |
|---|---|---|
| Buyer rail, `/marketplace/[id]` (a demo buyer) | Last in the Marketplace block: **Get creator support** when the buyer holds any sale of the project, else **Ask the creator** (secondary, full width). Replaces Purchased Summary's button, its "Request sent" line and `SupportDialog` | `/messages/new?to=me&project=<id>&about=purchase:<latest sale>` or `about=listing`, `as=<buyerId>` |
| Earn › Money › Customers (and the product's Customers) | In a row's sale details: **Message {Name}** | `…to=<buyerId>&project=<id>&about=purchase:<saleId>&as=me` |
| Project › Team tab (owner) | Per row: **Message**; above the list: **Team conversation** | `…to=<ctbId>&project=<id>&about=team&as=me`; `…team=<projectId>&as=me` |
| `/innovations/[slug]` (a sample post) | Under the title: the creator's avatar and name and **Message** | `…to=feed:<creatorId>&post=<slug>` (sender = the tab's acting person) |
| Customers (above the table) | One quiet line: "To tell every customer at once, add to Activity." linking the Activity block | — |
| Sidebar + ⌘K | **Messages** → `/messages`, with the unread badge (a dot when collapsed) | — |

## 7. Code layout

- `src/lib/messages/` — `types.ts`, `rules.ts` (keys, folders, can-start, edit, unread, list derivation, search, roles), `risk.ts`, `normalize.ts`, `migrate.ts`, `links.ts` (entry-point hrefs), `store.ts` (the `MessagesStore` interface + the local adapter over `key-store`), `files.ts` (IndexedDB), `identity.ts` (acting-as), `people.ts` (live person resolution). Pure modules are added to `tests/projects/tsconfig.json` and tested.
- `src/app/(create)/messages/` — `page.tsx`, `[conversationId]/page.tsx`, `new/page.tsx`.
- `src/components/messages/` — the list, conversation, composer, context card, dialogs.
- Edits: `dashboard/sidebar.tsx`, `marketplace/buyer-rail.tsx` + `purchased-summary.tsx` (and `support-dialog.tsx` removed), `projects/details/customers-tab.tsx`, `projects/details/team-tab.tsx`, `app/(dashboard)/innovations/[slug]/page.tsx`.
- Docs in the same change: a features guide `docs/guides/features/messages.md` (+ its README index), `app-map.md`, `src/app/README.md`, `STRUCTURE.md`, `docs/map/PRODUCT.md`, `src/lib/README.md`, `src/components/README.md`.

## 8. Done means

tsc clean, lint clean on touched files, `npm run test:projects` green, `next build` exits 0, and browser-verified on a dev server at 1280 and 375 px, light and dark: two tabs (You and Mira) talk live; every entry point opens the right conversation with the right card; Requests accept/delete/block; edit/delete window; files and project cards; risk warning; settings; migration of an old support request; sidebar badge.

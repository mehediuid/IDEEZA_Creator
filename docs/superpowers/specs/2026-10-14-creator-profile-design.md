# Creator profile — design (v1, Phases 1–3)

Owner request 2026-10-13: a 20–30 person UX team decides what a creator's personal profile should be in the AI era.
Study and plan: https://claude.ai/artifact/VubSkpycSfCDnEC2cqzRfw (26 modeled lenses, 40 modeled intents, three concepts scored).
Mockup: https://claude.ai/artifact/SD1enxK69bxPuNNsXK3mYL. The owner approved every recommended decision D1–D11 (2026-10-14) and the mockup ("Phase 1 থেকে build শুরু করো").

## What the profile is

A **proof page**: what a creator made and put out, whether it is still moving, and how the viewer is connected to them. It is the same page for every viewer; your own view adds only Edit profile and one owner-only line. It never shows money.

## Decisions (approved)

| | Decision |
|---|---|
| D1 | Proof page, launched lean: v1 shows only what is real today; later sections switch on when their data is real |
| D2 | Route `/creators/<handle>`; `/creators/me` is your own |
| D3 | Follow is one control: the same person block and the same store (`ideeza:innovations:reactions.follow`) on the profile header and the post's maker block |
| D4 | The only public number is "N projects shared"; no follower or following counts |
| D5 | No XP, level, plan or credits on the profile (they stay in the account menu) |
| D6 | Cut from User Panel V2: cover image, Friends, three stats, Post/Article/More tabs, typed skills and specialties, birthday, gender, phone, address, wallet, lock profile, View as public, Settings › Profile |
| D7 | AI in v1 is one opt-in helper: "Suggest from my work" drafts the headline from your shared projects; nothing saves until you press Use this, then Save |
| D8 | Report and Block work now, as Messages already does: Block writes the Messages blocked list; Report saves a record and says "Reports aren't reviewed yet in this demo" |
| D9 | The "AI build · you changed PCB, Code" line waits for a build-vs-edit comparison (not in v1) |
| D10 | Copies and shares a person owns never show on a profile; a money tie shows only to the two people involved, as the viewer's relation line |
| D11 | Names in any script; Noto Sans Bengali joins the app's fonts; initials never split a letter |

## Page anatomy

Header (no box): avatar (photo or initials, DS A16 XL 64 px; 48 px on a phone) · name (h1, any script) · the name in English letters when it differs (caption) · headline (60 characters) · facts line ("Building here since Mar 2026 · 4 projects shared", zeros hidden) · the viewer's relation line (verbs, "Owns a Physical copy of your Smart Lamp") · actions.

Actions: someone else's — **Follow** (the one violet control) · Message (obeys their "who can message you" rule; disabled with the reason) · ⋯ (Report profile · Block {name}). Your own — **Edit profile** (secondary).

Owner-only line (your own view only, grey surface): "Only you see this · Others see N projects. · M private in My projects › · You follow K ›".

**Made** (h2): the projects already public — shared to Innovations, or with a live Main listing or live copies — newest change first, up to three pinned ones first. Card: cover, title, current Activity (short name) with its age, and "For sale" / "Copies for sale". A card opens the public page: the post when shared, else the marketplace listing. Your own cards carry ⋯ › Pin to top / Unpin.

Empty states: your own — "Nothing shared yet · Projects you share to Innovations or put on sale show here. Everything else stays private." + **Share a project** (opens My projects). Someone else's — "{Name} hasn't shared a project yet."

Phone (< md): the same order; a 48 px avatar; Follow and Message (or Edit profile) in a fixed bottom bar.

## Privacy rule (one function)

`madeOf` reads only shared or live-listed projects. Drafts, private projects, History, chats, holdings, wallet addresses, earnings and XP never reach the profile, not even as a count, except the owner-only line, which only the owner sees.

## People and ids

One canonical person id, the Messages scheme: `"me"`, `"feed:c3"` (Innovations creators and commenters), `"buyer-mira"` (demo creators). Ids are mapped on read (`canonicalId`), never rewritten in storage. Names an owner typed into a project team (`ctb_…`) stay plain text: they belong to nobody yet.

Handles: `me`; a sample person's handle is their name slugified (`naim-rahman`, `mira`), unique among the known people.

Every person except you is a demo person and carries a **Demo creator** badge (the app's existing wording, "Mira (demo creator)").

## Your profile fields

`ideeza:profile` (localStorage): `{ v: 1, name, latinName, headline, pins, since }`. The photo is a 256 px JPEG in IndexedDB (`ideeza-profile` / `files` / `photo`), resized on the device. Name ≤ 60, English-letters name ≤ 60, headline ≤ 60, pins ≤ 3 project ids. An empty name reads "You".

## Edit profile

One dialog (the only home of these fields): photo (Upload photo · Remove), Name ("Any script. This is the name other creators see."), Name in English letters (optional), Headline (60, counter) with **Suggest from my work** (AI button). The suggestion calls `/api/profile/headline` with your shared projects' titles and stories only; the draft sits under the field ("Draft from your N shared projects · not saved") with Use this / Discard; a failure says "Couldn't write a suggestion. Try again." Cancel asks "Discard changes?" when something changed.

## Where it is reached

The account menu's Profile row and ⌘K "Profile" open `/creators/me`. In Phase 2 every person's name becomes a link: feed card, post maker block, comment author, Messages list and header, Team tab (real people only), Earn › Money › Splits and Sales, bids.

## Phases

1. One person, one page: `src/lib/people`, the profile store and photo, `/creators/[handle]` (own view), Edit profile with the AI suggestion, entry points.
2. Every name is a link: other people's pages (sample creators, commenters, demo creators), the relation line, the shared person block (Follow · Message · ⋯ Report/Block), your Following list.
3. Hardening and docs: storage full or blocked, deleted projects, both themes, 375 px, keyboard and screen reader, the features guide.

Not in v1 (later, when the data is real): the made-how line, skills from work, Worked on, Parts, About (bio, languages, local time, Open to), handles you choose, sharing links and QR, people search, followers list, shipping record, a real identity check.

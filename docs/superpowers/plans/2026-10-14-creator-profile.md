# Creator profile v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every creator gets one proof page at `/creators/<handle>`: what they made and put out, its current Activity, how the viewer is connected to them, with Follow / Message / Report / Block, and an Edit profile dialog for your own.

**Architecture:** A pure people layer (`src/lib/people/`: ids and handles, profile fields, the Made list, relation ties, the headline prompt) under node:test; two small client stores (`ideeza:profile` in localStorage, the photo in IndexedDB); one client page (`src/components/profile/`) behind a thin server route in the `(dashboard)` group; existing stores supply everything else (projects, builds, journey, market, editions, reactions, messages).

**Tech Stack:** Next.js 16.2.9 App Router (read `node_modules/next/dist/docs/` before Next-specific code), React 19, TypeScript, Tailwind preset over DS tokens, the app's DS atoms in `src/components/ideeza/`, node:test via `npm run test:projects`.

Spec: `docs/superpowers/specs/2026-10-14-creator-profile-design.md`.

## Global Constraints

- Tokens only, classes not inline styles (except data such as a person's colour), light + dark (AGENTS.md UI/UX hard rules).
- One control, one home: Follow is one component on one store; profile fields are edited only in Edit profile.
- Real logic, no stubs: a control works or is disabled with its reason. No "Soon" rows.
- Never show money, holdings, wallet addresses, XP or follower counts on a profile.
- Pure modules under `src/lib/people/` use relative imports only (node:test loads the compiled JS).
- Copy: sentence case, verbs from the viewer's side, no user types ("buyer", "seller"), no em-dash doing a full stop's job.
- `npx tsc --noEmit -p tsconfig.json`, `npm run lint` (no new errors), `npm run test:projects` must pass; UI is browser-verified (light, dark, 375 px).
- Commit per task: `feat(profile): …`. Never push.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/people/ids.ts` | canonical person ids, the directory of known people, handles, initials, display name |
| `src/lib/people/fields.ts` | `ProfileFields` shape, limits, normalize, pins |
| `src/lib/people/made.ts` | the Made list for you and for a sample person; owner counts |
| `src/lib/people/ties.ts` | the viewer's relation line to another person |
| `src/lib/people/headline.ts` | the AI suggestion's prompt and reply cleaning |
| `src/lib/people/profile-store.ts` | `useMyProfile()`: read/write `ideeza:profile` (client) |
| `src/lib/people/photo-store.ts` | the photo in IndexedDB, resize on device, `useMyPhoto()` |
| `src/app/(dashboard)/creators/[handle]/page.tsx` | thin server route + Suspense |
| `src/app/api/profile/headline/route.ts` | the headline suggestion (Pollinations, 45 s, 503 on failure) |
| `src/components/profile/profile-page.tsx` | resolves the handle and the stores, chooses own / other view |
| `src/components/profile/profile-header.tsx` | avatar, names, headline, facts, relation line, actions |
| `src/components/profile/owner-line.tsx` | "Only you see this" line |
| `src/components/profile/made-section.tsx` | the Made grid, card, pin menu, empty states |
| `src/components/profile/edit-profile-dialog.tsx` | the one editor of profile fields |
| `src/components/profile/person-block.tsx` | Phase 2: Follow · Message · ⋯ shared with the post maker block |
| `src/components/profile/person-name.tsx` | Phase 2: a person's name as a link |
| `tests/projects/people.test.mjs` | node:test for the pure modules |

---

### Task 1: People ids, directory and initials

**Files:**
- Create: `src/lib/people/ids.ts`
- Modify: `tests/projects/tsconfig.json` (add `"../../src/lib/people/**/*"` to `include`)
- Test: `tests/projects/people.test.mjs`

**Interfaces:**
- Produces:
  - `type PersonId = string`; `const ME = "me"`
  - `type PersonKind = "me" | "feed" | "demo"`
  - `type Person = { id: PersonId; kind: PersonKind; handle: string; name: string; latinName: string | null; initials: string; color: string | null }`
  - `canonicalId(raw: string, from: "innovations" | "messages"): PersonId` — innovations `"you"` → `"me"`, `"c3"`/`"k2"` → `"feed:c3"`/`"feed:k2"`; messages ids unchanged.
  - `initialsOf(name: string, latinName?: string | null): string` — from the English-letters name when given, else the first grapheme of the first and last word (Intl.Segmenter), upper-cased; `"?"` for empty.
  - `displayNameOf(name: string): string` — trimmed name, else `"You"`.
  - `directory(me: { name: string; latinName: string }): Person[]` — you first (handle `"me"`), then the eight feed creators, the six commenters, the three demo creators, each with a unique slug handle (`slugify` from `../innovations/slug`), feed people with their dataset colour.
  - `personByHandle(dir: Person[], handle: string): Person | null`, `personById(dir, id): Person | null`, `profileHref(person: Person): string` → `/creators/${handle}`.

- [ ] **Step 1: Write the failing tests** (`tests/projects/people.test.mjs`)

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ME, canonicalId, initialsOf, displayNameOf, directory, personByHandle, personById, profileHref } from "../../.tmp-test/lib/people/ids.js";

test("canonicalId maps Innovations ids onto the Messages scheme", () => {
  assert.equal(canonicalId("you", "innovations"), ME);
  assert.equal(canonicalId("c3", "innovations"), "feed:c3");
  assert.equal(canonicalId("k2", "innovations"), "feed:k2");
  assert.equal(canonicalId("buyer-mira", "messages"), "buyer-mira");
  assert.equal(canonicalId("me", "messages"), ME);
});

test("initialsOf prefers the English-letters name and never splits a Bengali letter", () => {
  assert.equal(initialsOf("নাঈম রহমান", "Naim Rahman"), "NR");
  assert.equal(initialsOf("নাঈম রহমান", null), "নার");
  assert.equal(initialsOf("Mira"), "M");
  assert.equal(initialsOf("  "), "?");
});

test("displayNameOf falls back to You", () => {
  assert.equal(displayNameOf("  Rafiq Ahmed "), "Rafiq Ahmed");
  assert.equal(displayNameOf("   "), "You");
});

test("directory lists you first, then every sample person with a unique handle", () => {
  const dir = directory({ name: "", latinName: "" });
  assert.equal(dir[0].id, ME);
  assert.equal(dir[0].handle, "me");
  assert.equal(dir[0].name, "You");
  const handles = dir.map((p) => p.handle);
  assert.equal(new Set(handles).size, handles.length);
  const naim = personByHandle(dir, "naim-rahman");
  assert.equal(naim?.id, "feed:c1");
  assert.equal(naim?.kind, "feed");
  assert.equal(personByHandle(dir, "mira")?.id, "buyer-mira");
  assert.equal(personById(dir, "feed:k1")?.name, "Kai Moreno");
  assert.equal(personByHandle(dir, "nobody"), null);
  assert.equal(profileHref(naim), "/creators/naim-rahman");
});

test("your entry carries your names", () => {
  const me = directory({ name: "রফিক আহমেদ", latinName: "Rafiq Ahmed" })[0];
  assert.equal(me.name, "রফিক আহমেদ");
  assert.equal(me.latinName, "Rafiq Ahmed");
  assert.equal(me.initials, "RA");
});
```

- [ ] **Step 2:** Run `npm run test:projects` → FAIL (module missing).
- [ ] **Step 3:** Implement `src/lib/people/ids.ts` to the interface above. Sources: `CREATORS` (`../feed`), the commenters through `SAMPLE_PEOPLE_IDS` + `personOf` (`../innovations/people`), `DEMO_BUYERS` (`../wallet/identities`). A Bengali initial pair is two graphemes joined ("না" + "র" = "নার"). Duplicate slugs get `-2`, `-3`.
- [ ] **Step 4:** `npm run test:projects` → PASS.
- [ ] **Step 5:** Commit `feat(profile): one person id, a directory of known people and their handles`.

### Task 2: Profile fields

**Files:** Create `src/lib/people/fields.ts`; test in `tests/projects/people.test.mjs`.

**Interfaces:**
- Produces: `PROFILE_KEY = "ideeza:profile"`, `NAME_MAX = 60`, `HEADLINE_MAX = 60`, `PINS_MAX = 3`, `type ProfileFields = { v: 1; name: string; latinName: string; headline: string; pins: string[]; since: number | null }`, `EMPTY_PROFILE`, `normalizeProfile(raw: unknown): ProfileFields` (clips every string, drops non-string pins, dedupes, keeps the first 3, `since` a finite number or null), `pinToggled(f: ProfileFields, projectId: string): { fields: ProfileFields; refused: boolean }` (refused when adding a 4th).

- [ ] **Step 1: tests**

```js
import { EMPTY_PROFILE, normalizeProfile, pinToggled, PINS_MAX } from "../../.tmp-test/lib/people/fields.js";

test("normalizeProfile clips, dedupes and repairs", () => {
  const f = normalizeProfile({ v: 1, name: "x".repeat(80), latinName: 3, headline: "  Lamps  ", pins: ["a", "a", 1, "b", "c", "d"], since: "x" });
  assert.equal(f.name.length, 60);
  assert.equal(f.latinName, "");
  assert.equal(f.headline, "Lamps");
  assert.deepEqual(f.pins, ["a", "b", "c"]);
  assert.equal(f.since, null);
  assert.deepEqual(normalizeProfile(null), EMPTY_PROFILE);
});

test("pinToggled adds, removes and refuses a fourth", () => {
  let f = { ...EMPTY_PROFILE, pins: ["a", "b"] };
  f = pinToggled(f, "c").fields;
  assert.deepEqual(f.pins, ["a", "b", "c"]);
  const r = pinToggled(f, "d");
  assert.equal(r.refused, true);
  assert.equal(r.fields.pins.length, PINS_MAX);
  assert.deepEqual(pinToggled(f, "b").fields.pins, ["a", "c"]);
});
```

- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5:** Commit `feat(profile): profile fields, limits and pins`.

### Task 3: The Made list

**Files:** Create `src/lib/people/made.ts`; tests.

**Interfaces:**
- Consumes: `currentOf`, `shortOf` (`../manual/journey`), `postHref`, `mineSlugOf` (`../innovations/slug`), `sampleJourneyOf` (`../innovations/sample-activity`), `InnovationPost` (`../innovations/types`).
- Produces:
  - `type MadeItem = { key: string; projectId: string | null; title: string; href: string; cover: string | null; stage: string | null; stageAt: number | null; sale: "whole" | "copies" | null; pinned: boolean; changedAt: number }`
  - `type MineInput = { id: string; name: string; createdAt: number; showcasedAt: number | null; cover: string | null; mainLive: boolean; copiesLive: boolean; journey: ProjectJourney; listedAt: number | null }`
  - `madeOfMine(projects: MineInput[], pins: string[]): MadeItem[]` — only `showcasedAt !== null || mainLive || copiesLive`; href = post when shared, else `/marketplace/${id}`; sale = whole if mainLive, else copies if copiesLive; stage = current project activity's short name and its `updatedAt`; `changedAt` = max(stageAt, showcasedAt, listedAt); pinned first in pin order, then `changedAt` desc.
  - `madeOfSample(posts: InnovationPost[], creatorFeedId: string): MadeItem[]` — that creator's posts, stage from `sampleJourneyOf(post)`, sale = whole when `post.listing`, cover = the first image media's src, else the first product image.
  - `ownerCounts(all: { id: string }[], made: MadeItem[]): { shown: number; hidden: number }`.

- [ ] **Step 1: tests** (fixtures inline: three projects — shared, live-listed, private; one pinned; a journey with a Testing entry)

```js
import { madeOfMine, madeOfSample, ownerCounts } from "../../.tmp-test/lib/people/made.js";
import { SAMPLE_POSTS } from "../../.tmp-test/lib/innovations/sample-posts.js";

const J0 = { v: 1, activities: [] };
const jTesting = (id, at) => ({ v: 1, activities: [{ v: 2, id: "a1", projectId: id, target: { kind: "project" }, type: "testing", description: "", urls: [], media: [], createdAt: at, updatedAt: at }] });
const P = (o) => ({ cover: null, mainLive: false, copiesLive: false, journey: J0, listedAt: null, showcasedAt: null, createdAt: 1, ...o });

test("madeOfMine shows only shared or live-listed projects, never private ones", () => {
  const list = madeOfMine([
    P({ id: "p1", name: "Smart Lamp", showcasedAt: 50, journey: jTesting("p1", 60) }),
    P({ id: "p2", name: "Pump Timer", mainLive: true, listedAt: 40 }),
    P({ id: "p3", name: "Secret Thing" }),
    P({ id: "p4", name: "Fan", copiesLive: true, listedAt: 10 }),
  ], []);
  assert.deepEqual(list.map((m) => m.title), ["Smart Lamp", "Pump Timer", "Fan"]);
  assert.equal(list[0].href, "/innovations/smart-lamp");
  assert.equal(list[0].stage, "Testing");
  assert.equal(list[0].stageAt, 60);
  assert.equal(list[1].href, "/marketplace/p2");
  assert.equal(list[1].sale, "whole");
  assert.equal(list[2].sale, "copies");
});

test("pins come first, in pin order", () => {
  const list = madeOfMine([
    P({ id: "p1", name: "A", showcasedAt: 90 }),
    P({ id: "p2", name: "B", showcasedAt: 10 }),
  ], ["p2"]);
  assert.deepEqual(list.map((m) => [m.title, m.pinned]), [["B", true], ["A", false]]);
});

test("ownerCounts names what others see and what stays private", () => {
  const made = madeOfMine([P({ id: "p1", name: "A", showcasedAt: 1 })], []);
  assert.deepEqual(ownerCounts([{ id: "p1" }, { id: "p2" }, { id: "p3" }], made), { shown: 1, hidden: 2 });
});

test("madeOfSample lists one creator's posts with their stage", () => {
  const list = madeOfSample(SAMPLE_POSTS, "c1");
  assert.ok(list.length > 0);
  assert.ok(list.every((m) => m.href.startsWith("/innovations/")));
  assert.ok(list.every((m) => typeof m.stage === "string"));
});
```

- [ ] **Step 2–4:** fail, implement, pass. (The default Planning entry has no stored `updatedAt`; use `createdAt` of the project for it.)
- [ ] **Step 5:** Commit `feat(profile): the Made list — only what is already public`.

### Task 4: Profile store and photo

**Files:** Create `src/lib/people/profile-store.ts`, `src/lib/people/photo-store.ts`.

**Interfaces:**
- `useMyProfile(): { hydrated: boolean; fields: ProfileFields; save(next: Partial<ProfileFields>): WriteResult; togglePin(projectId: string): { ok: boolean; refused: boolean } }` over `useStoredKey(PROFILE_KEY)` / `writeStoredKey`; refuses to write over an unreadable key (`storedUnreadable`). `since` is set once, on the first save, to `Date.now()`.
- `PHOTO_DB = "ideeza-profile"`, store `files`, key `photo`. `resizePhoto(file: File): Promise<Blob | null>` (≤ 256 px square cover-crop, JPEG 0.85; null when not an image or over 10 MB), `putPhoto(blob): Promise<WriteResult>`, `deletePhoto(): Promise<WriteResult>`, `useMyPhoto(): { url: string | null; refresh(): void }` (object URL, revoked on change; a same-tab `ideeza:profile-photo` event refreshes every reader).

- [ ] Steps: implement, `npx tsc --noEmit`, commit `feat(profile): your profile fields and photo, saved in this browser`.

### Task 5: The page (own view)

**Files:** Create `src/app/(dashboard)/creators/[handle]/page.tsx`, `src/components/profile/{profile-page,profile-header,owner-line,made-section}.tsx`.

**Behaviour (from the spec and the mockup's Own and DayZero artboards):**
- Route: `params: Promise<{ handle: string }>`; `generateMetadata` → "{Name} · IDEEZA" for sample people, "Your profile · IDEEZA" for `me`; body = `<Suspense fallback={<ProfileSkeleton/>}><ProfilePage handle={handle}/></Suspense>`.
- `ProfilePage`: waits for projects, builds, market, editions and the profile store (skeleton until then; the action slot is a Skeleton so Follow never flashes on your own page). `me` → own view. Unknown handle → a "This creator isn't here" StateCard with "Go to Innovations". (Phase 2 fills other people.)
- Header: `Avatar size="xl"` (photo → `src`), h1 name (Noto Sans Bengali in the font stack), the English-letters name as a caption when set and different, the headline (or, own view only, a Link "Add your name and what you build" that opens Edit profile), facts "Building here since {Mon YYYY} · {n} {project|projects} shared" (zeros hidden). Own action: secondary Button "Edit profile".
- `OwnerLine`: grey `bg-bg-surface-raised` line: eye icon + "Only you see this" · "Others see {n} {project|projects}." or "Others see your name and nothing else yet." · Link "{m} private in My projects" → `/projects` (hidden at 0).
- `MadeSection`: h2 "Made" + caption; grid 1/2/3 columns (`grid-cols-1 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3`, gap 24); card = cover (img or the project's Activity-free placeholder), "Pinned" badge, title (one line), stage Badge + age caption (`ageOf`), "For sale"/"Copies for sale" outline badge; whole card a Next `Link`. Own cards: an IconButton ⋯ → Menu "Pin to top"/"Unpin"; a 4th pin shows "Unpin one first — up to 3 projects can be pinned." in a toast/inline message. Empty own: StateCard "Nothing shared yet" + Button "Share a project" → `/projects`.
- Phone (< md): avatar `lg`; own: a fixed bottom bar with Edit profile.

- [ ] Steps: build, `npx tsc --noEmit`, browser-verify on the worktree's dev server (light, dark, 375 px; draft absent; Share to Innovations makes it appear; Stop sharing removes it after reload; pin order), commit `feat(profile): your profile page at /creators/me`.

### Task 6: Edit profile and the headline suggestion

**Files:** Create `src/components/profile/edit-profile-dialog.tsx`, `src/lib/people/headline.ts`, `src/app/api/profile/headline/route.ts`; tests for `headline.ts`.

**Interfaces:**
- `headlinePrompt(projects: { title: string; story: string }[]): string | null` (null with no shared project; each title ≤ 80 and story ≤ 300 chars, at most 6 projects).
- `cleanHeadline(reply: string): string | null` (strips quotes, "Headline:" prefixes and markdown, one line, ≤ 60 chars cut at a word; null when empty, JSON, or the provider's quota/rate-limit prose).
- Route `POST { projects }` → `{ headline }` or `503 { error: "unavailable" }`; Pollinations `openai-fast`, `reasoning_effort: "low"`, 45 s abort, no fallback text.

```js
import { headlinePrompt, cleanHeadline } from "../../.tmp-test/lib/people/headline.js";
test("headline prompt needs a shared project and clips its inputs", () => {
  assert.equal(headlinePrompt([]), null);
  const p = headlinePrompt([{ title: "Smart Lamp", story: "x".repeat(900) }]);
  assert.ok(p.includes("Smart Lamp"));
  assert.ok(p.length < 900);
});
test("cleanHeadline returns one plain line of at most 60 characters", () => {
  assert.equal(cleanHeadline('"Headline: Desk lamps and plant sensors."'), "Desk lamps and plant sensors");
  assert.equal(cleanHeadline("{\"a\":1}"), null);
  assert.ok(cleanHeadline("word ".repeat(30)).length <= 60);
  assert.equal(cleanHeadline("   "), null);
});
```

- Dialog (`ModalFrame`): photo row (Avatar lg · Upload photo · Remove, "JPG or PNG. Resized on your device before it is saved."), Name, Name in English letters (optional), Headline with counter, AI Button "Suggest from my work" (disabled with "Share a project first" when none), the draft region, Cancel / Save profile. Save writes the store, then the photo; a refused write keeps the dialog open with "Couldn't save. This browser's storage is full or blocked." Escape/Cancel with changes → ConfirmDialog "Discard changes?".

- [ ] Steps: tests fail → implement → pass; build the dialog; verify the round trip and a failed suggestion in the browser; commit `feat(profile): Edit profile, with an opt-in headline suggestion from your shared projects`.

### Task 7: Entry points and docs (end of Phase 1)

- Sidebar account menu "Profile" → `router.push("/creators/me")`; the sidebar's account button shows your name, initials and photo from the profile store (`displayNameOf`, `initialsOf`).
- ⌘K Account › "Profile" → `/creators/me`.
- Docs: `docs/guides/features/platform-and-projects.md` (new "Creator profile" section), `docs/guides/app-map.md`, `src/app/README.md`, `STRUCTURE.md`, `src/lib/README.md`, `src/components/README.md`, `docs/map/PRODUCT.md` (a row).
- [ ] Verify, commit `feat(profile): the account menu and ⌘K open your profile`.

### Task 8 (Phase 2): Every name is a link

- `PersonName({ id, name, className })`: a Next `Link` to `profileHref` when the id resolves in the directory, else plain text. Wire into: `newsfeed/project-card.tsx` creator row, `innovations/post-rail.tsx` maker block, `innovations/comments/comment-item.tsx`, Messages list row and `conversation-header.tsx`, `projects/details/team-tab.tsx` (only directory ids), `earn/money.tsx` Splits, `details/customers-tab.tsx` "Bought by", `marketplace` bid rows.
- [ ] Verify the same person opens from each; commit.

### Task 9 (Phase 2): Other people's pages

- `ties.ts`: `tiesOf(other, { myProjects: {id,name,products:{id,name}[]}[], sales, teams })` → first of: "Editor on your Smart Lamp" (role), "Holds 10% of your Smart Lamp", "Owns a Physical copy of your Smart Lamp" / "of your {product}", "Owns 3 copies from your Smart Lamp"; null otherwise. Tests for each line and for "nothing".
- `PersonBlock`: Follow (primary; `aria-pressed`; "Following" secondary with a tick; one store `withFollow`), Message (existing `MessageCreator` rules, disabled with the reason), ⋯ Menu: Report profile (dialog, reasons: Pretending to be someone else · Copied someone's work · Scam, or asks to pay outside IDEEZA · Spam · Hateful or abusive · Something else; "Also block {name}"; saves to `ideeza:people:reports`; "Report saved. Reports aren't reviewed yet in this demo.") · Block {name} (ConfirmDialog; writes the Messages blocked list via `block()`; page shows "You blocked {name}" Banner with Unblock).
- The post maker block renders the same `PersonBlock` (D3).
- Sample creators' Made = `madeOfSample`; demo creators have none ("{Name} hasn't shared a project yet."). Badge "Demo creator".
- [ ] Tests + browser verify (follow agrees on post and profile after reload; block hides Message; report receipt); commit.

### Task 10 (Phase 2): Your Following list and one name everywhere

- Owner line "You follow {k}" → dialog listing followed people (directory ∩ follow map + dataset defaults) with Unfollow/Follow.
- Innovations `ME` shows your profile name and initials on your own posts; the editor top bar's "Nick Rough · Creator account" shows your name and photo.
- [ ] Verify, commit.

### Task 11 (Phase 3): Hardening and docs

- Storage full / blocked (save refused), unreadable `ideeza:profile` (no overwrite), a pinned project deleted or unshared (dropped from pins on read), Bengali font load, 375 px, both themes, keyboard order (name → Follow → Message → ⋯), screen reader names, reduced motion.
- Docs complete; `npm run test:projects`, `npx tsc --noEmit`, `npm run lint`, `npx next build`.
- [ ] Commit `docs(profile): …`.

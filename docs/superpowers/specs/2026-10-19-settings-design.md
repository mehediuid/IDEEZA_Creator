# Settings — Phase 1 design

Owner request (2026-10-19): plan the creator panel's real Settings from the product's features, 40+ user intents and 20–30 user interviews, then build Phase 1. The plan was approved as written ("সব recommended ঠিক আছে, Phase 1 বানানো শুরু করো"), so every decision D1–D18 below takes its recommended option.

- Plan (Bangla, owner-facing): https://claude.ai/artifact/CTxbQtStNcNmV6SjVhdHfS
- Research inputs (session scratchpad, may vanish): `/private/tmp/claude-502/-Users-ideeza-Downloads-IDEEZA-Creator/47e84af9-3d3a-4adb-a259-f92f11786bb7/scratchpad/settings-study/` — `inputs/figma-settings.md` (every Figma frame, node id and visible string), `inputs/figma/*.png` (screenshots), `inputs/existing-settings.md` (what the code has today, file:line), `interviews/G1–G6.md`.
- Figma: User Panel V2 `HDtWAU2PSbjQKlEWgHI3ev`, page "✅ Settings" `19140:152179`. Use the sections at x = −36845; "Settings New (Old)" `22224:19686` is superseded. Creator Panel V3.0 `gb4w7Tq7nnqM6V72CWQWjO` (account popover `45356:5754`). DS `V3uizmZLHo5Xhy65Dp3F0O`.

## 1. Rules every piece follows

1. **AGENTS.md first.** Tokens only, light + dark, classes not inline style, `Page` frame, one control one home, contextual disable not stubs, no new dependencies, docs in the same change.
2. **Figma = requirements and layout** (owner rules `feedback-figma-requirements-all`, `feedback-figma-layout-with-ds`). Every Figma row listed for a page in §5 ships, with the Figma words, unless §5 names the change and its decision. The look comes from the DS: tokens, `components/ideeza/*` atoms. Match each screen's structure: breadcrumb, title, bordered cards, a card header with its action, rows of label + helper + control on the right.
3. **Layout and new surfaces only.** Never restyle an existing component or page beyond what §5 asks (owner rule `feedback-layout-not-design`). Plan & pricing, Edit profile, Messages, the profile page keep their look; we add rows, links or a gate.
4. **Real logic, never stubs.** A Phase 1 row does real work in this browser. A row that needs sign-in or a server (Phase 2) is **not shown**, except where §5 says to show an honest state. A disabled option carries its reason ("Not available yet"), the pattern Payment method already uses for Card and PayPal.
5. **Everyone is a creator.** Describe people by their relation to a project (works with you, owns a copy, holds %), never "buyer" or "customer".
6. **Copy.** Plain English, sentence case, the Figma words where Figma has them. No em-dash doing a full stop's job. Errors say what happened and how to fix it.
7. **Save model** (benchmark, NN/g): a toggle, radio or select saves at once and shows nothing more than its new state; a text form (a card in Edit mode) has Cancel / Update and saves on Update. Never mix the two inside one card. A refused write (storage full) shows the shared "couldn't save" error the stores already return.
8. **Verify like a user** before calling a page done: open it at 1440 and 390, light and dark, keyboard only once, and walk every row's effect where it shows (the profile, the bell, Messages…).

## 2. Information architecture

Settings is about the person. Project things (licence, royalty, splits, price, team roles, units of one product) stay on the project. The settings side-nav (Figma `Settings Sidenav V2`) is the one home for these pages:

| Group | Page | Route | Figma |
|---|---|---|---|
| — | Settings (home) | `/settings` | `22048:28753` |
| General | Profile | `/settings/profile` | `22048:28793` |
| General | Personal Information | `/settings/personal-information` | `22048:29733` |
| General | Security | `/settings/security` | `22048:30800` |
| General | KYC Verification | `/settings/kyc` | `41537:214832` |
| General | Get Paid | `/settings/get-paid` | `41537:182104` |
| Preferences | Notification | `/settings/notifications` | `22048:33859` |
| Preferences | Language | `/settings/language` | `22048:34238` |
| Preferences | Appearance & accessibility | `/settings/appearance` | new |
| Preferences | AI Properties | `/settings/ai` | landing tile only |
| Audience | Profile locking | `/settings/profile-locking` | `22550:47505` |
| Audience | Profile & Share | `/settings/profile-share` | `22048:34433` |
| Audience | Blocking | `/settings/blocking` | `22048:34661` |
| — | Plan & Pricing | `/settings/plan` (exists, unchanged frame) | `16838:713648` |
| Policy & Privacy | Privacy | `/settings/privacy` | `22048:35155` |
| Policy & Privacy | Personal Data | `/settings/personal-data` | `22048:35199` |
| — | Activity | `/settings/activity` | `22048:35243` |
| — | Report | `/settings/report` | `22550:48543` |

Doors into Settings: the account popover's **Settings** row (V3.0), ⌘K "Settings" and every row by name, the bell's ⋯ › Notification settings (Figma `41571:262629`), the profile's ⋯ › Profile settings (Figma `41537:105758`), the Messages gear (→ Profile & Share), the editor account menu. Plan & pricing keeps its own frame; its "Settings" crumb links to `/settings` and the side-nav item opens it.

Phone (< 768 px page container): no side-nav. `/settings` shows the home content then the page list; every sub-page starts with a "Settings" back link. Every page and row has a stable URL (`/settings/<page>#<row-id>`), which search and ⌘K use.

## 3. Shared pieces (built first, by W0)

### 3.1 Components — `src/components/settings/`
- `SettingsFrame({ page, children })` — `Page` + the white sheet (as `PricingFrame`: `rounded-2xl bg-bg-surface`) holding the side-nav (≈ 280 px), a hairline, and the main column: breadcrumb (`Settings › Group › Page`, Figma order), the page title (H3 24/32 SemiBold, the page's `title`), then children with 24 px gaps. `page` is a `SettingsPageId`; the frame reads title, group and crumbs from the registry, sets the document title "‹Title› · Settings · IDEEZA" through the route's metadata, and puts focus on the h1 on arrival.
- `SettingsNav` — accordion groups with chevrons (Figma), the group that holds the current page open, the current item an outlined brand pill (`aria-current="page"`), every item a real link. Keyboard: Tab through items, Enter/Space toggles a group.
- `SettingsCard({ title, action?, children, id? })` — a bordered, rounded card; header row = title (Label/LG semibold) + optional action on the right (Figma's "Edit" is a `Button hierarchy="outline-brand" size="sm"` with a pencil icon). Rows inside are separated by hairlines.
- `SettingsRow({ id, label, help?, control?, href?, onClick?, disabled?, reason? })` — label + helper text left, control right; with `href`/`onClick` and no control the row is one link/button with a chevron (Figma "Where you logged in ›"). `id` becomes the DOM id for deep links; arriving at `#id` scrolls it under the frame and outlines it once.
- `SettingsField({ label, children })` — a read-only label/value pair for a card in view mode (Figma "Bio / Front end Developer"); empty values read "No information" in `text-tertiary` (Figma).
- `SettingsChoiceDialog` — the Figma radio-list modal (Select Language, Date & Time Formatting, "Who can send you…"): title, radio rows with an optional description, Cancel / Update. Built on `ModalFrame`.
- `SettingsSearch` — "Find a setting" on the home page: a `SearchInput` over the index (§3.3); results are links "Page › Row" with the row's help line; Enter opens the first.

### 3.2 Preferences store — `src/lib/settings/prefs.ts`
One versioned localStorage record, `ideeza:settings`, for preferences that have no other home. Pure read/normalize + a tiny subscribe/`useSyncExternalStore` hook, the pattern of `lib/account/payment.ts`. Unknown or broken data falls back to `DEFAULT_SETTINGS` per field.

```ts
export type NoticeKind = "marketplace" | "product" | "coin" | "comments" | "message" | "following" | "teams" | "blog" | "policy" | "other";
export type Channel = "web" | "email" | "mobile";
export type Reach = "everyone" | "work" | "nobody";           // Anyone · People you work with · Only me / No one
export type DateLocale = "auto" | "en-US" | "en-IN" | "de-AT" | "nl-BE" | "th-TH" | "es-ES" | "iso";
export type VoiceLang = "auto" | "en-US" | "en-GB" | "bn-BD" | "hi-IN" | "ar-SA" | "th-TH" | "es-ES" | "pt-BR" | "tr-TR" | "ur-PK" | "ja-JP" | "de-DE" | "fr-FR" | "id-ID" | "sw-KE";
export type CreditPack = "starter" | "pro" | "power";

export interface SettingsV1 {
  v: 1;
  notifications: {
    channels: Record<NoticeKind, Record<Channel, boolean>>; // web true, email/mobile false by default
    digest: "instant" | "daily" | "weekly";
    quietHours: { on: boolean; from: string; to: string; urgentBreaksThrough: boolean }; // "22:00"–"07:00", true
    bidThreshold: number | null;   // USD; null = every bid and offer
    mutedProjects: string[];       // project ids muted from a notice
  };
  language: { dateLocale: DateLocale; voice: VoiceLang };
  appearance: { textSize: "default" | "large"; contrast: "default" | "high"; motion: "system" | "reduce"; keepNotices: boolean; singleKeyShortcuts: boolean; dataSaver: boolean };
  ai: { volunteerPool: boolean; editorAssist: boolean };     // true, true
  audience: { locked: boolean; addToTeam: Reach; seeFollowing: Reach; allowLinkSave: boolean; follow: Reach; teamConversation: Reach; showLocalTime: boolean; comment: Reach; quietUntil: number | null };
  blocking: { hiddenWords: string[] };                      // ≤ 500 words (Figma limit)
  privacy: { searchEngines: boolean };                      // false
  credits: { lowAt: number; expiryReminderDays: number; monthlyCap: number | null; confirmAbove: number | null; autoTopUp: { on: boolean; pack: CreditPack } }; // 3, 14, null, null, off/"starter"
}
```
API: `readSettings(): SettingsV1`, `useSettings(): SettingsV1`, `updateSettings<K extends keyof SettingsV1>(section: K, patch: Partial<SettingsV1[K]>): boolean` (false = refused write), `normalizeSettings(raw: unknown): SettingsV1`, `DEFAULT_SETTINGS`, `SETTINGS_KEY`, and a window event `ideeza:settings-change`. Data with an existing home stays there: who can message (`ideeza:messages`), profile fields (`ideeza:profile`), payment token (`ideeza:account:payment`), theme (`ideeza-theme`), PCB editor settings (`ideeza:pcb:appSettings`).

### 3.3 Registry and search — `src/lib/settings/registry.ts`, `src/lib/settings/rows/*.ts`, `src/lib/settings/search.ts`
- `SETTINGS_PAGES`: `{ id, title, group, href, icon, figma? }[]` in nav order (§2).
- One rows file per page (`rows/<page-id>.ts`) exporting `{ id, label, help?, keywords?, href? }[]` — the page's rows in order, plus "lives elsewhere" entries (PCB Setting › Measurement unit, Account menu › Appearance, Edit profile, a project's Earn) whose `href` points at that home. A workstream edits only its own page's rows file.
- `searchSettings(query)`: case-insensitive token match over label, help, keywords and page title; ranks label hits first; ≤ 12 results. ⌘K lists the same results under "Settings".

## 4. Decisions taken (D1–D18, all as recommended)
D1 Figma side-nav inside the shell, list → page on a phone · D2 one profile store, two doors (Settings and Edit profile edit the same values; legal name, email, phone, birthday, addresses are private and only in Settings) · D3 one earnings balance, withdrawn only in Get Paid; Earn › Money shows the project's earnings and links there; the ladder's payout-wallet step becomes "Add a withdrawal method" · D4 birthday comes from sign-up (Phase 2), read-only; under-18 defaults later · D5 security question optional, never the only recovery (Phase 2) · D6 Figma's three KYC levels; Level 1 is today's demo check; the Earn ladder opens Settings › KYC · D7 notification kinds map to real events (§5.6) · D8 only security and money receipts by email are locked (Phase 2), nothing locked in-app · D9 friends/groups wording maps to Follow / people you work with / project teams · D10 English first; other app languages are listed as "Not available yet" · D11 theme stays in the account menu and ⌘K; the PCB/Blockly/3D theme duplicates go · D12 units, grid, hotkeys live in the PCB Setting dialogs, persisted globally and read by every editor and the Parts wizard · D13 "who can message you" moves to Profile & Share; the Messages gear opens it · D14 "Pay with" (Payment method) vs "Get paid in" (Get Paid) · D15 Facebook rows wait for Phase 3 (not shown) · D16 nav "Activity", page title "Your activity", "Appreciated" not "Liked" · D17 Delete copy tells the truth about NFTs (Phase 2) · D18 no demo OTP, password, sessions or delete before sign-in.

## 5. Pages — Phase 1 rows and behaviour

Legend: **F** Figma as is · **C** Figma with the named change · **N** new from interviews · **L** link to the control's home.

### 5.1 Home `/settings` (W0)
F "Most visited settings" tiles (Figma `M131 Quick Action Tile` look): IDEEZA Pay → Get Paid, Blocking, AI Properties, Payment → `/settings/plan?tab=payment`. F "Looking for something else": IDEEZA Privacy & Policy, Terms & Conditions — the app has no legal pages; show both cards with "Not available yet" and no link (contextual disable), not a dead link. N "Find a setting" search (§3.3) above the tiles. Phone: the page list after the tiles.

### 5.2 Profile `/settings/profile` (W1)
Card "Profile Picture": avatar, "PNG, JPG under 2 MB" (C: our limit is the Edit profile limit — use its real limit text), Upload New Picture (tonal) and Remove (outline) — the same photo store as Edit profile (`lib/people/photo-store.ts`). Card "Profile" with Edit: view mode = Figma 2-column grid; edit mode = fields + Update. Rows: First Name, Last Name (legal, private, new store `ideeza:account:identity`); N Handle (`/creators/<handle>`, 3–30 of a–z 0–9 `-`, unique against the sample creators, `me` keeps working as an alias); Gender (Male · Female · Prefer not to say · Custom text); Links (C: the profile's ≤ 5 links, same store); Wallet Address (L: read-only, the connected demo wallet's address or "Not connected" with Connect → the wallet dialog). Not shown in Phase 1: Email, Phone, Birthday (D4, D18).

### 5.3 Personal Information `/settings/personal-information` (W1)
Four cards, each with Edit (Figma): **Profile Details** — Bio (C: = profile headline), About yourself (= profile About), Permanent Address (Country, City, Address), Shipping Address (≤ 5, one Default & Shipping, Add Another Address, Edit / Remove each, the Figma max-5 notice). **Abilities** — Skills (chips, ≤ 16, "You can add up to 16 skills"), Specialists (Top 3 Skills) with years (0-1 · 1-2 · 3-5 · 5+ Years). **Connected Accounts** — Facebook, X, Instagram, LinkedIn as profile URLs (C: X for Twitter). **Additional Information** — Timezone (C: the one time zone; a select of IANA zones, the device's zone offered first as "(this device)"; once set by hand, Edit profile no longer overwrites it), Language (spoken languages chips, "Add Another", Figma's Select Language modal). Skills, specialities and spoken languages show on the profile's identity column, under About, in the existing chip style.

### 5.4 Security `/settings/security` (W0)
Phase 2 rows are not shown (D18). The page holds one honest card: "Accounts and sign-in aren't in the app yet. Your work is saved in this browser only." with what will appear here (password, 2-step verification, devices, deactivate and delete), and an action "Download your information" → Personal Data. Nav keeps the item.

### 5.5 KYC Verification `/settings/kyc` and Get Paid `/settings/get-paid` (W2)
**KYC.** The three Figma tiers stacked: Verify Your Identity (Level 1), Intermediate KYC ("Unlocks at $1,000 total transactions"), Advanced KYC ("Unlocks at $5,000 … Removes all transaction limits"), each with its status badge (Not Submitted · Under Review · Rejected · Approved). Level 1 is today's demo identity check (`lib/commerce/kyc.ts`): Full Legal Name, Country of Residence, the terms checkbox, Submit for Review → Approved (demo), labelled with `TestnetDemoBadge`; email and phone OTP rows are Phase 2 (not shown). N "Reset" on an approved Level 1 (`resetKycDemo` finally gets its UI). Intermediate/Advanced show "Not needed yet" with the live total from your sales (demo ledger) and their requirement list; their Start button is disabled "Not available yet". The Earn ladder's Verify identity opens `/settings/kyc` (return link back to the project). Data note (Figma): "Your personal information is …" — write the true version for the demo ("Only 'verified' is kept in this browser; your name and country are not stored").
**Get Paid.** Hub (Figma `41537:182104`): title + View Withdrawal History; card Earning Information › Balance (the pooled balance from every project's sales, minus fees and earlier withdrawals) ›; card Tax Information › Tax Residence ›, Tax Identification ›. Balance view (`41537:182534`): Available Balance, Withdraw Money, the tax note (fixed grammar: "To withdraw earnings, keep your tax information up to date"), withdrawal methods list with Default tag and ⋯ (Make Default · Remove), Add Withdrawal Method. Methods: N **Crypto wallet** (USDT or IDZ address; the connected demo wallet offered first) is live; Direct Bank, Payoneer, PayPal show in the Add dialog as "Not available yet". N **Get paid in** token (D14). Withdraw dialog (Figma `41537:182611`): method, amount ($ full / Other amount), fee $0.00, total → confirm through the Demo wallet's signing dialog (not an OTP, D18); the withdrawal is recorded and the balance drops. Withdrawal History (`41537:183372`): stat tiles Complete / In Progress / Pending, Download Statement (a CSV of the chosen month or year: sales, fees, withdrawals), search, status filter, date range, table, pagination. Tax Residence and Tax Identification forms (US / non-US, SSN / EIN) store in `ideeza:account:payout` (the full TIN is never shown again: last 4 only). Earn › Money › Sales: per-project earnings rows stay; Request payout is replaced by "Withdraw in Get Paid" (D3); the ladder rung that asked for a payout wallet asks for a withdrawal method and links here.

### 5.6 Notification `/settings/notifications` (W3)
Card "What notification you receive": the ten Figma rows, each expanding to "Where you receive these notification" with Web Notification · Email · Mobile Application toggles. Web is live; Email and Mobile Application are disabled with "Arrives with sign-in" (D18). Rows and the events they carry (D7, D9 names): **Marketplace** (a sale of your listing or copy, a bid or offer on yours, an auction of yours ending within an hour, a question about your listing) · **Product** (build ready, needs a retry, paused for credits; a video take ready) · **Coin** (credits under your low mark, purchased credits expiring within your reminder days, plan renewal in 3 days) · **Comments** (comments, replies, @mentions on your shared projects and blogs) · **Message** (new message, new Request) · **Updates from people you follow** (C) · **Project teams** (C: team conversation messages) · **Blog** (review result, featured, taken down) · **Policy & Community** (status of reports you made) · **Other**. Card "Where you receive notification": Browser (this browser, live); Email not shown. N Digest (Right away · Daily summary · Weekly summary — in-app: a summary groups the bell by day/week and sends no toasts), N Quiet hours (from/to; urgent breaks through: money and security), N Bid threshold ("Only bids and offers of $X or more"), N Muted projects (list with Unmute; muting happens from a notice's ⋯ "Mute this project"). The bell (desktop and phone) reads one notice list from `lib/notifications` filtered by these settings, keeps read state, and its ⋯ gets "Mark all as read" and "Notification settings". The editor top bar's fake bell "3" becomes this bell.

### 5.7 Language `/settings/language` (W5)
Card "App Language" › Account Language: English (US); the Select Language modal lists Bangla, English, Hindi, Arabic, Thai, Español with every option but English disabled "Not available yet" (D10). Card "Time Formatting" › Date & Time Formatting: the Figma radio list with examples (United States 3/12/2020, 06:09 PM · India 12/03/2020, 06:09 PM · Austria · Belgium · Thailand · Español) plus N "Your browser (automatic)" and N "ISO (2020-03-12 18:09)"; `lib/settings/dates.ts` `formatDate / formatDateTime / formatTime` read it, and History, Messages, Blog lists, Billing history, invoices, Withdrawal History and the profile's local time use them. N Card "Voice typing" › language for the mic (default: same as the app, en-US); `use-voice-input.ts` uses it. L Time zone → Personal Information.

### 5.8 Appearance & accessibility `/settings/appearance` (W5)
L Theme → "Change it in the account menu" (D11). N Text size (Default · Large: every `--font-size-*` / `--line-height-*` steps up one DS step via `html[data-text-size="large"]`). N High contrast (`html[data-contrast="high"]`: secondary and tertiary text use the primary text token, borders use the strong border token — existing DS tokens only). N Reduce motion (Match system · Reduce: `html[data-motion="reduce"]` joins the existing reduced-motion rules). N Keep notices until I close them (toasts stop auto-hiding). N Single-key shortcuts (off: editors ignore unmodified letter keys). N Data saver (post and feed videos don't autoplay; they show a play button). L Units, grid, hotkeys → PCB editor › Setting (D12).

### 5.9 AI Properties `/settings/ai` (W5)
N Card "Where your AI requests go": text → Pollinations (keyless), images → AI Horde (volunteer GPUs), 3D → Meshy when keyed — read from the code's real routes. N "Use the volunteer GPU pool for images" (on by default; off → image requests carry `pool=off` and the route uses its non-volunteer path, or tells the user images are unavailable while it's off — never silently uses the pool). N "AI help in the editors" (off hides the Code editor's AI chat panel and the 3D AI generate entry).

### 5.10 Audience pages (W4)
**Profile locking:** "Lock Your Profile" toggle with the lock dialog's "How locking works" list (Figma `41537:105837`), worded for our model (D9): when locked, people you don't work with see your name, photo and "This profile is locked" instead of your projects, blogs and activity. **Profile & Share** (C rows, D9): Who can add you to a project team · Who can see who you follow · Allow others to save and link your shared projects (toggle) · Who can follow you · Who can invite you to a team conversation — each opens the Figma radio modal (Anyone · People you work with · Only me). N Who can message you (D13): Anyone · People you work with or who own a copy or hold a share · No one new — it writes `ideeza:messages` (`allowNew`, adding `"nobody"` and widening "work" to holders); the Messages gear opens this row. N Show my location and local time on my profile (off by default). N Who can comment on your shared projects. N Quiet mode (24 hours · 7 days · Off): while on, no new Requests reach you and only people you work with can comment. L View as public → `/creators/me?view=public`. **Blocking:** Block users (the one blocked list, Unblock, Add Blocked User search over people you've met), Block message (blocked conversations), Hide specific words (≤ 500, chips, "Remaining n of 500") — applied to comments on your shared projects and to Requests. Messages fixes that belong here: replying to a Request no longer accepts it (Accept does); a reported message stays visible to you and kept with the report even if its sender deletes it.

### 5.11 Plan & Pricing additions (W6)
Inside the existing tabs, no restyle: Credits tab — N card "Credit alerts and limits": Running low at (credits; drives the popover's "Running low" and the Coin notice), Remind me before credits expire (days), Monthly spending limit (credits; reaching it pauses builds like BUILD PAUSED with its own reason and a link here), Ask before a purchase over ($), Auto top-up (off by default and stated as off; on = when a build pauses for credits, buy the chosen pack from the Demo wallet through its signing dialog). Billing history tab — N card "Billing details": Name or company, Tax ID (VAT/GST/EIN), Address, Billing email; printed on every invoice. Payment method tab — C "Default" token wording becomes "Pay with" (D14). Downgrade dialog — F downgrade preview: what the lower plan allows against what you have (projects, contributors), saying plainly that nothing is removed.

### 5.12 Privacy, Personal Data, Activity, Report (W7)
**Privacy:** F Link with search engine (off by default: the profile page adds `<meta name="robots" content="noindex">`); N Blog reuse ("Give access to IDEEZA to future use"): the blogs that grant it, Revoke on each, Revoke all; N Cookies and analytics: a read-only line stating the truth (the app sets no analytics or advertising cookies; theme and work are kept in this browser's storage). Facebook rows wait (D15). **Personal Data:** the Figma Download Your Information wizard — Available or Specific information; categories Product, Marketplace, Coin (credits & payments), Newsfeed (Innovations), Blog, Message, Activity, Profile, plus N Project files (each product's PCB as `.kicad_pcb`, firmware files, wiring and 3D JSON); Date Range; Format HTML or JSON; Media Quality — then "Create File to download" builds a `.zip` in the browser (a dependency-free stored zip in `lib/data/zip.ts`) and downloads it. Notify (email/push) is Phase 2 and not shown. **Activity (Your activity):** Appreciated, Comments, Videos you have watched, Your search history — each a list grouped by day (Figma), with "Clear search history". Watching = a post video played ≥ 3 s; search history = queries you run in ⌘K and on Innovations/Explore search (kept 90 days, ≤ 200). Logged-in history is Phase 2. **Report:** N "Reports you made" (profile, post, comment, message reports and Report a problem references) with status "Received — not reviewed yet" (true today); "Reports about your work" with Appeal is Phase 2 and its section says nobody reviews reports yet.

### 5.13 Entry points and clean-up
W0: account popover Settings row → `/settings`; ⌘K Settings → `/settings`, Wallet & tokens → opens the wallet dialog, "Upgrade to Pro" → "Plan & pricing" `/settings/plan`, tours/help rows → removed until those pages exist, ⌘N bound to Start a new project; Plan & pricing crumb "Settings" → link. W8: editor account menu (`app-chrome/profile-dropdown.tsx`) → My profile · Settings · Notification settings · Plan & pricing (real links), Earn IDZ / Switch organization removed, Sign out "Soon" with the sidebar's reason; theme duplicates removed (PCB View ▸ Appearance and System ▸ Theme rows → one "Appearance is in the account menu" note, dead Blockly/3D theme items removed, unused `theme-toggle.tsx` deleted); PCB 2D settings persisted to `ideeza:pcb:appSettings` together with the 3D dialogs' values, one Measurement Unit read by schematic, PCB, the Parts New Package wizard; Report a problem's "Send page and device details" unticked by default; every "Buy credits" link → `/settings/plan?tab=credits`; docs.

## 6. Verification
Each workstream: `npx tsc --noEmit -p tsconfig.json`, `npm run lint` on changed files, `npm run test:projects` (new pure logic gets tests under `tests/projects/`), then the browser walk in §1.8 on its own dev server. Final: all merged on `feat/settings`, full test run, `next build`, a walk of every page and every door on :3050.

## 7. Workstreams and file ownership
W0 shell (frame, nav, card/row atoms, prefs, registry, search, home, security, doors) · W1 profile + personal information (+ profile page reads: skills, handle, local time gate, locked view, `?view=public`) · W2 KYC + Get Paid (+ Earn ladder/Sales links) · W3 notifications (+ bells, toasts' quiet hours/digest) · W4 audience + blocking (+ Messages fixes, comment rules) · W5 language, appearance, AI (+ dates helper, voice, editors' single-key, data saver, AI flags) · W6 Plan & pricing additions (+ credits cap/auto top-up, popover running-low) · W7 privacy, personal data, activity, report · W8 editor account menu, theme duplicates, PCB settings persistence, small fixes. A workstream edits only its own pages, its own `rows/*.ts`, and the files its line names; anything else is asked for, not taken.

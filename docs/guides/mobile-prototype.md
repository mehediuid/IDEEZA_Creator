# Building the mobile prototype (/m)

How a screen of the coded mobile prototype is built. What already works: [features/mobile-app.md](features/mobile-app.md). Code router: [src/components/mobile/README.md](../../src/components/mobile/README.md).

## What decides what (owner, 2026-11-04 / 11-05)

- **Every screen and state in the mobile Figma ships.** The Figma mobile designs are the product's real features, not ideas.
- **The web is newer.** Where the mobile Figma and the web disagree on a feature, its logic or its words, the web wins: reuse its `src/lib` logic, its stores and its words; take the mobile Figma's layout, components and IA. Never drop a Figma screen because the web lacks it — build it on the web's data.
- **Never invent IA.** The tabs, menus and screen order come from the Figma. A screen the Figma doesn't draw follows the nearest drawn pattern.
- Agreed decisions still apply: no Friends (D-1), no group / call / voice rows in Messages (D-2), Feed not Innovations, ETH not MATIC, no sound customization (D-9), no Activity log (D-17).

## The Figma

File `fKXxJ25dXvxWWa0kCKeSF4` ("IDEEZA - Mobile V.2"). Read only — never edit it. Use the 2026 update page when one exists, else the owner's master page:

| Area | Page |
|---|---|
| Account (way in, Sign-in & security, sign out, delete) | Account · 2026 update `10627:28230` |
| AI create | AI create · 2026 update `10706:2` (Full AI flow) |
| Project details | Project Details · 2026 update `10322:2` |
| Product details | Product Details · 2026 update `10459:3` |
| Home = Feed | Feed · 2026 update `10646:2` |
| Messages, creator profiles | People · 2026 update `10673:2` |
| Settings | Settings · 2026 update `10688:2` |
| Sheets, menus, toasts, states, glossary | Shared kit · 2026 update `10600:2` |
| Everything else (Earn Coin tab, Profile hub, Search, Notifications, Plans, KYC, Payments, IDEEZA pay, FAQ, Report an issue, Tutorial, My project) | Design - Light Mode (Current) `10702:161444` |

Each frame's note ("Note · …") beside a row says what the row covers; the Shared kit's Glossary (`10624:5792`) and Copy rules (`10624:5968`) set the words.

## Building blocks (use these, don't rebuild them)

- **Screen** (`components/mobile/screen.tsx`): status bar, `top`, the scrolling content, a pinned `footer`, the home indicator. `status="media"` over a video.
- **TopBar** (Back, centred title, 44 px actions), **TabBar** (only through `app/m/(tabs)/layout.tsx`), **BottomBar** + `SwitchLine` / `TEXT_LINK` (kit/bottom-bar.tsx).
- **Back** never pushes. TopBar's `back` goes to the previous screen when this tab's history has one in the app (`nav-trail.ts` follows every push, replace and Back), else it *replaces* the screen with its parent (`back="/m/projects"`; `back` alone: Home). So a deep link's Back stays in the app and two screens can't loop. A hand-made ← uses `useGoBack(parent)` from `nav-trail.ts`, never `router.push` or `window.history.length`.
- **Tabs:** `MobileTabs` (kit/tabs.tsx, M14 line: 14/500, brand line when on, tertiary when off, arrows/Home/End, `role="tablist"`, optional `count` → "Inbox 1", `width="full" | "hug"`), panels with `tabPanelProps(idBase, value)`. No hand-made tab strip.
- **Lists:** `ListCard` + `ListRow` (kit/list.tsx): surface, border/default, radius/xl, border/default lines between rows; a row is 48+ tall, 24 px icon, the title in Body/SM, an optional meta line and value, the 24 px `Chevron` when it opens something. `LIST_CARD` for a card that isn't a list, `LIST_ROW` for a content row's padding and line. Settings' grouped cards are the one exception (`radius="lg"`).
- **Popups — always from the bottom, one style:** `Sheet` (M09: title, description, ✕, content, stacked XL actions), `ActionSheet` (M12 menu, the red destructive row last), `ConfirmSheet` (neutral / destructive / typed; busy can't close, a failure says nothing changed), `ReportSheet`, `PickSheet` / `PickList` (kit/pick-list.tsx: every pick-one list, MD 40 or LG 48 with a helper), `SheetSelect` (A06 Select over a PickSheet), `PermissionSheet` / `usePrePrompt(kind)` / `useNotifyPrePrompt()` (KIT-PM-01…04, once per phone). One scrim, however many sheets are stacked; with the keyboard up a sheet fits above it.
- **Feedback:** `useToast()` (one at a time, 8 px above the foot — or above an open sheet's actions — and always tappable; `progress` and `BUILD_TOASTS` for TO-03/03b/03c; `FLOAT_ATTR` on anything floating over the foot that it must clear), `ListBones` (after 300 ms; `useDelayedBones` for your own bones) / DS `Skeleton`, `EmptyState` / `ErrorState` / `NotFoundState` (kit/state.tsx: M48 / M49 at full width, H3 title, 32 px icon, one XL action; a not-found page is ER-04 "This project isn’t here" + Go to Feed), `Banner` (M01: tones `good` · `attention` · `info` · `error`), `useOnline()` / `OfflineBanner`. Not the DS `StateCard` directly, not a hand-made note.
- **Media:** `MEDIA_GROUND` (bg/overlay), `MEDIA_INK`, `MEDIA_CHIP`, `MEDIA_THEME` (kit/media.tsx) under and on photos and video: they stay dark in dark mode, where `bg-inverse` turns light.
- **Account:** `useAuth()` (lib/account/auth.ts) for who is signed in; `account/parts.tsx` (`AccountHeading`, `ACCOUNT_CONTENT`, `PasswordChecklist`, `AccountAlert`); `GuestGate`.
- **DS atoms** (`components/ideeza/*`): Button (sizes up to `xl` = 44), IconButton, TextInput (`size="xl"`, `prefixText`), SearchInput (`size="xl"`: 44, 16/24), Textarea, Radio / Checkbox (an `sr-only` input inside a `relative` label, the atom `decorative`), Tag (`onClick`, `selected`, `onDismiss`), Avatar (`phone` for LG/XL initials), Badge, ProgressBar, Spinner, Skeleton, TestnetDemoBadge. Form fields: `Field`, `PasswordInput`, `errorProps`, `useFieldIds` from `components/auth/auth-parts.tsx`. Icons: `Icon` + `@hugeicons/core-free-icons` (the Figma's `icon/<name>` is `<Name>Icon`).

## Type scale

Every text in /m takes one of 16 roles from `components/mobile/type.ts`: always `className={cn(T.section, "…layout…")}`, never a raw `text-<size>`. The only change a call site may make is another semantic colour (`cn(T.meta, "text-text-tertiary")`). DS atoms (Button, TextInput, Tag, Badge, Avatar) own their text.

| Role | Figma style | px | Used for |
|---|---|---|---|
| `T.hero` | Heading/H2 | 28/36 semibold | the one headline of a screen (AI home) |
| `T.amountHero` | H2 size | 28/36 semibold, tabular | the one balance on a money screen |
| `T.display` | Heading/H3 | 24/32 semibold | empty/error title, plan or pack price |
| `T.title` | Heading/H4 | 20/28 semibold | project, product, creator name; sheet title |
| `T.screenTitle` | Heading/H6 | 16/24 semibold | the top bar's title |
| `T.section` | Heading/H6 | 16/24 semibold | section heading, card title, a stat number |
| `T.bodyStrong` | Body/MD Medium | 16/24 medium | toast title, alert title |
| `T.bodyLg` | Body/MD | 16/24 | M12 and pick-one rows, a 44 px field's value |
| `T.body` | Body/SM | 14/20 | paragraphs, sheet description, a settings row |
| `T.rowTitle` | Body/SM Medium | 14/20 medium | a row title over a meta line, a tab, a price in a row |
| `T.name` | Label/LG | 14/20 semibold, wide | a name in a dense card |
| `T.meta` | Body/XS | 12/18 | meta line, timestamp, group label |
| `T.caption` | Caption/MD | 12/16 | chip, helper, error, A03 Link SM |
| `T.micro` | Caption/SM | 11/16 | badge, tab-bar label, duration |
| `T.label` | Label/MD | 12/16 semibold, wide | a field's label |
| `T.overline` | Label/SM | 11/16 semibold caps, wider | eyebrows: `Eyebrow` (kit/eyebrow.tsx) |

`tests/projects/mobile-type-scale.test.mjs` guards it: the shell and the kit have no raw size at all, and the count of raw sizes (and of the forbidden ones: `text-xl`, `text-2xl`, `text-6xl`+, literal sizes, bold, unpaired sizes, caps without `tracking-wider`) in /m may only go down. Moving a screen to `T.*`? Lower the baseline in that test.

## Tokens at phone width

Inside /m the page is always phone-width (the desktop shows it in a 375 px iframe), so tokens take their phone values. Pick the token whose **phone** value is the Figma's pixel value:

| Figma px | spacing class | font |
|---|---|---|
| 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 | `1 · 2 · 3 · 4 · 5 · 6 · 7 · 8` | 11 `text-xs` · 12 `text-sm` · 14 `text-md` · 16 `text-lg` |
| 20 | `12` | 18 `text-2xl` · 20 `text-3xl` (H4) |
| 24 | `16` | 24 `text-4xl` (H3) · 28 `text-5xl` |
| 32 · 40 · 56 · 64 | `20 · 24 · 32 · 40` | pair each size with its `leading-*` |

Radius keeps the DS default mode inside /m (owner rule, never switch variable modes): name the Figma's variable and it renders the Figma's value (`rounded-xl` 12, `rounded-lg` 8), sheets included; XL and 2XL buttons keep their 20 / 24 side padding. Colours: only token classes or `var(--color-…)`. No hex, no new `--` variables, no `style={{}}` except for data (a measured offset, a progress width). A raw `h-[44px]` for a Figma component's fixed size is fine.

## Rules every screen keeps

- Real logic behind every control — the web's stores and API routes (`src/lib/*`, `/api/*`). A control with nothing behind it yet is disabled with its reason, never a dead button.
- Every state the Figma draws: loading (bones after the shell), empty, error, offline, the disabled and busy states of each action.
- Text over a photo or video is white (`data-theme="dark"` on the overlay, `status="media"`).
- Money is Testnet demo: the `TestnetDemoBadge` once per screen by the first money figure.
- Tabs need an account; the way-in screens are `ENTRY_PATH` in `lib/account/phone.ts`; `account/mobile-gate.tsx` decides who may open what.
- Phone-only logic goes in `src/lib/<area>/` with relative imports and a `tests/projects/*.test.mjs`.
- Prototype-only things (a Demo sheet standing in for a provider, a demo email) say "Demo" on screen.

## Checking a screen

1. `npx tsc --noEmit -p tsconfig.json`, `npx eslint <your files>`, and `npm run test:projects` when `src/lib` changed.
2. Run the worktree's dev server and drive the screen headless at phone size:
   `node scripts/mobile-shot.mjs --url http://localhost:<port>/m/<screen> --out /tmp/<name>.png --signin --steps steps.js` (`--dark` for dark mode, `--profile <dir>` to keep the browser's data between runs). Open the PNG and compare it with the Figma frame's screenshot (`get_screenshot`).
3. Check every control does what it says (steps can click, type and read the DOM).

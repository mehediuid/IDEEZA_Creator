# Settings

The account's Settings (spec `docs/superpowers/specs/2026-10-19-settings-design.md`; Figma User Panel V2 "✅ Settings" `19140:152179`). Settings is about the person; project things stay on the project. Every page has its own URL and every row a deep link (`/settings/<page>#<row>`). Back to [README.md](README.md).

## Shell
- **Frame** (`components/settings/settings-frame.tsx`): the white sheet on the page frame with the settings side-nav, a hairline, and the page — breadcrumb Settings › Group › Page, the page title, then its cards. Below a 768 px page container the side-nav goes and a "Settings" link leads back to the list.
- **Side-nav** (`settings-nav.tsx`): General · Preferences · Audience as accordions (the group holding the current page opens itself), then Plan & Pricing, Policy & Privacy, Activity, Report; the current page is the outlined brand pill. Pages and their order come from `lib/settings/registry.ts`.
- **Cards and rows** (`settings-card.tsx`, `settings-choice.tsx`): a bordered card with its header action (Figma's Edit), rows of label + helper + control, link rows with a chevron, read-only fields ("No information" when empty), the Cancel / Update pair, and the Figma radio-list modal with options that can be disabled with their reason. Arriving at `#<row>` scrolls the row into view and outlines it once.
- **Preferences store** (`lib/settings/prefs.ts`, `use-settings.ts`): one record `ideeza:settings` (v1) for notifications, language, appearance, AI, audience, blocking, privacy and credit alerts; a broken field falls back alone to its default. Data with a home of its own stays there (messages, profile, payment token, theme, PCB settings).
- **Home** `/settings`: Find a setting (every page and row, `lib/settings/search.ts`; Enter opens the first), the four Most visited tiles (IDEEZA Pay, Blocking, AI Properties, Payment), and Looking for something else — the privacy policy and the terms read "Not available yet" because the app has neither page. On a phone the page list follows.
- **Security** `/settings/security`: every Figma row needs accounts, so the page says sign-in isn't in the app yet, lists what will be here, and links to Download your information.
- **Doors**: the account popover's Settings row; ⌘K "Settings", "Plan & pricing", "Wallet & tokens" (opens the wallet dialog) and, while typing, every matching settings row; the Plan & pricing breadcrumb's "Settings".

## Language
`/settings/language` (Figma 22048:34238; `components/settings/language-page.tsx`).
- **App Language › Account Language**: English (US). The Select Language modal lists Bangla, English, Hindi, Arabic, Thai, Español; every one but English is disabled with "Not available yet" (D10).
- **Time Formatting › Date & Time Formatting**: the Figma radio modal with each option's live example of 12 March 2020 18:09 — Your browser (automatic, the default), United States, India, Austria, Belgium, Thailand, Español, ISO (`2020-03-12 18:09`). A region is its real locale: order, separators, 12/24-hour clock, its month words, and Thailand's Buddhist-era years. Saved in `ideeza:settings` `language.dateLocale`.
- **The dates helper** (`lib/settings/dates.ts`, hook `use-dates.ts`): `formatDate` (styles numeric · medium · long · day · weekday), `formatTime` (seconds, a time zone), `formatDateTime`, `formatStamp`. History (chat rows, the builds table), Messages (list times, day dividers, clocks), the Blog list and Quick view, Plan & pricing's Billing history and invoices, and a profile's local time use it. Relative words ("now", "5m", "Today") stay as they are.
- **Time zone**: a link row to Personal Information.
- **Voice typing** (new card): the language the mic listens for (`language.voice`; `lib/settings/voice.ts`, names from the browser's `Intl.DisplayNames`). "Same as the app" is English (US). Every dictation box (`useVoiceInput`) starts its recogniser in it.

## Appearance & accessibility
`/settings/appearance` (new page; `components/settings/appearance-page.tsx`). Every control saves as it changes.
- **Theme**: stays in the account menu (D11); the row explains that and **Open account menu** opens the sidebar's account popover (in the phone drawer on a phone) with focus on its first row (`openAccountMenu()` in `dashboard/sidebar-account.tsx`).
- **Text size** Default · Large, **High contrast**, **Reduce motion** Match system · Reduce: `<html data-text-size="large" | data-contrast="high" | data-motion="reduce">` (`lib/settings/appearance.ts`). A pre-paint script in `<head>` sets them before the first paint; `AppearanceSync` (`components/settings/appearance-sync.tsx`, root layout) follows changes. Large steps each `--font-size-*` and its `--line-height-*` up one DS step (2xs–4xl; the display sizes have no larger line height to pair with, so they stay); High contrast gives secondary and tertiary text the primary text token and every border the strong border token, in both themes (`tokens.css`); Reduce joins the reduced-motion rule in `reset.css`, and scripted motion asks `motionReduced()` (smooth scrolling, the assembly viewer).
- **Single-key shortcuts** (on by default): off, the PCB (H, V, R), 3D (G, R, S, H, L, B, Y, 0) and Connection Map (V, L) editors ignore a key that types a character on its own; ⌘/Ctrl/Alt shortcuts and Escape, Delete, Space, Enter keep working (`lib/settings/keys.ts` `singleKeyShortcutsAllowed`, first line of each editor's keydown handler). Code, Wiring and Preview have no single-key shortcuts.
- **Units, grid and hotkeys**: a link to the active project's PCB editor, where the Setting menu holds them (D12); greyed with the reason when there is no project.
- **Keep notices until I close them**: the choice is stored (`appearance.keepNotices`).
- **Data saver**: a post's video doesn't preload (not a byte until Play); videos never autoplay anyway.

## AI Properties
`/settings/ai` (the home's AI Properties tile; `components/settings/ai-page.tsx`, its route reads this deployment's keys at request time).
- **Where your AI requests go**: Text → Pollinations' keyless text model; Images → AI Horde's volunteer GPU pool (or Pollinations when the deployment has `POLLINATIONS_TOKEN`); 3D models → Meshy when `MESHY_API_KEY` is set, else a sample model.
- **Use the volunteer GPU pool for images** (on by default): off, concept images and the 3D editor's AI Generate send `pool: "off"`; the routes never send them to the Horde and, with no other image service, refuse with `pool-off` (409) and say so on the concept card and in the 3D dialog. Disabled with its reason when the deployment draws images with Pollinations.
- **AI help in the editors** (on by default): off hides the Code editor's AI chat (the Code Development activity-bar button and the Blockly AI tab) and the 3D toolbar's AI Generate.

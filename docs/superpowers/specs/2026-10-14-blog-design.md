# Blog — design (2026-10-14)

Source: the Figma "User Panel V2" section *User Blog* (`HDtWAU2PSbjQKlEWgHI3ev`, node `41549:125788`) is
**requirements only**; visuals come from the IDEEZA Design System. A five-role audit (research, flow/IA,
UI/DS, engineering, content/a11y) produced the plan the owner approved on 2026-10-14 ("সুপারিশ মতোই করো"):
plan https://claude.ai/artifact/VoL35ZTNLEzNu7EUWd4sLv, mockup https://claude.ai/artifact/EtZyjmB325okQ4XN2PnxaB.

## Owner decisions (all recommendations approved)
| # | Decision |
|---|---|
| D1 | One entry is an **article** ("post" belongs to Innovations). The section is **Blog**. |
| D2 | Editing a live article sends the **changes** for review; the live version stays up until they are approved. Changing the cover to one of the article's own (already reviewed) images applies at once. |
| D3 | **Reuse permission** is off by default, worded plainly, and can be turned off until IDEEZA has used the article. |
| D4 | One required **Category** (list below) + up to 5 **Topics**. NFT / Crypto / Fintech are gone. Both are asked only in the Send dialog. |
| D5 | Optional **About a project** link (your own projects) in the Send dialog; the article shows a project card. |
| D6 | Articles are read on their own in-app page `/blog/<slug>`; no reader feed in v1. |
| D7 | Editor = **TipTap v3** (3.31.3, pinned), loaded only on the editor route. The read path renders stored JSON with plain React. |
| D8 | Not in v1: text columns (an image row instead), justify, YouTube embeds, code colouring, a date filter, Medium, comments/likes. |
| D9 | No backend: a clearly labelled **Demo review** (an automatic check) decides ~60 s after sending. It never sets Featured or Taken down. Leaves at the production cut. |
| D10 | Review outcomes reach the writer in the **bell** (and the list counts). |

## IA and routes
Blog sits in the share layer, next to Innovations (sidebar: … Innovations · **Blog** · Messages). Routes in
`src/app/(create)/blog/` (creator-owned, same shell):
- `/blog` — your articles. URL state `?tab=&q=&page=`.
- `/blog/new` — an empty editor; the draft is created on the first real keystroke, then `router.replace` to its edit URL.
- `/blog/[slug]` — the article page (status card + the article as readers see it).
- `/blog/[slug]/edit` — the editor; `?view=preview` shows the reader view with a Preview bar.
- slug = `slugify(title) || "untitled"` + `-` + the id's last 8 chars; resolved **by the id tail**, then replaced with the canonical slug.

## Statuses (derived, never stored) — `lib/blog/status.ts`
| status | when | badge (DS Badge subtle) | sentence | row click | ⋯ |
|---|---|---|---|---|---|
| `draft` | no live, no submission, last review not "changes" | neutral **Draft** | Only you can see this. | editor | Delete draft |
| `review` | no live, submission pending | blue **In review** | The IDEEZA team is reading it. We'll let you know when it's live. | article page | Edit · Delete |
| `needs` | no live, last review = changes, nothing pending | warning **Needs changes** | The IDEEZA team asked for changes. See what to fix, then send it again. | editor (+ What to change) | Delete |
| `live` | live, nothing pending | success **Live** (+ outline success ★ **Featured**) | Anyone can read it on the IDEEZA Blog. | article page | Copy link · Change cover · Edit · Take offline · Delete |
| `changes` | live, submission pending | success **Live** + blue **Changes in review** | Readers still see the live version until your changes are checked. | article page | Copy link · Discard changes · Delete |
| `down` | takenDown set | neutral **Taken down** (eye-off icon) | The IDEEZA team took this off the Blog. Only you can see it. | article page (reason) | Delete |

Sub-lines: a live article whose last update was sent back shows **Update needs changes**; a live article with
unsent edits shows **Unsent changes**. Editing while a submission is pending first asks *"Take this article out of
review to edit it?"* and withdraws the submission (the draft is frozen while in review). Never the DS error
badge (fails contrast); never colour alone (badge always has its word).

## Data — `lib/blog/*`, localStorage + IndexedDB
- `ideeza:blog` — `{ v: 1, articles: BlogArticle[] }`, the index (list rows, meta, review history). Read-modify-write
  on the freshest copy (messages-store pattern); an unreadable key is never written over.
- `ideeza:blog:doc:<id>` — the working body `{ rev, doc }`. `ideeza:blog:live:<id>` — the approved body.
- IndexedDB `ideeza-blog` / `files` (keyPath `key`, index `articleId`) for images and video — never data URLs,
  never `ideeza-media` (the project delete sweep clears that).
- `BlogArticle = { id, createdAt, updatedAt, draft: Meta, live: (Meta & { approvedAt }) | null, submission:
  { at, decideAt, kind: "first" | "again" | "changes" } | null, reviews: ReviewRound[], reuse: { allowed, at },
  featured, takenDown: { at, reasonIds } | null }`, `Meta = { title, categoryId, topics, projectId, cover }`,
  `cover = { fileKey, x, y, zoom, alt } | null` (a non-destructive 3:2 crop of a stored image),
  `ReviewRound = { at, outcome: "approved" | "changes", reasons: { id, detail }[], kind, seen, demo }`.

## Body — `BlogDoc v1` (ProseMirror JSON subset), `lib/blog/doc.ts`
Nodes: `paragraph`, `heading` (level 2 | 3; the title is the only H1), `bulletList`, `orderedList`, `listItem`,
`blockquote`, `codeBlock`, `horizontalRule`, `hardBreak`, `image` {fileKey, alt, caption, decorative},
`imageRow` (2–3 images), `video` {fileKey, caption}, `projectCard` {projectId}. Marks: `bold`, `code`, `link`
{href: http/https/mailto only}. **No italic** (Manrope has none). `normalizeDoc` drops anything else on every read;
the renderer maps JSON to React elements — **no `dangerouslySetInnerHTML` / `innerHTML` under blog paths**.
Helpers: `wordCount`, `readingMinutes` (238 wpm + 10 s per image + 3 s per code line, min 1), `headingsOf`
(H2 with H3 under it, deduplicated anchors), `imagesOf`, `missingAlt`, `unreferencedKeys`.

## Categories (D4) — `lib/blog/categories.ts`
Build story · How-to · Electronics & PCB · Firmware & code · 3D & mechanical · Robotics · Manufacturing ·
Selling hardware. Stored by id.

## Demo review (D9) — `lib/blog/demo-review.ts`, pure and deterministic
Decides at `at + 60 s`, materialised **lazily on read** (`settleReviews(index, now)`; the store copies the draft
body to `live:` on approval) and by a timer while the app is open. Rules, each with a fix hint:
- **Needs more detail** — fewer than 150 words ("Write at least 150 words, you have 92.").
- **Hard to follow** — 400+ words and no heading ("Split it into short sections with headings.").
- **Reads like an ad** — more than one link per 40 words, more than 40 % capitals, or a repeated paragraph.
Otherwise approved. Every round says *Demo review* and "In this preview an automatic check stands in for the
IDEEZA team." Reasons library (real reviewers later): needs-detail, off-topic, reads-like-ad, image-rights,
hard-to-follow, personal-unsafe.

## Screens (mockup boards)
1. **Your articles** — H1 Blog + intro, **New article**; DS Tabs (All · Drafts · In review · Needs changes · Live,
   with counts) + title search; rows: 3:2 cover thumb, title (2 lines, the link), category, status badge(s),
   status-aware date ("Edited 2 h ago", "Sent Oct 12", "Live since Sep 28"), ⋯ (`Menu`). "Needs changes" rows say
   "n things to fix". 12 per page. Table from 600 px, stacked cards below. Empty / no results / error states teach.
2. **Write** — sidebar collapsed; editor bar: breadcrumb, save state ("Saving… / Saved 4:12 PM / Couldn't save ·
   Try again"), Preview, **Send for review** / **Send again** / **Send changes for review**. Title (H2 28/36) +
   body (Body/MD 16/24). "+" inserts Heading, Subheading, Image, Images side by side, Video, Bulleted list,
   Numbered list, Code, Quote, Divider, IDEEZA project; the selection bubble formats Bold, Link, H2, H3, Quote;
   markdown shortcuts. Images ask for a description (or "decoration only"). While Needs changes, a **What to
   change** panel is pinned on top.
3. **Send dialog** — one column: cover (auto-picked from the first image; drag, arrow keys, zoom −/+, Center
   image; pick another article image or upload), cover description, Category (required), Topics (≤ 5), About a
   project (optional), More options › *Let IDEEZA reuse this article* (unticked + plain helper), a reminder for
   images without a description (not blocking). Missing title/body/category is said next to the field.
4. **Article page** — breadcrumb; status card (badge, sentence, actions; reasons + **Edit article** when Needs
   changes; reason + Contact support when Taken down); the article (H2 title, byline You · n min read · date, 3:2
   cover, body; prose links underlined); rail: On this page (scroll-spy on `<main id="main-content">`), Category
   and Topics, About a project, Reuse by IDEEZA. Phone: one column, "On this page" folds.
5. **States** — first visit (3 steps), skeleton, no results, error, Change cover, delete per status, Take offline,
   Discard changes (only when a save failed), upload errors (type, > 5 MB, small image warning), bell items.

## Copy (glossary)
Blog / article · Cover image · Category, Topics · Send for review, Send again · IDEEZA team (never admin) · Live,
Taken down · Reuse · "5 min read". Dates `Intl.DateTimeFormat` ("Mar 24, 2025"), relative under 7 days.

## Build phases (branch `feat/blog`)
P0 foundations (lib/blog + tests, store, files, routes, sidebar) · P1 list · P2 editor · P3 article page +
preview · P4 send dialog, cover, review outcomes in the bell · P5 image row + video · P6 hardening (keyboard,
390 px, dark, quota, guard tests, browser verification, `next build`, docs).

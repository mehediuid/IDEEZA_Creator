# Blog — Figma requirements, one by one (2026-10-14)

The owner (2026-10-14): the built Blog does not match the Figma requirements; many are missing. The first build
dropped or moved Figma requirements in the name of UX recommendations. **Rule from now on: every requirement in
the Figma "User Panel V2 › User Blog" section (`HDtWAU2PSbjQKlEWgHI3ev`, node `41549:125788`) is built. Only the
look comes from the IDEEZA design system.** Where the Figma conflicts with a hard rule (consent, contrast,
a feature that needs a backend this build doesn't have), the requirement is still built and the difference is
named below.

Status key: **was** = what the first build did · **now** = what this pass builds.

**Built and checked in the browser, 2026-10-14** (feat/blog, 1440 and 390, light and dark): every row below. Where a row's "now" differs from the Figma's drawing, the reason is in that row or under "Differences, named" at the end.

**Audit fix pass, 2026-10-15.** A 27-member UX audit (94 findings, report https://claude.ai/artifact/QUM6js2CMEwNyQxwHtEjBH) found six rows above paraphrasing their frames (L1, L2, L10, P2, P3, P6: now quoted) and about 25 changed details nobody had named. The owner answered "do as recommended": every Now fix is built, and the owner decisions D-1…D-20 below follow the team's recommendation. Rule unchanged: no Figma requirement is removed, renamed, hidden or moved.

## List (frames 01–09)
| ID | Figma requirement | was | now |
|---|---|---|---|
| L1 | Search "Search by blog title or user name" (frame 01) | "by blog title" only | the Figma placeholder; matches every word in any order and the writer's own name (D-6) |
| L2 | **Reuse Access** filter: "All · Allow for use · Not Allow" (frame 03) | missing | the Figma words in sentence case: All · Allow for use · Not allow |
| L3 | **Status** filter (dropdown): All · Approved · Pending · Rejected · Draft · Removed · Re-submitted (+ Featured) | tabs with other names | dropdown, Figma statuses, counts |
| L4 | **Date Range** filter: a month calendar, range selection | missing | build (calendar popover, range, Clear) |
| L5 | "Create a New Blog" button | "New article" | "Create a new blog" |
| L6 | Columns: Blog Title · Category · Date & Time · Status · ⋯ | Article (with cover) · Status · Last change | Figma columns; date as "Mar 24, 2025 · 03:32 AM" |
| L7 | Green check after a title = reuse allowed, tooltip "Authorized for Use" | missing | build (icon + tooltip on hover and focus) |
| L8 | Truncated title shows the full title in a tooltip | missing (2-line wrap) | build |
| L9 | Statuses: Featured (with icon) · Approved · Draft · Re-submitted · Removed · Pending · Rejected | renamed (Live, In review, Needs changes, Taken down) | Figma names, DS badge tones |
| L10 | ⋯ Approved/Featured: "View to Website · Edit · Change Thumbnail · Delete" (frames 06, 23–25) | Copy link · Change cover · Edit · Take offline · Delete | View · Edit · Change thumbnail · Delete (+ Copy link, Take offline) |
| L11 | ⋯ Draft: Edit · Delete | Delete | Edit · Delete |
| L12 | ⋯ Re-submitted / Rejected: Quick View · Edit · Change Thumbnail · Delete | Delete (Rejected), Edit · Delete (review) | Quick view (a side panel with the blog and its reject reasons) · Edit · Change thumbnail · Delete; Pending the same |
| L13 | Removed: no actions | Delete | View · Delete |
| L14 | Delete confirm: trash icon, "Delete blog?", Cancel / Yes, delete | text-only dialog | icon + Figma wording, fixed grammar |
| L15 | Pagination | ✓ | ✓ |

## Create / edit (frames 10–13)
| ID | Figma requirement | was | now |
|---|---|---|---|
| E1 | Breadcrumb Blog › Create New Blog; Preview + Publish buttons | ✓ (other words) | Figma words |
| E2 | **Blog Category (Required)** above the editor | moved to the send dialog | on the page |
| E3 | **Tag (Optional)** chips above the editor | moved to the send dialog as Topics | on the page (the same tags the publish step lets you change) |
| E4 | Tag Link (Optional) "ex. ideeza.com/your product" (frames 14–19) | "About a project" in the dialog | on the page: link one of your IDEEZA projects |
| E5 | Title + "Start your story here…" + "+" | ✓ | ✓ |
| E6 | "+" opens a toolbar: image · video · 1 / 2 / 3 column layout · align left / center / right / justify · bulleted · numbered · code | vertical menu, no columns, no alignment | Figma toolbar with every tool (+ heading, which "On this page" needs) |
| E7 | "Drafted" save state | "Saved" | "Drafted" |

## Publish (frames 14–19)
| ID | Figma requirement | was | now |
|---|---|---|---|
| P1 | Two-column modal: Thumbnail · "Do you want to publish your blog?" | one column | two columns (one on phones) |
| P2 | Thumbnail: empty state "Include a high quality 400×267 pixels image in your blog" + Upload (frame 14); image with −/+ zoom and "Drag or use arrow keys to reposition"; Upload new | ✓ (other layout) | Figma layout in DS |
| P3 | "Select thumbnail one of your images" strip with a › scroll arrow (frames 17–18) | wraps, no arrows | scrolling strip with arrows |
| P4 | "Add or change topics (up to 5)" | Topics | same field as the page's Tags, "Add or change" |
| P5 | "Give access to IDEEZA to future use" checkbox with a ? tooltip | under "More options", unticked | visible, with the ? help; **unticked by default** (consent rule — Figma pre-ticks it) |
| P6 | After IDEEZA shared it on Medium: the box is locked, tooltip "This option cannot be unchecked. Please contact support to make changes" with "support" as a link (frame 16) | missing | build (data + locked state; this build has no Medium link, so nothing sets it yet) |
| P7 | "Save and Publish" | "Send for review" | "Save and publish"; the line under it says the IDEEZA team reviews it first |
| P8 | Edit of a published blog: "Update" | "Send changes for review" | "Update" |

## Preview, details, change thumbnail (frames 20–25)
| ID | Figma requirement | was | now |
|---|---|---|---|
| D1 | Preview: Blog › Create New Blog › Blog Preview, "Close Preview ×", writer, read time, date, rail (Category, On this page, tags) | ✓ | Figma breadcrumb + Close preview |
| D2 | Details: Reject Reason panel above (collapsible, dated), Blog › Blog Details, Edit top right, rail with the status badge, Category, On this page, tags | status card | Figma order: reasons panel, breadcrumb + Edit, rail starts with the status |
| D3 | Change Thumbnail modal (from ⋯): image, zoom, strip with scroller, Upload, Update (off until changed) | ✓ ("Change cover") | "Change thumbnail", "Update" |
| D4 | Likes / comments / "Date posted" (hidden layers in 20) | not built | not built: hidden in the Figma itself |

## Owner decisions (2026-10-15, as the audit recommended)
- **D-1** "View to website" opens a **reading view** of the published version (`/blog/<slug>/read`, D1's card, Close ×); Copy link copies it. A public route is Later; the toast, a rail caption and the not-found page say the demo link opens only in this browser.
- **D-2** Review time: the demo's only ("Demo review · decides in about a minute"); no production promise yet.
- **D-3** Removed is final: read it or delete it; "Contact IDEEZA support" opens Report a problem with "Blog removed: <title>". Its reasons never say how to fix.
- **D-4** One reuse scope string everywhere (helper, ?, P6); revoke by unticking in the publish/Update modal (a toast confirms); shared copies stay until IDEEZA support removes them.
- **D-5** Bangla: the word count and read time count Bangla words correctly; no Bangla UI yet.
- **D-6** Search also matches the writer's own name.
- **D-7** The Figma's exact words, only misspellings fixed ("Mintes" → minutes, "kyes" → keys, "upto" → up to); the editor's crumb is "Create new blog" on every editor page (frame 19).
- **D-8** P2's Figma sentence restored; the 1200 × 800 small-image warning stays.
- **D-9** The app's sidebar shell stays on the editor, preview and details (the Figma draws no sidebar there).
- **D-10** The hero is the writer's 3:2 crop (the Figma draws a wider banner).
- **D-11** The delete dialog uses the shared DS ConfirmDialog layout (trash mark, "Delete blog?", Cancel, "Yes, delete").
- **D-12** Removed ⋯ = View to website · Delete (the Figma greys it, which would leave it undeletable).
- **D-13** Tag link is a combobox: pick one of your projects, or paste an ideeza.com link ("ex. ideeza.com/your product").
- **D-14** The category list is the owner's hardware list.
- **D-15** Change thumbnail on a blog in review takes it out of review first, as Edit does, and says so.
- **D-16** The bell also says "Blog · Featured" and "Blog · Removed".
- **D-17** Delete, Take offline and Discard changes offer Undo in their toast, phones included.
- **D-18** The reading body stays Body MD 16/24, at a reading measure.
- **D-19** A thumbnail that repeats the first body image shows both.
- **D-20** DS-wide token changes (text-secondary, disabled text, the dark border ramp, a ≥ 3:1 input border, H1 36 / H2 30, the dialog title at H4, the dark first paint) are a separate DS change, not this release; the blog title keeps its 28 token until then.

## Differences, named (requirement built; one detail changed for a hard rule, an owner decision, or an addition)
**List (L1–L15)**
- L2: a narrowed trigger reads "Reuse: allowed" / "Reuse: not allowed".
- L3: Rejected also lists live blogs whose update was rejected (they keep their Approved/Featured badge), and Featured keeps a Featured blog whose update is in review, so counts can add up to more than All. Letter typeahead in both filter menus.
- L4: the trigger names the range day first ("9 – 13 Oct 2026"); a caption says it filters the Date & time column; on touch the panel widens to seven 44 px days.
- L6: Date & time is the latest status event (sent, decided, removed; a draft's last edit), day first as frame 01 ("24 Mar 2025 03:32 AM"); the moment is named in a tooltip (table) or in words (card). "-" marks a missing category. A note sits beside the badge ("n things to fix", "Live · update in review", "Update rejected · n things to fix", "Unsent changes"). Cards below 600 px.
- L7, L8, L9: tooltips open on hover, keyboard focus and tap; each badge carries its status sentence. Status marks: Featured a star (the Figma's gem reads as "paid"), Removed eye-off; Rejected is the filled DS error badge, as frame 01 draws it.
- L10–L13: extra ⋯ rows Copy link, Take offline and Discard changes where they apply; Quick view is a DS Drawer.
- L14: "Delete blog?" for every status; the body says what happens for that status and that Undo is offered.
- Above the toolbar: an `h1` "Blog" and one line on what the Blog is for. The first visit teaches the three steps and "What the IDEEZA team looks for", and says blogs are kept in this browser (demo only). "Clear filters" appears while a filter narrows.

**Create / edit (E1–E7)**
- E1: on phones the crumbs sit above Blog category and Preview is a visible button. Publish stays enabled before anything is written and names what is missing under each field.
- E5: the "+" shows at rest beside the empty first line, as frame 10 draws it; the title takes focus on a new blog.
- E6: the "+" toolbar is a bordered popover over the caret's column with one Tab stop and key hints (⌘ on Apple, Ctrl elsewhere); the toolbar also has Heading, Subheading, Quote, Divider, Images side by side and IDEEZA project; the selection bubble adds lists and Code; the phone bar adds Undo and Redo; an empty code block says "Code · Tab indents · Esc leaves".
- E7: besides "Drafted" (with "saved … in this browser" on hover): "Saving…", the offline line, "Not saved" + Try again with the cause, "Adding photos · n of m"; a live blog says readers keep the published version until the update is approved. A leave dialog, a two-tab conflict banner, a title counter from 120 characters and a lossy-paste banner are additions.

**Publish (P1–P8)**
- P1: ✕ sits in its own row; "Thumbnail" and the question are the column heads (Label LG); on phones one column, question first, with the button pinned in the sheet's footer.
- P2: adds a crop warning ("At this zoom the thumbnail is W × H px…"); a blog without images shows no strip, an earlier upload appears as "Your uploaded thumbnail".
- P5: a visible helper under the label (the D-4 scope, optional, how to revoke); the box starts unticked (the Figma pre-ticks it: consent is the writer's to give); a grant is saved only by Save and publish / Update, a withdrawal on close is saved with a toast.
- P6: the Figma sentence, then "Shared on Medium · <date>"; "support" opens Report a problem. The bubble uses the DS dark tooltip (frame 16 draws a light one). Nothing sets the lock until IDEEZA has a Medium link.
- P7: stays off without a thumbnail but focusable, saying why; under it the review line, "Demo review · decides in about a minute", "What the IDEEZA team looks for" and the demo check's advice.
- D3: names the blog; says why Update is off; a new image on a live blog goes for review with Update (a note says so first, a "Waiting for review" badge marks it).

**Preview, details, reading view (D1–D4)**
- D1/D2: "n minutes to read" after the Figma's dot, and a day-first date; the writer's profile name and photo ("You" until a name is set); an article-led 9/3 split; rail heads Label LG; the breadcrumb wraps instead of folding. Preview shows a 3:2 thumbnail placeholder before one is picked.
- D2: the Reject reason panel adds a count caption (never in the title), "Latest review" and "Demo review" badges, the visible demo note, "Earlier reviews (n)" folded, and three lines per reason (title, what was found, how to fix). Removal reason has no fix lines: removal is final, with Contact IDEEZA support. The rail adds the demo time while it waits and "Shared on Medium · <date>". On phones a copy of the status badge sits in the byline row (the rail order is unchanged). A Featured blog with an update in review shows both badges.
- Reading view (new, D-1): "Blog › Blog details › Reader view" with Close ×.
- D4: likes, comments and "Date posted" are not built: hidden layers in the Figma itself.
- Bell (owner D10, D-16): Approved, Rejected, Featured and Removed; on phones the bell sits in the top bar; a review result is announced politely.
- Labels are in DS sentence case.

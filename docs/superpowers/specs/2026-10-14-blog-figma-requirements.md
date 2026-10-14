# Blog — Figma requirements, one by one (2026-10-14)

The owner (2026-10-14): the built Blog does not match the Figma requirements; many are missing. The first build
dropped or moved Figma requirements in the name of UX recommendations. **Rule from now on: every requirement in
the Figma "User Panel V2 › User Blog" section (`HDtWAU2PSbjQKlEWgHI3ev`, node `41549:125788`) is built. Only the
look comes from the IDEEZA design system.** Where the Figma conflicts with a hard rule (consent, contrast,
a feature that needs a backend this build doesn't have), the requirement is still built and the difference is
named below.

Status key: **was** = what the first build did · **now** = what this pass builds.

**Built and checked in the browser, 2026-10-14** (feat/blog, 1440 and 390, light and dark): every row below. Where a row's "now" differs from the Figma's drawing, the reason is in that row or under "Differences, named" at the end.

## List (frames 01–09)
| ID | Figma requirement | was | now |
|---|---|---|---|
| L1 | Search "by blog title" | ✓ | ✓ |
| L2 | **Reuse Access** filter: All · Allow for use · Not allow | missing | build |
| L3 | **Status** filter (dropdown): All · Approved · Pending · Rejected · Draft · Removed · Re-submitted (+ Featured) | tabs with other names | dropdown, Figma statuses, counts |
| L4 | **Date Range** filter: a month calendar, range selection | missing | build (calendar popover, range, Clear) |
| L5 | "Create a New Blog" button | "New article" | "Create a new blog" |
| L6 | Columns: Blog Title · Category · Date & Time · Status · ⋯ | Article (with cover) · Status · Last change | Figma columns; date as "Mar 24, 2025 · 03:32 AM" |
| L7 | Green check after a title = reuse allowed, tooltip "Authorized for Use" | missing | build (icon + tooltip on hover and focus) |
| L8 | Truncated title shows the full title in a tooltip | missing (2-line wrap) | build |
| L9 | Statuses: Featured (with icon) · Approved · Draft · Re-submitted · Removed · Pending · Rejected | renamed (Live, In review, Needs changes, Taken down) | Figma names, DS badge tones |
| L10 | ⋯ Approved/Featured: View · Edit · Change Thumbnail · Delete | Copy link · Change cover · Edit · Take offline · Delete | View · Edit · Change thumbnail · Delete (+ Copy link, Take offline) |
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
| P2 | Thumbnail: empty state "Include a high quality image" + Upload; image with −/+ zoom and "Drag or use arrow keys to reposition"; Upload new | ✓ (other layout) | Figma layout in DS |
| P3 | "Select thumbnail one of your images" strip with a scroll arrow | wraps, no arrows | scrolling strip with arrows |
| P4 | "Add or change topics (up to 5)" | Topics | same field as the page's Tags, "Add or change" |
| P5 | "Give access to IDEEZA to future use" checkbox with a ? tooltip | under "More options", unticked | visible, with the ? help; **unticked by default** (consent rule — Figma pre-ticks it) |
| P6 | After IDEEZA shared it on Medium: the box is locked, tooltip "cannot be unchecked, contact support" | missing | build (data + locked state; this build has no Medium link, so nothing sets it yet) |
| P7 | "Save and Publish" | "Send for review" | "Save and publish"; the line under it says the IDEEZA team reviews it first |
| P8 | Edit of a published blog: "Update" | "Send changes for review" | "Update" |

## Preview, details, change thumbnail (frames 20–25)
| ID | Figma requirement | was | now |
|---|---|---|---|
| D1 | Preview: Blog › Create New Blog › Blog Preview, "Close Preview ×", writer, read time, date, rail (Category, On this page, tags) | ✓ | Figma breadcrumb + Close preview |
| D2 | Details: Reject Reason panel above (collapsible, dated), Blog › Blog Details, Edit top right, rail with the status badge, Category, On this page, tags | status card | Figma order: reasons panel, breadcrumb + Edit, rail starts with the status |
| D3 | Change Thumbnail modal (from ⋯): image, zoom, strip with scroller, Upload, Update (off until changed) | ✓ ("Change cover") | "Change thumbnail", "Update" |
| D4 | Likes / comments / "Date posted" (hidden layers in 20) | not built | not built: hidden in the Figma itself |

## Differences, named (requirement built; one detail changed for a hard rule)
- **P5 reuse checkbox** starts unticked (the Figma pre-ticks it): consent is the writer's to give.
- **P6 Medium lock**: built in the data and the modal; nothing sets it until IDEEZA has a Medium link.
- **P2 thumbnail**: no description field (the Figma has none); a thumbnail picked from the blog keeps that image's description, an upload is drawn as decoration under the title.
- **P7 Save and publish** stays off without a thumbnail (as the Figma draws it), but stays focusable and says "Add a thumbnail to publish your blog."
- **L7, L8, P5, E6 tooltips** also open on keyboard focus and tap, not hover only.
- **L9 Rejected** badge is error ink on an error outline (the DS error fill under 12 px text fails AA); **Featured** uses a star (the Figma's gem reads as "paid").
- **E1 Publish** stays enabled before anything is written and says what is missing next to each field (the Figma greys it).
- **D2 details** keeps a ⋯ beside Edit for the status's other actions (the same menu as the list), and a one-line sentence under the status badge.
- **D4 likes / comments / "Date posted"** are not built: hidden layers in the Figma itself.
- Labels are in DS sentence case ("Reuse access", "Date & time", "Create a new blog").


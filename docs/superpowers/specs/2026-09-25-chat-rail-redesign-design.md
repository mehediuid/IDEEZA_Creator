# Concept chat rail — redesign spec

Requested by the owner on 2026-09-25, before going to sleep: *"kaj sesh hole ei
chat er design ta niye plan kore redesign korbe. aro kivabe interective kora
jay + aro kivabe user friendly info dekhano jay. sob kichu sesh kore rakhbe"*
(with a phone-width screenshot of the rail). They delegated the decisions
("ja korba koro"), so this spec is the design proposal below, adopted as is,
with the controller's amendments at the end. It builds on the product spec
sheet (`2026-09-25-product-spec-sheet-design.md`), which gives each product
the size · power · radio facts the rail now shows.


Skills used: `/impeccable` (product register, critique heuristics, detector: 0 findings on `chat-rail.tsx` and `build-rail.tsx`) and `/ui-ux-pro-max` (a11y, touch, feedback, navigation rules). Rules applied: `40-ui-ux.md` (read from tag `backup-before-strip`, since the worktree has no `docs/agent-rules/`), CLAUDE.md §5 entries 167, 186–196 and §7.

---

## 1. Diagnosis

### Screenshots (current rail, seeded "Car" chat: 4 products, 1 offered and passed over, a failed Remote Controller render followed by a good one, 396 credits)

All in `$SP/shots/` (`SP=/private/tmp/claude-502/-Users-ideeza-Downloads-IDEEZA-Creator/6baaa1e4-70b3-41c1-8f4f-b57ac5b3bc98/scratchpad`):

| Shot | What it shows |
|---|---|
| `rail-now-desktop-dark.png`, `rail-now-desktop-light.png` | Concepts ready, 1440 × 900 |
| `rail-now-phone-dark.png`, `rail-now-phone-light.png` | Same, 400 × 860, Chat tab |
| `rail-now-asking-phone-dark.png` | Setup question open, Chat tab |
| `rail-now-build-desktop-dark.png`, `rail-now-build-phone-light.png` | 4-product build running (seed step: `node $SP/rail-buildseed.cjs`) |
| `$SP/../images/3.png` | The owner's own screenshot |

### What makes it hard to use

1. **It is a transcript where the maker needs a status board.** Every render ever made stays as its own line, in the order it happened. With four products you get "Concept ready" four times, and after a few refines the same product appears several times. Nothing tells you which line is the current state of a product.
2. **A failure stays red after it has been fixed.** In the seed, *Remote Controller: Didn't come through* is still red, with the alert glyph, two lines above *Remote Controller: Concept ready*. The loudest thing in the rail is something that no longer matters.
3. **The composer aims at one product, and you can't pick which.** `focusedProduct` changes only as a side effect of Refine, Regenerate or adding a product. To change a different product you have to press Refine on its card (which opens a modal) or read the placeholder and hope. The rail lists the products but a click on them does nothing, while the build rail's product names during a build *are* buttons. The same list behaves two ways.
4. **No place, no price, no next step.** Nothing says where the maker is in *Idea → Concepts → Build → Save*, what the balance is, what the next action costs, or what to do next. The only pointer is *Waiting on your answers →*. On a phone the canvas is another tab, not to the right, so the arrow points at nothing (`rail-now-asking-phone-dark.png`).
5. **Nothing about the product itself.** The canvas now knows each product's size, power, radio, whether it fits, and whether it is in or out of the next build. The rail shows none of it, so comparing four products means scrolling a 2 × 2 grid of 640 px cards.
6. **The build sinks below the history.** During a build the whole pipeline (4 products × 5 pieces + headers ≈ 680 px) is appended *under* the transcript, below the fold on both desktop and phone (`rail-now-build-*.png`). It repeats the project name ("Project / Car", then "Building / Car") and the product names a third time.
7. **The screen reader account goes silent on phones.** The rail is the only live region (`role="log"`, polite). At phone width the rail is `display:none` whenever the Canvas tab is showing, which is where the maker is while a render runs. A hidden live region is not announced, so *Concept ready* is never read. The canvas tile explicitly relies on the rail for that (`PendingImageTurn`: "The rail beside the canvas reports when it lands").
8. **Smaller issues.** The waiting glyph is a spinner that doesn't spin. *Project / Car* is a label and value on two lines. The passed-over *Carrying Case* is missing from the rail. The rail auto-scrolls to its end on every new turn, so the newest line wins over the state. A large empty gap sits between the list and the composer on desktop.

### Heuristic scores (Nielsen, 0–4), current rail

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Per-render lines, but a stale red failure, no project state, build below the fold |
| 2 | Match with the real world | 3 | Plain words and product names |
| 3 | User control and freedom | 1 | Can't choose what the composer changes, can't jump to a card |
| 4 | Consistency and standards | 2 | Product names are inert here and buttons in the build rail below |
| 5 | Error prevention | 2 | The composer's target and cost show only in the placeholder and hint |
| 6 | Recognition rather than recall | 1 | Spec, in/out of build and current concept all have to be recalled from the canvas |
| 7 | Flexibility and efficiency | 1 | No jumps, no shortcuts |
| 8 | Aesthetic and minimalist design | 2 | Quiet, but "Concept ready" ×4 and an empty void |
| 9 | Error recovery | 2 | A failed line gives no way to recover and doesn't point at *Try again* |
| 10 | Help and documentation | 2 | The composer hint does the teaching |
| | **Total** | **18/40** | Poor. The fix is structural (IA), not cosmetic |

Persona red flags:
- **First-timer:** reads *Waiting on your answers →* on a phone and looks right; sees a red error and assumes the remote failed.
- **Power user with 4 products:** can't retarget the composer without opening a modal, and can't compare specs without scrolling.
- **Screen reader, phone:** hears nothing when a render lands.

---

## 2. The redesign (one proposal)

**The rail stops being a transcript and becomes the project's status board, with the transcript folded under it.** Top to bottom:

1. **Project header** (sticky): the name, the balance, where you are in *Idea → Concepts → Build → Save*, and the idea you typed.
2. **Next step slot:** one sentence saying what to do now, with **Show on canvas**. That button takes you to the canvas control that does it; it never *is* that control. During a build, the existing build states card (Cancel, Stop and refund, retry) takes this slot instead.
3. **Products:** one selectable row per product in the project, showing its thumbnail, name, live status, spec in one line, and in/out of build as state. Choosing a row sets `focusedProduct` (the composer, the review tabs and the rail all follow) and brings its card into view. During a build each row carries that product's pipeline.
4. **Activity:** the full history, collapsed to one line (*Activity · 9* + the latest event). Expanded, it is chronological with times, and a fixed failure reads *redrawn as Concept 4* in a neutral tone, not red.
5. **Composer:** unchanged, with one hint line reworded.

Only one thing is ever "active": the selected product. It shows as the row's fill in the rail and as its card's edge on the canvas. The violet brand colour is used for that selection and for the current step's dot, nothing else.

### 2.1 Wireframes

Desktop, 360 px rail, concepts ready (the seed; spec figures are illustrative):

```
┌─ rail 360 ───────────────────────────────┐┌─ canvas ─────────────────────
│ Car                         ◎ 396 credits ││ Car
│ ✓ Idea ─ ● Concepts ─ ○ Build ─ ○ Save    ││ 4 products in this project
│ “rc car” · 4 products                     ││ ┌──────────────┐┌──────────
│───────────────────────────────────────────││ │RC Car Contr… ││Remote Co…
│ ┌───────────────────────────────────────┐ ││ │ (selected:   ││
│ │ → Next: build 4 products · 16 credits.│ ││ │  brand edge) ││
│ │   You have 396.                       │ ││ │              ││
│ │   Show on canvas ›                    │ ││ └──────────────┘└──────────
│ └───────────────────────────────────────┘ ││
│ Products                                  ││
│ ┌───────────────────────────────────────┐ ││
│ │ ▣  RC Car Controller                  │ ││ ← selected row:
│ │    Concept 1 · ready                  │ ││   bg-brand-subtle
│ │    224 × 60 × 25 mm · ~4.8 h · nRF24  │ ││
│ └───────────────────────────────────────┘ ││
│   ▣  Remote Controller                    ││
│      Concept 4 · ready                    ││
│      60 × 46 × 48 mm · USB powered · nRF24││
│   ▣  Battery Charger                      ││
│      Concept 3 · ready                    ││
│      50 × 41 × 18 mm · USB powered        ││
│   ▣  Spare Battery Pack                   ││
│      Concept 5 · ready                    ││
│      100 × 40 × 23 mm · 2S Li-Po 1500 mAh ││
│   Also suggested: Carrying Case    Show › ││
│───────────────────────────────────────────││
│ ▸ Activity · 9                            ││
│   Latest: Spare Battery Pack drawn ·      ││
│   36 min ago                              ││
│───────────────────────────────────────────││
│ ┌───────────────────────────────────────┐ ││
│ │ Describe a change to RC Car Contr…    │ ││
│ │ 🎙                  ✧ Enhance   [↑]   │ ││
│ └───────────────────────────────────────┘ ││
│ Refines RC Car Controller · 1 credit.     ││
│ Pick another product above, or name a new ││
│ one to add it.                            ││
└───────────────────────────────────────────┘└──────────────────────────────
```

Desktop, 4-product build running, Remote Controller selected (3+ products, so only the selected row shows its five pieces):

```
┌─ rail ────────────────────────────────────┐
│ Car                         ◎ 380 credits │
│ ✓ Idea ─ ✓ Concepts ─ ● Build ─ ○ Save    │
│ “rc car” · 4 products                     │
│───────────────────────────────────────────│
│ ┌ BuildStatus statesOnly (unchanged) ───┐ │  ← takes the next-step slot
│ │ Building · 26% …  (Cancel / Stop …)   │ │    while the build isn't ready
│ └───────────────────────────────────────┘ │
│ Products                  Building · 26%  │
│   ▣  RC Car Controller                    │
│      2 of 5 pieces ready                  │
│      ▰▰▰▰▱▱▱▱▱▱                           │
│ ┌───────────────────────────────────────┐ │
│ │ ▣  Remote Controller                  │ │ ← selected
│ │    1 of 5 pieces ready                │ │
│ │    ▰▰▰▱▱▱▱▱▱▱                         │ │
│ └───────────────────────────────────────┘ │
│        ✓ 3D model                 Ready   │ ← PipelineRow ×5 (reused)
│        ◌ PCB                        62%   │
│        ○ Firmware code          Waiting   │
│        ○ Wiring                 Waiting   │
│        ○ Parts                  Waiting   │
│   ▣  Battery Charger                      │
│      0 of 5 pieces ready                  │
│      ▰▱▱▱▱▱▱▱▱▱                           │
│   ▣  Spare Battery Pack                   │
│      Waiting to start · 0 of 5            │
│ ▸ Activity · 11                           │
│ … composer …                              │
└───────────────────────────────────────────┘
```

Phone, 400 px, Chat tab (tabs unchanged, the rail body scrolls, the composer is pinned):

```
┌──────────────────────────────────────┐
│  [ Canvas ]   [■ Chat ■]             │
│──────────────────────────────────────│
│ Car                    ◎ 396 credits │ sticky
│ ✓ Idea ─ ● Concepts ─ ○ Build ─ ○ Save│
│ “rc car” · 4 products                │
│──────────────────────────────────────│
│ ┌──────────────────────────────────┐ │
│ │ → Next: build 4 products ·       │ │
│ │   16 credits. You have 396.      │ │
│ │   Show on canvas ›               │ │  → switches to Canvas,
│ └──────────────────────────────────┘ │    focuses Build
│ Products                             │
│ ┌──────────────────────────────────┐ │
│ │ ▣ RC Car Controller              │ │  tap → Canvas tab,
│ │   Concept 1 · ready              │ │  card scrolled in,
│ │   224 × 60 × 25 mm · ~4.8 h · …  │ │  focus on the card
│ └──────────────────────────────────┘ │
│   ▣ Remote Controller                │
│   …                                  │
│ ▸ Activity · 9                       │
│──────────────────────────────────────│
│ ┌──────────────────────────────────┐ │
│ │ Describe a change to RC Car C…   │ │
│ │ 🎙            ✧ Enhance  [↑]     │ │
│ └──────────────────────────────────┘ │
│ Refines RC Car Controller · 1 credit.│
│ Pick another product above, or name a│
│ new one to add it.                   │
└──────────────────────────────────────┘
```

Phone, setup question open:

```
│ rc car                                │  ← chat.title until the project is named
│ ● Idea ─ ○ Concepts ─ ○ Build ─ ○ Save│
│ “rc car” · waiting on your answer     │
│ ┌───────────────────────────────────┐ │
│ │ ! Answer the question on the      │ │
│ │   canvas. Nothing is drawn or     │ │
│ │   charged until you do.           │ │
│ │   Show on canvas ›                │ │
│ └───────────────────────────────────┘ │
│ You · just now                        │  ← no products yet, so the
│ rc car                                │    activity is the body, open
│ ✓ Read your idea                      │
│ ✓ This needs 5 products               │
│   RC Car Controller · Remote … · …    │
```

### 2.2 Section 1: project header

Sticky at the top of the rail's scroll area: `sticky top-0 z-sticky bg-bg-surface border-b border-solid border-border px-[18px] pt-[16px] pb-[14px] flex flex-col gap-[8px]`.

**Line 1:** the project name as an `h2` (`text-lg font-semibold text-text-primary truncate`, `title` = full name). On the right, the balance: `Coins01Icon` 14 + `{balance} credits` (`text-sm text-text-secondary tabular-nums shrink-0`). The balance is rendered only once `useCredits().hydrated`, so a 0 never flashes. It is information, not a control: no top-up link here, because the canvas's credits notice owns that.
- Name = `projectName` (host memo), else `chat.title`.

**Line 2:** the stepper, `<ol aria-label="Progress">`, four `<li>`: **Idea · Concepts · Build · Save**, joined by 12 px hairlines (`h-px w-[12px] bg-border`).
- Done: `CheckmarkCircle02Icon` 14 in `text-text-success`, label `text-sm text-text-secondary`, plus `<span className="sr-only"> (done)</span>`.
- Current: an 8 px `bg-bg-brand rounded-full` dot, label `text-sm font-semibold text-text-primary`, `aria-current="step"`.
- Upcoming: an 8 px hollow dot (`border border-solid border-border-strong rounded-full`), label `text-sm text-text-tertiary`.
- Not interactive: no hover and no cursor, because the next-step slot is the way forward.

**Line 3** (`text-sm text-text-tertiary truncate`, `title` = full): `“{first user turn's text}” · {count phrase}`.
- Setup loading: `reading it now`.
- Setup asking: `waiting on your answer`.
- Otherwise: `1 product` / `{n} products`.
- A chat with no user turn drops the quote and its separator.

`stageOf(chat, job)`:

| Stage (current step) | When |
|---|---|
| Idea | Setup turn `loading` or `asking` |
| Concepts | Answered (or no setup turn) and no build |
| Build | Build exists and `statusOf(job) !== "ready"` |
| Save | `statusOf(job) === "ready"` and no `job.projectId` |
| (all done) | `job.projectId` set, so every step reads done |

### 2.3 Section 2: next-step slot

One slot directly under the header (`px-[18px] pt-[14px]`).
- While a build exists and `statusOf(job) !== "ready"`, the slot holds the existing `<BuildStatus job statesOnly inChat />`, unchanged, with its Cancel, Stop and refund and retries. That card already says what the build is doing, so a second sentence would say it twice.
- Otherwise it holds the **next-step line**: a `rounded-xl bg-bg-subtle p-[12px] flex gap-[10px]` box. It is a tint on the rail surface, not a card in a card. It contains a 16 px glyph, the sentence (`text-sm text-text-primary`), and under it an optional **Show on canvas** button: `inline-flex h-[28px] items-center gap-[4px] rounded-lg px-[6px] -ml-[6px] text-sm font-semibold text-text-secondary hover:bg-bg-surface hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus`, `ArrowRight01Icon` 14 after the text.
- Glyphs: neutral `ArrowRight01Icon` in `text-text-tertiary`; attention `Alert02Icon` in `text-[color:var(--color-text-warning)]`; working `Loading03Icon` with `motion-safe:animate-spin text-text-tertiary`.

`nextStep(...)`: the first rule that matches wins. `n`/`cost` = chosen products / `buildCost(n)`.

| # | Condition | Tone | Sentence (exact) | Show on canvas → target |
|---|---|---|---|---|
| 1 | Setup `loading` | working | `Reading your idea. Nothing is charged until you answer its questions.` | none |
| 2 | Setup `asking` | attention | `Answer the question on the canvas. Nothing is drawn or charged until you do.` | setup question |
| 3 | Build exists, not ready | n/a | slot shows `BuildStatus statesOnly` | n/a |
| 4 | A chosen product's latest concept failed | attention | `{Name} couldn't be drawn. Try again on its card · 1 credit.` | that card's **Try again** |
| 5 | A chosen product doesn't fit its size (`!fits && !draftAtSize`) | attention | `{Name} doesn't fit the size you set. Fix the size, or build it as Draft.` | that card's size field (the existing `focusSpec(productId)`) |
| 6 | Any chosen concept is drawing | working | one: `Drawing {Name}. The build opens when it lands.` · several: `Drawing {k} concepts. The build opens when they land.` | none |
| 7 | Build ready, changed since, affordable | neutral | `Changed since the build. Build again to carry it into the deliverables · {cost} credits.` | Build button |
| 7b | Same, short of credits | attention | `Building again costs {cost} credits. You have {balance}.` | credits notice |
| 8 | Build ready, not saved | neutral | project known: `Build ready. Save it to {project}, or open it in the editor.` · else: `Build ready. Save it as a project, or open it in the editor.` | review card |
| 9 | Build ready and saved | neutral | `Saved to {saved project name}. Add a brief to sell, give or keep it.` | review card |
| 10 | No build, every chosen concept ready, affordable | neutral | `Next: build {n} product{s} · {cost} credits. You have {balance}.` (`Next: build this product · 4 credits. You have 396.` when n = 1) | Build button |
| 10b | Same, short of credits | attention | `The build costs {cost} credits. You have {balance}. Top up to build.` | credits notice |
| – | Nothing matches (e.g. an empty chat) | n/a | slot is empty | n/a |

The button's `aria-label` names its destination: `Show the question on the canvas` · `Show {Name}'s Try again on the canvas` · `Show {Name}'s size on the canvas` · `Show the Build button on the canvas` · `Show the credits notice on the canvas` · `Show the build on the canvas`.

Why this is not a duplicate control: it moves focus to the canvas's own Build, Try again, size field or Save. Nothing is started from the rail, so each control keeps one home.

### 2.4 Section 3: products

Section label row (`px-[18px] pt-[18px] pb-[6px] flex items-baseline`):
- An `h3` `Products` (`Product` when there is one), `text-sm font-semibold text-text-tertiary`, in sentence case, not a caps eyebrow.
- Right side (`ml-auto text-sm text-text-tertiary tabular-nums`): with a build, the build word from `STATE_WORD` (exported from `build-rail.tsx`), with `· {pct}%` while running: `Building · 26%` · `Queued` · `Build ready` · `Needs a retry` · `Build stopped`. Without one, `{k} of {n} in the next build` when k < n, otherwise nothing.

List: `<ul role="list" className="flex flex-col gap-[2px] px-[10px]">`. Each `<li>` holds the row `<button>` and, during a build, its pipeline `<ul>` as a *sibling*, because a list inside a button is invalid.

**Row button**
- `type="button"`, `aria-current={selected ? "true" : undefined}`, `aria-label={name}`, `aria-describedby="{statusId} {factsId}"`.
- Class: `flex w-full items-start gap-[12px] rounded-xl px-[8px] py-[8px] text-left outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus`.
- Selected: `bg-bg-brand-subtle`, the DS "chosen" fill that `Segmented`/`ButtonGroup` use. Otherwise `hover:bg-bg-subtle`.
- Minimum height ≈ 58 px, well above the 24 px floor.

**Thumbnail:** 40 × 40, `rounded-lg shrink-0 object-cover`, `alt=""` (the name is right beside it), `loading="lazy" decoding="async" width={40} height={40}`. The source is the product's latest ready concept image (already cached by the canvas).
- Drawing, or no image yet: a `bg-bg-subtle` tile with `Loading03Icon` 14 (`motion-safe:animate-spin text-text-tertiary`).
- Failed: a `bg-bg-error-subtle` tile with `Alert02Icon` 14 in `text-[var(--color-icon-error)]`.
- Left out: `opacity-40 grayscale`, the card's own treatment, with `transition-[opacity,filter] duration-normal ease-decelerate`.
- When an image lands it fades in over 200 ms.

**Line 1:** the name, `text-md font-semibold text-text-primary truncate` (`title` = full name). Right-aligned tag (`text-sm text-text-tertiary shrink-0`), at most one:
- `Left out`: in the project, ticked off the next build.
- `Not in this build`: a build exists and this product isn't in it.
- `Changed`: a build exists and this product's drawing or spec differs from the build.

The primary shows no tag. Its "Always built" lives on its card.

**Line 2** (status, `id=statusId`, `text-sm`). The first rule that matches wins:

| Phase | Copy (exact) | Tone |
|---|---|---|
| drawing | `Drawing Concept {label} · {elapsed}` (the `· {elapsed}` part is `aria-hidden`, on the second clock) | `text-text-secondary` |
| failed (latest turn) | `Couldn't draw Concept {label} · nothing charged` | `text-text-error` |
| conflict | `Doesn't fit its size · fix it on the card` | `text-text-error` |
| build: queued (in this build) | `Waiting to start · 0 of 5` | `text-text-tertiary` |
| build: running | `{r} of 5 pieces ready`, then a 3 px track: `mt-[6px] h-[3px] w-full overflow-hidden rounded-full bg-bg-subtle` with a fill of `h-full w-full origin-left bg-text-tertiary transition-transform duration-normal ease-decelerate` and inline `transform: scaleX(p)` (data-valued inline style, as §7 allows) | `text-text-secondary` |
| build: a piece failed | `{Piece} failed · retry it on the build` (`ITEM_LABELS[kind]`; several: `{k} pieces failed · retry them on the build`) | `text-text-error` |
| build: ready | `Built · 5 of 5 pieces` | `text-text-secondary` |
| reading | `Concept {label} · reading the spec…` | `text-text-tertiary` |
| draft | `Concept {label} · Draft at this size` | `text-[color:var(--color-text-warning)]` |
| ready | `Concept {label} · ready` | `text-text-secondary` |

`5` is the product's live item count (`items.filter(i => i.status !== "skipped").length`), never a literal.

**Line 3** (spec, `id=factsId`, `text-sm tabular-nums truncate`, `title` = full): `specFacts(spec, parts)` joined with ` · `, taking size, power and radio (the board fact is dropped, since it rarely differs and would crowd 248 px). Colour:
- Size fact error-toned when it doesn't fit.
- Warning-toned when Draft.
- Otherwise `text-text-tertiary`.

It is omitted while drawing, failed, or before a spec exists.

**Pipeline under a row** (only when a build exists): `<ul role="list" className="ml-[60px] mr-[8px] mb-[6px] flex flex-col gap-[2px]">` of the existing `PipelineRow` (exported from `build-rail.tsx`, unchanged), skipped items filtered out as today. It shows under **every** row when the build has 1–2 products, and under the **selected** row only when it has 3 or more.

Every row still states its fixed denominator (`n of 5`) from the first second. That keeps the build rail's rule ("a list that grows says nothing about how much is left") while fitting a 4-product build in one screen.

**Below the list:** when the classifier offered products that were never drawn (`state.available`), one line (`px-[18px] pt-[8px] text-sm text-text-tertiary`):
- `Also suggested: {A}, {B}` (truncate, `title` = all) + a **Show ›** button (same style as Show on canvas, `aria-label="Show suggested products on the canvas"`) → the Add-a-product section.
- The chips there remain the one place to add a product.

Removed products don't appear in the list. The canvas's *Removed · restore free* row is their home, and the activity records them.

### 2.5 Section 4: activity

Before the setup question is answered there are no products, so the activity **is** the rail body, shown open without a disclosure. After that it collapses under a disclosure:

```
<h3><button aria-expanded aria-controls="rail-activity">▸ Activity · {count}</button></h3>
<p>Latest: {newest entry, one line} · {relative time}</p>
<ol id="rail-activity" hidden={!open}> … </ol>
```

- **Button:** `h-[32px] inline-flex items-center gap-[6px] rounded-lg px-[8px] -ml-[8px] text-sm font-semibold text-text-secondary hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus`, with an `ArrowDown01Icon` 14 that rotates `-90° → 0°` (`transition-transform duration-normal ease-decelerate motion-reduce:transition-none`, the Spec panel's own chevron).
- **Summary line:** `text-sm text-text-tertiary truncate`, hidden while open.
- **Open list:** fades in with the Spec panel's `motion-safe:animate-in fade-in slide-in-from-top-1`.
- **State:** open/closed is local state, closed by default. Nothing auto-opens it.

Entries are oldest first (the conversation's own order). Each is a `<li>` with a 14 px glyph, the text, and `<time dateTime={iso}>` right-aligned in `text-sm text-text-tertiary tabular-nums`, via `relativeLabel(ts, now)` on the minute clock. `activityOf(...)` produces:

| Source | Title · detail (exact) | Glyph / tone |
|---|---|---|
| User turn | `You` (`text-sm font-semibold text-text-tertiary`) over the text (`text-md text-text-primary whitespace-pre-wrap`) | none |
| Setup `loading` | `Reading your idea` · then `Working out what it needs` | working (spinning); waiting: 8 px hollow dot, not a still spinner |
| Setup `asking` | `Read your idea` · `This needs {n} products` with names `A · B · C` as detail (one product: `One product, nothing else needed`) · `Waiting on your answer on the canvas` | done · done · waiting |
| Setup answered | `Read your idea` · new project: `Started project {name} · {n} product{s}` · existing: `Added to {name} · {n} product{s}` | done |
| Render ready (first for the product) | `{Product} · Concept {label}` · `Drawn` | done |
| Render ready (refine) | `{Product} · Concept {label}` · `Refined from Concept {parent}` | done |
| Render ready (fresh take after an earlier one) | `{Product} · Concept {label}` · `A fresh take` | done |
| Render drawing | `{Product} · Concept {label}` · `Drawing` + `aria-hidden` ` · {elapsed}` | working |
| Render failed, later redrawn | `{Product} · Concept {label}` · `Couldn't draw · redrawn as Concept {later label}` | `Alert02Icon` in `text-text-tertiary`, words `text-text-secondary`. **Not red.** |
| Render failed, still current | `{Product} · Concept {label}` · `Couldn't draw · nothing was charged` | error (`text-text-error`, icon-error) |
| Build booked | `Build started · {n} product{s} · {cost} credits` at `startedAt ?? createdAt` | done |
| Build ended | `Build ready` / `Build stopped · credits refunded` (when `creditsRefunded`) / `Build stopped` at `endedAt` | done / error |

"Later redrawn" means some later assistant turn for the same product is `ready` (or `pending`, shown as `redrawing as Concept {label}`). Summary line: `Latest: {title} {detail}` for the newest entry, e.g. `Latest: Spare Battery Pack drawn · 36 min ago`.

### 2.6 Composer (`PromptBar`), placement and behaviour unchanged

Only the hint under it changes (`concept-chat.tsx`). The other three branches stay word for word:

| Branch | Now | Proposed |
|---|---|---|
| Ready, product in focus | `Refines {name} · 1 credit. Name another product to add it.` | `Refines {name} · 1 credit. Pick another product above, or name a new one to add it.` |

### 2.7 Loading skeleton

`LoadingShell`'s rail column takes the new shape so nothing jumps when the chat hydrates:
- a header block (a 14 px bar 140 wide, a 12 px bar 220 wide, a 12 px bar 180 wide);
- a 64 px rounded-xl next-step block;
- three 56 px rows (a 40 px square plus two bars);
- the composer block at the foot.

All `motion-safe:animate-pulse`, as today.

---

## 3. States

| State | Header (step · line 3) | Next-step slot | Products | Activity |
|---|---|---|---|---|
| Setup loading | ● Idea · `“…” · reading it now` | #1 working | none | open: You, Reading your idea (spinning), Working out what it needs |
| Setup asking | ● Idea · `waiting on your answer` | #2 + Show on canvas → setup question | none | open: You, Read your idea, This needs n products, Waiting on your answer on the canvas |
| Drawing (first renders) | ✓ Idea ● Concepts · `n products` | #6 working | rows in *drawing* with the clock; thumbnails are spinner tiles | collapsed, `Latest: {Product} drawing` |
| Failed | same | #4 + Show on canvas → Try again | that row red with an error tile; the rest as they are | a red entry while current; neutral `redrawn as …` once fixed |
| Ready | same | #10 + Show on canvas → Build | rows *ready* + spec line | collapsed |
| Spec conflict | same | #5 + Show on canvas → size field | row *conflict* (red), size fact red | unchanged |
| Draft at size | same | #10 (Draft doesn't block) | row *draft* (warning) | unchanged |
| Left out | same; label right side `3 of 4 in the next build` | #10 counts only the chosen | row tag `Left out`, thumbnail greyed | unchanged |
| Short of credits | same | #10b attention → credits notice | unchanged | unchanged |
| Build queued / paused for credits | ● Build | `BuildStatus` (Cancel / top-up text) | rows `Waiting to start · 0 of 5`; label `Queued` | `Build started …` |
| Build running | ● Build | `BuildStatus` | rows with `r of 5` + bar; pipeline under the selected row (3+ products) or under all (1–2) | `Build started …` |
| Build partial / stopped | ● Build | `BuildStatus` (its retry, refund copy) | the failing row red: `{Piece} failed · retry it on the build` | `Build stopped …` when system-failed |
| Build ready, not saved | ✓ Build ● Save | #8 → review card | rows `Built · 5 of 5 pieces`; pipelines collapse as above | `Build ready` |
| Changed after build | ● Save | #7 / #7b → Build again | changed row tag `Changed` (+ drawing/ready status of the new concept) | refine entries |
| Saved | all ✓ | #9 → review card | as ready | as ready |
| Pre-setup chat (no setup turn) | ● Concepts; name `chat.title`; primary `Your product` | as the table | rows from turns; no tags | collapsed |

---

## 4. Interactions

**Product row: click, tap, Enter or Space.**
1. `setFocusedProduct(productId)`. The composer placeholder and hint, the selected row, and the review card's product tab (`ReviewOutputs productId`) all follow, since they read the same state.
2. Jump:
   - No build: to the product's card `#product-card-{id}`.
   - Build exists: to the review wrapper `#build-review`, which now shows that product's tab.
   - Scroll with `scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" })`; cards carry `scroll-mt-[16px]`.
   - The target gets an arrival ring for 1.2 s: `data-arrived="true"` → `ring-2 ring-border-focus`, `transition-shadow duration-normal ease-decelerate motion-reduce:transition-none`.
3. Focus:
   - **Desktop** (`md` and up): focus stays on the row. The canvas is visible beside it, and keeping focus lets a keyboard user go on choosing.
   - **Phone:** `setPane("work")`, then after paint focus the card root (`tabIndex={-1}`, `outline-none`). The rail is hidden now, and the next Tab lands on the card's own controls.
4. The canvas shows which card the composer changes. When the project has 2 or more products, the focused product's card (ready, drawing or failed) draws its existing 1 px edge in `border-border-brand` instead of `border-border`, with `transition-colors duration-normal ease-decelerate`. This is a selection state, the one use the accent is for; the Build button stays the only filled brand control. It follows `focusedProduct` however it changed (rail row, Refine, Regenerate, add).

**Show on canvas.** Same scroll and ring. It always moves focus to the target *control* (Build, Try again, size input via `focusSpec`, the review wrapper), and on phones switches to Canvas first. That is its job: "take me to the thing that does it".

**Show (suggested).** Jumps to `#add-product`; the focus rules are those of Show on canvas.

**Activity disclosure.** Enter or Space toggles. Focus stays on the button.

**Keyboard order through the rail:** Show on canvas (if any) → BuildStatus controls (if shown) → product rows in order → Show (suggested) → Activity → composer (mic, textarea, Enhance, send). Rows are plain tab stops: the list is short, and each row is a real destination, so no roving tabindex.

**Unchanged:**
- Acting on a card (Refine, Regenerate, add, restore) still moves `focusedProduct`, and the rail's selection follows.
- Removing the focused product still falls back to the primary.
- Sending from the composer still switches phones to Canvas.

---

## 5. Data each piece reads

All derivation moves into **one pure module, `src/lib/create/project-state.ts`**. It uses relative imports (like `lib/spec`) so the node harness can compile it. The canvas and the rail read the same answers, so they can't disagree about "changed since the build" or "doesn't fit".

| Function | Reads | Returns |
|---|---|---|
| `projectState(chat, job)` | `chat.turns` (setup: `productName`, `companions`, `answer.picked/leftOut/specs`; assistant turns: `companionOf`, `status`, `imageUrl`, `concept`), `deriveSpec`, `cleanEdits`, `specKey`, `productsOf(job)` | `{ setup, answer, products, leftOut, selected, specs, specBlock, builtImages, inBuild(t), conceptChanged, specChanged, changedSinceBuild, available, removed }`. This is exactly the memo block now in `chat-thread.tsx` lines 152–274 (plus `allReady` / `failedChoice`), moved and not rewritten |
| `productIdOf(t)`, `productNameOf(setup, t)` | turn / setup | `"primary"` or companion id; the display name |
| `railRows(state, labels, job)` | `projectState`, `conceptLabels` map, `productsOf(job).items`, `ITEM_LABELS`, `specFacts` | `RailRow[]` = `{ productId, name, turnId, conceptLabel, imageUrl?, phase, since?, facts: {text,tone}[], leftOut, tag?, build?: { ready, total, progress, failedKinds, items } }` |
| `stageOf(chat, job)` | setup status, `statusOf(job)`, `job.projectId` | `"idea" \| "concepts" \| "build" \| "save" \| "saved"` |
| `nextStep({ state, rows, job, balance, hydrated, projectName, savedName })` | the above + `buildCost`, `CONCEPT_COST`, `useCredits().balance/hydrated` (passed in) | `{ tone, text, target?: JumpTarget, targetLabel? } \| null` |
| `activityOf(chat, labels, names, job, projectName)` | turns, `labels`, `job.startedAt/createdAt/endedAt/creditsRefunded`, `buildCost` | `ActivityEntry[]` = `{ id, tone, title, detail?, ts }` |
| `announcementFor(prev, next)` | two snapshots `{ rows, buildStatus }` | one sentence or `null` |

`JumpTarget = { kind: "setup" } | { kind: "card" | "retry" | "spec"; productId } | { kind: "build" | "credits" | "review" | "add" }`.

Also:
- `specFacts(spec, parts)` moves from `SpecFacts` in `spec-panel.tsx` to `src/lib/spec/format.ts` (whose header already says every surface says the same thing). The card renders from it with no visual change.
- `formatRelative` moves from `image-turn.tsx` to `use-clock.ts` as `relativeLabel(ts, now)`.
- The host keeps `focusedProduct`, `pane`, `projectName`, `activeBuild`, `labels`, `focusSpec`, and gains `selectProduct(id)` and `jumpTo(target, { focus })`.
- Anchors live in a new `src/components/create/anchors.ts`:
  - `productCardId(id) = "product-card-" + id`
  - `productRetryId(id)`
  - `SETUP_QUESTION_ID = "setup-question"`
  - `BUILD_ACTION_ID = "build-action"`
  - `CREDITS_NOTICE_ID = "build-credits"`
  - `BUILD_REVIEW_ID = "build-review"`
  - `ADD_PRODUCT_ID = "add-product"`

---

## 6. Accessibility

- **Landmark and headings:** `<aside aria-label="Project">`. `h2` project name → `h3` Products → `h3` Activity (its button). The page's sr-only `h1` stays.
- **The rail is no longer a live region.** `role="log"` / `aria-live` come off. A list of buttons whose text changes must not be a live region, or every status tick re-reads a row.
- **One announcer, outside both panes:**
  - `<p role="status" aria-live="polite" aria-atomic="true" className="sr-only">`, rendered by `ConceptChat` at its root. It is outside the `hidden` aside, so it is heard on the Canvas tab on phones. This fixes diagnosis item 7.
  - It speaks only on a transition, never on mount, from `announcementFor(prev, next)`:
    - `{Name}: Concept {label} is ready.`
    - `{Name}: Concept {label} couldn't be drawn. Nothing was charged.`
    - `Drawing {Name}, Concept {label}.`
    - `{Name} doesn't fit the size you set.`
    - `Build started.`
    - `Build ready to review.`
    - `Build needs a retry.`
    - `Build stopped.`
  - Several transitions in one render are joined with a space.
- **Clocks stay `aria-hidden`.** The elapsed seconds (row, activity) are never read.
- **What a screen reader hears on a row:** *"Remote Controller, button, current, Concept 4 · ready, 60 × 46 × 48 mm · USB powered · nRF24"*. `aria-current="true"` is used rather than `aria-pressed`: pressing the current row again doesn't unselect it, and the row is also a jump, which `aria-current` describes truthfully. The `/build` page's `BuildRail` keeps its own `aria-pressed` and is not touched.
- **Stepper:** `<ol aria-label="Progress">` with `aria-current="step"` and sr-only `(done)`.
- **Colour is never alone:** failed has a glyph and words; left out has a tag; selected has the fill plus `aria-current`.
- **Contrast (existing tokens):**
  - `text-text-tertiary` on `bg-bg-surface`: light gray-600 on white ≈ 7:1; dark gray-400 on gray-900 ≈ 7:1.
  - `text-text-tertiary` on `bg-bg-brand-subtle`: light gray-600 on violet-50 ≈ 6.9:1; dark gray-400 on violet-950 ≈ 6:1.
  - `text-text-error` on surface ≥ 4.5:1 in both themes.
  - Verify each over CDP (§8).
- **Targets:** rows ≈ 58 px, Show buttons 28 px, disclosure 32 px. All ≥ 24 px.
- **Focus:** `focus-visible:ring-2 ring-border-focus` everywhere. Programmatic focus on a card root uses `tabIndex={-1}` and shows the arrival ring instead of a focus ring.

---

## 7. Motion (150–250 ms, ease-out, state only)

| What | How | Reduced motion |
|---|---|---|
| Row selection fill, hover | `transition-colors duration-normal ease-decelerate` (200 ms) | instant |
| Thumbnail arrives / leaves greyscale | `transition-[opacity,filter] duration-normal ease-decelerate` | instant |
| Build bar | `scaleX(p)` transform, `transition-transform duration-normal ease-decelerate` (never width) | instant |
| Activity chevron + reveal | rotate 200 ms; list `motion-safe:animate-in fade-in slide-in-from-top-1` | none |
| Jump scroll | `behavior: "smooth"` | `"auto"` |
| Arrival ring on the target | ring appears, fades out after 1.2 s via `transition-shadow duration-normal` | appears and disappears with no transition |
| Spinners | `motion-safe:animate-spin` (the rail's current bare `animate-spin` gets the prefix) | still glyph |

There is no entrance choreography and no staggered list reveal.

---

## 8. What stays unchanged

- **Composer:** `PromptBar` behaviour, placement at the rail's foot, Enter sends, the blocked and out-of-credit hints, and the placeholder `Describe a change to {name}…`.
- **Every canvas control keeps its one home:** In build, Remove, Refine, Regenerate, Try again, Spec and its edits, Build / Build again, Add a product, Suggested and Removed chips, and ReviewOutputs with its Save Project and Open in editor. The rail gains **no** action control.
- **`BuildStatus statesOnly inChat`:** same component, same controls. It moves up from under the pipeline into the next-step slot.
- **`BuildRail`** stays exactly as it is for the `/build` page (`build-shell.tsx`). The chat simply stops rendering it and reuses its exported `PipelineRow` and `STATE_WORD`.
- **Phone:** two tabs `Canvas` / `Chat`, Canvas leading, and a send switches to Canvas.
- **Everything else:** the canvas's own `Car / 4 products in this project` header (the Canvas tab on phones needs it), concept numbering by lineage, "Drawing" as the one verb for a render, the rail width (360 px), and `focusedProduct` semantics (last acted on, primary by default).
- `review-outputs.tsx`, `deliverable-previews.tsx` and `build-artifacts.ts` are **not touched** (another agent is editing them). The review is reached through a wrapper `div` in `chat-thread.tsx`.

### Past decisions this touches (for the owner's veto)

1. *"Nothing here is a control"* (rail header, CLAUDE §5 entry 189). **Rows become selectable and jump**, which is navigation, allowed by rule 4. No action control is added, so the reason behind the rule (every line's real surface is on the canvas) still holds, and the rail now points at that surface.
2. *The rail is `role="log"`* (entry 189). It is replaced by a list plus a root-level status announcer, because the log went unheard on phones.
3. *The whole pipeline joins the rail, grouped under each product* (entries 167/168). The pipeline stays in the rail, merged into the product rows. It is fully expanded for 1–2 products, and for 3+ only the selected product's five pieces show, with every row showing `n of 5` from the start.
4. *Plain "You" / "IDEEZA" attribution* (entry 189). "You" stays on the maker's own turns in Activity. "IDEEZA" is dropped, because the header now says whose account it is.
5. Kept as they were: *one verb for a render* ("Drawing") and *the answered question reads as a decision* (`Started project Car · 4 products`).

---

## 9. File-level change list

| File | Change |
|---|---|
| `src/lib/create/project-state.ts` (new) | `projectState`, `productIdOf`, `productNameOf`, `railRows`, `stageOf`, `nextStep`, `activityOf`, `announcementFor`, types `RailRow`, `RailPhase`, `Stage`, `NextStep`, `JumpTarget`, `ActivityEntry` |
| `src/lib/spec/format.ts` | add `specFacts(spec, parts)` (moved from `SpecFacts`) |
| `src/components/create/spec-panel.tsx` | `SpecFacts` renders `specFacts()`; no visual change |
| `src/components/create/use-clock.ts` | add `relativeLabel(ts, now)` (moved from `image-turn.tsx` `formatRelative`) |
| `src/components/create/anchors.ts` (new) | the anchor ids of §5 |
| `src/components/create/chat-thread.tsx` | read `projectState()` instead of its inline memos (same behaviour); ids on the SetupTurn wrapper, the review wrapper (`tabIndex={-1}`), `BuildAction`'s button, the credits-notice wrapper and `AddProductSection` |
| `src/components/create/image-turn.tsx` | card root (all three variants) gets `id={productCardId}`, `tabIndex={-1}`, `scroll-mt-[16px]` and the `data-arrived` ring classes; new `focused` prop → `border-border-brand` edge (§4.4); `FailedImageTurn`'s Try again gets `id={productRetryId}`; uses `relativeLabel`. `chat-thread.tsx` passes `focused={products.length > 1 && idOf(turn) === focusedProduct}` |
| `src/components/create/build-rail.tsx` | `export` `PipelineRow` and `STATE_WORD`; `BuildRail` unchanged |
| `src/components/create/chat-rail.tsx` | rewritten: `ChatRail({ model, focusedProduct, onSelectProduct, onJump })` with `RailHeader`, `Stepper`, `NextStepLine`, `ProductList` / `ProductRow`, `SuggestedLine`, `Activity`; export `RailAnnouncer({ model })` and `useRailModel(chat, job, labels, projectName, savedName)` |
| `src/components/create/concept-chat.tsx` | build the rail model once; `selectProduct`, `jumpTo` (pane switch, scroll, arrival ring, focus rules of §4); render `RailAnnouncer` at the root; `BuildStatus statesOnly` goes into the rail's slot; stop rendering `BuildRail`; composer hint copy; `LoadingShell` rail shape |
| `CLAUDE.md` §5 | rewrite the rail half of entry 189 and the "pipeline joins the rail" clause of entry 167 to describe the new rail (only once it is browser-verified) |

---

## 10. Implementation plan (4 tasks)

**Task 1: one model for rail and canvas (no visual change).**
- Create `project-state.ts` by *moving* chat-thread's memo block, then add `railRows`, `stageOf`, `nextStep`, `activityOf`, `announcementFor`.
- Move `specFacts` and `relativeLabel`. `chat-thread`, `spec-panel` and `image-turn` consume them.
- Harness: compile `project-state.ts` (tsc follows its imports; `--jsx react-jsx` for `history.tsx`) into `$SP/railtest/out` and run `NODE_PATH=<worktree>/node_modules node --test $SP/railtest/rail.test.js`. Test cases:
  - the seed's failed-then-ready Remote Controller → row *ready*, activity *redrawn as Concept 4* (neutral);
  - every `nextStep` rule in table order;
  - stage per state;
  - announcements fire only on transitions.
- Proof: canvas screenshots before and after are identical.

**Task 2: the rail UI.**
- Rewrite `chat-rail.tsx` (header, stepper, next-step line, product rows with thumbnail, status, spec and tag, pipelines, suggested line, Activity disclosure) against `useRailModel`.
- Export `PipelineRow` / `STATE_WORD`.
- Run `/impeccable` and `/ui-ux-pro-max` on the rendered rail before calling the markup final.

**Task 3: wiring, anchors, announcer.**
- `concept-chat.tsx`: selection, jump, focus rules, pane switch, arrival ring, root announcer, BuildStatus in the slot, no BuildRail, hint copy, skeleton.
- `image-turn.tsx` / `chat-thread.tsx`: anchors from `anchors.ts`, and the focused card's brand edge (§4.4).

**Task 4: browser proof and docs.**
- CDP matrix, desktop 1440 and phone 400, dark and light, covering:
  - setup loading and asking;
  - drawing, failed, and failed-then-redrawn;
  - conflict, draft and left out;
  - short of credits;
  - build queued, running (1-, 2- and 4-product), partial, ready and saved;
  - changed after build.
- Screenshots go to `$SP/shots/rail-new-*.png`.
- Check on the page:
  - every string is exact (read the DOM);
  - row click selects and retargets the composer placeholder;
  - the review tab follows during a build;
  - desktop focus stays on the row; phone switches tab and focuses the card;
  - Show on canvas focuses Build / Try again / size / review;
  - the announcer text changes when a render lands while the Canvas tab is shown;
  - computed contrast of rail text ≥ 4.5:1 in both themes;
  - `prefers-reduced-motion: reduce` gives instant scroll and no transitions.
- Then `npx tsc --noEmit` and `npx eslint` on the touched files, and update CLAUDE.md §5.

---

## 11. Controller amendments (bind the implementation)

- **A1 — scope of files.** The Task 9 note ("`review-outputs.tsx`, `deliverable-previews.tsx`, `build-artifacts.ts` are not touched") no longer applies — that work is finished — but the redesign still has no reason to change them; the review is reached through a wrapper in `chat-thread.tsx` as proposed.
- **A2 — tests.** `project-state.ts` is pure and gets `node:test` coverage in the scratchpad harness (`$SP/railtest`), as §10 Task 1 says. Every `nextStep` rule, `stageOf` per state, `activityOf`'s "redrawn as" rule and `announcementFor`'s transitions-only rule are asserted.
- **A3 — the spec's blocking rule.** `nextStep` rule 5, the row's *conflict* phase and the canvas's Build line all use one predicate, `blocksBuild(spec)` = `!spec.fits && !spec.draftAtSize`, exported from `src/lib/spec/derive.ts` (it is duplicated today in `spec-panel.tsx` and `chat-thread.tsx`; both switch to it).
- **A4 — nothing new to buy or start from the rail.** Rule 4 of `40-ui-ux.md` is the acceptance test: after the redesign, every action control (In build, Remove, Refine, Regenerate, Try again, Spec edits, Build, Add, Restore, Save, Open in editor, Cancel/Stop/retry) exists exactly once on screen. `BuildStatus statesOnly` moves into the rail slot; it is not duplicated.
- **A5 — nothing pushed**; commits on `feat/spec-sheet` only.

"use client";

// The left rail: the project's status board.
//
// It used to be a transcript — every render its own line, in the order it
// happened — and a maker with four products could not tell from it which line
// was the current state of which product: "Concept ready" four times, and a
// failure that had long since been redrawn still the loudest thing on it. So
// the rail says the state first and folds the story under it: where the
// project is, the one thing to do next, one row per product with its live
// status and spec, and the history collapsed at the foot.
//
// Nothing here starts, buys or changes anything. Every action has one home on
// the canvas; the rail only says what it is and takes you there — a row picks
// the product the composer changes and brings its card into view, and "Show
// on canvas" moves focus to the control that does the next step.
//
// What each line says is decided in `lib/create/project-state`, which the
// canvas reads too, so the two can't disagree about "changed since the build"
// or "doesn't fit". This file is how it looks.

import * as React from "react";
import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  Coins01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  ITEM_LABELS,
  rollupBuild,
  statusOf,
  type BuildJob,
  type BuildStatus,
  type ChatSession,
  type ChatTurn,
} from "@/lib/create/history";
import { useCredits } from "@/lib/create/credits";
import {
  activityOf,
  announcementFor,
  nextStep,
  productNameOf,
  projectState,
  railRows,
  stageOf,
  type ActivityEntry,
  type JumpTarget,
  type NextStep,
  type ProjectState,
  type RailRow,
  type RailSnapshot,
  type Stage,
} from "@/lib/create/project-state";
import { PipelineRow, STATE_WORD } from "./build-rail";
import { useMinuteClock } from "./build-status";
import { elapsedLabel, relativeLabel, useSecondClock } from "./use-clock";

// ─────────────────────────────── the model ───────────────────────────────

/** Everything the rail and the announcer say, worked out once per change. */
export type RailModel = {
  /** The project's name, else the chat's own title. */
  title: string;
  /** What the maker first typed. Null for a chat that has no user turn. */
  idea: string | null;
  /** The header's third line, after the idea. */
  countPhrase: string;
  stage: Stage;
  /** Null until the credits have been read from storage, so a 0 never
   *  flashes in the header. */
  balance: number | null;
  next: NextStep | null;
  rows: RailRow[];
  /** The build's state and whole-build percentage; null with no build. */
  build: { status: BuildStatus; percent: number } | null;
  /** Offered by the classifier and never drawn — named here, added there. */
  suggested: string[];
  activity: ActivityEntry[];
  /** The turns drawing right now, whose activity entries carry the clock. */
  drawing: Set<string>;
  /** What the announcer compares between renders. */
  snapshot: RailSnapshot;
  /** The project model the rows were read from — the host reads it too
   *  rather than working the same answers out a second time. */
  state: ProjectState;
};

export function useRailModel(
  chat: ChatSession,
  job: BuildJob | null | undefined,
  labels: Map<string, string>,
  projectName: string,
  savedName?: string,
): RailModel {
  const { balance, hydrated } = useCredits();
  const build = job ?? null;
  const state = React.useMemo(() => projectState(chat, build), [chat, build]);
  const rows = React.useMemo(
    () => railRows(state, labels, build),
    [state, labels, build],
  );
  const activity = React.useMemo(
    () =>
      activityOf(
        chat,
        labels,
        (t) => productNameOf(state.setup, t),
        build,
        projectName,
      ),
    [chat, labels, state.setup, build, projectName],
  );
  const drawing = React.useMemo(
    () => new Set(rows.filter((r) => r.phase === "drawing").map((r) => r.turnId)),
    [rows],
  );
  const buildStatus = build ? statusOf(build) : undefined;
  const buildId = build?.id;
  const snapshot = React.useMemo(
    () => ({ rows, buildId, buildStatus }),
    [rows, buildId, buildStatus],
  );

  const setup = chat.turns.find(
    (t): t is Extract<ChatTurn, { role: "setup" }> => t.role === "setup",
  );
  const firstAsk = chat.turns.find(
    (t): t is Extract<ChatTurn, { role: "user" }> => t.role === "user",
  );

  return {
    title: projectName.trim() || chat.title,
    idea: firstAsk?.text.trim() || null,
    countPhrase:
      setup?.status === "loading"
        ? "reading it now"
        : setup?.status === "asking"
          ? "waiting on your answer"
          : `${rows.length} product${rows.length === 1 ? "" : "s"}`,
    stage: stageOf(chat, build),
    balance: hydrated ? balance : null,
    next: nextStep({
      state,
      rows,
      job: build,
      balance,
      hydrated,
      projectName,
      savedName,
    }),
    rows,
    build:
      build && buildStatus
        ? { status: buildStatus, percent: Math.round(rollupBuild(build).progress) }
        : null,
    suggested: state.available.map((c) => c.name),
    activity,
    drawing,
    snapshot,
    state,
  };
}

// ─────────────────────────────── the rail ────────────────────────────────

export function ProjectRail({
  model,
  focusedProduct,
  onSelectProduct,
  onJump,
  slot,
}: {
  model: RailModel;
  /** The product the composer changes — the row drawn as chosen. Null when
   *  nothing is selected (the spec sheet's Done or Close cleared it). */
  focusedProduct: string | null;
  onSelectProduct: (productId: string) => void;
  /** Take the maker to a place on the canvas. The host owns the scroll, the
   *  arrival ring, the phone's tab switch and where focus lands. */
  onJump: (target: JumpTarget) => void;
  /** Takes the next-step line's place — the build's own states card while a
   *  build is not ready, which already says what the build is doing. */
  slot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <RailHeader model={model} />
      {slot ? (
        <div className="px-[18px] pt-[14px]">{slot}</div>
      ) : (
        model.next && (
          <div className="px-[10px] pt-[14px]">
            <NextStepLine step={model.next} onJump={onJump} />
          </div>
        )
      )}
      {model.rows.length > 0 && (
        <ProductList
          model={model}
          focusedProduct={focusedProduct}
          onSelectProduct={onSelectProduct}
        />
      )}
      {model.rows.length > 0 && model.suggested.length > 0 && (
        <SuggestedLine names={model.suggested} onJump={onJump} />
      )}
      <Activity
        entries={model.activity}
        drawing={model.drawing}
        // Before the question is answered there is nothing else to show, so
        // the history is the body rather than a line to open.
        folded={model.rows.length > 0}
      />
    </div>
  );
}

/** The one place a screen reader hears the flow change. It belongs at the
 *  page root, outside both panes: on a phone the rail is hidden while the
 *  canvas tab shows, and a hidden live region says nothing — which is where
 *  the maker is while a render lands. */
export function RailAnnouncer({
  model,
  note,
}: {
  model: RailModel;
  /** Something the page did that the rail's model doesn't see — a docked
   *  spec sheet opening beside the canvas. Said once per `n`. */
  note?: { text: string; n: number } | null;
}) {
  const [seen, setSeen] = React.useState(model.snapshot);
  const [seenNote, setSeenNote] = React.useState(note?.n ?? 0);
  const [said, setSaid] = React.useState("");
  // Compared during render rather than in an effect, so the sentence lands
  // in the same commit as the change it describes. Mounting says nothing.
  const fresh = note && note.n !== seenNote ? note : null;
  if (seen !== model.snapshot || fresh) {
    setSeen(model.snapshot);
    if (fresh) setSeenNote(fresh.n);
    const line = [seen !== model.snapshot ? announcementFor(seen, model.snapshot) : null, fresh?.text]
      .filter(Boolean)
      .join(" ");
    if (line) setSaid(line);
  }
  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {said}
    </p>
  );
}

// ─────────────────────────────── header ──────────────────────────────────

function RailHeader({ model }: { model: RailModel }) {
  const line = model.idea
    ? `“${model.idea}” · ${model.countPhrase}`
    : model.countPhrase;
  return (
    <header className="sticky top-0 z-sticky flex flex-col gap-[8px] border-b border-solid border-border bg-bg-surface px-[18px] pb-[14px] pt-[16px]">
      <div className="flex items-baseline gap-[12px]">
        <h2
          title={model.title}
          className="min-w-0 flex-1 truncate text-lg font-semibold text-text-primary"
        >
          {model.title}
        </h2>
        {/* Information, not a control: the canvas's credits notice is where
            a top-up lives. */}
        {model.balance !== null && (
          <span className="inline-flex shrink-0 items-baseline gap-[4px] text-sm tabular-nums text-text-secondary">
            <span className="inline-flex self-center">
              <Icon icon={Coins01Icon} size={14} />
            </span>
            {model.balance} credits
          </span>
        )}
      </div>
      <Stepper stage={model.stage} />
      {/* The idea is what gives way: a real one is a sentence, and the count
          after it is the part worth reading. */}
      <p title={line} className="flex min-w-0 text-sm text-text-tertiary">
        {model.idea && <span className="truncate">“{model.idea}”</span>}
        <span className="shrink-0 whitespace-pre">
          {model.idea ? ` · ${model.countPhrase}` : model.countPhrase}
        </span>
      </p>
    </header>
  );
}

const STEPS: { id: Exclude<Stage, "saved">; label: string }[] = [
  { id: "idea", label: "Idea" },
  { id: "concepts", label: "Concepts" },
  { id: "build", label: "Build" },
  { id: "save", label: "Save" },
];

// Where the project is, not a way to move it: the next-step line is the way
// forward, so the steps take no hover and no cursor.
function Stepper({ stage }: { stage: Stage }) {
  const at =
    stage === "saved" ? STEPS.length : STEPS.findIndex((s) => s.id === stage);
  return (
    <ol
      role="list"
      aria-label="Progress"
      className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px]"
    >
      {STEPS.map((step, i) => {
        const where = i < at ? "done" : i === at ? "current" : "upcoming";
        return (
          <li
            key={step.id}
            aria-current={where === "current" ? "step" : undefined}
            className="inline-flex items-center gap-[6px]"
          >
            {i > 0 && <span aria-hidden className="h-px w-[12px] bg-border" />}
            <span
              aria-hidden
              className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center"
            >
              {where === "done" ? (
                <span className="inline-flex text-text-success">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
              ) : where === "current" ? (
                <span className="h-[8px] w-[8px] rounded-full bg-bg-brand" />
              ) : (
                <span className="h-[8px] w-[8px] rounded-full border border-solid border-border-strong" />
              )}
            </span>
            <span
              className={[
                "text-sm",
                where === "done"
                  ? "text-text-secondary"
                  : where === "current"
                    ? "font-semibold text-text-primary"
                    : "text-text-tertiary",
              ].join(" ")}
            >
              {step.label}
              {where === "done" && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ─────────────────────────────── next step ───────────────────────────────

// Every "take me there" button in the rail. It moves focus to the canvas
// control that does the thing; it is never that control. It draws 28 px and
// takes a 44 px tap, and scrolls clear of the sticky header when focused.
const SHOW_BUTTON =
  "relative inline-flex h-[28px] shrink-0 scroll-mt-[120px] items-center gap-[4px] rounded-lg px-[6px] text-sm font-semibold text-text-secondary outline-none transition-colors duration-normal ease-decelerate motion-reduce:transition-none after:absolute after:inset-x-0 after:-inset-y-[8px] after:content-[''] hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";

function NextStepLine({
  step,
  onJump,
}: {
  step: NextStep;
  onJump: (target: JumpTarget) => void;
}) {
  const target = step.target;
  return (
    // A tint on the rail's surface, not a card in a card. Its edge lines up
    // with the product rows' fills, and its glyph with the text above.
    <div className="flex gap-[10px] rounded-xl bg-bg-subtle px-[8px] py-[12px]">
      {/* Sized and pinned to the first line: a stretched box would spin the
          glyph around the middle of the whole sentence. */}
      <span
        aria-hidden
        className={[
          "mt-[1px] inline-flex h-[16px] w-[16px] shrink-0 self-start",
          step.tone === "attention" ? "text-text-warning" : "text-text-tertiary",
          step.tone === "working" ? "motion-safe:animate-spin" : "",
        ].join(" ")}
      >
        <Icon
          icon={
            step.tone === "attention"
              ? Alert02Icon
              : step.tone === "working"
                ? Loading03Icon
                : ArrowRight02Icon
          }
          size={16}
        />
      </span>
      <div className="flex min-w-0 flex-col items-start gap-[4px]">
        <p className="text-sm text-text-primary">{step.text}</p>
        {target && (
          <button
            type="button"
            aria-label={step.targetLabel}
            onClick={() => onJump(target)}
            className={`${SHOW_BUTTON} -ml-[6px] hover:bg-bg-surface`}
          >
            Show on canvas
            <Icon icon={ArrowRight01Icon} size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────── products ────────────────────────────────

function ProductList({
  model,
  focusedProduct,
  onSelectProduct,
}: {
  model: RailModel;
  focusedProduct: string | null;
  onSelectProduct: (productId: string) => void;
}) {
  const { rows, build } = model;
  const chosen = rows.filter((r) => !r.leftOut).length;
  const aside = build
    ? build.status === "running"
      ? `${STATE_WORD[build.status]} · ${build.percent}%`
      : STATE_WORD[build.status]
    : chosen < rows.length
      ? `${chosen} of ${rows.length} in the next build`
      : "";
  // A build of one or two products shows every piece; past that only the
  // chosen product's, so four products still fit one screen. Every row keeps
  // its own "n of 5", so how much is left never depends on which is open.
  const inBuild = rows.filter((r) => r.build).length;

  return (
    <section aria-labelledby="rail-products" className="flex flex-col">
      <div className="flex items-baseline gap-[12px] px-[18px] pb-[6px] pt-[18px]">
        <h3 id="rail-products" className="text-sm font-semibold text-text-tertiary">
          {rows.length === 1 ? "Product" : "Products"}
        </h3>
        {aside && (
          <span className="ml-auto text-sm tabular-nums text-text-tertiary">
            {aside}
          </span>
        )}
      </div>
      {/* The inset is a margin: the reset zeroes a role="list"'s padding
          with a selector that outranks a utility. */}
      <ul role="list" className="mx-[10px] flex flex-col gap-[2px]">
        {rows.map((row) => {
          const selected = row.productId === focusedProduct;
          // The model's items are the live ones already — skipped pieces out.
          const pieces =
            row.build && (inBuild <= 2 || selected) ? row.build.items : [];
          return (
            // The pieces are the row's sibling, not its child: a list inside
            // a button is not a list any more.
            <li key={row.productId}>
              <ProductRow
                row={row}
                selected={selected}
                onSelect={() => onSelectProduct(row.productId)}
              />
              {pieces.length > 0 && (
                <ul
                  role="list"
                  aria-label={`${row.name} pieces`}
                  className="mb-[6px] ml-[54px] mr-[2px] flex flex-col gap-[2px]"
                >
                  {pieces.map((item) => (
                    <PipelineRow key={item.kind} item={item} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProductRow({
  row,
  selected,
  onSelect,
}: {
  row: RailRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const id = React.useId();
  const status = statusLine(row);
  // While the build runs the row is about its pieces; the spec line comes
  // back once the build has settled.
  const building = row.phase === "queued" || row.phase === "running";
  const facts = row.facts.length > 0 && !building ? row.facts : null;
  const tag = row.tag ?? null;
  // Red on the selected row's brand fill falls just under 4.5:1 in light, so
  // there an error reads in the primary ink and the glyph alone stays red:
  // the words and the glyph carry it, never the colour by itself. A failed
  // row's glyph is its thumbnail; a row with a picture takes one in its line.
  const statusTone =
    selected && status.tone === "error" ? "text-text-primary" : STATUS_TONE[status.tone];
  const statusGlyph = status.tone === "error" && row.phase !== "failed";
  // The button is named by the product alone; what it is doing, whether the
  // next build takes it, and its spec are read after, in that order — the
  // tag too, or "Left out" would be colour and position only.
  const describedBy = [
    `${id}-status`,
    tag ? `${id}-tag` : null,
    facts ? `${id}-facts` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      aria-label={row.name}
      aria-describedby={describedBy}
      className={[
        "flex w-full scroll-mt-[120px] items-start gap-[12px] rounded-xl px-[8px] py-[8px] text-left outline-none transition-[background-color,box-shadow] duration-normal ease-decelerate motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface",
        // The fill alone is all but the hover tint in light, and this row
        // decides what a paid refine changes — so it also takes the brand
        // edge the chosen card draws on the canvas.
        selected
          ? "bg-bg-brand-subtle shadow-[inset_0_0_0_1px_var(--color-border-brand)]"
          : "hover:bg-bg-subtle",
      ].join(" ")}
    >
      <Thumb row={row} />
      <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
        <span className="flex items-baseline gap-[8px]">
          <span
            title={row.name}
            className="min-w-0 flex-1 truncate text-md font-semibold text-text-primary"
          >
            {row.name}
          </span>
          {tag && (
            <span id={`${id}-tag`} className="shrink-0 text-sm text-text-tertiary">
              {tag}
            </span>
          )}
        </span>
        <span
          id={`${id}-status`}
          className={`flex items-start gap-[4px] text-sm ${statusTone}`}
        >
          {statusGlyph && (
            <span
              aria-hidden
              className="inline-flex h-[18px] shrink-0 items-center text-[var(--color-icon-error)]"
            >
              <Icon icon={Alert02Icon} size={14} />
            </span>
          )}
          <span className="min-w-0">
            {status.text}
            {status.since !== undefined && <Elapsed since={status.since} />}
          </span>
        </span>
        {status.bar !== undefined && (
          <span
            aria-hidden
            className="mt-[6px] block h-[3px] w-full overflow-hidden rounded-full bg-bg-subtle"
          >
            <span
              className="block h-full w-full origin-left bg-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none"
              style={{ transform: `scaleX(${status.bar})` }}
            />
          </span>
        )}
        {facts && (
          <span
            id={`${id}-facts`}
            title={facts.map((f) => f.text).join(" · ")}
            className="block truncate text-sm tabular-nums text-text-tertiary"
          >
            {facts.map((f, i) => (
              <React.Fragment key={f.key}>
                {i > 0 && " · "}
                <span
                  className={
                    selected && f.tone === "error" ? "text-text-primary" : FACT_TONE[f.tone]
                  }
                >
                  {f.text}
                </span>
              </React.Fragment>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

type StatusTone = "secondary" | "tertiary" | "error" | "warn";
const STATUS_TONE: Record<StatusTone, string> = {
  secondary: "text-text-secondary",
  tertiary: "text-text-tertiary",
  error: "text-text-error",
  warn: "text-text-warning",
};
const FACT_TONE: Record<RailRow["facts"][number]["tone"], string> = {
  plain: "",
  warn: "text-text-warning",
  error: "text-text-error",
};

/** A row's second line. `since` adds the running clock, `bar` the build's
 *  0–1 fill for this product. */
function statusLine(row: RailRow): {
  text: string;
  tone: StatusTone;
  since?: number;
  bar?: number;
} {
  const concept = `Concept ${row.conceptLabel}`;
  const b = row.build;
  const total = b?.total ?? 0;
  switch (row.phase) {
    case "drawing":
      return { text: `Drawing ${concept}`, tone: "secondary", since: row.since };
    case "failed":
      return { text: `Couldn't draw ${concept} · nothing charged`, tone: "error" };
    case "conflict":
      return { text: "Doesn't fit its size · fix it on the card", tone: "error" };
    case "queued":
      return { text: `Waiting to start · 0 of ${total}`, tone: "tertiary" };
    case "running": {
      // Filled by how far each piece has got, as the header's percentage
      // is: counted in whole pieces it only restated the words beside it.
      const items = b?.items ?? [];
      const done = items.length
        ? items.reduce((sum, i) => sum + (i.status === "ready" ? 100 : i.progress), 0) /
          (items.length * 100)
        : 0;
      return {
        text: `${b?.ready ?? 0} of ${total} pieces ready`,
        tone: "secondary",
        bar: Math.min(1, Math.max(0, done)),
      };
    }
    case "piece-failed": {
      const kinds = b?.failedKinds ?? [];
      return {
        text:
          kinds.length === 1
            ? `${ITEM_LABELS[kinds[0]]} failed · retry it on the build`
            : `${kinds.length} pieces failed · retry them on the build`,
        tone: "error",
      };
    }
    case "built":
      return { text: `Built · ${total} of ${total} pieces`, tone: "secondary" };
    case "reading":
      return { text: `${concept} · reading the spec…`, tone: "tertiary" };
    // A stand-in is said where the row's facts would be, which it drops:
    // generic parts' numbers are not this product's (review 2 I4).
    case "draft":
      return {
        text: `${concept} · Draft at this size${row.standIn ? " · stand-in parts" : ""}`,
        tone: "warn",
      };
    case "ready":
      return row.standIn
        ? { text: `${concept} · stand-in parts`, tone: "tertiary" }
        : { text: `${concept} · ready`, tone: "secondary" };
  }
}

/** The product's latest drawing, or what stands in for one. Its name is
 *  right beside it, so the picture has nothing to tell a screen reader. */
function Thumb({ row }: { row: RailRow }) {
  if (row.phase === "failed") {
    return (
      <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-error-subtle text-[var(--color-icon-error)]">
        <Icon icon={Alert02Icon} size={14} />
      </span>
    );
  }
  if (!row.imageUrl || row.phase === "drawing") {
    return (
      <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-text-tertiary">
        {row.phase === "drawing" && (
          <span className="inline-flex motion-safe:animate-spin">
            <Icon icon={Loading03Icon} size={14} />
          </span>
        )}
      </span>
    );
  }
  return <ThumbImage key={row.imageUrl} src={row.imageUrl} leftOut={row.leftOut} />;
}

function ThumbImage({ src, leftOut }: { src: string; leftOut: boolean }) {
  // Hidden until it has decoded, then faded in: a tile that pops from empty
  // to picture reads as a flicker. An image already in the cache can finish
  // before the listener is attached, so the ref looks as well.
  const [loaded, setLoaded] = React.useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0) setLoaded(true);
      }}
      src={src}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={[
        "h-[40px] w-[40px] shrink-0 rounded-lg bg-bg-subtle object-cover transition-[opacity,filter] duration-normal ease-decelerate motion-reduce:transition-none",
        !loaded ? "opacity-0" : leftOut ? "opacity-40 grayscale" : "opacity-100",
      ].join(" ")}
    />
  );
}

function Elapsed({ since }: { since: number }) {
  const now = useSecondClock(true);
  // For the eye only: read aloud, every tick would be a sentence.
  return <span aria-hidden>{` · ${elapsedLabel(since, now)}`}</span>;
}

function SuggestedLine({
  names,
  onJump,
}: {
  names: string[];
  onJump: (target: JumpTarget) => void;
}) {
  const all = `Also suggested: ${names.join(", ")}`;
  // Named here, added there: the chips on the canvas stay the one place a
  // product joins the project.
  return (
    <div className="flex items-center gap-[12px] px-[18px] pt-[8px]">
      <p title={all} className="min-w-0 flex-1 truncate text-sm text-text-tertiary">
        {all}
      </p>
      <button
        type="button"
        aria-label="Show suggested products on the canvas"
        onClick={() => onJump({ kind: "add" })}
        className={`${SHOW_BUTTON} -mr-[6px] hover:bg-bg-subtle`}
      >
        Show
        <Icon icon={ArrowRight01Icon} size={14} />
      </button>
    </div>
  );
}

// ─────────────────────────────── activity ────────────────────────────────

function Activity({
  entries,
  drawing,
  folded,
}: {
  entries: ActivityEntry[];
  drawing: Set<string>;
  /** Behind a disclosure, once there are products to show above it. */
  folded: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const now = useMinuteClock();
  if (!entries.length) return null;

  if (!folded) {
    return (
      <section aria-labelledby="rail-activity-title" className="px-[18px] py-[18px]">
        <h3 id="rail-activity-title" className="sr-only">
          Activity
        </h3>
        <ActivityList entries={entries} drawing={drawing} now={now} />
      </section>
    );
  }

  const latest = entries[entries.length - 1];
  return (
    <section className="mt-[18px] border-t border-solid border-border px-[18px] pb-[18px] pt-[10px]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="rail-activity"
          onClick={() => setOpen((v) => !v)}
          className="relative -ml-[8px] inline-flex h-[32px] scroll-mt-[120px] items-center gap-[6px] rounded-lg px-[8px] text-sm font-semibold text-text-secondary outline-none transition-colors duration-normal ease-decelerate motion-reduce:transition-none after:absolute after:inset-x-0 after:-inset-y-[6px] after:content-[''] hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span
            aria-hidden
            className={[
              "inline-flex transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
              open ? "rotate-0" : "-rotate-90",
            ].join(" ")}
          >
            <Icon icon={ArrowDown01Icon} size={14} />
          </span>
          {/* One flex item, so the gap doesn't split it; heard as "Activity
              8 entries", not "Activity middle dot 8". */}
          <span>
            Activity <span aria-hidden>·</span> {entries.length}
            <span className="sr-only"> entries</span>
          </span>
        </button>
      </h3>
      {!open && (
        // The time is kept whole; the event gives way.
        <p title={summaryOf(latest)} className="flex min-w-0 text-sm text-text-tertiary">
          <span className="truncate">Latest: {summaryOf(latest)}</span>
          <span className="shrink-0 whitespace-pre"> · {relativeLabel(latest.ts, now)}</span>
        </p>
      )}
      <div
        id="rail-activity"
        hidden={!open}
        // `hidden` alone loses to a display utility, so the class follows
        // the same state.
        className={[
          "pt-[10px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:ease-decelerate motion-safe:[animation-duration:var(--motion-duration-normal)]",
          open ? "block" : "hidden",
        ].join(" ")}
      >
        <ActivityList entries={entries} drawing={drawing} now={now} />
      </div>
    </section>
  );
}

/** The newest entry as one phrase: "Spare Battery Pack · Concept 5 drawn". */
function summaryOf(e: ActivityEntry): string {
  if (e.tone === "plain") return `${e.title}: ${e.detail ?? ""}`;
  if (!e.detail) return e.title;
  return `${e.title} ${e.detail.charAt(0).toLowerCase()}${e.detail.slice(1)}`;
}

function ActivityList({
  entries,
  drawing,
  now,
}: {
  entries: ActivityEntry[];
  drawing: Set<string>;
  now: number;
}) {
  // Oldest first: the conversation's own order, read top to bottom.
  return (
    <ol role="list" className="flex flex-col gap-[14px]">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start gap-[8px]">
          {e.tone === "plain" ? (
            // What the maker typed, in their words, under a plain "You".
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="text-sm font-semibold text-text-tertiary">{e.title}</span>
              <p className="whitespace-pre-wrap text-md text-text-primary">
                {e.detail}
              </p>
            </div>
          ) : (
            <>
              <EntryGlyph tone={e.tone} />
              <p
                className={[
                  "min-w-0 flex-1 text-sm",
                  e.tone === "error" ? "text-text-error" : "text-text-secondary",
                ].join(" ")}
              >
                {e.title}
                {e.detail && (
                  <span
                    className={[
                      "mt-[1px] block",
                      e.tone === "error" ? "" : "text-text-tertiary",
                    ].join(" ")}
                  >
                    {e.detail}
                    {drawing.has(e.id) && <Elapsed since={e.ts} />}
                  </span>
                )}
              </p>
            </>
          )}
          <time
            dateTime={new Date(e.ts).toISOString()}
            className="shrink-0 text-sm tabular-nums text-text-tertiary"
          >
            {relativeLabel(e.ts, now)}
          </time>
        </li>
      ))}
    </ol>
  );
}

function EntryGlyph({ tone }: { tone: ActivityEntry["tone"] }) {
  if (tone === "waiting") {
    // Not started yet: a still dot, never a spinner that doesn't spin.
    return (
      <span
        aria-hidden
        className="inline-flex h-[20px] w-[14px] shrink-0 items-center justify-center"
      >
        <span className="h-[8px] w-[8px] rounded-full border border-solid border-border-strong" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={[
        "mt-[3px] inline-flex shrink-0",
        tone === "done" ? "text-text-success" : "",
        tone === "working" ? "text-text-tertiary motion-safe:animate-spin" : "",
        tone === "error" ? "text-[var(--color-icon-error)]" : "",
        // A failure since redrawn: still said, no longer in red.
        tone === "neutral" ? "text-text-tertiary" : "",
      ].join(" ")}
    >
      <Icon
        icon={
          tone === "done"
            ? CheckmarkCircle02Icon
            : tone === "working"
              ? Loading03Icon
              : Alert02Icon
        }
        size={14}
      />
    </span>
  );
}

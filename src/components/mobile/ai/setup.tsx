"use client";

// The question the web asks before anything is drawn (setup-turn.tsx), as
// the Figma lays it out on a phone:
//
// · the reading card (05, 646): "IDEEZA is reading your idea…" while the
//   idea is read, its rows ticking off (open); folded once the question is
//   asked; "IDEEZA read your idea…", folded, once it is answered;
// · What should we build? (5026): inline, when the idea needs more than one
//   product — one grouped list: the described product always included, each
//   other product a whole-row tick with why it is needed and the trash; the
//   web's note behind ⓘ; Continue in a foot that sticks to the screen's foot;
// · Which project is this for? (505–864): a sheet with two clear choices
//   (owner 2026-11-24: the plain "+ Start a new project" row over a bare list
//   read as instructions, not choices) — New project (picked first, its name
//   field inside) and A project I have (the projects as pick rows inside).
//   Only ONE product asks it. Several products always start a new project
//   (owner 2026-11-24: "with several products I can only create a project, I
//   can't pick one I have"; §4.4.8), so their sheet only names it (5110, What
//   should the project be called?), the decided products as a row back to the
//   question. With every one of the plan's projects in
//   use, "+ Start a new project" says so before it is picked ("3 of 3 used on
//   Free · Builder gives you 20"), and picking it shows the plan's card in
//   place of the name field; Start drawing waits with the web's reason, and
//   nothing is drawn or charged. Start drawing shows the credits and stays
//   off until there is a project — never for credits (the web's rule, CRE-2):
//   each concept charges as it is drawn, or fails with "Your credit balance ran
//   out before this render started. Nothing was charged." Out of credits, the
//   sheet opens on the out-of-credits row, Buy credits in place. A chat started
//   from a project's Add a product keeps that project (owner rule: it never
//   makes a new one): nothing starts ticked, and the product question's
//   button is Start drawing into it;
// · Required step (580): the sheet closed unanswered — nothing is drawn
//   until it is, and the card opens it again.

import * as React from "react";
import { ArrowDown01Icon, ArrowUp01Icon, CheckmarkCircle02Icon, Delete02Icon, InformationCircleIcon, Loading03Icon, PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { TextInput } from "@/components/ideeza/text-input";
import { Tag } from "@/components/ideeza/tag";
import { Field } from "@/components/auth/auth-parts";
import { CreditBadge } from "@/components/credits/credit-badge";
import { CONCEPT_COST } from "@/lib/create/credits";
import type { SetupAnswer } from "@/lib/create/history";
import { relativeLabel } from "@/components/create/use-clock";
import { titleFromPrompt } from "@/components/create/setup-turn";
import { useNewProjectHint, useProjectRoom } from "@/components/projects/project-limit";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Sheet } from "../kit/sheet";
import { LIST_DIVIDERS, ListCard, ListRow } from "../kit/list";
import { PickList } from "../kit/pick-list";
import { RadioCard } from "../plans/parts";
import { OutOfCreditsRow, ProjectLimitCard } from "../plans/upsell";
import { DASHED } from "./parts";
import type { SetupTurn } from "./use-concept-flow";

// ─────────────────────────── reading card ───────────────────────────

type Row = { key: string; text: string; tone: "done" | "info" | "next" | "working"; when: string };

/** The described product's name: the model's reading of it, else the maker's own first words — never
 *  a generic "Your product" (the web's titleFromPrompt, CRE-20). */
export function productNameOf(setup: SetupTurn): string {
  return setup.productName?.trim() || titleFromPrompt(setup.prompt);
}

export function ReadingCard({ setup, now, projectName }: { setup: SetupTurn; now: number; projectName: string }) {
  const done = setup.status === "answered";
  // Open while the idea is read; folded once the question is asked (the question under it
  // names the products, and its button stays in view) and once it is answered.
  const [open, setOpen] = React.useState(setup.status === "loading");
  const [was, setWas] = React.useState(setup.status);
  if (was !== setup.status) {
    setWas(setup.status);
    setOpen(setup.status === "loading");
  }
  const rel = relativeLabel(setup.ts, now);
  const when = rel.charAt(0).toUpperCase() + rel.slice(1);
  const n = 1 + (setup.answer ? setup.answer.picked.length : setup.companions.length);
  const names = [productNameOf(setup), ...setup.companions.filter((c) => !setup.answer || setup.answer.picked.includes(c.id)).map((c) => c.name)];
  const rows: Row[] =
    setup.status === "loading"
      ? [
          { key: "work", text: "Working out what it needs", tone: "working", when: "Now" },
          { key: "check", text: "Checking concept requirements", tone: "next", when: "Next" },
        ]
      : [
          { key: "work", text: "Working out what it needs", tone: "done", when },
          { key: "needs", text: `This needs ${n} ${n === 1 ? "product" : "products"}: ${names.join(" • ")}`, tone: "info", when },
          done
            ? {
                key: "check",
                text: setup.answer?.projectId ? `Added to ${projectName || "your project"}` : `Started project ${projectName || "your project"}`,
                tone: "done",
                when,
              }
            : { key: "check", text: "Checking concept requirements", tone: "next", when: "Next" },
        ];
  const title = done ? "IDEEZA read your idea…" : "IDEEZA is reading your idea…";
  return (
    <section className={cn(DASHED, "border-border bg-bg-surface")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[48px] w-full items-center gap-4 px-7 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span className={cn("inline-flex", done ? "text-[color:var(--color-icon-success)]" : "text-[color:var(--color-icon-brand)] motion-safe:animate-spin")}>
          <Icon icon={done ? CheckmarkCircle02Icon : Loading03Icon} size={18} />
        </span>
        <span className={cn(T.rowTitle, "flex-1")}>{title}</span>
        <span className="text-[color:var(--color-icon-default)]">
          <Icon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={16} />
        </span>
      </button>
      {open && (
        <ol className="flex flex-col gap-4 px-7 pb-7">
          {rows.map((r) => (
            <li key={r.key} className="flex items-start gap-4">
              <span
                aria-hidden
                className={cn(
                  "mt-[6px] size-[8px] shrink-0 rounded-full",
                  r.tone === "done" && "bg-[var(--color-icon-success)]",
                  r.tone === "info" && "bg-[var(--color-icon-blue)]",
                  r.tone === "working" && "bg-bg-brand motion-safe:animate-pulse",
                  r.tone === "next" && "bg-bg-subtle ring-1 ring-border",
                )}
              />
              <span className={cn(T.meta, "flex-1", r.tone === "next" ? "text-text-tertiary" : "text-text-primary")}>{r.text}</span>
              <span className={cn(T.meta, "shrink-0 text-text-tertiary")}>{r.when}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ─────────────────────────── what should we build ───────────────────────────

/** "2 of 3 products selected" (the web's count note). */
function countNote(chosen: number, offered: number): string {
  return offered > 1 ? `${chosen} of ${offered} products selected` : "1 product";
}

/** 5026: which products this build includes, one at a time like the web. A chat started from a
 *  project's Add a product (`addTo`) draws straight into that project. */
export function ProductQuestion({
  setup,
  picked,
  onToggle,
  onContinue,
  addTo,
  held,
}: {
  setup: SetupTurn;
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onContinue: () => void;
  /** The project this chat adds to: Continue becomes Start drawing, with its credits. */
  addTo?: { id: string; name: string } | null;
  /** Why Start drawing can't run now (offline). Credits never hold it (the web's rule). */
  held?: string | null;
}) {
  const name = productNameOf(setup);
  const chosen = 1 + setup.companions.filter((c) => picked.has(c.id)).length;
  const [info, setInfo] = React.useState(false);
  // The web's whole note (setup-turn.tsx): one short line inline, all of it behind ⓘ (lens 1).
  const note = addTo
    ? `Your idea needs more than one product to work. Everything ticked gets its own concept and goes into ${addTo.name}.`
    : "Your idea needs more than one product to work. Everything ticked gets its own concept.";
  return (
    // Not LIST_CARD: its overflow clip would stop the foot from sticking.
    <section aria-labelledby="product-q" className="flex flex-col rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface">
      <div className="flex items-start gap-2 pb-5 pl-8 pr-3 pt-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="product-q" className={T.section}>
            What should we build?
          </h2>
          <p className={T.meta}>Your idea needs more than one product.</p>
        </div>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label="Why more than one product"
          onClick={() => setInfo(true)}
          className="-mt-2 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-bg-subtle active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={InformationCircleIcon} size={20} />
        </button>
      </div>
      {/* One grouped list (lens: rows, not boxes in a card): whole-row ticks, the Figma trash at the end. */}
      <ul aria-label="Products" className={cn("border-t-[length:var(--border-width-1)] border-solid border-border", LIST_DIVIDERS)}>
        <li className="flex items-start gap-5 px-8 py-5">
          <span className="mt-1">
            <Checkbox checked disabled decorative />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-start justify-between gap-4">
              <span className={T.rowTitle}>{name}</span>
              <Tag size="sm">Always included</Tag>
            </span>
            {setup.productSummary && <span className={T.meta}>{setup.productSummary}</span>}
          </span>
        </li>
        {setup.companions.map((c) => {
          const on = picked.has(c.id);
          return (
            <li key={c.id} className="flex items-start">
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-5 py-5 pl-8 transition-colors duration-fast active:bg-bg-subtle has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-inset has-[input:focus-visible]:ring-border-focus">
                <input type="checkbox" className="sr-only" checked={on} onChange={() => onToggle(c.id)} />
                <span className="mt-1">
                  <Checkbox checked={on} decorative />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={T.rowTitle}>{c.name}</span>
                  {c.why && <span className={T.meta}>{c.why}</span>}
                </span>
              </label>
              {/* 5026's trash: takes the product out of this build (the same as clearing its tick). */}
              <button
                type="button"
                disabled={!on}
                onClick={() => onToggle(c.id)}
                aria-label={`Leave out ${c.name}`}
                className="mx-3 mt-3 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-bg-subtle active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:text-[color:var(--color-icon-disabled)] disabled:hover:bg-transparent"
              >
                <Icon icon={Delete02Icon} size={18} />
              </button>
            </li>
          );
        })}
      </ul>
      {/* The question's one primary sticks to the foot of the scroll area while the list
          scrolls (lens 6 / 14): the thumb always reaches it. */}
      <div className="sticky bottom-0 flex flex-col gap-3 rounded-b-xl border-t-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-8 pb-6 pt-5">
        <p className={cn(T.meta, "text-center")}>
          {countNote(chosen, setup.companions.length + 1)}
          {addTo ? ` · into ${addTo.name}` : ""}
        </p>
        <Button size="xl" className="w-full" onClick={onContinue} disabled={!!addTo && !!held}>
          {addTo ? (
            <>
              Start drawing <CreditBadge credits={chosen * CONCEPT_COST} onBrand={!held} />
            </>
          ) : (
            "Continue"
          )}
        </Button>
        {addTo && held && (
          <p role="status" className={cn(T.meta, "text-center")}>
            {held}
          </p>
        )}
      </div>
      {/* An ⓘ sheet: ✕, swipe and the scrim close it — no Done that only closes (kit rule). */}
      <Sheet open={info} onClose={() => setInfo(false)} title="What should we build?" description={note} />
    </section>
  );
}

// ─────────────────────────── which project ───────────────────────────

export function ProjectSheet({
  open,
  onClose,
  products,
  productNames,
  onChangeProducts,
  projects,
  onStart,
  onBuyCredits,
  held,
}: {
  open: boolean;
  onClose: () => void;
  /** How many products are kept: one may join a project, several make a new one —
   *  unless the chat was started from a project (a preselected one), which they join. */
  products: number;
  /** The products decided in "What should we build?", with the way back to it. */
  productNames?: string[];
  onChangeProducts?: () => void;
  projects: { id: string; name: string; preselect?: boolean; detail?: string }[];
  onStart: (answer: Pick<SetupAnswer, "projectId" | "projectName">) => void;
  /** Out of credits: the row with Buy credits opens the sheet (null with a credit to draw with). */
  onBuyCredits?: (() => void) | null;
  /** Why Start drawing can't run now (offline). */
  held?: string | null;
}) {
  const multi = products > 1;
  const addTo = projects.find((p) => p.preselect) ?? null;
  // One product: which project — one the maker has, or a new one. Several products always make a new
  // project (owner 2026-11-24), so they only need its name — unless the chat came from a project's Add a
  // product (a preselected one), whose project they join.
  // With no project to pick, one product only needs a name too.
  const choosing = (!multi && projects.length > 0) || addTo !== null;
  const [mode, setMode] = React.useState<"new" | "existing">(addTo ? "existing" : "new");
  const [picked, setPicked] = React.useState<string | null>(addTo?.id ?? null);
  const [name, setName] = React.useState("");
  const nameId = React.useId();
  const existingRef = React.useRef<HTMLDivElement>(null);
  // The plan's projects (CL-034): when they're all in use a new project can't start — the card takes the
  // name field's place, before any credit is spent. When one frees up the name field comes back.
  const room = useProjectRoom();
  const newHint = useNewProjectHint();
  const isNew = !choosing || mode === "new";
  const newBlocked = room.full && isNew;
  const cost = products * CONCEPT_COST;
  const ready = !newBlocked && (isNew ? name.trim().length > 0 : !!picked);
  const reason = newBlocked
    ? choosing && projects.length > 0
      ? "Pick a project you have, or upgrade"
      : "Upgrade to start a new project"
    : !ready
      ? isNew
        ? "Name the project first"
        : "Pick a project first"
      : (held ?? null);
  // "Use a project I have": A project I have picked and its projects brought into view.
  const useExisting = () => {
    setMode("existing");
    requestAnimationFrame(() => {
      existingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      existingRef.current?.querySelector<HTMLElement>("[role=option]")?.focus({ preventScroll: true });
    });
  };

  const start = () => {
    if (reason) return;
    onStart(isNew ? { projectId: "", projectName: name.trim() } : { projectId: picked!, projectName: "" });
  };

  const nameField = (
    <Field label="New project name" htmlFor={nameId}>
      <TextInput
        id={nameId}
        size="xl"
        value={name}
        onValueChange={setName}
        placeholder="e.g. Drone project"
        maxLength={80}
        onKeyDown={(e) => {
          if (e.key === "Enter") start();
        }}
      />
    </Field>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={choosing ? (multi ? "Which project are these for?" : "Which project is this for?") : "What should the project be called?"}
      description={
        multi
          ? addTo
            ? `You're adding ${products} products to ${addTo.name}. You can pick another project, or start a new one.`
            : `${products} products belong together, so they start one new project.`
          : addTo
            ? `You're adding a product to ${addTo.name}. You can pick another project, or start a new one.`
            : choosing
              ? "Start a new project with it, or add it to one you have."
              : "This product starts a new project."
      }
      actions={
        <>
          <Button size="xl" className="w-full" onClick={start} aria-disabled={!!reason || undefined} disabled={!!reason}>
            Start drawing <CreditBadge credits={cost} onBrand={!reason} />
          </Button>
          {reason && (
            <p role="status" className={cn(T.meta, "text-center")}>
              {reason}
            </p>
          )}
        </>
      }
    >
      {/* Out of credits: the web's CL-032 line stays in view while the question is open (CRE-2). */}
      {onBuyCredits && <OutOfCreditsRow onBuy={onBuyCredits} />}
      {/* The products decided a step back: a row that returns to the question (lens 4). */}
      {productNames && productNames.length > 1 && (
        <ListCard label="Products">
          {onChangeProducts ? (
            <ListRow icon={PackageIcon} title={`Products · ${productNames.length}`} meta={productNames.join(", ")} value="Change" onClick={onChangeProducts} />
          ) : (
            <ListRow icon={PackageIcon} title={`Products · ${productNames.length}`} meta={productNames.join(", ")} />
          )}
        </ListCard>
      )}
      {/* The projects as pick rows in this sheet, not a field that opens a second sheet: the
          sheet scrolls while its title and Start drawing stay pinned, so a long list never
          pushes the question away (the web's reason for its dropdown). */}
      {/* Two choices, each a card with its radio; what the picked one needs sits inside it. */}
      {choosing && (
        <ul role="radiogroup" aria-label={multi ? "Where these products go" : "Where this product goes"} className="flex flex-col gap-4">
          <RadioCard
            checked={mode === "new"}
            onSelect={() => setMode("new")}
            below={mode === "new" ? (newBlocked ? <ProjectLimitCard onUseExisting={projects.length > 0 ? useExisting : undefined} /> : nameField) : undefined}
          >
            <span className={T.rowTitle}>New project</span>
            <span className={T.meta}>{newHint ?? (multi ? "These products start it." : "This product starts it.")}</span>
          </RadioCard>
          {projects.length > 0 && (
            <RadioCard
              checked={mode === "existing"}
              onSelect={useExisting}
              below={
                mode === "existing" ? (
                  <div ref={existingRef} className="scroll-mt-4">
                    <PickList label="Your projects" value={picked} options={projects.map((p) => ({ value: p.id, label: p.name, helper: p.detail }))} onPick={setPicked} />
                  </div>
                ) : undefined
              }
            >
              <span className={T.rowTitle}>A project I have</span>
              <span className={T.meta}>
                Add it to one of your {projects.length} {projects.length === 1 ? "project" : "projects"}.
              </span>
            </RadioCard>
          )}
        </ul>
      )}
      {!choosing && (newBlocked ? <ProjectLimitCard /> : nameField)}
    </Sheet>
  );
}

/** 580: the question closed unanswered. */
export function RequiredStep({ onOpen }: { onOpen: () => void }) {
  return (
    // A designed state card with its one primary, full width and 44 px (owner rule, lens 5 / 16).
    <section className={cn(DASHED, "flex flex-col gap-5 border-border-error bg-bg-error-subtle p-7")}>
      <div className="flex min-w-0 flex-col gap-3">
        <span className="w-fit">
          <Badge tone="error">Required step</Badge>
        </span>
        <p className={T.meta}>Choose a project to continue to concept drawing.</p>
      </div>
      <Button size="xl" className="w-full" onClick={onOpen}>
        Choose project
      </Button>
    </section>
  );
}

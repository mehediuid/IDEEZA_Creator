"use client";

// The questions the flow asks before it renders anything.
//
// A prompt used to go straight to an image. The two decisions that shape a
// build — which project it belongs to, and whether the idea is one product or
// several — are cheap to ask and expensive to get wrong, so they are asked
// first, and nothing is charged until they are answered.
//
// It is drawn as a question in the conversation rather than as a dialog over
// it: the answers become part of the thread and can be read back later, which
// a modal that closes cannot do. The shape is the one a reader already knows
// from an assistant asking a question — a small label saying what is being
// decided, the question in plain words, then the options as rows you can
// actually click, each with the line that explains it.
//
// The order follows the decision, not the data: what you are building comes
// first, because it is what decides whether the next question is "which
// project" or "name the project". Several products always start a new project
// (owner 2026-11-24: "with several products from AI I can only create a
// project, I can't pick one I have"), so they are only asked its name; one
// product gets two clear choices, New project or A project I have (owner: a
// "+ Start a new project" row over a list of projects confused people).

import * as React from "react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Radio, SelectMenu } from "@/components/ideeza";
import { CreditBadge } from "@/components/credits/credit-badge";
import { ProjectLimitCard, useNewProjectHint, useProjectRoom } from "@/components/projects/project-limit";
import { cn } from "@/lib/utils";
import { CanvasFooter } from "./canvas-footer";
import type { Companion } from "@/lib/create/companions";
import type { SetupAnswer } from "@/lib/create/history";

export type SetupProject = {
  id: string;
  name: string;
  /** What tells two projects of the same name apart: what they hold and when
   *  they last changed. */
  detail?: string;
  /** The project this chat was started for — its page's "Add a product"
   *  (`/?addTo=`, P2-TABS-29). The question opens on it: the chooser holds
   *  it, and whatever is built goes into it, one product or several (owner,
   *  2026-10-13: a product added from a project never lands in a new one).
   *  The companions still start unticked — the page asked for one product. */
  preselect?: boolean;
};

export function SetupTurn({
  prompt,
  status,
  companions,
  productName,
  productSummary,
  answer,
  projects,
  onAnswer,
}: {
  prompt: string;
  status: "loading" | "asking" | "answered";
  companions: Companion[];
  /** What the model called this product, and the line under it. The prompt
   *  is what the maker typed; a product needs a name, and they should not
   *  have to write it twice. */
  productName?: string;
  productSummary?: string;
  answer?: SetupAnswer;
  /** Existing projects one product could join; several products always start a new project
   *  (owner 2026-11-24), unless the chat came from a project's Add a product (`preselect`). */
  projects: SetupProject[];
  onAnswer: (answer: SetupAnswer) => void;
}) {
  // Everything offered starts ticked: the classifier only offers a companion
  // where the product genuinely needs one, so the default that matches the
  // finding is "yes", and unticking is the deliberate act.
  //
  // Derived, not synced. The classifier answers after this card is already on
  // screen, and an effect that copied its list into state re-rendered to say
  // what could simply be read — so the default is computed and state holds
  // only what the maker has actually touched.
  //
  // A chat started from a project's "Add a product" is the exception: it
  // exists to add ONE product to that project, so nothing starts ticked.
  const addTo = projects.find((p) => p.preselect) ?? null;
  const defaults = () => new Set(addTo ? [] : companions.map((c) => c.id));
  const [touched, setTouched] = React.useState<Set<string> | null>(null);
  const picked = touched ?? defaults();
  const setPicked = (next: (was: Set<string>) => Set<string>) =>
    setTouched((was) => next(was ?? defaults()));
  const [step, setStep] = React.useState<"products" | "project">("products");
  // Derived like `picked`: the project store can land after this card, so the
  // "Add a product" project is read, not copied into state on mount.
  const [touchedMode, setMode] = React.useState<"new" | "existing" | null>(null);
  const mode = touchedMode ?? (addTo ? "existing" : "new");
  const [chosenId, setProjectId] = React.useState<string | null>(null);
  const projectId = chosenId ?? addTo?.id ?? "";
  const [projectName, setProjectName] = React.useState("");
  // The plan's projects (upgrade plan C5): when they're all in use, a new project
  // can't start — the card takes the name field's place, before any credit is spent.
  const room = useProjectRoom();
  const newHint = useNewProjectHint();
  const pickerRef = React.useRef<HTMLDivElement>(null);

  // A chat started from a project's "Add a product" already knows its project: the maker chose
  // it on that page and started the concept there, its credit in view. So the project is never
  // asked again (owner, 2026-10-13). With one product nothing is left to ask, and the question
  // answers itself once the idea is read; with more, only "What should we build?" is asked.
  const answeredForProject = React.useRef(false);
  const answersItself = status === "asking" && addTo !== null && companions.length === 0;
  React.useEffect(() => {
    if (!answersItself || !addTo || answeredForProject.current) return;
    answeredForProject.current = true;
    onAnswer({ projectId: addTo.id, projectName: "", picked: [] });
  }, [answersItself, addTo, onAnswer]);

  if (status === "loading" || answersItself) {
    return (
      <Card>
        <p className="flex items-center gap-[8px] text-md text-text-secondary">
          <span className="animate-spin text-text-tertiary">
            <Icon icon={Loading03Icon} size={16} />
          </span>
          Reading your idea…
        </p>
      </Card>
    );
  }

  if (status === "answered" && answer) {
    return <AnsweredCard answer={answer} companions={companions} projects={projects} />;
  }

  // More than one product means one NEW project holding all of them (§4.4.8; owner
  // 2026-11-24, which withdrew the create-flow study's D3 default that let them join
  // a project the maker has).
  const extra = companions.filter((c) => picked.has(c.id));
  const multi = extra.length > 0;

  // One question at a time. The second question’s shape depends on the first
  // answer — how many products there are decides whether there is a project
  // to choose or a project to name — so showing both at once would be asking
  // something before it is knowable.
  const onProducts = step === "products" && companions.length > 0;

  if (onProducts) {
    return (
      <Card>
        <Question
          chip="Products"
          ask="What should we build?"
          note={
            addTo
              ? `Your idea needs more than one product to work. Everything ticked gets its own concept and goes into ${addTo.name}.`
              : "Your idea needs more than one product to work. Everything ticked gets its own concept."
          }
        >
          <Row
            checked
            disabled
            title={productName?.trim() || titleFromPrompt(prompt)}
            why={
              productSummary?.trim() ||
              "The product you described. Always included."
            }
          />
          {companions.map((c) => (
            <Row
              key={c.id}
              checked={picked.has(c.id)}
              title={c.name}
              why={c.why}
              onToggle={() =>
                setPicked((was) => {
                  const next = new Set(was);
                  if (next.has(c.id)) next.delete(c.id);
                  else next.add(c.id);
                  return next;
                })
              }
            />
          ))}
        </Question>
        <Footer
          note={countNote(extra.length + 1, companions.length + 1)}
          credits={extra.length + 1}
          spends={!!addTo}
          label={addTo ? "Start drawing" : "Continue"}
          ready
          onGo={() =>
            addTo
              ? onAnswer({ projectId: addTo.id, projectName: "", picked: extra.map((c) => c.id) })
              : setStep("project")
          }
        />
      </Card>
    );
  }

  // Several products only need a name for their new project, and so does one product when the
  // maker has no project to add it to. Otherwise the question is which project: New project or
  // A project I have — the one this chat was started from, unless the maker picks another.
  const choosing = (!multi && projects.length > 0) || addTo !== null;
  const isNew = !choosing || mode === "new";
  const newBlocked = room.full && isNew;
  const ready = !newBlocked && (isNew ? projectName.trim().length > 0 : projectId !== "");
  // "Use a project I have" on the plan's card: A project I have picked, its list opened.
  const useExisting = () => {
    setMode("existing");
    window.requestAnimationFrame(() => pickerRef.current?.querySelector<HTMLElement>("[role=combobox]")?.click());
  };
  const nameField = (
    <NameField
      label={choosing ? "New project name" : "Project name"}
      value={projectName}
      onChange={setProjectName}
      placeholder={multi ? "e.g. Field survey drone" : "e.g. Bench tools"}
      className={choosing ? undefined : "mt-[12px]"}
    />
  );

  return (
    <Card>
      {companions.length > 0 && (
        <Decided
          chip="Products"
          text={`${extra.length + 1} product${extra.length ? "s" : ""}: ${[
            productName?.trim() || titleFromPrompt(prompt),
            ...extra.map((c) => c.name),
          ].join(", ")}`}
          onChange={() => setStep("products")}
        />
      )}
      <Question
        chip="Project"
        ask={choosing ? (multi ? "Which project are these for?" : "Which project is this for?") : "What should the project be called?"}
        note={
          multi
            ? addTo
              ? `You're adding ${extra.length + 1} products to ${addTo.name}. You can pick another project, or start a new one.`
              : `${extra.length + 1} products belong together, so they start one new project.`
            : addTo
              ? `You're adding a product to ${addTo.name}. You can pick another project, or start a new one.`
              : choosing
                ? "Start a new project with it, or add it to one you have."
                : "This product starts a new project."
        }
      >
        {!choosing ? (
          newBlocked ? <ProjectLimitCard className="mt-[12px]" /> : nameField
        ) : (
          <ProjectChoices
            label={multi ? "Where these products go" : "Where this product goes"}
            mode={mode}
            onMode={setMode}
            newWhy={newHint ?? (multi ? "These products start it." : "This product starts it.")}
            existingWhy={`Add ${multi ? "them" : "it"} to one of your ${projects.length} ${projects.length === 1 ? "project" : "projects"}.`}
            newBody={newBlocked ? <ProjectLimitCard onUseExisting={useExisting} /> : nameField}
            existingBody={
              /* A dropdown, not a row per project: a maker with fifty projects got fifty rows in the
                 middle of a chat, and the question scrolled off the top. Same control the Brief's
                 own project chooser uses. Two projects can share a name, so each row says what it
                 holds and when it last changed. */
              <div ref={pickerRef}>
                <SelectMenu
                  placeholder="Choose a project"
                  ariaLabel="Your projects"
                  value={projectId || null}
                  onChange={setProjectId}
                  options={projects.map((pr) => ({ value: pr.id, label: pr.name, sub: pr.detail }))}
                />
              </div>
            }
          />
        )}
      </Question>
      <Footer
        note={countNote(extra.length + 1, companions.length + 1)}
        credits={extra.length + 1}
        spends
        label="Start drawing"
        ready={ready}
        reason={
          newBlocked
            ? choosing
              ? "Pick a project you have, or upgrade"
              : `Upgrade to start a new project`
            : isNew
              ? "Name the project first"
              : "Pick a project first"
        }
        onGo={() =>
          onAnswer(
            isNew
              ? { projectId: "", projectName: projectName.trim(), picked: extra.map((c) => c.id) }
              : { projectId, projectName: "", picked: extra.map((c) => c.id) },
          )
        }
      />
    </Card>
  );
}

/** Once answered the card stops being a form and becomes the record of what
 *  was decided, so scrolling back explains why the build looks as it does. */
function AnsweredCard({
  answer,
  companions,
  projects,
}: {
  answer: SetupAnswer;
  companions: Companion[];
  projects: SetupProject[];
}) {
  const chosen = companions.filter((c) => answer.picked.includes(c.id));
  const where =
    answer.projectName ||
    projects.find((p) => p.id === answer.projectId)?.name ||
    "a new project";
  return (
    <Card muted>
      <p className="flex items-start gap-[8px] text-sm leading-relaxed text-text-secondary">
        <span className="mt-[2px] shrink-0 text-text-success">
          <Icon icon={CheckmarkCircle02Icon} size={15} />
        </span>
        <span>
          Building{" "}
          <strong className="font-semibold text-text-primary">
            {chosen.length + 1} product{chosen.length ? "s" : ""}
          </strong>{" "}
          in <strong className="font-semibold text-text-primary">{where}</strong>
          {chosen.length > 0 && (
            <> — with {chosen.map((c) => c.name.toLowerCase()).join(" and ")}.</>
          )}
          {chosen.length === 0 && <>.</>}
        </span>
      </p>
    </Card>
  );
}

// ───────────────────────────── the pieces ─────────────────────────────

// No card. The thread is already a column on a surface, and wrapping these
// questions in a bordered panel — which then holds bordered rows — is a box
// inside a box (AGENTS.md, UI/UX hard rules). What separates this from the
// message above it is space and one hairline, not another edge.
function Card({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      data-testid="setup-turn"
      className={[
        "flex w-full max-w-[640px] flex-col",
        muted ? "gap-[10px]" : "gap-[22px]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** One question, in the shape a reader already knows: a small chip saying
 *  what is being decided, the question itself in plain words, a line of
 *  context under it, then the options as rows you can click. */
function Question({
  chip,
  ask,
  note,
  children,
}: {
  chip: string;
  ask: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-[10px]">
      <span className="text-sm font-medium text-text-tertiary">{chip}</span>
      <h2 className="text-lg font-semibold text-text-primary">{ask}</h2>
      <p className="max-w-[62ch] text-sm leading-relaxed text-text-secondary">
        {note}
      </p>
      <div className="flex flex-col gap-[2px] pt-[6px]">{children}</div>
    </section>
  );
}

/** A question already answered, kept in view so the thread still reads as a
 *  conversation — and reopenable, because an answer you cannot revise is a
 *  trap rather than a question. */
function Decided({
  chip,
  text,
  onChange,
}: {
  chip: string;
  text: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-baseline gap-[10px] text-sm">
      <span className="shrink-0 font-medium text-text-tertiary">{chip}</span>
      <span className="min-w-0 flex-1 truncate text-text-secondary">{text}</span>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 rounded text-sm font-medium text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Change
      </button>
    </div>
  );
}

function Footer({
  note,
  credits,
  spends = false,
  label,
  ready,
  reason,
  onGo,
}: {
  note: string;
  /** What drawing these concepts costs — on the button that spends it, or
   *  beside the note on a step before that one (Continue). */
  credits?: number;
  spends?: boolean;
  label: string;
  ready: boolean;
  reason?: string;
  onGo: () => void;
}) {
  // Not ready: the reason takes the note's place, where a keyboard, a screen
  // reader and a touch screen all find it — a title on a disabled button
  // reached a mouse and nobody else. The button stays focusable for the same
  // reason, and a press does nothing until it is ready.
  const reasonId = React.useId();
  const blocked = !ready && !!reason;
  return (
    <CanvasFooter>
      <div className="flex w-full items-center justify-end gap-[12px] pt-[2px]">
        <span
          id={blocked ? reasonId : undefined}
          className="inline-flex items-center gap-[6px] text-sm text-text-tertiary"
        >
          {blocked ? reason : note}
          {!blocked && credits !== undefined && !spends && <CreditBadge credits={credits} />}
        </span>
        <button
          type="button"
          aria-disabled={!ready}
          aria-describedby={blocked ? reasonId : undefined}
          onClick={ready ? onGo : undefined}
          className={
            ready
              ? "inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
              : "inline-flex h-[40px] cursor-not-allowed items-center gap-[8px] rounded-lg bg-bg-subtle px-[16px] text-md font-semibold text-text-disabled outline-none"
          }
        >
          {label}
          {credits !== undefined && spends && <CreditBadge credits={credits} onBrand={ready} />}
          <Icon icon={ArrowRight01Icon} size={16} />
        </button>
      </div>
    </CanvasFooter>
  );
}

/** How many products are ticked out of how many the idea can have (owner,
 *  2026-11-03: the count of what can be made and what is chosen). One
 *  product has nothing to choose between, so it is just named. */
function countNote(chosen: number, offered: number): string {
  return offered > 1 ? `${chosen} of ${offered} products selected` : "1 product";
}

/** One option. The whole row is the target — a 16px box is not something to
 *  ask anyone to hit when the row beside it is already the label for it. */
function Row({
  checked,
  title,
  why,
  onToggle,
  disabled = false,
  radio = false,
}: {
  checked: boolean;
  title: string;
  why: string;
  onToggle?: () => void;
  disabled?: boolean;
  radio?: boolean;
}) {
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={[
        "flex w-full items-start gap-[12px] rounded-xl px-[12px] py-[10px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
        disabled ? "cursor-default" : "hover:bg-bg-subtle",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "mt-[2px] inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center border border-solid",
          radio ? "rounded-full" : "rounded-[4px]",
          checked
            ? "border-border-brand bg-bg-brand text-text-on-brand"
            : "border-border-strong bg-bg-surface",
        ].join(" ")}
      >
        {checked &&
          (radio ? (
            <span className="h-[6px] w-[6px] rounded-full bg-text-on-brand" />
          ) : (
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
              <path d="M5 13l4 4L19 7" />
            </svg>
          ))}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-md font-medium text-text-primary">{title}</span>
        <span className="text-sm leading-relaxed text-text-tertiary">{why}</span>
      </span>
      {disabled && (
        <span className="shrink-0 text-sm text-text-tertiary">Always included</span>
      )}
    </button>
  );
}

/** "Which project is this for?" as two clear choices (owner 2026-11-24): New project (its name
 *  field) and A project I have (the list of projects). Each is a card whose head is the radio;
 *  what the picked one needs sits under it in the same card. Arrow keys move between them. */
function ProjectChoices({
  label,
  mode,
  onMode,
  newWhy,
  existingWhy,
  newBody,
  existingBody,
}: {
  label: string;
  mode: "new" | "existing";
  onMode: (m: "new" | "existing") => void;
  newWhy: string;
  existingWhy: string;
  newBody: React.ReactNode;
  existingBody: React.ReactNode;
}) {
  const refs = React.useRef<Record<"new" | "existing", HTMLButtonElement | null>>({ new: null, existing: null });
  const choices = [
    { id: "new" as const, title: "New project", why: newWhy, body: newBody },
    { id: "existing" as const, title: "A project I have", why: existingWhy, body: existingBody },
  ];
  const go = (to: "new" | "existing") => {
    onMode(to);
    refs.current[to]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-[12px]">
      {choices.map((c) => {
        const on = mode === c.id;
        const other = c.id === "new" ? "existing" : "new";
        return (
          <div
            key={c.id}
            className={cn(
              "flex flex-col rounded-xl border border-solid bg-bg-surface transition-colors duration-fast",
              on ? "border-border-brand" : "border-border",
            )}
          >
            <button
              ref={(el) => {
                refs.current[c.id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onMode(c.id)}
              onKeyDown={(e) => {
                if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                  e.preventDefault();
                  go(other);
                }
              }}
              className={cn(
                "flex w-full items-start gap-[12px] rounded-xl px-[16px] py-[12px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                !on && "hover:bg-bg-subtle",
              )}
            >
              <Radio checked={on} decorative size="sm" className="mt-[2px] shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="text-md font-medium text-text-primary">{c.title}</span>
                <span className="text-sm leading-relaxed text-text-tertiary">{c.why}</span>
              </span>
            </button>
            {on && <div className="flex flex-col gap-[12px] pb-[16px] pl-[48px] pr-[16px]">{c.body}</div>}
          </div>
        );
      })}
    </div>
  );
}

// A visible label, and as wide as the chooser above it — it was a 380 px box
// with only a placeholder to say what it was for, under a 640 px dropdown.
function NameField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-[6px]", className)}>
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-[40px] w-full rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-md text-text-primary outline-none placeholder:text-text-tertiary focus-visible:border-border-brand focus-visible:ring-2 focus-visible:ring-border-focus"
      />
    </div>
  );
}

/** The product the maker described, named from their own words — the model
 *  has not run yet, so this is their phrasing, not an invention. (Exported for
 *  the phone's question, the same fallback.) */
export function titleFromPrompt(prompt: string): string {
  const first = prompt.trim().split(/[.,\n]/)[0].trim();
  const short = first.length > 52 ? `${first.slice(0, 52).trimEnd()}…` : first;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

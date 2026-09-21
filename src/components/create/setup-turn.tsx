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
// project" or "name the project".

import * as React from "react";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { Companion } from "@/lib/create/companions";
import type { SetupAnswer } from "@/lib/create/history";

export type SetupProject = { id: string; name: string };

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
  /** Existing projects a single-product build could join. */
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
  const [touched, setTouched] = React.useState<Set<string> | null>(null);
  const picked = touched ?? new Set(companions.map((c) => c.id));
  const setPicked = (next: (was: Set<string>) => Set<string>) =>
    setTouched((was) => next(was ?? new Set(companions.map((c) => c.id))));
  const [step, setStep] = React.useState<"products" | "project">("products");
  const [projectId, setProjectId] = React.useState("");
  const [projectName, setProjectName] = React.useState("");

  if (status === "loading") {
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

  // More than one product means one project holding all of them, so there is
  // nothing to choose between — only a name to give. With a single product
  // the build can join a project that already exists.
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
          note="Your idea needs more than one product to work. Everything ticked gets its own concept."
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
          note={`${extra.length + 1} concept${extra.length ? "s" : ""} · ${extra.length + 1} credit${extra.length ? "s" : ""}`}
          label="Continue"
          ready
          onGo={() => setStep("project")}
        />
      </Card>
    );
  }

  const ready = multi
    ? projectName.trim().length > 0
    : projectId !== "" || projectName.trim().length > 0;

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
        ask={multi ? "What should the project be called?" : "Where does this go?"}
        note={
          multi
            ? `${extra.length + 1} products belong together, so they go in one new project.`
            : "A single product can join a project you already have, or start a new one."
        }
      >
        {multi ? (
          <NameField
            value={projectName}
            onChange={setProjectName}
            placeholder="e.g. Field survey drone"
          />
        ) : (
          <>
            {projects.map((pr) => (
              <Row
                key={pr.id}
                radio
                checked={projectId === pr.id}
                title={pr.name}
                why="Add this product to that project."
                onToggle={() => {
                  setProjectId(pr.id);
                  setProjectName("");
                }}
              />
            ))}
            <Row
              radio
              checked={projectId === "" && projectName !== ""}
              title="Start a new project"
              why="Give it a name and this product becomes its first."
              onToggle={() => {
                setProjectId("");
                setProjectName((n) => n || " ");
              }}
            />
            {projectId === "" && projectName !== "" && (
              <NameField
                value={projectName.trim()}
                onChange={setProjectName}
                placeholder="e.g. Bench tools"
              />
            )}
          </>
        )}
      </Question>
      <Footer
        note={`${extra.length + 1} concept${extra.length ? "s" : ""} · ${extra.length + 1} credit${extra.length ? "s" : ""}`}
        label="Start drawing"
        ready={ready}
        reason={multi ? "Name the project first" : "Pick a project first"}
        onGo={() =>
          onAnswer({
            projectId: multi ? "" : projectId,
            projectName: projectName.trim(),
            picked: extra.map((c) => c.id),
          })
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
// inside a box (CLAUDE.md §7). What separates this from the message above it
// is space and one hairline, not another edge.
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
        "flex w-full max-w-[640px] flex-col border-t border-solid border-border",
        muted ? "gap-[10px] pt-[20px]" : "gap-[22px] pt-[28px]",
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
      <span className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">
        {chip}
      </span>
      <h3 className="text-lg font-semibold text-text-primary">{ask}</h3>
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
      <span className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">
        {chip}
      </span>
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
  label,
  ready,
  reason,
  onGo,
}: {
  note: string;
  label: string;
  ready: boolean;
  reason?: string;
  onGo: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-[12px] pt-[2px]">
      <span className="text-sm text-text-tertiary">{note}</span>
      <button
        type="button"
        disabled={!ready}
        onClick={onGo}
        title={ready ? undefined : reason}
        className={
          ready
            ? "inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
            : "inline-flex h-[40px] cursor-not-allowed items-center gap-[8px] rounded-lg bg-bg-subtle px-[16px] text-md font-semibold text-text-disabled outline-none"
        }
      >
        {label}
        <Icon icon={ArrowRight01Icon} size={16} />
      </button>
    </div>
  );
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
        checked ? "bg-bg-brand-subtle" : "hover:bg-bg-subtle",
        disabled ? "cursor-default" : "",
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
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="text-md font-medium text-text-primary">{title}</span>
        <span className="text-sm leading-relaxed text-text-tertiary">{why}</span>
      </span>
    </button>
  );
}

function NameField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Project name"
      className="h-[40px] w-full max-w-[380px] rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-md text-text-primary outline-none placeholder:text-text-tertiary focus-visible:border-border-brand focus-visible:ring-2 focus-visible:ring-border-focus"
    />
  );
}

/** The product the maker described, named from their own words — the model
 *  has not run yet, so this is their phrasing, not an invention. */
function titleFromPrompt(prompt: string): string {
  const first = prompt.trim().split(/[.,\n]/)[0].trim();
  const short = first.length > 52 ? `${first.slice(0, 52).trimEnd()}…` : first;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

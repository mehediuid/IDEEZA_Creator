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
  answer,
  projects,
  onAnswer,
}: {
  prompt: string;
  status: "loading" | "asking" | "answered";
  companions: Companion[];
  answer?: SetupAnswer;
  /** Existing projects a single-product build could join. */
  projects: SetupProject[];
  onAnswer: (answer: SetupAnswer) => void;
}) {
  // Everything offered starts ticked: the classifier only offers a companion
  // where the product genuinely needs one, so the default that matches the
  // finding is "yes", and unticking is the deliberate act.
  const [picked, setPicked] = React.useState<Set<string>>(
    () => new Set(companions.map((c) => c.id)),
  );
  const [projectId, setProjectId] = React.useState("");
  const [projectName, setProjectName] = React.useState("");

  // The classifier answers after the card is already on screen, so the
  // default selection is seeded when its list arrives.
  const offered = companions.map((c) => c.id).join(",");
  React.useEffect(() => {
    setPicked(new Set(offered ? offered.split(",") : []));
  }, [offered]);

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
  const ready = multi
    ? projectName.trim().length > 0
    : projectId !== "" || projectName.trim().length > 0;

  return (
    <Card>
      <Label>Before we draw anything</Label>
      <h3 className="text-lg font-semibold text-text-primary">
        Two things to settle first
      </h3>
      <p className="max-w-[62ch] text-sm leading-relaxed text-text-secondary">
        Your first concept costs a credit, and these answers shape it. Nothing
        is charged until you continue.
      </p>

      {companions.length > 0 && (
        <Section
          title="What this build includes"
          hint="Your idea needs more than one product to work. Untick anything you don't want built."
        >
          <Row
            checked
            disabled
            title={titleFromPrompt(prompt)}
            why="The product you described. Always included."
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
        </Section>
      )}

      <Section
        title={multi ? "Name the project" : "Where does this go?"}
        hint={
          multi
            ? `${extra.length + 1} products belong together, so they go in one new project. Name it.`
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
            {projects.map((p) => (
              <Row
                key={p.id}
                radio
                checked={projectId === p.id}
                title={p.name}
                why="Add this product to that project."
                onToggle={() => {
                  setProjectId(p.id);
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
                onChange={(v) => setProjectName(v)}
                placeholder="e.g. Bench tools"
              />
            )}
          </>
        )}
      </Section>

      <div className="flex items-center justify-end gap-[12px] pt-[4px]">
        <span className="text-sm text-text-tertiary">
          {multi
            ? `${extra.length + 1} concepts · ${extra.length + 1} credits`
            : "1 concept · 1 credit"}
        </span>
        <button
          type="button"
          disabled={!ready}
          onClick={() =>
            onAnswer({
              projectId: multi ? "" : projectId,
              projectName: projectName.trim(),
              picked: extra.map((c) => c.id),
            })
          }
          className={
            ready
              ? "inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
              : "inline-flex h-[40px] cursor-not-allowed items-center gap-[8px] rounded-lg bg-bg-subtle px-[16px] text-md font-semibold text-text-disabled outline-none"
          }
          title={
            ready
              ? undefined
              : multi
                ? "Name the project first"
                : "Pick a project first"
          }
        >
          Start drawing
          <Icon icon={ArrowRight01Icon} size={16} />
        </button>
      </div>
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
        "flex w-full max-w-[640px] flex-col gap-[14px] rounded-2xl border border-solid p-[20px]",
        muted ? "border-border bg-bg-subtle" : "border-border bg-bg-surface",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">
      {children}
    </span>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-[8px]">
      <h4 className="text-md font-semibold text-text-primary">{title}</h4>
      <p className="max-w-[62ch] text-sm leading-relaxed text-text-tertiary">
        {hint}
      </p>
      <div className="flex flex-col gap-[6px] pt-[2px]">{children}</div>
    </section>
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
        "flex w-full items-start gap-[10px] rounded-xl border border-solid p-[12px] text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
        checked
          ? "border-border-brand bg-bg-brand-subtle"
          : "border-border bg-bg-surface hover:border-border-strong",
        disabled ? "cursor-default opacity-80" : "",
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

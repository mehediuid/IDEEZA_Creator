"use client";

// Earn's hub on the phone (Figma 12, 12b; the web's Earn overview, design A,
// its words), laid out as a native hub (lens 3, 8, 1, 2, 6):
// · the large title once: the project's name with the status pill beside it,
//   the lock line under it once sold in full;
// · the summary first. Once something is live (listed, paused, given, sold,
//   or copies on sale) the live card (12b): its label (You're selling /
//   Given away / Sold) and the Testnet demo badge, the state as its title with
//   ⓘ (why, and where a sale's share goes), what it Earned large, then Price ·
//   Copies sold · Bought by. Before that, the checklist is the summary: "Get
//   {project} earning", its line, the bar with "n of m done", ① Mint your
//   project ② Put it on sale. The current step's why sits behind ⓘ; only the
//   first missing task opens, with its reason and one-tap fix; a later step's
//   tasks show dimmed;
// · the rows Sell · Business plan · Money, each with its live line, each
//   opening its section in place;
// · once live, the checklist folds into one row (both steps Done) that opens
//   where it is, as the web keeps it under the live card;
// · the state's one action at the foot: Start mint / Choose what to sell,
//   held ("Unlocks when the steps above are done.") until nothing above it is
//   missing — a press then brings the next fix into view — and once live the
//   web's Manage in Sell / Relist in Sell / See it in Sell / See sales and
//   payouts. Sell copies of a product and Preview are in the top bar's ⋯.
// The progress fill is the success tone (the web's).

import * as React from "react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle01Icon,
  CircleIcon,
  LockIcon,
  Note01Icon,
  Store01Icon,
  Tick02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useIsPlanLive } from "@/components/projects/business-plan/plan-runner";
import { earnSourceOf, useEarnFacts } from "@/components/projects/earn/ladder/use-earn-facts";
import type { License } from "@/lib/brief/types";
import { levelStepsOf, type EarnFacts, type LadderStep } from "@/lib/commerce/ladder";
import { useBusinessPlan } from "@/lib/manual/business-plan-store";
import { earnLiveFactsOf, earnNextOf, earnPathOf, earnStatusOf, type EarnPathStep } from "@/lib/manual/earn-view";
import { labelOf } from "@/lib/manual/journey";
import { ownershipRow } from "@/lib/manual/ownership";
import { phoneEarnHref } from "@/lib/manual/phone-earn";
import { currentVersionOf, phonePlanState, runLineOf, sectionsWord, writtenCountOf } from "@/lib/manual/phone-plan-money";
import { phoneHrefOf } from "@/lib/manual/phone-project";
import { headerText } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../kit/list";
import { useEarn } from "./context";
import { EARN_CARD, EARN_NOTE, EarnBar, EarnLink, FactGrid, InfoButton, StepFix } from "./parts";
import { T } from "../type";

type Task = LadderStep & { ok: boolean };

/** Mint asks the ladder's first two levels; Sell its third, minus "Minted" (step one itself). */
function tasksOf(step: EarnPathStep["id"], facts: EarnFacts): Task[] {
  if (step === "mint") return [...levelStepsOf(1, facts), ...levelStepsOf(2, facts)];
  return levelStepsOf(3, facts).filter((s) => s.id !== "minted");
}

/** The checklist says each task as something to do (the ladder's labels are states). */
const TASK_WORD: Partial<Record<LadderStep["id"], string>> = {
  built: "Build a product",
  wallet: "Connect the demo wallet",
  ownership: "Confirm you own this design",
  videos: "Make a video for each product",
  license: "Choose a license",
};

const ACTION_LINE: Record<EarnPathStep["id"], string> = {
  mint: "Opens the mint: keep it private, give it away, or sell it.",
  sell: "Opens Sell: the Main NFT, or Physical and Virtual copies.",
};
const HELD_LINE = "Unlocks when the steps above are done.";
/** The first missing task's fix: what a press on the held action brings into view. */
const NEXT_FIX_ID = "earn-next-fix";

export function EarnHub({ titleRef }: { titleRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { project, view, viewer, brief, commercial, announce } = useEarn();
  const source = React.useMemo(() => earnSourceOf(project, view, brief), [project, view, brief]);
  const { facts, ready } = useEarnFacts(source);
  const copiesOnSale = view.lock === null && view.editions.some((t) => t.listing !== null);
  const next = earnNextOf(project.id, commercial, copiesOnSale);
  const steps = earnPathOf(commercial, copiesOnSale);
  const status = earnStatusOf(commercial);
  const lockLine = headerText(view.summary, { viewer, now: { label: labelOf(view.current) } }).lockLine;
  const live = next.point === null;
  const liveFacts = earnLiveFactsOf({
    projectId: project.id,
    commercial,
    listing: view.listing,
    sales: view.sales,
    editions: view.editions,
    buyers: view.customers.buyerCount,
  });
  const fact = (label: string) => liveFacts.find((f) => f.label === label)?.value ?? "";

  const all = steps.map((s) => ({ step: s, tasks: ready ? tasksOf(s.id, facts) : [] }));
  const total = all.reduce((n, g) => n + g.tasks.length + 1, 0);
  const done = all.reduce((n, g) => n + (g.step.state === "done" ? g.tasks.length + 1 : g.tasks.filter((t) => t.ok).length), 0);
  const current = all.find((g) => g.step.state === "current");
  const canAct = !!current && ready && !current.tasks.some((t) => !t.ok);
  const heldId = React.useId();

  const stepList = (
    <ol className="flex flex-col">
      {all.map(({ step, tasks }) => (
        <StepGroup
          key={step.id}
          step={step}
          tasks={tasks}
          ready={ready}
          why={step.state === "current" ? next.why : null}
          action={step.state === "current" ? next.action : null}
          heldId={heldId}
          projectId={project.id}
          license={brief?.state.license ?? null}
          announce={announce}
        />
      ))}
    </ol>
  );

  const actionHref = phoneHrefOf(next.action.href) ?? next.action.href;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 ref={titleRef} className={cn(T.title, "min-w-0 break-words")}>
            <span className="sr-only">Earn · </span>
            {project.name}
          </h1>
          <Badge tone={status.tone} className="shrink-0">
            {status.word}
          </Badge>
        </div>
        {lockLine && (
          <p className={cn(T.meta, "flex items-start gap-2 text-text-primary")}>
            <span aria-hidden className="mt-1 text-[color:var(--color-icon-secondary)]">
              <Icon icon={LockIcon} size={14} />
            </span>
            {lockLine}
          </p>
        )}
      </header>

      {live ? (
        <LiveCard
          label={commercial === "given" ? "Given away" : commercial === "soldOut" ? "Sold" : "You're selling"}
          title={next.title}
          why={commercial === "given" ? next.why : `${next.why} Your share of each sale, less the 2.5% IDEEZA fee, joins your balance in Get paid.`}
          earned={fact("Earned")}
          facts={[
            { label: "Price", value: fact("Price") },
            { label: "Copies sold", value: fact("Copies sold") },
            { label: "Bought by", value: fact("Bought by") },
          ]}
        />
      ) : (
        <Checklist name={project.name} ready={ready} done={done} total={total}>
          {stepList}
        </Checklist>
      )}

      <HubRows sellLine={`Main NFT · ${fact("Price")}${copiesOnSale ? " · Copies on sale" : ""}`} />

      {live && (
        <FoldedChecklist name={project.name} ready={ready} done={done} total={total}>
          {stepList}
        </FoldedChecklist>
      )}

      <EarnBar>
        {live || canAct ? (
          <EarnLink href={actionHref} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
            {next.action.label}
          </EarnLink>
        ) : (
          <Button
            size="xl"
            className="w-full cursor-not-allowed opacity-60"
            aria-disabled
            aria-describedby={heldId}
            onClick={() => {
              const fix = document.getElementById(NEXT_FIX_ID);
              fix?.scrollIntoView({ block: "center", behavior: "smooth" });
              fix?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
            }}
          >
            {next.action.label}
          </Button>
        )}
      </EarnBar>
    </div>
  );
}

/** Before anything is live, the checklist is the summary. */
function Checklist({ name, ready, done, total, children }: { name: string; ready: boolean; done: number; total: number; children: React.ReactNode }) {
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId} className={EARN_CARD}>
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className={T.section}>{`Get ${name} earning`}</h2>
        <p className={T.meta}>Two steps: mint it, then put it on sale.</p>
      </div>
      <Progress ready={ready} done={done} total={total} />
      {children}
    </section>
  );
}

function Progress({ ready, done, total }: { ready: boolean; done: number; total: number }) {
  return (
    <div className="flex items-center gap-6">
      <div
        role="progressbar"
        aria-label="Progress to earning"
        aria-valuemin={0}
        aria-valuemax={total || 1}
        aria-valuenow={done}
        className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-sm bg-bg-subtle"
      >
        <span
          className="block h-full rounded-sm bg-bg-success transition-[width] duration-normal ease-out motion-reduce:transition-none"
          style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
        />
      </div>
      {ready && <span className={cn(T.meta, "shrink-0 tabular-nums")}>{`${done} of ${total} done`}</span>}
    </div>
  );
}

/** Once live: the checklist as one row, both steps Done, that opens in place. */
function FoldedChecklist({ name, ready, done, total, children }: { name: string; ready: boolean; done: number; total: number; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();
  return (
    <section aria-label={`Get ${name} earning`} className={LIST_CARD}>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)} className={LIST_ROW}>
        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-success)]">
          <Icon icon={CheckmarkCircle01Icon} size={24} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.body, "text-text-primary")}>{`Get ${name} earning`}</span>
          <span className={T.meta}>{ready ? `Done · ${done} of ${total} done` : "Done"}</span>
        </span>
        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
          <Icon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={24} />
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={cn("flex flex-col gap-6 border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border px-8 py-6", !open && "hidden")}
      >
        <p className={T.meta}>Two steps: mint it, then put it on sale.</p>
        <Progress ready={ready} done={done} total={total} />
        {children}
      </div>
    </section>
  );
}

/** 12b: what is live (selling, given away or sold): the state, what it earned, its facts. */
function LiveCard({ label, title, why, earned, facts }: { label: string; title: string; why: string; earned: string; facts: { label: string; value: string }[] }) {
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId} className={EARN_CARD}>
      <div className="flex items-center justify-between gap-4">
        <p className={T.overline}>{label}</p>
        <TestnetDemoBadge />
      </div>
      <div className="-mt-2 flex items-center gap-2">
        <h2 id={headingId} className={cn(T.section, "min-w-0 flex-1 break-words")}>
          {title}
        </h2>
        <InfoButton title={title}>
          <p className={cn(T.body, "text-text-primary")}>{why}</p>
        </InfoButton>
      </div>
      <div className="flex flex-col gap-1">
        <p className={T.micro}>Earned</p>
        <p className={cn(T.display, "break-words tabular-nums")}>{earned}</p>
      </div>
      <FactGrid facts={facts} />
    </section>
  );
}

// ─────────────────────────── the rows ───────────────────────────

function HubRow({ icon, title, line, href }: { icon: IconValue; title: string; line: string | null; href: string }) {
  return (
    <li>
      <EarnLink href={href} className={LIST_ROW}>
        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
          <Icon icon={icon} size={24} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.body, "text-text-primary")}>{title}</span>
          {line && <span className={cn(T.meta, "break-words")}>{line}</span>}
        </span>
        <Chevron />
      </EarnLink>
    </li>
  );
}

/** Sell · Business plan · Money, each with its live line. */
function HubRows({ sellLine }: { sellLine: string }) {
  const { project, view, viewer } = useEarn();
  const { hydrated, record: plan } = useBusinessPlan(project.id);
  const planLive = useIsPlanLive(project.id);
  const own = ownershipRow(view.ownership, viewer);
  const sales = view.customers.rows.length;
  const moneyLine = [own?.value, sales === 0 ? "No sales yet" : `${sales} ${sales === 1 ? "sale" : "sales"}`].filter(Boolean).join(" · ");
  return (
    <ul aria-label="Earn" className={cn(LIST_CARD, LIST_DIVIDERS)}>
      <HubRow icon={Store01Icon} title="Sell" line={sellLine} href={phoneEarnHref(project.id, "sell")} />
      <HubRow icon={Note01Icon} title="Business plan" line={hydrated ? planLineOf(plan, planLive) : null} href={phoneEarnHref(project.id, "plan")} />
      <HubRow icon={Wallet01Icon} title="Money" line={moneyLine} href={phoneEarnHref(project.id, "money")} />
    </ul>
  );
}

function planLineOf(plan: ReturnType<typeof useBusinessPlan>["record"], live: boolean): string {
  const state = phonePlanState(plan, live);
  const current = currentVersionOf(plan);
  if (state === "none") return "No plan yet";
  if (state === "failed") return "We couldn't write the plan";
  if ((state === "writing" || state === "interrupted") && plan?.run) return runLineOf(plan.run, live, plan.versions.find((v) => v.n === plan.run?.version));
  return current ? `Version ${current.n} · ${sectionsWord(writtenCountOf(current))}` : "No plan yet";
}

// ─────────────────────────── the checklist ───────────────────────────

function StepGroup({
  step,
  tasks,
  ready,
  why,
  action,
  heldId,
  projectId,
  license,
  announce,
}: {
  step: EarnPathStep;
  tasks: Task[];
  ready: boolean;
  why: string | null;
  action: { label: string; href: string } | null;
  heldId: string;
  projectId: string;
  license: License | null;
  announce: (m: string) => void;
}) {
  const current = step.state === "current";
  const firstMissing = current ? tasks.find((t) => !t.ok) : undefined;
  const canAct = current && ready && !firstMissing;
  const note = step.state === "done" ? "Done" : current ? "Now" : "Later";

  return (
    <li
      aria-current={current ? "step" : undefined}
      className="flex flex-col gap-4 border-t-[length:var(--border-width-1)] border-solid border-border py-6 first:border-t-0 first:pt-0 last:pb-0"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className={cn(
            T.meta,
            "inline-flex size-[24px] shrink-0 items-center justify-center rounded-full tabular-nums",
            step.state === "done" ? "bg-bg-success-subtle text-text-success" : current ? "bg-bg-inverse text-text-inverse" : "bg-bg-subtle text-text-secondary",
          )}
        >
          {step.state === "done" ? <Icon icon={Tick02Icon} size={14} /> : step.n}
        </span>
        <h3 className={cn(T.section, "min-w-0 flex-1")}>
          <span className="sr-only">{`Step ${step.n}: `}</span>
          {step.title}
        </h3>
        {current && why && (
          <InfoButton title={step.title} label={`Why ${step.title.toLowerCase()}`}>
            <p className={cn(T.body, "text-text-primary")}>{why}</p>
          </InfoButton>
        )}
        <span className={cn(T.meta, current ? "text-text-brand" : step.state === "done" ? "text-text-success" : "text-text-secondary")}>{note}</span>
      </div>

      {step.state !== "done" && ready && (
        <ul className={cn("flex flex-col", !current && "opacity-60")}>
          {tasks.map((t) => {
            const open = t === firstMissing;
            return (
              <li key={t.id} className="flex items-start gap-4 py-2">
                <TaskMark ok={t.ok} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className={cn(T.body, "text-text-primary")}>
                    {TASK_WORD[t.id] ?? t.label}
                    <span className="sr-only">{t.ok ? ", done" : ", not done yet"}</span>
                  </span>
                  {open && (
                    <div id={NEXT_FIX_ID} className="flex scroll-mt-8 flex-col gap-4">
                      <span className={EARN_NOTE}>{t.reason}</span>
                      <StepFix step={t} projectId={projectId} license={license} announce={announce} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {current && action && (
            <li className="flex items-start gap-4 py-2">
              <TaskMark ok={false} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.body, "text-text-primary")}>{action.label}</span>
                <span id={canAct ? undefined : heldId} className={EARN_NOTE}>
                  {canAct ? ACTION_LINE[step.id] : HELD_LINE}
                </span>
              </div>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

function TaskMark({ ok }: { ok: boolean }) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0", ok ? "text-text-success" : "text-[color:var(--color-icon-secondary)]")}>
      <Icon icon={ok ? CheckmarkCircle01Icon : CircleIcon} size={20} />
    </span>
  );
}

"use client";

// Earn › Overview, design A (owner, 2026-10-11: "A ta koro" — the setup
// checklist from the mockups; no "Get paid" step, a sale pays the wallet at once).
// - Once something is live (listed, paused, given, sold, or copies on sale
//   without the Main NFT) a "You're selling" card leads: the state in words, the
//   facts (`earnLiveFactsOf`: price, copies sold of the whole project and of
//   each product, customers, earned) and where each is managed.
// - Then one checklist card, "Get {project} earning": a progress bar ("N of M
//   done") over two steps, ① Mint your project and ② Put it on sale. A done step
//   folds to one line; the current one lists its tasks — the ladder's steps for
//   that commit point, the same ones the project page's Earn button counts — and
//   only its first missing task opens, with its one-tap fix (StepFix); the
//   step's own action ends the list and is the page's one violet control, shown
//   only once nothing above it is missing (never a greyed button); step two's
//   is "Choose what to sell", the Sell tab. A later
//   step's tasks show dimmed, so the whole road is visible.
// - Before the wallet and identity stores hydrate, the tasks wait, so nothing
//   flashes as missing.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, buttonVariants } from "@/components/ideeza";
import { levelStepsOf, type EarnFacts, type LadderStep } from "@/lib/commerce/ladder";
import { earnHref } from "@/lib/manual/earn-route";
import { earnLiveFactsOf, earnNextOf, earnPathOf, type EarnPathStep } from "@/lib/manual/earn-view";
import { cn } from "@/lib/utils";
import type { SlotProps } from "../details/slots";
import { StepFix } from "./ladder/missing-steps";
import { earnSourceOf, useEarnFacts } from "./ladder/use-earn-facts";
import { EARN_CARD, EARN_H2, EARN_LEAD, EARN_LINK, EARN_STACK, TAP } from "./surface";

type Task = LadderStep & { ok: boolean };

/** Each step's tasks: Mint asks the ladder's first two levels, Sell its third (minus "Minted",
 *  which is step one itself). */
function tasksOf(step: EarnPathStep["id"], facts: EarnFacts): Task[] {
  if (step === "mint") return [...levelStepsOf(1, facts), ...levelStepsOf(2, facts)];
  return levelStepsOf(3, facts).filter((s) => s.id !== "minted");
}

/** The checklist says each task as something to do (the ladder's labels are states, for the
 *  notices at commit points). */
const TASK_WORD: Partial<Record<LadderStep["id"], string>> = {
  built: "Build a product",
  wallet: "Connect the demo wallet",
  ownership: "Confirm you own this design",
  videos: "Make a video for each product",
  license: "Choose a license",
  payout: "Set a payout wallet",
};

const ACTION_LINE: Record<EarnPathStep["id"], string> = {
  mint: "Opens the mint: keep it private, give it away, or sell it.",
  sell: "Opens Sell: the Main NFT, or Physical and Virtual copies.",
};

export function EarnOverview({ project, view, brief, announce }: SlotProps) {
  const source = React.useMemo(() => earnSourceOf(project, view, brief), [project, view, brief]);
  const { facts, ready } = useEarnFacts(source);
  const copiesOnSale = view.lock === null && view.editions.some((t) => t.listing !== null);
  const next = earnNextOf(project.id, source.commercial, copiesOnSale);
  const steps = earnPathOf(source.commercial, copiesOnSale);
  const live =
    next.point === null
      ? earnLiveFactsOf({
          projectId: project.id,
          commercial: source.commercial,
          listing: view.listing,
          sales: view.sales,
          editions: view.editions,
          buyers: view.customers.buyerCount,
        })
      : null;

  // Progress: every task, plus each step's own action.
  const all = steps.map((s) => ({ step: s, tasks: ready ? tasksOf(s.id, facts) : [] }));
  const total = all.reduce((n, g) => n + g.tasks.length + 1, 0);
  const done = all.reduce((n, g) => n + (g.step.state === "done" ? g.tasks.length + 1 : g.tasks.filter((t) => t.ok).length), 0);
  const headingId = React.useId();

  return (
    <div className={EARN_STACK}>
      {live && (
        <LiveCard
          title={next.title}
          why={next.why}
          facts={live}
          manage={next.action}
          copiesHref={`${earnHref(project.id, "sell")}#copies`}
          given={source.commercial === "given"}
        />
      )}

      <section aria-labelledby={headingId} className={EARN_CARD}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={headingId} className={EARN_H2}>{`Get ${project.name} earning`}</h2>
              <p className={EARN_LEAD}>Two steps: mint it, then put it on sale.</p>
            </div>
            {ready && <span className="text-sm font-semibold tabular-nums text-text-secondary">{`${done} of ${total} done`}</span>}
          </div>
          <div
            role="progressbar"
            aria-label="Progress to earning"
            aria-valuemin={0}
            aria-valuemax={total || 1}
            aria-valuenow={done}
            className="h-[6px] w-full overflow-hidden rounded-full bg-bg-subtle"
          >
            <span
              className="block h-full rounded-full bg-bg-success transition-[width] duration-normal ease-out motion-reduce:transition-none"
              style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
            />
          </div>
        </div>

        <ol className="m-0 flex list-none flex-col p-0">
          {all.map(({ step, tasks }) => (
            <StepGroup
              key={step.id}
              step={step}
              tasks={tasks}
              ready={ready}
              why={step.state === "current" ? next.why : null}
              action={step.state === "current" ? next.action : null}
              project={project}
              brief={brief}
              announce={announce}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}

function StepGroup({
  step,
  tasks,
  ready,
  why,
  action,
  project,
  brief,
  announce,
}: {
  step: EarnPathStep;
  tasks: Task[];
  ready: boolean;
  why: string | null;
  action: { label: string; href: string } | null;
  project: SlotProps["project"];
  brief: SlotProps["brief"];
  announce?: (message: string) => void;
}) {
  const current = step.state === "current";
  const firstMissing = current ? tasks.find((t) => !t.ok) : undefined;
  const canAct = current && ready && !firstMissing;
  const note = step.state === "done" ? "Done" : current ? "Now" : "Later";

  return (
    <li aria-current={current ? "step" : undefined} className="flex flex-col gap-3 border-t border-solid border-border py-6 last:pb-0">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className={cn(
            "inline-flex size-[24px] shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
            step.state === "done" ? "bg-bg-success-subtle text-text-success" : current ? "bg-bg-inverse text-text-inverse" : "bg-bg-subtle text-text-secondary",
          )}
        >
          {step.state === "done" ? <Icon icon={Tick02Icon} size={14} /> : step.n}
        </span>
        <h3 className="m-0 min-w-0 flex-1 text-md font-semibold leading-md text-text-primary">
          <span className="sr-only">{`Step ${step.n}: `}</span>
          {step.title}
        </h3>
        <span className={cn("text-sm font-semibold", current ? "text-text-brand" : step.state === "done" ? "text-text-success" : "text-text-secondary")}>
          {note}
        </span>
      </div>

      {current && why && <p className={cn(EARN_LEAD, "pl-[40px] text-sm leading-sm")}>{why}</p>}

      {step.state !== "done" && ready && (
        <ul className={cn("m-0 flex list-none flex-col gap-1 p-0", !current && "opacity-60")}>
          {tasks.map((t) => {
            const open = t === firstMissing;
            return (
              <li key={t.id} className={cn("flex items-start gap-4 rounded-xl px-4 py-3", open && "bg-bg-subtle")}>
                <TaskMark ok={t.ok} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="text-md font-medium leading-md text-text-primary">
                    {TASK_WORD[t.id] ?? t.label}
                    <span className="sr-only">{t.ok ? ", done" : ", not done yet"}</span>
                  </span>
                  {open && (
                    <>
                      <span className="text-sm leading-sm text-text-secondary">{t.reason}</span>
                      <span className="self-start">
                        <StepFix step={t} project={project} brief={brief} announce={announce} />
                      </span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {current && action && (
            <li className={cn("flex items-start gap-4 rounded-xl px-4 py-3", canAct && "bg-bg-subtle")}>
              <TaskMark ok={false} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="text-md font-medium leading-md text-text-primary">{action.label}</span>
                {canAct ? (
                  <>
                    <span className="text-sm leading-sm text-text-secondary">{ACTION_LINE[step.id]}</span>
                    <Link
                      href={action.href}
                      // The reset colours every a:hover as a link; the button keeps its own text colour.
                      className={cn(
                        buttonVariants({ hierarchy: "primary", size: "md" }),
                        "self-start hover:text-[color:var(--color-button-primary-text)] max-sm:w-full",
                        TAP,
                      )}
                    >
                      {action.label}
                    </Link>
                  </>
                ) : (
                  <span className="text-sm leading-sm text-text-secondary">Unlocks when the steps above are done.</span>
                )}
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
    <span
      aria-hidden
      className={cn(
        "mt-px inline-flex size-[20px] shrink-0 items-center justify-center rounded-full",
        ok ? "bg-bg-success text-text-inverse" : "border-2 border-solid border-border-strong",
      )}
    >
      {ok && <Icon icon={Tick02Icon} size={12} />}
    </span>
  );
}

/** "You're selling": what is live, its facts, and where each is managed. No violet: the
 *  checklist's action (or the tab it links to) owns that. */
function LiveCard({
  title,
  why,
  facts,
  manage,
  copiesHref,
  given,
}: {
  title: string;
  why: string;
  facts: { label: string; value: string }[];
  manage: { label: string; href: string };
  copiesHref: string;
  given: boolean;
}) {
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId} className={EARN_CARD}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id={headingId} className={EARN_H2}>
            {title}
          </h2>
          <Badge tone="warning">Testnet demo</Badge>
        </div>
        <p className={EARN_LEAD}>
          {given ? why : `${why} Money from each sale goes straight to your wallet, minus the 2.5% IDEEZA fee.`}
        </p>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-x-8 gap-y-6 [@container(min-width:640px)]:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="flex min-w-0 flex-col gap-1 rounded-xl bg-bg-subtle px-5 py-4">
            <dt className="text-sm font-medium leading-sm text-text-secondary">{f.label}</dt>
            <dd className="m-0 break-words text-lg font-semibold leading-lg tabular-nums text-text-primary">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Link href={manage.href} className={EARN_LINK}>
          {manage.label}
          <Icon icon={ArrowRight01Icon} size={16} />
        </Link>
        {!given && (
          <Link href={copiesHref} className={EARN_LINK}>
            Sell copies of a product
            <Icon icon={ArrowRight01Icon} size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

"use client";

// The Build log (Activity 4008–4733): the chat's journey as four stages —
// Idea, Concepts, Build, Save — each with where it stands (Live, Drawing,
// Building, Ready, Upcoming), its time once done, the Figma's chips (credits
// so far, products, pieces) and what happened in it, read off the web's own
// build log (project-state.ts `buildLogOf`) and build; a done stage folds
// open to show its steps. At the foot, what the chat has really cost so far
// (the credits ledger: charges less refunds). Times follow Settings ›
// Language & region. Named "Build log", not "Activity": the project page's
// Activity is the maker's own journey (owner, 2026-10-13).

import * as React from "react";
import {
  AiMagicIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  CpuIcon,
  Folder01Icon,
  FloppyDiskIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Tag } from "@/components/ideeza/tag";
import { useCredits } from "@/lib/create/credits";
import { ITEM_LABELS, jobCost, productsOf, statusOf, useCreateHistory } from "@/lib/create/history";
import type { BuildLogEntry } from "@/lib/create/project-state";
import { joinWords, spentLine, spentOf } from "@/lib/mobile-ai/flow";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Sheet } from "../kit/sheet";
import type { ConceptFlow } from "./use-concept-flow";

type StageState = "done" | "live" | "upcoming";

export function BuildLogSheet({ open, onClose, flow }: { open: boolean; onClose: () => void; flow: ConceptFlow }) {
  const { ledger } = useCredits();
  const { buildsForChat } = useCreateHistory();
  const dates = useDates();
  const time = (ts: number) => dates.time(ts);
  const chat = flow.chat;
  const job = flow.activeBuild;
  const stage = flow.stage;
  const log = flow.rail.buildLog;
  const spent = React.useMemo(() => {
    const turns = chat?.turns.filter((t) => t.role === "assistant") ?? [];
    const ids = new Set(turns.map((t) => t.id));
    const refines = new Set(turns.filter((t) => t.role === "assistant" && t.kind === "refine").map((t) => t.id));
    const buildIds = new Set(chat ? buildsForChat(chat.id).map((b) => b.id) : []);
    return spentOf(ledger, ids, refines, buildIds);
  }, [chat, ledger, buildsForChat]);
  if (!chat) return null;

  const setup = chat.turns.find((t) => t.role === "setup");
  const ideaState: StageState = stage === "idea" ? "live" : "done";
  const conceptState: StageState = stage === "idea" ? "upcoming" : stage === "concepts" ? "live" : "done";
  const buildState: StageState = stage === "build" ? "live" : stage === "save" || stage === "saved" ? "done" : "upcoming";
  const saveState: StageState = stage === "saved" ? "done" : stage === "save" ? "live" : "upcoming";
  const conceptEntries = log.filter((e) => chat.turns.some((t) => t.role === "assistant" && t.id === e.id));
  const ideaEntries = log.filter((e) => !conceptEntries.includes(e));
  const drawing = flow.rail.rows.some((r) => r.phase === "drawing");
  const n = flow.rail.rows.length;
  const readyRows = flow.rail.rows.filter((r) => r.phase !== "drawing" && r.phase !== "failed").length;
  const products = job ? productsOf(job) : [];
  const projectName = flow.projectName || chat.title;
  const pieces = products.flatMap((p) => p.items.filter((i) => i.status !== "skipped").map((i) => ({ product: p, item: i })));
  const piecesReady = pieces.filter((x) => x.item.status === "ready");
  // The newest finished piece: the Build stage's "Latest" line.
  const latest = piecesReady.filter((x) => x.item.endedAt).sort((a, b) => (b.item.endedAt ?? 0) - (a.item.endedAt ?? 0))[0];
  // When each stage was done: the newest concept that landed, the build's end, the save.
  const lastConcept = conceptEntries.length ? Math.max(...conceptEntries.map((e) => e.ts)) : undefined;
  const conceptsSpent = spent.total - spent.buildCredits;

  const subtitle =
    stage === "idea"
      ? "Reading your idea and mapping the journey ahead."
      : stage === "concepts"
        ? drawing
          ? `${n === 1 ? "One product is" : `${n} products are`} set. Drawing ${n === 1 ? "its concept" : "one concept for each"}.`
          : `${n === 1 ? "The concept is" : "Every concept is"} ready to build.`
        : stage === "build"
          ? `Building the pieces for ${n === 1 ? "the product" : n === 2 ? "both products" : `all ${n} products`}.`
          : stage === "save"
            ? "Every piece is ready. Save it to keep it together."
            : `Saved to ${flow.savedName ?? projectName}.`;
  const since =
    stage === "idea"
      ? `Started ${setup ? time(setup.ts) : ""}`
      : stage === "concepts"
        ? drawing
          ? `Generating concept · ${time(chat.updatedAt)}`
          : `Concepts ready · ${time(lastConcept ?? chat.updatedAt)}`
        : job?.startedAt
          ? `Build started · ${time(job.startedAt)}`
          : `Build booked · ${time(job?.createdAt ?? chat.updatedAt)}`;

  return (
    <Sheet open={open} onClose={onClose} title="Build log" description={subtitle}>
      <p className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
        <Tag icon={<Icon icon={Folder01Icon} size={14} />}>{projectName}</Tag>• {since}
      </p>
      <ol className="flex flex-col">
        <Stage
          icon={BubbleChatIcon}
          title="Idea"
          state={ideaState}
          when={setup ? time(setup.ts) : undefined}
          liveTag="Live"
          summary={ideaState === "done" ? "Idea understood" : "Understanding intent, constraints, and product scope."}
          chips={ideaState === "live" ? ["Nothing charged yet", "Working securely"] : undefined}
          entries={ideaEntries}
          time={time}
        />
        <Stage
          icon={AiMagicIcon}
          title="Concepts"
          state={conceptState}
          when={lastConcept !== undefined ? time(lastConcept) : undefined}
          liveTag={drawing ? "Drawing" : "Ready"}
          upcoming="Draw concepts for the products you include"
          chips={conceptState === "live" ? [`${conceptsSpent} ${conceptsSpent === 1 ? "credit" : "credits"} so far`, `${readyRows} of ${n} ready`] : undefined}
          summary={
            conceptState === "done"
              ? `${n === 1 ? "The drawing is" : n === 2 ? "Both drawings are" : `All ${n} drawings are`} ready${spent.refines ? ` · ${spent.refines} ${spent.refines === 1 ? "refine" : "refines"}` : ""} · ${conceptsSpent} ${conceptsSpent === 1 ? "credit" : "credits"}`
              : undefined
          }
          entries={conceptEntries}
          time={time}
        />
        <Stage
          icon={CpuIcon}
          title="Build"
          state={buildState}
          when={job?.endedAt ? time(job.endedAt) : undefined}
          liveTag="Building"
          upcoming="Build the PCB, Code, 3D Module, Assembly and Wiring, plus the Parts list"
          chips={
            buildState === "live" && job
              ? [`${products.length} ${products.length === 1 ? "product" : "products"}`, `${pieces.length} pieces`, `${jobCost(job)} credits`]
              : undefined
          }
          summary={
            buildState === "done" && job
              ? `${piecesReady.length} of ${pieces.length} pieces ready · ${joinWords([...new Set(piecesReady.map((x) => ITEM_LABELS[x.item.kind]))])}`
              : undefined
          }
          time={time}
        >
          {buildState === "live" && job && (
            <div className="flex flex-col gap-5 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand bg-bg-brand-subtle p-6">
              {products.map((p) => {
                const live = p.items.filter((i) => i.status !== "skipped");
                const pct = live.length ? Math.round(live.reduce((s, i) => s + i.progress, 0) / live.length) : 0;
                return (
                  <div key={p.id} className="flex flex-col gap-3">
                    <p className={cn(T.rowTitle, "flex items-center justify-between")}>
                      {p.name}
                      <span className={cn(T.meta, "text-text-brand")}>{statusOf(job) === "queued" ? "Queued" : `${pct}%`}</span>
                    </p>
                    <ProgressBar value={pct} label={`${p.name} progress`} />
                    <ul className="flex flex-wrap gap-2">
                      {live.map((i) => (
                        <li
                          key={i.kind}
                          className={cn(
                            T.micro,
                            "rounded-full px-3",
                            i.status === "ready" ? "text-text-success" : i.status === "failed" ? "text-text-error" : i.status === "building" ? "bg-bg-surface text-text-brand" : "text-text-secondary",
                          )}
                        >
                          {i.status === "ready" ? "✓ " : ""}
                          {ITEM_LABELS[i.kind]}
                          {i.status === "building" ? ` ${Math.round(i.progress)}%` : i.status === "pending" ? " queued" : i.status === "failed" ? " failed" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {latest && (
                <p className={cn(T.meta, "flex justify-between gap-4")}>
                  <span className="min-w-0">
                    Latest · {ITEM_LABELS[latest.item.kind]} ready{products.length > 1 ? ` for ${latest.product.name}` : ""}
                  </span>
                  <span className="shrink-0 text-text-tertiary">{time(latest.item.endedAt!)}</span>
                </p>
              )}
            </div>
          )}
        </Stage>
        <Stage
          icon={FloppyDiskIcon}
          title="Save"
          state={saveState}
          when={saveState === "done" && job ? time(job.updatedAt) : undefined}
          liveTag="Ready"
          upcoming="Save the finished deliverables"
          summary={saveState === "done" ? `Saved to ${flow.savedName ?? projectName}` : undefined}
          time={time}
          last
        >
          {saveState === "live" && (
            <div className="flex flex-col gap-3 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-success)] bg-bg-success-subtle p-6">
              <p className={cn(T.rowTitle, "flex items-center gap-3")}>
                <Icon icon={CheckmarkCircle02Icon} size={16} />
                Save ready
              </p>
              <p className={T.meta}>
                {products.map((p) => p.name).join(" and ")} {products.length === 1 ? "is" : "are"} complete with every deliverable.
              </p>
              <ul className="flex flex-wrap gap-2">
                {[
                  `${products.length} ${products.length === 1 ? "product" : "products"}`,
                  `${products.length} ${products.length === 1 ? "concept" : "concepts"}`,
                  `${piecesReady.length} pieces`,
                ].map((c) => (
                  <li key={c}>
                    <Tag size="sm">{c}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Stage>
      </ol>
      <div className="flex items-start gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-blue)] bg-bg-info-subtle p-6">
        <span className="text-[color:var(--color-icon-blue)]">
          <Icon icon={InformationCircleIcon} size={20} />
        </span>
        <span className="flex flex-col">
          <span className={T.rowTitle}>
            {spent.total} {spent.total === 1 ? "credit" : "credits"} so far
          </span>
          <span className={T.meta}>{spentLine(spent)}</span>
        </span>
      </div>
    </Sheet>
  );
}

function Stage({
  icon,
  title,
  state,
  when,
  liveTag,
  upcoming,
  summary,
  chips,
  entries = [],
  time,
  last,
  children,
}: {
  icon: IconValue;
  title: string;
  state: StageState;
  when?: string;
  liveTag: string;
  upcoming?: string;
  summary?: string;
  chips?: string[];
  /** Live: shown; done: behind the fold (the Figma's chevron). */
  entries?: BuildLogEntry[];
  time: (ts: number) => string;
  last?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const foldable = state === "done" && entries.length > 0;
  const showEntries = entries.length > 0 && (state === "live" || (foldable && open));
  return (
    <li className="flex gap-5">
      <span className="flex flex-col items-center">
        <span
          className={cn(
            "inline-flex size-[32px] shrink-0 items-center justify-center rounded-full border-[length:var(--border-width-1-5)] border-solid",
            state === "done" && "border-[var(--color-border-success)] text-[color:var(--color-icon-success)]",
            state === "live" && "border-border-brand text-[color:var(--color-icon-brand)]",
            state === "upcoming" && "border-border text-[color:var(--color-icon-disabled)]",
          )}
        >
          <Icon icon={icon} size={16} />
        </span>
        {!last && <span className={cn("w-[2px] flex-1", state === "done" ? "bg-[var(--color-icon-success)]" : "bg-bg-subtle")} />}
      </span>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-3", !last && "pb-8")}>
        <div className="flex min-h-[32px] items-center justify-between gap-4">
          {foldable ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="-my-2 flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span className={T.bodyStrong}>{title}</span>
              {when && <span className={cn(T.meta, "text-text-tertiary")}>{when}</span>}
              <span className="ml-auto text-[color:var(--color-icon-default)]">
                <Icon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={16} />
              </span>
            </button>
          ) : (
            <p className="flex min-w-0 items-baseline gap-3">
              <span className={cn(T.bodyStrong, state === "upcoming" && "text-text-secondary")}>{title}</span>
              {when && state === "done" && <span className={cn(T.meta, "text-text-tertiary")}>{when}</span>}
            </p>
          )}
          {state === "live" && <Badge tone="brand">● {liveTag}</Badge>}
          {state === "upcoming" && <Badge tone="neutral">Upcoming</Badge>}
        </div>
        {state === "upcoming" && upcoming && <p className={T.meta}>{upcoming}</p>}
        {summary && <p className={T.meta}>{summary}</p>}
        {chips && chips.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c}>
                <Tag size="sm">{c}</Tag>
              </li>
            ))}
          </ul>
        )}
        {showEntries && (
          <ul className={cn("flex flex-col gap-3 rounded-xl border-[length:var(--border-width-1)] border-solid p-5", state === "live" ? "border-border-brand" : "border-border")}>
            {entries.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-4">
                <span className="flex min-w-0 flex-col">
                  <span className={T.rowTitle}>{e.title}</span>
                  {e.detail && <span className={T.meta}>{e.title === "You" ? `“${e.detail}”` : e.detail}</span>}
                </span>
                <span className={cn(T.meta, "shrink-0 text-text-tertiary")}>{time(e.ts)}</span>
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </li>
  );
}

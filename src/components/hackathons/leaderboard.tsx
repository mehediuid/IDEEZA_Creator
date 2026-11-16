"use client";

// The standings as a race. The hackathon is university vs university, so the
// universities' league sits beside the people's ranking (not behind a tab):
// a student sees in one look where their campus stands and who to beat.
//  - University league: points as bars against the leader, people and
//    products under each name.
//  - People: rank, movement since the last update, name and campus, products,
//    points; the top three carry their product's picture. Search finds a name,
//    "Open category" filters, "Show all" opens the rest.
// The public board shows no moderation flags ("Under review" stays with the
// organizer). All numbers come from the one board in the page context. The
// builders list pages ten at a time (no "Show all": 64 rows ran the page long).

import * as React from "react";
import { SearchInput } from "@/components/ideeza/search-input";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { HACKATHON, qualified, qualityOf, type Row } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";
import { Heading, Initials, SECTION, SURFACE } from "./parts";

const ROWS = 10;

export function Leaderboard() {
  const { board, unis } = useHackathon();
  const products = board.reduce((s, r) => s + r.p.products, 0);
  const votes = board.reduce((s, r) => s + r.votes, 0);

  return (
    <section id="leaderboard" aria-labelledby="leaderboard-title" className={SECTION}>
      <Heading
        id="leaderboard-title"
        title="Which university builds best?"
        lead={`Every point a student earns counts for their university. Updated every hour; the top ${HACKATHON.shortlist} people go to the judges.`}
        aside={
          <dl className="grid grid-cols-3 gap-8 md:gap-12">
            {[
              [board.length, "builders"],
              [products, "products"],
              [votes, "votes"],
            ].map(([v, l]) => (
              <div key={l as string} className="flex flex-col">
                <dd className="order-1 font-display text-4xl font-semibold leading-4xl tabular-nums text-[color:var(--color-text-primary)]">{(v as number).toLocaleString("en-US")}</dd>
                <dt className="order-2 text-lg leading-lg text-[color:var(--color-text-tertiary)]">{l}</dt>
              </div>
            ))}
          </dl>
        }
      />

      <div className="mt-24 grid grid-cols-1 gap-10 md:mt-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <UniversityLeague unis={unis} />
        <People board={board} />
      </div>
      <p className="mt-10 text-md leading-md text-[color:var(--color-text-tertiary)]">Standings on this page are sample data.</p>
    </section>
  );
}

// A phone shows the league's top six first (the full list would push the builders a screen away).
const PHONE_UNIS = 6;

function UniversityLeague({ unis }: { unis: ReturnType<typeof useHackathon>["unis"] }) {
  const max = unis[0]?.pts || 1;
  const [allUnis, setAllUnis] = React.useState(false);
  return (
    <div className={cn("self-start rounded-3xl px-10 py-12 md:px-12", SURFACE)}>
      <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">University league</h3>
      {/* Each row is one grid: the rank in its own column, and the name, the bar and the
          facts all starting on the same left edge; the bar runs to the points' right edge. */}
      <ol className="m-0 mt-10 flex list-none flex-col gap-10 p-0">
        {unis.map((u, i) => (
          <li key={u.name} className={cn("grid grid-cols-[28px_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-3", i >= PHONE_UNIS && !allUnis && "max-md:hidden")}>
            <span className={cn("text-lg font-semibold leading-lg tabular-nums", i === 0 ? "text-[color:var(--color-violet-300)]" : "text-[color:var(--color-text-tertiary)]")}>{i + 1}</span>
            <span className="truncate text-xl font-medium leading-xl text-[color:var(--color-text-primary)]">{u.name}</span>
            <span className="text-right text-xl font-semibold leading-xl tabular-nums text-[color:var(--color-text-primary)]">{u.pts.toLocaleString("en-US")}</span>
            <div aria-hidden className="col-start-2 col-end-4 h-[6px] self-start overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--color-white)_7%,transparent)]">
              <div
                style={{ width: `${Math.max(3, (u.pts / max) * 100)}%` }}
                className={cn("h-full rounded-full", i === 0 ? "bg-[linear-gradient(to_right,var(--color-violet-600),var(--color-violet-300))]" : "bg-[color:color-mix(in_srgb,var(--color-violet-400)_60%,transparent)]")}
              />
            </div>
            <span className="col-start-2 col-end-4 text-md leading-md text-[color:var(--color-text-tertiary)]">
              {u.people} {u.people === 1 ? "student" : "students"} · {u.products} products
            </span>
          </li>
        ))}
      </ol>
      {unis.length > PHONE_UNIS ? (
        <button type="button" onClick={() => setAllUnis((v) => !v)} className="mt-8 border-0 bg-transparent p-0 text-lg font-semibold leading-lg text-[color:var(--color-text-brand)] underline-offset-4 hover:underline md:hidden">
          {allUnis ? "Show fewer" : `Show all ${unis.length} universities`}
        </button>
      ) : null}
    </div>
  );
}

function People({ board }: { board: Row[] }) {
  const { now, openProject } = useHackathon();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  // Ten builders a page (owner: "Show all" ran the page 54 rows longer); the list keeps its height.
  const [page, setPage] = React.useState(0);

  const pool = open ? board.filter((r) => !r.p.university) : board;
  const query = q.trim().toLowerCase();
  const found = query ? pool.filter((r) => `${r.p.name} ${r.p.university}`.toLowerCase().includes(query)) : pool;
  const pages = Math.max(1, Math.ceil(found.length / ROWS));
  const at = Math.min(page, pages - 1);
  const shown = found.slice(at * ROWS, at * ROWS + ROWS);

  return (
    <div className={cn("flex flex-col rounded-3xl px-4 py-10 md:px-12 md:py-12", SURFACE)}>
      <div className="flex flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between md:px-0">
        <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">Top builders</h3>
        <div className="flex items-center gap-4">
          <div role="group" aria-label="Show" className="flex rounded-full bg-[color:color-mix(in_srgb,var(--color-white)_6%,transparent)] p-1">
            {[
              [false, "Everyone"],
              [true, "Open category"],
            ].map(([v, l]) => (
              <button
                key={l as string}
                type="button"
                aria-pressed={open === v}
                onClick={() => {
                  setOpen(v as boolean);
                  setPage(0);
                }}
                className={cn(
                  "h-[40px] whitespace-nowrap rounded-full border-0 px-5 text-md font-medium leading-md transition-colors duration-fast",
                  open === v ? "bg-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)] text-[color:var(--color-text-primary)]" : "bg-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 px-4 md:px-0">
        <SearchInput value={q} onValueChange={(v) => { setQ(v); setPage(0); }} onClear={() => { setQ(""); setPage(0); }} placeholder="Find your name or university" aria-label="Find your name or university" containerClassName="w-full" />
      </div>

      <ol className="m-0 mt-8 flex list-none flex-col gap-1 p-0" aria-label="Builders by points">
        {shown.map((r) => {
          const podium = r.rank <= 3 && !open && !query;
          return (
            <li key={r.p.id} className={cn("flex items-center gap-4 rounded-2xl px-4 py-5 md:gap-6 md:py-6", podium && "bg-[color:color-mix(in_srgb,var(--color-violet-600)_10%,transparent)]")}>
              <span className={cn("w-[28px] shrink-0 text-center font-display text-lg font-semibold tabular-nums", r.rank <= 3 ? "text-[color:var(--color-violet-300)]" : "text-[color:var(--color-text-secondary)]")}>{r.rank}</span>
              {r.p.project && r.rank <= 3 ? (
                <button type="button" onClick={() => openProject(r)} aria-label={`Open ${r.p.project.name}`} className="size-[44px] shrink-0 overflow-hidden rounded-xl border-0 p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.p.project.thumb} alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <Initials name={r.p.name} className="size-[44px] text-md" />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="truncate text-xl font-medium leading-xl text-[color:var(--color-text-primary)]">{r.p.name}</span>
                  {r.p.moved ? (
                    <span className={cn("shrink-0 text-md font-medium leading-md tabular-nums", r.p.moved > 0 ? "text-[color:var(--color-green-400)]" : "text-[color:var(--color-red-400)]")} aria-label={r.p.moved > 0 ? `up ${r.p.moved} places` : `down ${-r.p.moved} places`}>
                      {r.p.moved > 0 ? "▲" : "▼"}
                      {Math.abs(r.p.moved)}
                    </span>
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-md leading-md text-[color:var(--color-text-tertiary)]">
                  <span className="truncate">{r.p.university || "Open category"}</span>
                  <span aria-hidden>·</span>
                  <span>{r.p.products} products</span>
                  {/* Written out at the row's own size (the DS badge's 11 px was too small to read here). */}
                  {qualified(r.p) ? (
                    <span className="inline-flex items-center gap-1 font-medium text-[color:var(--color-green-400)]">
                      <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.4} aria-hidden />
                      Qualified
                    </span>
                  ) : null}
                  {now !== null && qualityOf(r.rank, now) === "Medium" ? <span className="font-medium text-[color:var(--color-violet-300)]">Medium quality</span> : null}
                </span>
              </div>
              <span className="shrink-0 text-right">
                <span className="block font-display text-2xl font-semibold leading-2xl tabular-nums text-[color:var(--color-text-primary)]">{r.pts.toLocaleString("en-US")}</span>
                <span className="block text-md leading-md text-[color:var(--color-text-tertiary)]">points</span>
              </span>
            </li>
          );
        })}
        {shown.length === 0 ? <li className="px-4 py-12 text-center text-lg leading-lg text-[color:var(--color-text-tertiary)]">No one matches “{q}”.</li> : null}
      </ol>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 px-4 md:px-0">
        <span className="text-md leading-md text-[color:var(--color-text-tertiary)]">
          Qualified = {HACKATHON.minProducts}+ products built.
        </span>
        {pages > 1 ? (
          <nav aria-label="Builder pages" className="flex items-center gap-3">
            <span className="text-md leading-md tabular-nums text-[color:var(--color-text-secondary)]" aria-live="polite">
              {at * ROWS + 1}–{Math.min(found.length, at * ROWS + ROWS)} of {found.length}
            </span>
            {[
              [ArrowLeft01Icon, "Previous ten", at - 1],
              [ArrowRight01Icon, "Next ten", at + 1],
            ].map(([icon, label, to]) => (
              <button
                key={label as string}
                type="button"
                aria-label={label as string}
                disabled={(to as number) < 0 || (to as number) >= pages}
                onClick={() => setPage(to as number)}
                className="flex size-[40px] items-center justify-center rounded-full border border-solid border-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)] bg-transparent text-[color:var(--color-text-primary)] transition-colors duration-fast hover:bg-[color:color-mix(in_srgb,var(--color-white)_8%,transparent)] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <HugeiconsIcon icon={icon as typeof ArrowLeft01Icon} size={18} strokeWidth={2} aria-hidden />
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

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
// organizer). All numbers come from the one board in the page context.

import * as React from "react";
import { SearchInput } from "@/components/ideeza/search-input";
import { Badge } from "@/components/ideeza/badge";
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
                <dt className="order-2 text-md leading-md text-[color:var(--color-text-tertiary)]">{l}</dt>
              </div>
            ))}
          </dl>
        }
      />

      <div className="mt-20 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <UniversityLeague unis={unis} />
        <People board={board} />
      </div>
      <p className="mt-8 text-sm leading-sm text-[color:var(--color-text-tertiary)]">Standings on this page are sample data.</p>
    </section>
  );
}

// A phone shows the league's top six first (the full list would push the builders a screen away).
const PHONE_UNIS = 6;

function UniversityLeague({ unis }: { unis: ReturnType<typeof useHackathon>["unis"] }) {
  const max = unis[0]?.pts || 1;
  const [allUnis, setAllUnis] = React.useState(false);
  return (
    <div className={cn("self-start rounded-3xl px-8 py-10 md:px-10", SURFACE)}>
      <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">University league</h3>
      <ol className="m-0 mt-8 flex list-none flex-col gap-6 p-0">
        {unis.map((u, i) => (
          <li key={u.name} className={cn("flex flex-col gap-3", i >= PHONE_UNIS && !allUnis && "max-md:hidden")}>
            <div className="flex items-baseline justify-between gap-6">
              <span className="flex min-w-0 items-baseline gap-4">
                <span className={cn("w-[20px] shrink-0 text-md font-semibold tabular-nums", i === 0 ? "text-[color:var(--color-violet-300)]" : "text-[color:var(--color-text-tertiary)]")}>{i + 1}</span>
                <span className="truncate text-lg font-medium leading-lg text-[color:var(--color-text-primary)]">{u.name}</span>
              </span>
              <span className="shrink-0 text-lg font-semibold leading-lg tabular-nums text-[color:var(--color-text-primary)]">{u.pts.toLocaleString("en-US")}</span>
            </div>
            <div className="ml-[36px] flex flex-col gap-2">
              <div aria-hidden className="h-[8px] overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--color-white)_6%,transparent)]">
                <div
                  style={{ width: `${Math.max(3, (u.pts / max) * 100)}%` }}
                  className={cn("h-full rounded-full", i === 0 ? "bg-[linear-gradient(to_right,var(--color-violet-600),var(--color-violet-300))]" : "bg-[color:color-mix(in_srgb,var(--color-violet-400)_55%,transparent)]")}
                />
              </div>
              <span className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">
                {u.people} {u.people === 1 ? "student" : "students"} · {u.products} products
              </span>
            </div>
          </li>
        ))}
      </ol>
      {unis.length > PHONE_UNIS ? (
        <button type="button" onClick={() => setAllUnis((v) => !v)} className="mt-8 border-0 bg-transparent p-0 text-md font-semibold leading-md text-[color:var(--color-text-brand)] underline-offset-4 hover:underline md:hidden">
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
  const [all, setAll] = React.useState(false);

  const pool = open ? board.filter((r) => !r.p.university) : board;
  const query = q.trim().toLowerCase();
  const found = query ? pool.filter((r) => `${r.p.name} ${r.p.university}`.toLowerCase().includes(query)) : pool;
  const shown = all || query ? found : found.slice(0, ROWS);

  return (
    <div className={cn("flex flex-col rounded-3xl px-4 py-8 md:px-10 md:py-10", SURFACE)}>
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
                  setAll(false);
                }}
                className={cn(
                  "h-[32px] whitespace-nowrap rounded-full border-0 px-5 text-sm font-medium leading-sm transition-colors duration-fast",
                  open === v ? "bg-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)] text-[color:var(--color-text-primary)]" : "bg-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 px-4 md:px-0">
        <SearchInput value={q} onValueChange={setQ} onClear={() => setQ("")} placeholder="Find your name or university" aria-label="Find your name or university" containerClassName="w-full" />
      </div>

      <ol className="m-0 mt-6 flex list-none flex-col p-0" aria-label="Builders by points">
        {shown.map((r) => {
          const podium = r.rank <= 3 && !open && !query;
          return (
            <li key={r.p.id} className={cn("flex items-center gap-4 rounded-2xl px-4 py-4 md:gap-6", podium && "bg-[color:color-mix(in_srgb,var(--color-violet-600)_10%,transparent)]")}>
              <span className={cn("w-[28px] shrink-0 text-center font-display text-lg font-semibold tabular-nums", r.rank <= 3 ? "text-[color:var(--color-violet-300)]" : "text-[color:var(--color-text-secondary)]")}>{r.rank}</span>
              {r.p.project && r.rank <= 3 ? (
                <button type="button" onClick={() => openProject(r)} aria-label={`Open ${r.p.project.name}`} className="size-[44px] shrink-0 overflow-hidden rounded-xl border-0 p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.p.project.image} alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <Initials name={r.p.name} className="size-[44px] text-md" />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="truncate text-lg font-medium leading-lg text-[color:var(--color-text-primary)]">{r.p.name}</span>
                  {r.p.moved ? (
                    <span className={cn("shrink-0 text-sm font-medium leading-sm tabular-nums", r.p.moved > 0 ? "text-[color:var(--color-green-400)]" : "text-[color:var(--color-red-400)]")} aria-label={r.p.moved > 0 ? `up ${r.p.moved} places` : `down ${-r.p.moved} places`}>
                      {r.p.moved > 0 ? "▲" : "▼"}
                      {Math.abs(r.p.moved)}
                    </span>
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-sm text-[color:var(--color-text-tertiary)]">
                  <span className="truncate">{r.p.university || "Open category"}</span>
                  <span aria-hidden>·</span>
                  <span>{r.p.products} products</span>
                  {qualified(r.p) ? <Badge tone="success">Qualified</Badge> : null}
                  {now !== null && qualityOf(r.rank, now) === "Medium" ? <Badge tone="neutral">Medium quality</Badge> : null}
                </span>
              </div>
              <span className="shrink-0 text-right">
                <span className="block font-display text-2xl font-semibold leading-2xl tabular-nums text-[color:var(--color-text-primary)]">{r.pts.toLocaleString("en-US")}</span>
                <span className="block text-xs leading-xs text-[color:var(--color-text-tertiary)]">points</span>
              </span>
            </li>
          );
        })}
        {shown.length === 0 ? <li className="px-4 py-12 text-center text-md leading-md text-[color:var(--color-text-tertiary)]">No one matches “{q}”.</li> : null}
      </ol>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-4 md:px-0">
        <span className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">
          Qualified = {HACKATHON.minProducts}+ products built.
        </span>
        {!query && found.length > ROWS ? (
          <button type="button" onClick={() => setAll((v) => !v)} className="border-0 bg-transparent p-0 text-md font-semibold leading-md text-[color:var(--color-text-brand)] underline-offset-4 hover:underline">
            {all ? "Show fewer" : `Show all ${found.length}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

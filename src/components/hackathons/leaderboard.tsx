"use client";

// The standings, with the prototype landing page's content (owner 2026-11-17:
// that page's content is final) in our design, and the campaign's data
// (client 2026-11-17: one layout, the campaign's data):
//  - The heading: "Live standings" (frozen once building ends, final with the
//    results), "Leaderboard" (or "The winners"), and four figures beside it —
//    participants, projects, votes, prizes.
//  - 1 vs 1: the head-to-head matches, two products a match, decided by votes.
//  - Otherwise tabs: Top participants (the top three as cards with their
//    product, place and prize, then everyone else as rows), the group league
//    (Universities, Countries…) and the open category, when the campaign has them.
//  - Rows: rank, movement since the last update, name, the AI mode when it is
//    better than the base, group, products, Qualified, the project, points.
//    Search finds a name; "Show the top n" opens the rest.
//  - Before anyone has built: "0 projects in the competition" and one card.
// The public board shows no moderation flags ("Under review" stays with the
// organizer). All numbers come from the one board in the page context.

import * as React from "react";
import { SearchInput } from "@/components/ideeza/search-input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { buttonVariants } from "@/components/ideeza/button";
import { LANDING_SECONDARY } from "@/components/landing/buttons";
import { cn } from "@/lib/utils";
import { matchesOf, type Row } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";
import { JoinButton, VoteButton } from "./actions";
import { VotesLeft } from "./vote";
import { Heading, Initials, SECTION, SURFACE } from "./parts";

// The rows shown before "Show the top n" (the top three are cards above them), and the most it opens.
const ROWS = 10;
const TOP = 100;
const PLACE = ["1st", "2nd", "3rd"];

type Tab = "people" | "groups" | "open";

const ORDINAL = (n: number) => PLACE.at(n - 1) ?? `${n}th`;

export function Leaderboard() {
  const { c, board, phase, unit } = useHackathon();
  const { HACKATHON, GROUP } = c;
  const empty = board.length === 0;
  const duel = unit === "duel";
  const eyebrow = phase === "results" ? "Final results" : phase === "judging" ? "Standings are frozen" : "Live standings";
  const entries = board.reduce((s, r) => s + r.p.published, 0);
  const title = empty ? `${entries} projects in the competition` : duel ? "Head-to-head matches" : phase === "results" ? "The winners" : "Leaderboard";
  const figures: [number, string][] = [
    [board.length, unit === "team" ? "teams" : "participants"],
    [entries, "projects"],
    [board.reduce((s, r) => s + r.votes, 0), "votes"],
    [HACKATHON.prizes.length, "prizes"],
  ];
  const tabs: [Tab, string][] = [
    ["people", unit === "team" ? "Top teams" : "Top participants"],
    ...(GROUP ? ([["groups", { university: "Universities", country: "Countries", group: "Groups" }[GROUP.one]]] as [Tab, string][]) : []),
    ...(GROUP && HACKATHON.openCategory ? ([["open", "Open category"]] as [Tab, string][]) : []),
  ];
  const [tab, setTab] = React.useState<Tab>("people");

  return (
    <section id="leaderboard" aria-labelledby="leaderboard-title" className={SECTION}>
      <p className="mb-8 flex items-center gap-3 text-lg font-medium leading-lg text-[color:var(--color-text-secondary)] md:mb-10">
        <span aria-hidden className={cn("size-[8px] rounded-full", phase === "live" ? "bg-[var(--color-green-400)] motion-safe:animate-pulse" : "bg-[color:var(--color-text-tertiary)]")} />
        {eyebrow}
      </p>
      <Heading
        id="leaderboard-title"
        title={title}
        aside={
          <dl className="m-0 grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-4 md:gap-12">
            {figures.map(([v, l]) => (
              <div key={l} className="flex flex-col">
                <dd className="order-1 m-0 font-display text-4xl font-semibold leading-4xl tabular-nums text-[color:var(--color-text-primary)]">{v.toLocaleString("en-US")}</dd>
                <dt className="order-2 text-lg leading-lg text-[color:var(--color-text-tertiary)]">{l}</dt>
              </div>
            ))}
          </dl>
        }
      />

      {empty ? (
        <NoEntries />
      ) : duel ? (
        <>
          {/* In 1 vs 1 the votes are cast in the matches, so the voter's count sits over them. */}
          <div className="mt-16 flex md:mt-20 md:justify-end">
            <VotesLeft />
          </div>
          <Matches board={board} />
        </>
      ) : (
        <>
          {tabs.length > 1 ? (
            <div role="tablist" aria-label="Standings" className="mt-24 flex w-fit max-w-full overflow-x-auto rounded-full bg-[color:color-mix(in_srgb,var(--color-white)_6%,transparent)] p-1 [scrollbar-width:none] md:mt-32">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "h-[44px] whitespace-nowrap rounded-full border-0 px-6 text-lg font-medium leading-lg transition-colors duration-fast",
                    tab === id ? "bg-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)] text-[color:var(--color-text-primary)]" : "bg-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <div className={tabs.length > 1 ? "mt-12" : "mt-24 md:mt-32"}>
            {tab === "groups" ? (
              <GroupLeague />
            ) : (
              <>
                {tab === "people" ? <TopCards board={board} /> : null}
                <People key={tab} board={tab === "open" ? board.filter((r) => !r.p.group) : board} open={tab === "open"} />
              </>
            )}
          </div>
        </>
      )}
      {empty ? null : <p className="mt-10 text-md leading-md text-[color:var(--color-text-tertiary)]">Standings on this page are sample data.</p>}
    </section>
  );
}

/** Before anyone has built: nothing on the board yet, and Join. */
function NoEntries() {
  return (
    <div className={cn("mt-24 flex flex-col items-start gap-8 rounded-3xl px-10 py-16 md:mt-32 md:px-16 md:py-20", SURFACE)}>
      <p className="max-w-[640px] text-xl leading-xl text-[color:var(--color-text-secondary)]">No projects yet. Be the first to add one.</p>
      <JoinButton size="xl" />
    </div>
  );
}

/** "ASTU · ✓ Qualified" — where a participant competes, and whether they have built enough. */
function WhereLine({ r, products }: { r: Row; products?: boolean }) {
  const { c, openProject } = useHackathon();
  const { GROUP, groupOf, qualified } = c;
  const bits = [GROUP ? groupOf(r.p) : "", products ? `${r.p.products} ${r.p.products === 1 ? "product" : "products"}` : ""].filter(Boolean);
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-md leading-md text-[color:var(--color-text-tertiary)]">
      {bits.map((b, i) => (
        <React.Fragment key={b}>
          {i ? <span aria-hidden>·</span> : null}
          <span className="truncate">{b}</span>
        </React.Fragment>
      ))}
      {qualified(r.p) ? (
        <>
          {bits.length ? <span aria-hidden>·</span> : null}
          <span className="inline-flex items-center gap-1 font-medium text-[color:var(--color-green-400)]">
            <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.4} aria-hidden />
            Qualified
          </span>
        </>
      ) : null}
      {products && r.p.project ? (
        <>
          <span aria-hidden>·</span>
          <button type="button" onClick={() => openProject(r)} className="border-0 bg-transparent p-0 font-medium text-[color:var(--color-text-brand)] underline-offset-4 hover:underline">
            View project
          </button>
        </>
      ) : null}
    </span>
  );
}

/** The AI mode a rank builds in, when it is better than everyone's ("Medium Mode"). */
function ModeChip({ rank }: { rank: number }) {
  const { c, now } = useHackathon();
  if (now === null) return null;
  const mode = c.qualityOf(rank, now);
  if (mode === c.HACKATHON.baseQuality) return null;
  return <span className="shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--color-violet-500)_22%,transparent)] px-3 text-md font-medium leading-md text-[color:var(--color-violet-200)]">{mode}</span>;
}

/** The top three: their product, the place and its prize, their figures, and View + Vote. */
function TopCards({ board }: { board: Row[] }) {
  const { c, openProject } = useHackathon();
  const { HACKATHON, money } = c;
  const top = board.slice(0, Math.min(3, HACKATHON.prizes.length || 3));
  return (
    <ol className="m-0 mb-10 grid list-none grid-cols-1 gap-10 p-0 md:grid-cols-3 lg:mb-12 lg:gap-12">
      {top.map((r, i) => {
        const proj = r.p.project;
        const prize = HACKATHON.prizes.at(i);
        return (
          <li key={r.p.id} className={cn("flex flex-col overflow-hidden rounded-3xl", SURFACE, i === 0 && "border-[color:color-mix(in_srgb,var(--color-violet-400)_45%,transparent)]")}>
            <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-bg-subtle)]">
              {proj ? (
                <button type="button" onClick={() => openProject(r)} aria-label={`Open ${proj.name}`} className="group block h-full w-full border-0 p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proj.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-slower ease-decelerate group-hover:scale-[1.04] motion-reduce:transition-none" />
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Initials name={r.p.name} className="size-[88px] text-2xl" />
                </div>
              )}
              <span className="pointer-events-none absolute left-5 top-5 flex items-center gap-3 rounded-full bg-[color:color-mix(in_srgb,var(--color-black)_62%,transparent)] py-1 pl-1 pr-4 text-md font-semibold leading-md text-[color:var(--color-white)] backdrop-blur-[8px]">
                <span className={cn("flex size-[28px] items-center justify-center rounded-full tabular-nums", i === 0 ? "bg-[var(--color-button-primary-bg)]" : "bg-[color:color-mix(in_srgb,var(--color-white)_18%,transparent)]")}>{i + 1}</span>
                {prize ? `${ORDINAL(i + 1)} place · ${money(prize)}` : null}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-6 px-8 pb-8 pt-8 md:px-10 md:pb-10">
              <div className="flex flex-col gap-2">
                <span className="flex min-w-0 items-center gap-3">
                  <h3 className="truncate text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{r.p.name}</h3>
                  <ModeChip rank={r.rank} />
                </span>
                <WhereLine r={r} />
              </div>
              <dl className="m-0 grid grid-cols-3 gap-4">
                {(
                  [
                    [r.pts, "points"],
                    [r.p.products, "products"],
                    [r.votes, "votes"],
                  ] as [number, string][]
                ).map(([v, l]) => (
                  <div key={l} className="flex flex-col">
                    <dd className="order-1 m-0 font-display text-3xl font-semibold leading-3xl tabular-nums text-[color:var(--color-text-primary)]">{v.toLocaleString("en-US")}</dd>
                    <dt className="order-2 text-md leading-md text-[color:var(--color-text-tertiary)]">{l}</dt>
                  </div>
                ))}
              </dl>
              {proj ? (
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => openProject(r)}
                    className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), LANDING_SECONDARY, "min-w-0 max-w-full hover:text-[color:var(--color-text-primary)]")}
                  >
                    <span className="truncate">View {proj.name}</span>
                  </button>
                  <VoteButton projectId={proj.id} name={proj.name} />
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Everyone below the cards (the open category: everyone in it), as rows: the
 * count and how they are ranked, the voter's votes left, search, and the rows
 * up to the tenth; "Show the top n" opens the rest.
 */
function People({ board, open }: { board: Row[]; open: boolean }) {
  const { c, phase, unit } = useHackathon();
  const { GROUP } = c;
  const [all, setAll] = React.useState(false);
  const [q, setQ] = React.useState("");
  const query = q.trim().toLowerCase();
  // Each row keeps its place in this list (the open category counts from 1).
  const ranked = open ? board.map((r, i) => ({ ...r, rank: i + 1 })) : board;
  const skip = open || query ? 0 : Math.min(3, board.length);
  const found = query ? ranked.filter((r) => `${r.p.name} ${r.p.group}`.toLowerCase().includes(query)) : ranked;
  const shown = found.slice(skip, all || query ? TOP : Math.max(ROWS, skip + 5));
  const find = `Find your name or ${GROUP ? GROUP.one : "team"}`;
  const who = unit === "team" ? "teams" : "participants";

  return (
    <div className={cn("flex flex-col rounded-3xl px-4 py-10 md:px-12 md:py-12", SURFACE)}>
      <div className="flex flex-col gap-6 px-4 md:flex-row md:items-start md:justify-between md:px-0">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{open ? "Open category" : `${board.length.toLocaleString("en-US")} ${who}`}</h3>
          <p className="text-lg leading-lg text-[color:var(--color-text-tertiary)]">
            {open ? `Participants who are not in a ${GROUP?.one ?? "group"}, ranked by points.` : "Ranked by points."} Updated every hour.
          </p>
        </div>
        {phase === "live" ? <VotesLeft /> : null}
      </div>
      <div className="mt-8 px-4 md:px-0">
        <SearchInput value={q} onValueChange={setQ} onClear={() => setQ("")} placeholder={find} aria-label={find} containerClassName="w-full" />
      </div>

      <ol className="m-0 mt-8 flex list-none flex-col gap-1 p-0" aria-label={open ? "Open category by points" : `${who} by points`}>
        {shown.map((r) => (
          <li key={r.p.id} className="flex items-center gap-4 rounded-2xl px-4 py-5 md:gap-6 md:py-6">
            <span className="w-[28px] shrink-0 text-center font-display text-lg font-semibold tabular-nums text-[color:var(--color-text-secondary)]">{r.rank}</span>
            <Initials name={r.p.name} className="size-[44px] text-md" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 items-center gap-3">
                <span className="truncate text-xl font-medium leading-xl text-[color:var(--color-text-primary)]">{r.p.name}</span>
                {r.p.moved ? (
                  <span className={cn("shrink-0 text-md font-medium leading-md tabular-nums", r.p.moved > 0 ? "text-[color:var(--color-green-400)]" : "text-[color:var(--color-red-400)]")} aria-label={r.p.moved > 0 ? `up ${r.p.moved} places` : `down ${-r.p.moved} places`}>
                    {r.p.moved > 0 ? "▲" : "▼"}
                    {Math.abs(r.p.moved)}
                  </span>
                ) : null}
                {open ? null : <ModeChip rank={r.rank} />}
              </span>
              <WhereLine r={r} products />
            </div>
            <span className="shrink-0 text-right">
              <span className="block font-display text-2xl font-semibold leading-2xl tabular-nums text-[color:var(--color-text-primary)]">{r.pts.toLocaleString("en-US")}</span>
              <span className="block text-md leading-md text-[color:var(--color-text-tertiary)]">points</span>
            </span>
          </li>
        ))}
        {shown.length === 0 ? <li className="px-4 py-12 text-center text-lg leading-lg text-[color:var(--color-text-tertiary)]">Nobody matches. Try another name.</li> : null}
      </ol>

      {!query && ranked.length > ROWS ? (
        <div className="mt-8 flex justify-center px-4 md:px-0">
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), LANDING_SECONDARY, "hover:text-[color:var(--color-text-primary)]")}
          >
            {all ? "Show fewer" : `Show the top ${Math.min(TOP, ranked.length)}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** The group league: each group's points (its participants' summed) as a bar against the leader. */
function GroupLeague() {
  const { c, groups, board } = useHackathon();
  const { GROUP } = c;
  if (!GROUP) return null;
  const max = groups[0]?.pts || 1;
  // Builders: participants in the group with at least one product.
  const builders = (name: string) => board.filter((r) => r.p.group === name && r.p.products > 0).length;
  return (
    <div className={cn("rounded-3xl px-8 py-10 md:px-12 md:py-12", SURFACE)}>
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{GROUP.title} league</h3>
        <p className="text-lg leading-lg text-[color:var(--color-text-tertiary)]">Ranked by the total points of each {GROUP.one}’s participants.</p>
      </div>
      {/* Each row is one grid: the rank in its own column, and the name, the bar and the
          facts all starting on the same left edge; the bar runs to the points' right edge. */}
      <ol className="m-0 mt-10 flex list-none flex-col gap-10 p-0">
        {groups.map((u, i) => {
          const b = builders(u.name);
          return (
            <li key={u.name} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-3">
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
                {u.people} {u.people === 1 ? "participant" : "participants"} · {b} {b === 1 ? "builder" : "builders"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * 1 vs 1: each match as one card — the two products side by side with their
 * makers, votes and Vote, "Leads" on the one ahead, and the vote share as one
 * bar under them. Pairs come from matchesOf (1st v 2nd, 3rd v 4th…).
 */
function Matches({ board }: { board: Row[] }) {
  const matches = matchesOf(board);
  if (!matches.length) return <p className="mt-12 text-xl leading-xl text-[color:var(--color-text-secondary)]">Not enough entries for a matchup yet.</p>;
  return (
    <ol className="m-0 mt-12 grid list-none grid-cols-1 gap-10 p-0 lg:grid-cols-2 lg:gap-12">
      {matches.map(({ a, b }, i) => {
        const share = Math.round((a.votes / (a.votes + b.votes || 1)) * 100);
        return (
          <li key={a.p.id} className={cn("flex flex-col gap-10 rounded-3xl px-8 py-10 md:px-12 md:py-12", SURFACE)}>
            <span className="text-md font-medium leading-md text-[color:var(--color-text-tertiary)]">Match {i + 1} · the winner advances to the next round</span>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-4 md:gap-8">
              <MatchSide r={a} leads={a.votes >= b.votes} />
              <span className="pt-[20px] font-display text-xl font-semibold leading-xl text-[color:var(--color-text-tertiary)]">vs</span>
              <MatchSide r={b} leads={b.votes > a.votes} end />
            </div>
            <div role="img" aria-label={`${a.p.project?.name}: ${share}% of the votes, ${b.p.project?.name}: ${100 - share}%`} className="flex h-[8px] w-full gap-1 overflow-hidden rounded-full">
              <div style={{ flexGrow: share }} className="basis-0 bg-[var(--color-violet-400)]" />
              <div style={{ flexGrow: 100 - share }} className="basis-0 bg-[var(--color-blue-400)]" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MatchSide({ r, leads, end }: { r: Row; leads: boolean; end?: boolean }) {
  const { c, openProject } = useHackathon();
  const { groupOf } = c;
  const proj = r.p.project;
  if (!proj) return null;
  return (
    <div className={cn("flex min-w-0 flex-col gap-5", end ? "items-end text-right" : "items-start")}>
      <button type="button" onClick={() => openProject(r)} aria-label={`Open ${proj.name}`} className="size-[64px] shrink-0 overflow-hidden rounded-2xl border-0 p-0 md:size-[72px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={proj.thumb} alt="" className="h-full w-full bg-[var(--color-bg-subtle)] object-cover" />
      </button>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-xl font-semibold leading-xl text-[color:var(--color-text-primary)] [overflow-wrap:anywhere]">{proj.name}</span>
        <span className="text-md leading-md text-[color:var(--color-text-tertiary)]">{[r.p.name, groupOf(r.p)].filter(Boolean).join(" · ")}</span>
      </span>
      <span className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", end && "justify-end")}>
        <span className="font-display text-2xl font-semibold leading-2xl tabular-nums text-[color:var(--color-text-primary)]">{r.votes.toLocaleString("en-US")}</span>
        <span className="text-md leading-md text-[color:var(--color-text-tertiary)]">votes</span>
        {leads ? <span className="text-md font-semibold leading-md text-[color:var(--color-violet-300)]">Leads</span> : null}
      </span>
      <VoteButton projectId={proj.id} name={proj.name} />
    </div>
  );
}

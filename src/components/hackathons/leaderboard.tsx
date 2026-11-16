"use client";

// Live standings — three views of one board (Top participants · Universities ·
// Open category), the top three as cards with their project, the rest as one
// table with search and "Show all". Fixes over the prototype:
//  - the public board shows no moderation flags ("Under review" stays with the
//    organizer), and ▲/▼ movement sits in its own column, not inside the rank;
//  - "Medium Mode" reads "Medium quality", the app's own word for AI levels,
//    and the board says what "Qualified" means;
//  - every number on a row is the row's own (points summed from its actions).

import * as React from "react";
import { Segmented } from "@/components/ideeza/segmented";
import { SearchInput } from "@/components/ideeza/search-input";
import { Badge } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { LandingSectionHeader } from "@/components/landing/section-header";
import { cn } from "@/lib/utils";
import { HACKATHON, PARTICIPANTS, money, pointsOf, qualified, qualityOf, type Participant } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";
import { VoteButton } from "./actions";
import { GLASS, SECTION } from "./sections";

type Tab = "people" | "universities" | "open";

const ROWS = 10;

export function Leaderboard() {
  const { now, entry, openProject } = useHackathon();
  const [tab, setTab] = React.useState<Tab>("people");
  const [q, setQ] = React.useState("");
  const [all, setAll] = React.useState(false);

  const extra = (p: Participant) => (p.project && entry.votes.includes(p.project.id) ? 1 : 0);
  const board = React.useMemo(
    () =>
      PARTICIPANTS.map((p) => ({ p, pts: pointsOf(p, extra(p)) }))
        .sort((a, b) => b.pts - a.pts || b.p.products - a.p.products)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entry.votes],
  );

  const top = board.slice(0, 3);
  const rest = board.slice(3);
  const rows = tab === "open" ? board.filter((r) => !r.p.university) : rest;
  const query = q.trim().toLowerCase();
  const found = query ? rows.filter((r) => `${r.p.name} ${r.p.university}`.toLowerCase().includes(query)) : rows;
  const shown = all || query ? found : found.slice(0, ROWS);

  const unis = React.useMemo(() => {
    const m = new Map<string, { name: string; people: number; builders: number; pts: number }>();
    board.forEach((r) => {
      if (!r.p.university) return;
      const g = m.get(r.p.university) ?? { name: r.p.university, people: 0, builders: 0, pts: 0 };
      g.people += 1;
      if (r.p.products > 0) g.builders += 1;
      g.pts += r.pts;
      m.set(r.p.university, g);
    });
    return [...m.values()].sort((a, b) => b.pts - a.pts);
  }, [board]);

  return (
    <section id="leaderboard" aria-labelledby="leaderboard-title" className={SECTION}>
      <LandingSectionHeader id="leaderboard-title" eyebrow="Live standings" title="Leaderboard" lead={`Ranked by points, updated every hour. ${entry.signedIn ? `You have ${entry.votesLeft} of ${HACKATHON.votesPerPerson} votes left.` : `Every account has ${HACKATHON.votesPerPerson} votes.`}`} />

      <div className="mt-16 flex justify-center">
        <Segmented
          label="Standings"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setQ("");
            setAll(false);
          }}
          options={[
            { value: "people", label: "Top participants" },
            { value: "universities", label: "Universities" },
            { value: "open", label: "Open category" },
          ]}
        />
      </div>

      {tab === "people" ? (
        <ol className="m-0 mt-16 grid list-none grid-cols-1 gap-8 p-0 md:grid-cols-3">
          {top.map((r) => (
            <li key={r.p.id} className={cn("flex flex-col overflow-hidden rounded-2xl", GLASS, r.rank === 1 && "border-[color:color-mix(in_srgb,var(--color-violet-400)_60%,transparent)] shadow-[0_0_48px_color-mix(in_srgb,var(--color-violet-600)_30%,transparent)]")}>
              <div className="relative aspect-[16/10] bg-[var(--color-bg-subtle)]">
                {r.p.project ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.p.project.image} alt={r.p.project.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-6 px-8 pb-8 pt-6">
                <div className="flex items-center gap-4">
                  <span className="flex size-[28px] items-center justify-center rounded-full bg-[var(--color-button-primary-bg)] text-sm font-semibold text-[color:var(--color-white)]">{r.rank}</span>
                  <Badge tone="brand">{`${["1st", "2nd", "3rd"].at(r.rank - 1)} place · ${money(HACKATHON.prizes.at(r.rank - 1) ?? 0)}`}</Badge>
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{r.p.name}</p>
                  <p className="text-md leading-md text-[color:var(--color-text-tertiary)]">{r.p.university || "Open category"}</p>
                </div>
                <dl className="grid grid-cols-3 gap-4">
                  {[
                    [r.pts, "points"],
                    [r.p.products, "products"],
                    [r.p.votes + extra(r.p), "votes"],
                  ].map(([v, l]) => (
                    <div key={l as string}>
                      <dd className="font-display text-3xl font-semibold leading-3xl tabular-nums text-[color:var(--color-text-primary)]">{(v as number).toLocaleString("en-US")}</dd>
                      <dt className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">{l}</dt>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-3">
                  {qualified(r.p) ? <Badge tone="success">Qualified</Badge> : null}
                  {now !== null && qualityOf(r.rank, now) === "Medium" ? <Badge tone="neutral">Medium quality</Badge> : null}
                </div>
                {r.p.project ? (
                  <div className="mt-auto flex items-center gap-4 pt-2">
                    <button type="button" onClick={() => openProject(r.p, r.rank)} className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "min-w-0 flex-1 rounded-full")}>
                      <span className="truncate">View {r.p.project.name}</span>
                    </button>
                    <VoteButton projectId={r.p.project.id} name={r.p.project.name} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {tab === "universities" ? (
        <div className={cn("mt-16 overflow-hidden rounded-2xl", GLASS)}>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">
                <th className="px-8 py-6 font-medium">Rank</th>
                <th className="px-8 py-6 font-medium">University</th>
                <th className="px-8 py-6 text-right font-medium">Participants</th>
                <th className="hidden px-8 py-6 text-right font-medium md:table-cell">Building</th>
                <th className="px-8 py-6 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {unis.map((g, i) => (
                <tr key={g.name} className="border-0 border-t border-solid border-[var(--color-border-default)] text-md leading-md text-[color:var(--color-text-primary)]">
                  <td className="px-8 py-6 tabular-nums text-[color:var(--color-text-secondary)]">{i + 1}</td>
                  <td className="px-8 py-6 font-medium">{g.name}</td>
                  <td className="px-8 py-6 text-right tabular-nums">{g.people}</td>
                  <td className="hidden px-8 py-6 text-right tabular-nums md:table-cell">{g.builders}</td>
                  <td className="px-8 py-6 text-right font-semibold tabular-nums">{g.pts.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-16 flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <SearchInput value={q} onValueChange={setQ} onClear={() => setQ("")} placeholder="Find your name or university" aria-label="Find your name or university" containerClassName="w-full md:w-[340px]" />
            <p className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">
              Qualified = {HACKATHON.minProducts}+ products built. The top {HACKATHON.shortlist} go to the judges.
            </p>
          </div>
          <div className={cn("overflow-hidden rounded-2xl", GLASS)}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">
                  <th className="w-[72px] px-8 py-6 font-medium">Rank</th>
                  <th className="px-8 py-6 font-medium">Participant</th>
                  <th className="hidden px-8 py-6 text-right font-medium md:table-cell">Products</th>
                  <th className="px-8 py-6 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.p.id} className="border-0 border-t border-solid border-[var(--color-border-default)] align-middle text-md leading-md text-[color:var(--color-text-primary)]">
                    <td className="px-8 py-6">
                      <span className="flex items-center gap-3 tabular-nums">
                        <span className="font-semibold">{r.rank}</span>
                        {r.p.moved ? (
                          <span className={cn("text-sm leading-sm", r.p.moved > 0 ? "text-[color:var(--color-green-400)]" : "text-[color:var(--color-red-400)]")} aria-label={r.p.moved > 0 ? `Up ${r.p.moved}` : `Down ${-r.p.moved}`}>
                            {r.p.moved > 0 ? "▲" : "▼"}
                            {Math.abs(r.p.moved)}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
                        <div className="min-w-0">
                          <p className="font-medium">{r.p.name}</p>
                          <p className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">{r.p.university || "Open category"}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {qualified(r.p) ? <Badge tone="success">Qualified</Badge> : null}
                          {now !== null && qualityOf(r.rank, now) === "Medium" ? <Badge tone="neutral">Medium quality</Badge> : null}
                          {r.p.project ? (
                            <button type="button" onClick={() => openProject(r.p, r.rank)} className="border-0 bg-transparent p-0 text-sm font-medium leading-sm text-[color:var(--color-text-brand)] underline-offset-4 hover:underline">
                              View project
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-8 py-6 text-right tabular-nums md:table-cell">{r.p.products}</td>
                    <td className="px-8 py-6 text-right font-semibold tabular-nums">{r.pts.toLocaleString("en-US")}</td>
                  </tr>
                ))}
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-md leading-md text-[color:var(--color-text-tertiary)]">
                      No one matches “{q}”.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {!query && found.length > ROWS ? (
            <div className="flex justify-center">
              <button type="button" onClick={() => setAll((v) => !v)} className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "rounded-full")}>
                {all ? "Show fewer" : `Show all ${found.length}`}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

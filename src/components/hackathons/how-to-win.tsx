"use client";

// How to win: the route (a real sequence, so it is numbered) beside the
// scoring that decides the board. The prototype told people to "earn points"
// without saying how many for what; the points table is the part a
// participant actually plans around, so it sits next to the steps, with one
// worked example so the arithmetic is obvious.

import * as React from "react";
import { cn } from "@/lib/utils";
import { GROUP, HACKATHON, POINTS, inWords, type Unit } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";
import { JoinButton } from "./actions";
import { Heading, SECTION, SURFACE } from "./parts";

// The steps follow the campaign: the style shown and its groups (step 1), its
// AI quality (step 2) and how the winner is decided (the last step).
function joinStep(unit: Unit): [string, string] {
  const team = unit === "team";
  return [
    `${team ? "Register your team" : GROUP ? "Join" : "Join the hackathon"}${GROUP ? ` and pick your ${GROUP.one}` : ""}`,
    `${GROUP && HACKATHON.openCategory ? `${GROUP.outside}? Join the open category. ` : ""}${team ? "Then invite your teammates. " : ""}You get a personal link to share. You need an IDEEZA account with a verified email.`,
  ];
}
const WIN_STEP: [string, string] =
  HACKATHON.winBy === "shortlist"
    ? [`The top ${HACKATHON.shortlist} go to the judges`, `When building ends the board freezes. The judges score the shortlist and pick the ${inWords(HACKATHON.prizes.length)} winners.`]
    : HACKATHON.winBy === "score"
      ? ["The judges and the votes decide", `The judges' scores count for ${HACKATHON.judgesWeight}% and the audience's votes for ${100 - HACKATHON.judgesWeight}%.`]
      : ["The most points win", "When building ends the board freezes. The participants with the most points win."];
const LEAD =
  HACKATHON.winBy === "shortlist"
    ? "Points put you on the board, and the board decides who the judges see."
    : HACKATHON.winBy === "score"
      ? "Points put you on the board; the judges' scores and the votes pick the winners."
      : "Points put you on the board, and the board picks the winners.";

const AFTER_JOIN: [string, string][] = [
  [`Build ${HACKATHON.minProducts} or more products`, `Describe each idea in plain words. IDEEZA AI makes the concept, PCB, code and 3D, on ${HACKATHON.baseQuality} quality, free. A product counts when every stage is done.`],
  ["Publish each one", "To Give to Community on the marketplace, and to the feed. No wallet or KYC needed."],
  ["Share your link and collect votes", `Every vote adds a point, and a friend who builds a product through your link adds ${POINTS.referral}.`],
  WIN_STEP,
];

const TABLE: [string, string, number][] = [
  ["Build a product", "all stages done, no limit", POINTS.build],
  ["Publish a product", "per product", POINTS.publish],
  ["Build on a new day", "once a day", POINTS.buildDay],
  ["Each vote you get", "no limit", POINTS.vote],
  ["A friend you invited builds", "per friend", POINTS.referral],
];

// The worked example: three products, built and published on three days, forty votes.
const EX = { products: 3, days: 3, votes: 40 };
const EX_TOTAL = EX.products * POINTS.build + EX.products * POINTS.publish + EX.days * POINTS.buildDay + EX.votes * POINTS.vote;

export function HowToWin() {
  const { unit } = useHackathon();
  const STEPS = [joinStep(unit), ...AFTER_JOIN];
  return (
    <section id="how" aria-labelledby="how-title" className={SECTION}>
      <Heading id="how-title" title="How to win" lead={LEAD} />

      <div className="mt-24 grid grid-cols-1 gap-24 md:mt-32 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-32">
        <div>
          <ol className="m-0 flex list-none flex-col p-0">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="relative flex gap-8 pb-16 last:pb-0 md:gap-10">
                {/* The track joining the steps. */}
                {i < STEPS.length - 1 ? <span aria-hidden className="absolute bottom-0 left-[23px] top-[52px] w-px bg-[color:color-mix(in_srgb,var(--color-white)_14%,transparent)]" /> : null}
                <span
                  aria-hidden
                  className={cn(
                    "relative flex size-[48px] shrink-0 items-center justify-center rounded-full font-display text-xl font-semibold tabular-nums",
                    i === STEPS.length - 1 ? "bg-[var(--color-button-primary-bg)] text-[color:var(--color-white)]" : "border border-solid border-[color:color-mix(in_srgb,var(--color-violet-300)_45%,transparent)] text-[color:var(--color-violet-200)]",
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-4 pt-[10px]">
                  <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{t}</h3>
                  <p className="max-w-[600px] text-xl leading-xl text-[color:var(--color-text-secondary)]">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-20 pl-[64px] md:pl-[68px]">
            <JoinButton size="xl" />
          </div>
        </div>

        <aside aria-labelledby="points-title" className={cn("self-start rounded-3xl px-10 py-12 md:px-12 md:py-16 lg:sticky lg:top-[184px]", SURFACE)}>
          <h3 id="points-title" className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">How points add up</h3>
          <table className="mt-10 w-full border-collapse text-left">
            <caption className="sr-only">Points for each action</caption>
            <tbody>
              {TABLE.map(([what, note, pts]) => (
                <tr key={what} className="border-0 border-t border-solid border-[color:color-mix(in_srgb,var(--color-white)_8%,transparent)] first:border-t-0">
                  <th scope="row" className="py-6 pr-6 font-regular">
                    <span className="block text-xl font-medium leading-xl text-[color:var(--color-text-primary)]">{what}</span>
                    <span className="block text-md leading-md text-[color:var(--color-text-tertiary)]">{note}</span>
                  </th>
                  <td className="py-6 text-right font-display text-3xl font-semibold leading-3xl tabular-nums text-[color:var(--color-violet-300)]">+{pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-8 rounded-2xl bg-[color:color-mix(in_srgb,var(--color-violet-600)_14%,transparent)] px-8 py-6 text-lg leading-lg text-[color:var(--color-text-secondary)]">
            <b className="font-semibold text-[color:var(--color-text-primary)]">Example:</b> {EX.products} products built and published on {EX.days} days, with {EX.votes} votes = {EX.products * POINTS.build} + {EX.products * POINTS.publish} + {EX.days * POINTS.buildDay} + {EX.votes} ={" "}
            <b className="font-semibold text-[color:var(--color-text-primary)]">{EX_TOTAL} points</b>.
          </p>
        </aside>
      </div>
    </section>
  );
}

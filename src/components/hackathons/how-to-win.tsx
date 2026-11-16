"use client";

// How to win: the route (a real sequence, so it is numbered) beside the
// scoring that decides the board. The prototype told people to "earn points"
// without saying how many for what; the points table is the part a
// participant actually plans around, so it sits next to the steps, with one
// worked example so the arithmetic is obvious.

import * as React from "react";
import { cn } from "@/lib/utils";
import { HACKATHON, POINTS } from "@/lib/hackathons/vibe-inventing";
import { JoinButton } from "./actions";
import { Heading, SECTION, SURFACE } from "./parts";

const STEPS: [string, string][] = [
  ["Join and pick your university", "Or the open category if you are not at one. You get a personal link to share. You need an IDEEZA account with a verified email."],
  [`Build ${HACKATHON.minProducts} or more products`, "Describe each idea in plain words. IDEEZA AI makes the concept, PCB, code and 3D, on Low quality, free. A product counts when every stage is done."],
  ["Publish each one", "To Give to Community on the marketplace, and to the feed. No wallet or KYC needed."],
  ["Share your link and collect votes", `Every vote adds a point, and a friend who builds a product through your link adds ${POINTS.referral}.`],
  [`The top ${HACKATHON.shortlist} go to the judges`, "When building ends the board freezes. The judges score the shortlist and pick the three winners."],
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
  return (
    <section id="how" aria-labelledby="how-title" className={SECTION}>
      <Heading id="how-title" title="How to win" lead="Points put you on the board, and the board decides who the judges see." />

      <div className="mt-20 grid grid-cols-1 gap-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-24">
        <div>
          <ol className="m-0 flex list-none flex-col p-0">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="relative flex gap-8 pb-12 last:pb-0">
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
                <div className="flex flex-col gap-3 pt-[10px]">
                  <h3 className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">{t}</h3>
                  <p className="max-w-[560px] text-lg leading-lg text-[color:var(--color-text-secondary)]">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-16 pl-[64px]">
            <JoinButton size="xl" />
          </div>
        </div>

        <aside aria-labelledby="points-title" className={cn("self-start rounded-3xl px-8 py-10 md:px-12 lg:sticky lg:top-[176px]", SURFACE)}>
          <h3 id="points-title" className="text-2xl font-semibold leading-2xl text-[color:var(--color-text-primary)]">How points add up</h3>
          <table className="mt-8 w-full border-collapse text-left">
            <caption className="sr-only">Points for each action</caption>
            <tbody>
              {TABLE.map(([what, note, pts]) => (
                <tr key={what} className="border-0 border-t border-solid border-[color:color-mix(in_srgb,var(--color-white)_8%,transparent)] first:border-t-0">
                  <th scope="row" className="py-5 pr-6 font-regular">
                    <span className="block text-lg font-medium leading-lg text-[color:var(--color-text-primary)]">{what}</span>
                    <span className="block text-sm leading-sm text-[color:var(--color-text-tertiary)]">{note}</span>
                  </th>
                  <td className="py-5 text-right font-display text-3xl font-semibold leading-3xl tabular-nums text-[color:var(--color-violet-300)]">+{pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 rounded-2xl bg-[color:color-mix(in_srgb,var(--color-violet-600)_14%,transparent)] px-6 py-5 text-md leading-md text-[color:var(--color-text-secondary)]">
            <b className="font-semibold text-[color:var(--color-text-primary)]">Example:</b> {EX.products} products built and published on {EX.days} days, with {EX.votes} votes = {EX.products * POINTS.build} + {EX.products * POINTS.publish} + {EX.days * POINTS.buildDay} + {EX.votes} ={" "}
            <b className="font-semibold text-[color:var(--color-text-primary)]">{EX_TOTAL} points</b>.
          </p>
        </aside>
      </div>
    </section>
  );
}

"use client";

// The Hackathons list, /hackathons/all (owner 2026-11-17: several hackathons
// can run at once; the menu's Hackathons opens the main one, and its More
// hackathons opens this list; each card opens that hackathon's own page). It is drawn like the website's other list, Events
// (Figma "Event for Join Waitlist"): the same header, the first hackathon as a
// wide card, the others as rows — the words on the left, the picture card on
// the right. Running first, then starting soon, then ended (campaigns.ts).
//
// Each card says what a visitor decides on: whether it is open (status, and
// the date that matters now), where and for whom, the format, the prize, and
// one way in. A prototype sample says so on its card. Each picture is one of
// the hackathon pages' own media (the hero's glow, the closing wave, the prize
// ribbon), not another page's art.

import * as React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { LandingEyebrow } from "@/components/landing/section-header";
import { cn } from "@/lib/utils";
import { MAIN_HACKATHON, STATUS_LABEL, listOrder, statusOf, type ListStatus } from "@/lib/hackathons/campaigns";
import { campaignOf, inWords, type Hackathon } from "@/lib/hackathons/vibe-inventing";

/** A hackathon's page: the main one lives at /hackathons (the menu's Hackathons), the others at /hackathons/<slug>. */
const pageOf = (h: Hackathon) => (h.id === MAIN_HACKATHON.id ? "/hackathons" : `/hackathons/${h.slug}`);

const FRAME = "block rounded-[20px] border-solid border border-[rgba(210,197,252,0.2)] p-[12px] focus-visible:outline-none focus-visible:shadow-focus-brand";
const PHOTO = "relative flex flex-col justify-end overflow-hidden rounded-[14px] border-solid border border-[var(--color-border-strong)]";
const FADE = "absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,var(--color-bg-page)_100%)]";

// The list's clock: a tick a minute is enough for "starts / ends" dates; null under SSR.
function subscribeMinute(on: () => void) {
  const id = window.setInterval(on, 60_000);
  return () => window.clearInterval(id);
}
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000;

/** "16–22 Nov 2026", or "28 Nov – 2 Dec 2026": the building days, in the hackathon's own time zone. */
function buildingDays(h: Hackathon): string {
  const part = (ms: number, o: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleDateString("en-GB", { ...o, timeZone: h.timeZone });
  const sameMonth = part(h.dates.start, { month: "short", year: "numeric" }) === part(h.dates.end, { month: "short", year: "numeric" });
  return sameMonth
    ? `${part(h.dates.start, { day: "numeric" })}–${part(h.dates.end, { day: "numeric", month: "short", year: "numeric" })}`
    : `${part(h.dates.start, { day: "numeric", month: "short" })} – ${part(h.dates.end, { day: "numeric", month: "short", year: "numeric" })}`;
}

/** The date that matters now, beside the status. */
function whenLine(h: Hackathon, now: number): string {
  const { eat, phaseAt } = campaignOf(h);
  const day = (ms: number) => eat(ms).split(",")[0];
  switch (phaseAt(now)) {
    case "soon":
      return `Registration opens ${day(h.dates.registration)}`;
    case "registration":
      return `Registration open · building starts ${day(h.dates.start)}`;
    case "live":
      return `Building ends ${day(h.dates.end)}`;
    case "judging":
      return `Winners on ${day(h.dates.results)}`;
    default:
      return `Winners announced ${day(h.dates.results)}`;
  }
}

function Status({ h, now }: { h: Hackathon; now: number | null }) {
  const status: ListStatus | null = now === null ? null : statusOf(campaignOf(h).phaseAt(now));
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <span className="flex h-[36px] items-center gap-3 rounded-full border border-solid border-[color:color-mix(in_srgb,var(--color-white)_16%,transparent)] bg-[color:color-mix(in_srgb,var(--color-black)_55%,transparent)] px-5 text-md font-semibold leading-md text-[color:var(--color-white)] backdrop-blur-[8px]">
        <span
          aria-hidden
          className={cn(
            "size-[8px] shrink-0 rounded-full",
            status === "live" ? "bg-[var(--color-green-400)] motion-safe:animate-pulse" : status === "ended" ? "bg-[color:var(--color-text-tertiary)]" : "bg-[var(--color-violet-400)]",
          )}
        />
        {status ? STATUS_LABEL[status] : " "}
      </span>
      {now !== null ? <span className="text-lg font-medium leading-lg text-[color:var(--color-text-secondary)]">{whenLine(h, now)}</span> : null}
      {h.sample ? (
        <span className="flex h-[32px] items-center rounded-full border border-dashed border-[color:color-mix(in_srgb,var(--color-white)_24%,transparent)] px-4 text-md font-medium leading-md text-[color:var(--color-text-tertiary)]">Prototype sample</span>
      ) : null}
    </span>
  );
}

/** The card's one way in, with the site's glass arrow pill (as Events' "View All"). */
function Open({ h, now, big }: { h: Hackathon; now: number | null; big?: boolean }) {
  const ended = now !== null && campaignOf(h).phaseAt(now) === "results";
  return (
    <span className="relative flex shrink-0 items-center gap-6">
      <span className="font-display text-xl font-medium leading-xl text-[color:var(--color-text-primary)] md:text-2xl md:leading-[30px]">{ended ? "See the winners" : "View hackathon"}</span>
      <span
        className={cn(
          "flex items-center justify-center rounded-[64px] bg-[var(--color-glass-highlight)] px-[24px] py-[8px] text-[color:var(--color-white)] transition-colors duration-fast ease-standard group-hover:bg-[var(--color-glass-border-subtle)]",
          big ? "h-[56px] w-[69px]" : "h-[48px] w-[59px]",
        )}
      >
        <HugeiconsIcon icon={ArrowUpRight01Icon} size={big ? 24 : 22} color="currentColor" strokeWidth={1.5} />
      </span>
    </span>
  );
}

function Featured({ h, now }: { h: Hackathon; now: number | null }) {
  const { money, prizePool, unitLabel } = campaignOf(h);
  return (
    <Link href={pageOf(h)} aria-label={`${h.name} — view hackathon`} className={cn(FRAME, "group")}>
      <div className={cn(PHOTO, "min-h-[440px] gap-10 p-10 md:min-h-[520px] md:p-12 xl:min-h-[578px] xl:p-16")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={h.cover} alt="" width={1600} height={684} className="absolute inset-0 block size-full object-cover object-top transition-transform duration-slower ease-decelerate group-hover:scale-[1.02] motion-reduce:transition-none" />
        {/* On a phone the words sit on the glow itself: the fade starts higher and goes darker there. */}
        <div aria-hidden className={cn(FADE, "max-md:bg-[linear-gradient(180deg,transparent_12%,color-mix(in_srgb,var(--color-bg-page)_72%,transparent)_42%,var(--color-bg-page)_100%)]")} />
        <div className="relative flex flex-col gap-10">
          <Status h={h} now={now} />
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-[760px] flex-col gap-4 font-display">
              <h2 className="text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)] xl:text-6xl xl:leading-6xl xl:tracking-snug">{h.name}</h2>
              <p className="text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">
                {h.where} · {unitLabel(h.unit)} · {buildingDays(h)}
              </p>
            </div>
            <div className="flex flex-col items-start gap-8 lg:items-end">
              <p className="flex flex-col lg:items-end">
                <span className="font-display text-4xl font-semibold leading-4xl tabular-nums text-[color:var(--color-white)]">{money(prizePool)}</span>
                <span className="text-lg leading-lg text-[color:var(--color-text-secondary)]">in prizes for the top {inWords(h.prizes.length)}</span>
              </p>
              <Open h={h} now={now} big />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Row({ h, now }: { h: Hackathon; now: number | null }) {
  const { money, prizePool, unitLabel } = campaignOf(h);
  const facts: [string, string][] = [
    ["Prizes", `${money(prizePool)} for the top ${inWords(h.prizes.length)}`],
    ["Building", buildingDays(h)],
    ["Format", unitLabel(h.unit)],
    ["Who can join", `${h.minAge}+, living in ${h.where}`],
  ];
  return (
    <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
      {/* The words, as an Events row: the title and its line over a rule, then the facts. */}
      <div className="flex flex-col gap-12 lg:w-[480px] lg:shrink-0">
        <Status h={h} now={now} />
        <div className="flex flex-col gap-2 border-0 border-b border-solid border-[var(--color-border-default)] pb-12 font-display">
          <h2 className="text-5xl font-semibold leading-5xl tracking-close text-[color:var(--color-text-primary)] xl:text-6xl xl:leading-6xl xl:tracking-snug">{h.name}</h2>
          <p className="text-xl font-medium leading-2xl tracking-normal text-[color:var(--color-text-tertiary)]">{h.lead}</p>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-x-10 gap-y-8">
          {facts.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1">
              <dt className="text-md font-medium leading-md text-[color:var(--color-text-tertiary)]">{k}</dt>
              <dd className="m-0 text-lg font-medium leading-lg text-[color:var(--color-text-primary)]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Link href={pageOf(h)} aria-label={`${h.name} — view hackathon`} className={cn(FRAME, "group w-full lg:w-[679px] lg:shrink-0")}>
        <div className={cn(PHOTO, "h-[300px] p-10 md:h-[400px] md:p-12 lg:h-[460px]")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={h.cover} alt="" width={1600} height={900} loading="lazy" className="absolute inset-0 block size-full object-cover transition-transform duration-slower ease-decelerate group-hover:scale-[1.02] motion-reduce:transition-none" />
          <div aria-hidden className={FADE} />
          <Open h={h} now={now} />
        </div>
      </Link>
    </div>
  );
}

export function HackathonList() {
  const now = React.useSyncExternalStore(subscribeMinute, minuteNow, () => null);
  const [first, ...rest] = listOrder(now);
  return (
    <section aria-labelledby="hackathons-title" className="relative bg-[var(--color-bg-page)]">
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col gap-24 px-8 pb-40 pt-[136px] md:pt-[180px] xl:gap-[64px] xl:px-0 xl:pb-[148px] xl:pt-[208px]">
        <div className="flex flex-col items-start gap-[28px]">
          <LandingEyebrow>Hackathons</LandingEyebrow>
          <div className="flex max-w-[867px] flex-col gap-[28px] font-display font-semibold">
            <h1 id="hackathons-title" className="text-6xl leading-6xl tracking-snug text-[color:var(--color-text-primary)] md:text-7xl md:leading-7xl md:tracking-tight">
              Invent hardware with AI. Win prizes.
            </h1>
            <p className="text-2xl leading-2xl tracking-normal text-[color:var(--color-text-secondary)]">
              Build products with IDEEZA AI, publish them and collect votes. Join a hackathon that is open, vote in one that is running, or see who won.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-32 xl:gap-[120px]">
          {first ? <Featured h={first} now={now} /> : null}
          {rest.map((h) => (
            <Row key={h.slug} h={h} now={now} />
          ))}
        </div>
      </div>
    </section>
  );
}

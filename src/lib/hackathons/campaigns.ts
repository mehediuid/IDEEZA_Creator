// Every hackathon the website lists (owner 2026-11-17: several hackathons can
// run at once — the menu's Hackathons opens a list, each card opens that
// hackathon's own page in the one layout, with its own data and its own link).
//
// The running hackathon is the prototype's Ethiopia launch. The other two are
// PROTOTYPE SAMPLES (owner's "yes"), there so the list shows a hackathon that
// is starting soon and one that has ended; both are marked as samples on the
// list and on their pages. Each sample takes a different setup — 1 vs 1 with
// a country ranking and judges + votes; individuals, no groups, points only —
// so opening one shows the same layout with other data.

import { VIBE_INVENTING, phaseAt, type Hackathon, type Phase } from "./vibe-inventing";

// The prototype's sample judges (as on the Ethiopia page; the real panel is the organizer's).
const SAMPLE_JUDGES = VIBE_INVENTING.judges;

/** Starting soon: registration is open, building starts on 1 December. Nobody has built yet. */
const EAST_AFRICA_CUP: Hackathon = {
  id: "east-africa-1v1-2026",
  slug: "east-africa-1-vs-1",
  sample: true,
  cover: "/hackathons/covers/east-africa-1-vs-1.webp",
  name: "IDEEZA East Africa 1 vs 1 Cup",
  shortName: "East Africa 1 vs 1 Cup",
  lead: "A 120-hour online hackathon in head-to-head matches. Build products with IDEEZA AI, publish them to Give to Community and win your matches on votes.",
  where: "East Africa",
  minAge: 18,
  timezone: "East Africa Time (EAT)",
  tzShort: "EAT",
  timeZone: "Africa/Nairobi",
  currency: "USD",
  prizes: [5_000, 2_000, 1_000],
  votesPerPerson: 10,
  minProducts: 2,
  hours: 120,
  unit: "duel",
  teamMin: 1,
  teamMax: 1,
  groupBy: "country",
  groups: ["Ethiopia", "Kenya", "Uganda", "Tanzania", "Rwanda"],
  openCategory: false,
  winBy: "score",
  judgesWeight: 50,
  shortlist: 10,
  dates: {
    registration: Date.parse("2026-11-15T09:00:00+03:00"),
    start: Date.parse("2026-12-01T09:00:00+03:00"),
    end: Date.parse("2026-12-06T09:00:00+03:00"),
    results: Date.parse("2026-12-08T18:00:00+03:00"),
  },
  who: "Students, makers, engineers and anyone with a product idea",
  category: "Hardware",
  langs: "English",
  baseQuality: "Low Mode",
  aiUnlock: null,
  extras: null,
  appVoteWeight: 2,
  verify: ["Email"],
  points: { build: 10, publish: 5, vote: 1, referral: 15, buildDay: 2 },
  criteria: [
    { name: "Innovation", weight: 50 },
    { name: "Completeness", weight: 50 },
  ],
  judges: SAMPLE_JUDGES,
  rules:
    "Open to participants aged 18 or over living in Ethiopia, Kenya, Uganda, Tanzania or Rwanda. Only products published to Give to Community after joining, while the hackathon is live, count as entries. One account per person. Suspicious votes are reviewed and can be removed.",
  board: { entrants: 0, seed: 3, firstProduct: 0 },
};

/** Ended: built in October, winners announced. Individuals, no groups, the most points win. */
const SMART_HOME_SPRINT: Hackathon = {
  id: "smart-home-sprint-2026",
  slug: "smart-home-sprint",
  sample: true,
  cover: "/hackathons/covers/smart-home-sprint.webp",
  name: "IDEEZA Smart Home Sprint",
  shortName: "Smart Home Sprint",
  lead: "A 96-hour online hackathon for products that make a home smarter. Build with IDEEZA AI, publish to Give to Community and collect votes.",
  where: "Ethiopia",
  minAge: 18,
  timezone: "East Africa Time (EAT)",
  tzShort: "EAT",
  timeZone: "Africa/Addis_Ababa",
  currency: "birr",
  prizes: [50_000, 25_000, 10_000],
  votesPerPerson: 10,
  minProducts: 2,
  hours: 96,
  unit: "solo",
  teamMin: 1,
  teamMax: 1,
  groupBy: "none",
  groups: [],
  openCategory: false,
  winBy: "points",
  judgesWeight: 0,
  shortlist: 0,
  dates: {
    registration: Date.parse("2026-09-28T09:00:00+03:00"),
    start: Date.parse("2026-10-05T09:00:00+03:00"),
    end: Date.parse("2026-10-09T09:00:00+03:00"),
    results: Date.parse("2026-10-11T18:00:00+03:00"),
  },
  who: "University students, makers, engineers and anyone with a product idea",
  category: "Smart home",
  langs: "English",
  baseQuality: "Low Mode",
  aiUnlock: null,
  extras: null,
  appVoteWeight: 2,
  verify: ["Email"],
  points: { build: 10, publish: 5, vote: 1, referral: 15, buildDay: 2 },
  criteria: [],
  judges: [],
  rules:
    "Open to participants in Ethiopia aged 18 or over. Only products published to Give to Community after joining, while the hackathon was live, counted as entries. One account per person. Winners agreed to the use of their name and photo.",
  board: { entrants: 40, seed: 11, firstProduct: 4 },
};

export const HACKATHONS: Hackathon[] = [VIBE_INVENTING, EAST_AFRICA_CUP, SMART_HOME_SPRINT];

export const hackathonBySlug = (slug: string): Hackathon | null => HACKATHONS.find((h) => h.slug === slug) ?? null;

/** The card's status, from the hackathon's phase. */
export type ListStatus = "live" | "soon" | "judging" | "ended";
export const statusOf = (phase: Phase): ListStatus => (phase === "live" ? "live" : phase === "soon" || phase === "registration" ? "soon" : phase === "judging" ? "judging" : "ended");
export const STATUS_LABEL: Record<ListStatus, string> = { live: "Live now", soon: "Starting soon", judging: "Judging", ended: "Ended" };

const ORDER: ListStatus[] = ["live", "soon", "judging", "ended"];

/**
 * The list's order: running first, then starting soon (soonest first), then
 * judging, then ended (latest first). Before the clock is known (the server's
 * render) the list keeps its own order.
 */
export function listOrder(now: number | null, list: readonly Hackathon[] = HACKATHONS): Hackathon[] {
  if (now === null) return [...list];
  return [...list].sort((a, b) => {
    const sa = statusOf(phaseAt(a, now));
    const sb = statusOf(phaseAt(b, now));
    if (sa !== sb) return ORDER.indexOf(sa) - ORDER.indexOf(sb);
    return sa === "soon" ? a.dates.start - b.dates.start : b.dates.end - a.dates.end;
  });
}

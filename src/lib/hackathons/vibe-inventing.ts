// The public hackathon page's data — one campaign (client 2026-11-17: "think
// about it like a campaign page: the style and the layout look exactly the
// same, but the data inside the page comes from the exact campaign"). The
// organizer designs the hackathon in the "IDEEZA Hackathons" prototype's setup;
// every word and number the page shows that depends on that setup is read from
// the record below, never typed in a section. The record is the prototype's
// Ethiopia launch (the running hackathon). The standings are SAMPLE data, made
// here from a seeded walk so every visit draws the same board, and every
// figure on the page is derived from these rows, never typed beside them.

export type Phase = "soon" | "registration" | "live" | "judging" | "results";

/** Who competes (the prototype's "Who competes?"). */
export type Unit = "solo" | "team" | "duel";
/** The group ranking beside the people's (the prototype's "Is there a group ranking as well?"). */
export type GroupBy = "none" | "university" | "country" | "custom";
/** How the winner is decided (the prototype's Winner step). */
export type WinBy = "score" | "shortlist" | "points";

export type Hackathon = {
  id: string;
  name: string;
  /** The name where the full one would not fit on a phone's line. */
  shortName: string;
  lead: string;
  where: string;
  minAge: number;
  /** Shown on the page, e.g. "East Africa Time (EAT)", and its short form. */
  timezone: string;
  tzShort: string;
  /** The IANA zone every date on the page is written in. */
  timeZone: string;
  currency: string;
  prizes: number[];
  votesPerPerson: number;
  minProducts: number;
  /** How long building runs, as the organizer states it. */
  hours: number;
  unit: Unit;
  /** Team size, when `unit` is "team". */
  teamMin: number;
  teamMax: number;
  groupBy: GroupBy;
  /** The groups that compete, when `groupBy` is not "none". */
  groups: string[];
  /** A category for people in no group. */
  openCategory: boolean;
  winBy: WinBy;
  /** "score": the judges' share of the final score, in % (the audience has the rest). */
  judgesWeight: number;
  /** "shortlist": how many of the board's top go to the judges. */
  shortlist: number;
  dates: { registration: number; start: number; end: number; results: number };
  who: string;
  /** The AI quality every participant builds with. */
  baseQuality: string;
  /** Stronger AI for the top of the board near the end, or null. */
  aiUnlock: { top: number; lastDays: number; quality: string } | null;
  /** Giveaways while the hackathon runs, or null. */
  giveaways: { everyDays: number; prize: string } | null;
  /** Points per action — the prototype's points table. */
  points: { build: number; publish: number; vote: number; referral: number; buildDay: number };
  criteria: { name: string; weight: number }[];
  judges: { name: string; role: string }[];
  rules: string;
};

export type Participant = {
  id: string;
  name: string;
  /** Their group (university, country…), or "" for the open category or when there are no groups. */
  group: string;
  products: number;
  published: number;
  votes: number;
  referrals: number;
  buildDays: number;
  /** Places moved since the last hourly update (+ up, − down). */
  moved: number;
  /** The participant's showcased product, when they have one. */
  project?: { id: string; name: string; image: string; thumb: string; video: string; summary: string };
};

export const HACKATHON: Hackathon = {
  id: "vibe-inventing-2026",
  name: "IDEEZA Vibe Inventing Online Hackathon",
  shortName: "Vibe Inventing Hackathon",
  lead: "A 160-hour online hackathon. Build products with IDEEZA AI, publish them to Give to Community, collect votes and climb the leaderboard.",
  where: "Ethiopia",
  minAge: 18,
  timezone: "East Africa Time (EAT)",
  tzShort: "EAT",
  timeZone: "Africa/Addis_Ababa",
  currency: "birr",
  prizes: [100_000, 40_000, 20_000],
  votesPerPerson: 10,
  minProducts: 3,
  hours: 160,
  unit: "solo",
  teamMin: 1,
  teamMax: 1,
  groupBy: "university",
  groups: [
    "Addis Ababa University",
    "AASTU",
    "ASTU",
    "Haramaya University",
    "Wollo University",
    "Bahir Dar University",
    "Jimma University",
    "Mekelle University",
    "Hawassa University",
    "University of Gondar",
    "Arba Minch University",
    "Dire Dawa University",
  ],
  openCategory: true,
  winBy: "shortlist",
  judgesWeight: 70,
  shortlist: 10,
  // EAT = UTC+3. Registration two days before the start; building and voting
  // together; judging for two days after.
  dates: {
    registration: Date.parse("2026-11-14T09:00:00+03:00"),
    start: Date.parse("2026-11-16T09:00:00+03:00"),
    end: Date.parse("2026-11-22T21:00:00+03:00"),
    results: Date.parse("2026-11-24T18:00:00+03:00"),
  },
  who: "University students, makers, engineers and anyone with a product idea",
  baseQuality: "Low",
  aiUnlock: { top: 50, lastDays: 3, quality: "Medium" },
  giveaways: { everyDays: 2, prize: "Bonus AI credits and IDEEZA merch" },
  points: { build: 10, publish: 5, vote: 1, referral: 15, buildDay: 2 },
  criteria: [
    { name: "Innovation", weight: 40 },
    { name: "Manufacturability", weight: 30 },
    { name: "Completeness", weight: 30 },
  ],
  // Sample judges, as the prototype draws them (owner to name the real panel).
  judges: [
    { name: "Noa Barak", role: "Hardware engineer" },
    { name: "Amir Shalev", role: "Investor" },
    { name: "Maya Cohen", role: "Product designer" },
  ],
  rules:
    "Open to participants in Ethiopia aged 18 or over. Only products published to Give to Community after joining, while the hackathon is live, count as entries. One account per person. Suspicious votes and referrals are reviewed and can be removed. Winners agree to the use of their name and photo.",
};

export const POINTS = HACKATHON.points;

/** The words the page uses for the hackathon's groups (null when there are none). */
export const GROUP = (
  {
    none: null,
    university: { one: "university", many: "universities", title: "University", member: "student", members: "students", outside: "Not at a university" },
    country: { one: "country", many: "countries", title: "Country", member: "participant", members: "participants", outside: "Not from these countries" },
    custom: { one: "group", many: "groups", title: "Group", member: "member", members: "members", outside: "Not in a group" },
  } as const
)[HACKATHON.groupBy];

// The style can be switched on the page (owner 2026-11-17: the prototype must show
// every style), so the words that follow it take the style being shown.

/** The words for who competes: one person, or one team. */
export const entrantOf = (unit: Unit) => (unit === "team" ? { one: "team", many: "teams", title: "Team" } : { one: "builder", many: "builders", title: "Builder" });

/** "Individuals", "Teams of 2–5", "1 vs 1" — the prototype's format names. */
export const unitLabel = (unit: Unit) => (unit === "team" ? `Teams of ${HACKATHON.teamMin}–${HACKATHON.teamMax}` : unit === "duel" ? "1 vs 1" : "Individuals");

/** How you compete, in the prototype's words. */
export const competeLine = (unit: Unit) =>
  unit === "team"
    ? `You compete as a team of ${HACKATHON.teamMin} to ${HACKATHON.teamMax} people`
    : unit === "duel"
      ? "You compete head-to-head: one opponent per round, and the winner advances"
      : "You compete as an individual";

/** Where a participant competes, as a line: their group, the open category, or nothing without groups. */
export const groupOf = (p: Participant) => (GROUP ? p.group || "Open category" : "");

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** 3 → "three" (up to ten; then the figure). */
export const inWords = (n: number) => NUMBER_WORDS.at(n) ?? String(n);

const FIRST = ["Abel", "Bethlehem", "Dawit", "Eden", "Fikir", "Hanna", "Kaleb", "Liya", "Meron", "Nahom", "Rahel", "Samuel", "Selam", "Tigist", "Yonas", "Zewdu", "Mahlet", "Biruk", "Saron", "Henok", "Mekdes", "Natnael", "Ruth", "Tewodros"];
const LAST = ["Abebe", "Bekele", "Girma", "Haile", "Kebede", "Lemma", "Mekonnen", "Tadesse", "Tesfaye", "Worku", "Alemu", "Desta", "Gebre", "Assefa", "Mulugeta", "Negash"];

// Showcased products: the platform's own sample products, so each has a real picture.
// `clip` names the product's own video in /innovations/videos (<id>--<clip>.mp4).
const PROJECTS = [
  { id: "lora-weather-station", clip: "station", name: "LoRa weather station", summary: "A solar weather station that reports over LoRa from rooftops and farms." },
  { id: "air-quality-room-sensor", clip: "sensor", name: "Air quality room sensor", summary: "Tells a classroom when to open a window, from CO2 and humidity." },
  { id: "smart-plant-watering-hub", clip: "hub", name: "Smart plant watering hub", summary: "Waters each pot by what its soil needs, not by a timer." },
  { id: "solar-mppt-controller", clip: "controller", name: "Solar MPPT controller", summary: "Gets more charge from a small panel into a battery." },
  { id: "soil-moisture-mesh-network", clip: "gateway", name: "Soil moisture mesh network", summary: "Sensors across a field that pass readings to one gateway." },
  { id: "line-following-micro-rover", clip: "rover", name: "Line-following micro rover", summary: "A small rover that follows a taped line, built for teaching." },
  { id: "self-balancing-two-wheeler", clip: "robot", name: "Self-balancing two-wheeler", summary: "A two-wheeled robot that stays upright on its own." },
  { id: "heart-rate-fitness-band", clip: "band", name: "Heart-rate fitness band", summary: "A band that reads heart rate and steps, and syncs to a phone." },
  { id: "gesture-control-glove", clip: "glove", name: "Gesture control glove", summary: "A glove that turns hand movements into commands." },
] as const;

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeParticipants(n: number): Participant[] {
  const r = seeded(7);
  const out: Participant[] = [];
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    const q = Math.pow(1 - i / n, 2.2);
    let name = "";
    do name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
    while (used.has(name));
    used.add(name);
    const products = Math.max(0, Math.round(q * 7 + r() * 1.2 - 0.3));
    const published = Math.min(products, Math.round(products * (0.6 + r() * 0.4)));
    out.push({
      id: `p${i + 1}`,
      name,
      // The same draws whatever the groups (so the board stays the same); "" without groups.
      group: r() < 0.2 ? "" : (HACKATHON.groups.at(Math.floor(r() * r() * HACKATHON.groups.length)) ?? ""),
      products,
      published,
      votes: published ? Math.round(q * q * 320 * (0.5 + r())) : 0,
      referrals: Math.round(q * 14 * r()),
      buildDays: Math.min(7, Math.round(products * 0.8 + r())),
      moved: Math.round((r() - 0.45) * 8),
    });
  }
  return out;
}

export function pointsOf(p: Participant, extraVotes = 0): number {
  return (
    p.products * POINTS.build +
    p.published * POINTS.publish +
    (p.votes + extraVotes) * POINTS.vote +
    p.referrals * POINTS.referral +
    p.buildDays * POINTS.buildDay
  );
}

/** The board, best first, with the showcased products given to the leaders. */
export const PARTICIPANTS: Participant[] = (() => {
  const ps = makeParticipants(64).sort((a, b) => pointsOf(b) - pointsOf(a) || b.products - a.products);
  return ps.map((p, i) => {
    const proj = PROJECTS.at(i);
    if (!proj || p.published === 0) return p;
    const { clip, ...rest } = proj;
    // Pictures are small WebP copies of the Innovations PNGs (720 px card, 192 px avatar):
    // the 1024 px PNGs weighed 1–1.5 MB each, about 10 MB for the page.
    return {
      ...p,
      project: { ...rest, image: `/hackathons/products/${proj.id}.webp`, thumb: `/hackathons/products/${proj.id}-thumb.webp`, video: `/innovations/videos/${proj.id}--${clip}.mp4` },
    };
  });
})();

/** One row of the standings, with this account's votes counted in. */
export type Row = { p: Participant; pts: number; votes: number; rank: number };

/** The standings, best first, counting `myVotes` (the project ids this account voted for). */
export function standings(myVotes: readonly string[]): Row[] {
  return PARTICIPANTS.map((p) => {
    const extra = p.project && myVotes.includes(p.project.id) ? 1 : 0;
    return { p, pts: pointsOf(p, extra), votes: p.votes + extra };
  })
    .sort((a, b) => b.pts - a.pts || b.p.products - a.p.products)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export type GroupRow = { name: string; people: number; products: number; pts: number; leader: string };

/** The group ranking: each group's points are its participants' points summed. */
export function groupStandings(rows: readonly Row[]): GroupRow[] {
  const m = new Map<string, GroupRow>();
  for (const r of rows) {
    if (!r.p.group) continue;
    const g = m.get(r.p.group) ?? { name: r.p.group, people: 0, products: 0, pts: 0, leader: r.p.name };
    g.people += 1;
    g.products += r.p.products;
    g.pts += r.pts;
    m.set(r.p.group, g);
  }
  return [...m.values()].sort((a, b) => b.pts - a.pts);
}

export type Match = { a: Row; b: Row };

/**
 * 1 vs 1: the products by votes, paired in order — 1st against 2nd, 3rd
 * against 4th (the prototype's pairing). An odd one out waits for the next round.
 */
export function matchesOf(rows: readonly Row[]): Match[] {
  const entries = rows.filter((r) => r.p.project).sort((x, y) => y.votes - x.votes);
  const out: Match[] = [];
  for (let i = 0; i + 1 < entries.length; i += 2) {
    const a = entries.at(i);
    const b = entries.at(i + 1);
    if (a && b) out.push({ a, b });
  }
  return out;
}

/** Qualified = built the hackathon's minimum number of products. */
export const qualified = (p: Participant) => p.products >= HACKATHON.minProducts;

/** The AI quality a rank builds with (the top move up near the end, when the hackathon has that unlock). */
export function qualityOf(rank: number, now: number): string {
  const u = HACKATHON.aiUnlock;
  return u && rank <= u.top && HACKATHON.dates.end - now <= u.lastDays * 86_400_000 ? u.quality : HACKATHON.baseQuality;
}

export function phaseAt(now: number): Phase {
  const d = HACKATHON.dates;
  if (now < d.registration) return "soon";
  if (now < d.start) return "registration";
  if (now < d.end) return "live";
  if (now < d.results) return "judging";
  return "results";
}

export const prizePool = HACKATHON.prizes.reduce((s, x) => s + x, 0);

export const money = (n: number) => `${n.toLocaleString("en-US")} ${HACKATHON.currency}`;

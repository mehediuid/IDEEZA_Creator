// A hackathon's data — one campaign record (client 2026-11-17: "think about it
// like a campaign page: the style and the layout look exactly the same, but
// the data inside the page comes from the exact campaign"). The organizer
// designs the hackathon in the "IDEEZA Hackathons" prototype's setup; every
// word and number a hackathon's page shows that depends on that setup is read
// from its record, never typed in a section. campaignOf(record) gives a page
// everything it derives from one record (its groups' words, its board, its
// dates in its own time zone…); the list of hackathons is in campaigns.ts.
// The standings are SAMPLE data, made from a seeded walk so every visit draws
// the same board, and every figure is derived from these rows, never typed
// beside them.

export type Phase = "soon" | "registration" | "live" | "judging" | "results";

/** Who competes (the prototype's "Who competes?"). */
export type Unit = "solo" | "team" | "duel";
/** The group ranking beside the people's (the prototype's "Is there a group ranking as well?"). */
export type GroupBy = "none" | "university" | "country" | "custom";
/** How the winner is decided (the prototype's Winner step). */
export type WinBy = "score" | "shortlist" | "points";

export type Hackathon = {
  id: string;
  /** Its page's address: /hackathons/<slug>. */
  slug: string;
  /** A prototype sample (not a real campaign): the list and its page say so. */
  sample: boolean;
  /** The picture on its card in the list (one of the hackathon pages' own media). */
  cover: string;
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
  /** What is built, as the prototype's setup names it ("Hardware"). */
  category: string;
  /** The languages it runs in ("English, Amharic"). */
  langs: string;
  /** The AI mode every participant builds in ("Low Mode"). */
  baseQuality: string;
  /** A stronger AI mode for the top of the board near the end, or null. */
  aiUnlock: { top: number; lastDays: number; quality: string } | null;
  /** Extra rewards beyond the places, in the organizer's words, or null. */
  extras: string | null;
  /** A vote from the IDEEZA mobile app counts this many points (a web vote counts 1), or null when the app is off. */
  appVoteWeight: number | null;
  /** How voters verify ("Email"). */
  verify: string[];
  /** Points per action — the prototype's points table. */
  points: { build: number; publish: number; vote: number; referral: number; buildDay: number };
  criteria: { name: string; weight: number }[];
  judges: { name: string; role: string }[];
  rules: string;
  /**
   * The prototype's sample board: how many participants, the seed of the draw,
   * and which sample product the leader shows (0 = the first). Before building
   * starts a board has no entries (0).
   */
  board: { entrants: number; seed: number; firstProduct: number };
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

/** The running hackathon: the prototype's Ethiopia launch. */
export const VIBE_INVENTING: Hackathon = {
  id: "vibe-inventing-2026",
  slug: "vibe-inventing-ethiopia",
  sample: false,
  cover: "/hackathons/covers/vibe-inventing-ethiopia.webp",
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
  category: "Hardware",
  langs: "English, Amharic",
  baseQuality: "Low Mode",
  aiUnlock: { top: 50, lastDays: 3, quality: "Medium Mode" },
  extras: "Bonus AI credits and merch giveaways every 2 days",
  appVoteWeight: 2,
  verify: ["Email"],
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
  board: { entrants: 64, seed: 7, firstProduct: 0 },
};

/** The words for a hackathon's groups (null when it has none). */
const GROUP_WORDS = {
  none: null,
  university: { one: "university", many: "universities", title: "University", member: "student", members: "students", outside: "Not at a university" },
  country: { one: "country", many: "countries", title: "Country", member: "participant", members: "participants", outside: "Not from these countries" },
  custom: { one: "group", many: "groups", title: "Group", member: "member", members: "members", outside: "Not in a group" },
} as const;

/** The words for who competes: one person, or one team (the style can be switched on the page). */
export const entrantOf = (unit: Unit) => (unit === "team" ? { one: "team", many: "teams", title: "Team" } : { one: "builder", many: "builders", title: "Builder" });

const UNIT_LABEL: Record<Unit, string> = { solo: "Individuals", team: "Teams", duel: "1 vs 1 (head-to-head)" };
const GROUPBY_LABEL: Record<Exclude<GroupBy, "none">, string> = { university: "University vs university", country: "Country vs country", custom: "Custom groups" };

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

function makeParticipants(h: Hackathon, n: number): Participant[] {
  const r = seeded(h.board.seed);
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
      group: r() < 0.2 ? "" : (h.groups.at(Math.floor(r() * r() * h.groups.length)) ?? ""),
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

/** One row of the standings, with this account's votes counted in. */
export type Row = { p: Participant; pts: number; votes: number; rank: number };

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

/** "16 Nov, 09:00" in the hackathon's own time zone. */
const eatOf = (h: Hackathon, ms: number) => new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: h.timeZone });

const STAGE_NAME: Record<Phase, string> = { soon: "Registration opens soon", registration: "Registration", live: "Build & vote", judging: "Judging", results: "Results" };

function phaseOf(h: Hackathon, now: number): Phase {
  const d = h.dates;
  if (now < d.registration) return "soon";
  if (now < d.start) return "registration";
  if (now < d.end) return "live";
  if (now < d.results) return "judging";
  return "results";
}

const campaigns = new Map<string, ReturnType<typeof makeCampaign>>();

/** Everything a page derives from one hackathon's record (made once per hackathon). */
export function campaignOf(h: Hackathon) {
  const known = campaigns.get(h.id);
  if (known) return known;
  const c = makeCampaign(h);
  campaigns.set(h.id, c);
  return c;
}
export type Campaign = ReturnType<typeof campaignOf>;

function makeCampaign(h: Hackathon) {
  const POINTS = h.points;
  const GROUP = GROUP_WORDS[h.groupBy];

  const pointsOf = (p: Participant, extraVotes = 0): number =>
    p.products * POINTS.build + p.published * POINTS.publish + (p.votes + extraVotes) * POINTS.vote + p.referrals * POINTS.referral + p.buildDays * POINTS.buildDay;

  /** The board, best first, with the showcased products given to the leaders. */
  const PARTICIPANTS: Participant[] = makeParticipants(h, h.board.entrants)
    .sort((a, b) => pointsOf(b) - pointsOf(a) || b.products - a.products)
    .map((p, i) => {
      const proj = i < PROJECTS.length ? PROJECTS.at((i + h.board.firstProduct) % PROJECTS.length) : undefined;
      if (!proj || p.published === 0) return p;
      const { clip, ...rest } = proj;
      // Pictures are small WebP copies of the Innovations PNGs (720 px card, 192 px avatar):
      // the 1024 px PNGs weighed 1–1.5 MB each, about 10 MB for the page.
      return {
        ...p,
        project: { ...rest, image: `/hackathons/products/${proj.id}.webp`, thumb: `/hackathons/products/${proj.id}-thumb.webp`, video: `/innovations/videos/${proj.id}--${clip}.mp4` },
      };
    });

  return {
    HACKATHON: h,
    POINTS,
    /** The words the page uses for the hackathon's groups (null when there are none). */
    GROUP,
    /** "Individuals", "Teams", "1 vs 1 (head-to-head)" — the prototype's format names. */
    unitLabel: (unit: Unit) => UNIT_LABEL[unit],
    /** "University vs university"… — the group ranking's name, or null without groups. */
    groupByLabel: h.groupBy === "none" ? null : GROUPBY_LABEL[h.groupBy],
    /** How you compete, in the prototype's words. */
    competeLine: (unit: Unit) =>
      unit === "team"
        ? `You compete as a team of ${h.teamMin} to ${h.teamMax} people`
        : unit === "duel"
          ? "You compete head-to-head: one opponent per round, and the winner advances"
          : "You compete as an individual",
    /** Where a participant competes, as a line: their group, the open category, or nothing without groups. */
    groupOf: (p: Participant) => (GROUP ? p.group || "Open category" : ""),
    pointsOf,
    PARTICIPANTS,
    /** The standings, best first, counting `myVotes` (the project ids this account voted for). */
    standings: (myVotes: readonly string[]): Row[] =>
      PARTICIPANTS.map((p) => {
        const extra = p.project && myVotes.includes(p.project.id) ? 1 : 0;
        return { p, pts: pointsOf(p, extra), votes: p.votes + extra };
      })
        .sort((a, b) => b.pts - a.pts || b.p.products - a.p.products)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    /** Qualified = built the hackathon's minimum number of products. */
    qualified: (p: Participant) => p.products >= h.minProducts,
    /** The AI quality a rank builds with (the top move up near the end, when the hackathon has that unlock). */
    qualityOf: (rank: number, now: number): string => {
      const u = h.aiUnlock;
      return u && rank <= u.top && h.dates.end - now <= u.lastDays * 86_400_000 ? u.quality : h.baseQuality;
    },
    // The page's words, as the "IDEEZA Hackathons" prototype's landing page
    // writes them for a visitor (owner 2026-11-17: that page's content is final).
    /** "How it works": the steps from sign-up to winning, for this setup. */
    steps: (unit: Unit): [string, string][] => [
      ["Sign up or log in", "Create your IDEEZA account and verify your email."],
      ["Join the hackathon", `Join from this page${GROUP ? ` and pick your ${GROUP.one}` : ""}${unit === "team" ? ", then invite your teammates" : ""}. You get a personal referral link.`],
      ["Build", `Build ${h.minProducts > 1 ? `${h.minProducts} or more products` : "one or more products"} with IDEEZA AI in ${h.baseQuality}. A product counts when all design stages are done.`],
      ["Publish", "Publish each product to the NFT marketplace under Give to Community and to the social feed. No wallet or KYC is needed."],
      ["Share and collect votes", "Share your personal link on any platform. Votes on the IDEEZA social feed count."],
      ["Earn points", "Builds, posts and votes, referrals and streaks all add to one score on the leaderboard."],
      [
        "Climb and win",
        h.winBy === "score"
          ? `Judges’ scores count for ${h.judgesWeight}% and audience votes for ${100 - h.judgesWeight}%.`
          : h.winBy === "shortlist"
            ? `When the hackathon ends the leaderboard freezes. The top ${h.shortlist} are shortlisted and the judges pick the winners.`
            : "When the hackathon ends the leaderboard freezes. The participants with the most points win.",
      ],
    ],
    /** "Who can participate". */
    whoCan: (unit: Unit): string[] => [
      h.who,
      /world/i.test(h.where) ? "Open to participants worldwide" : `Open to participants in ${h.where}`,
      `You must be ${h.minAge} or older`,
      unit === "team" ? `You compete as a team of ${h.teamMin} to ${h.teamMax} people` : unit === "duel" ? "You compete head-to-head: one opponent per round, and the winner advances" : "You compete as an individual",
      ...(GROUP ? [`You pick your ${GROUP.one} when you join${h.openCategory ? ". Not part of one? Join the open category" : ""}`] : []),
      "You need an IDEEZA account with a verified email",
      ...(h.winBy !== "points" ? ["Judges cannot take part or vote"] : []),
    ],
    /** "How the winner is decided", in one paragraph. */
    decided:
      h.winBy === "score"
        ? "Judges’ scores and audience votes are combined into one final score."
        : h.winBy === "shortlist"
          ? `When the hackathon ends the standings freeze and the top ${h.shortlist} are shortlisted. The judges score them and confirm the winners.`
          : "The standings freeze when the hackathon ends. The participants with the most points win.",
    /** "Questions and answers". */
    faq: (): [string, string][] => [
      ["Is it free to take part?", `Yes. Joining is free, and every participant builds in ${h.baseQuality}.`],
      ["Do I need a crypto wallet or KYC?", "No. You can build, publish and vote without a wallet and without KYC."],
      [
        "How do votes count?",
        `Each person has ${h.votesPerPerson} votes. Only logged-in users with a verified account can vote.${h.appVoteWeight ? ` A vote from the IDEEZA mobile app counts as ${h.appVoteWeight} points. A vote on the web counts as 1 point.` : ""}`,
      ],
      ["Who owns my design?", "You do. Participants keep full ownership of their designs and intellectual property."],
      ["When are the winners announced?", `The hackathon ends on ${eatOf(h, h.dates.end)} (${h.timezone}). The winners are published on this page after judging.`],
    ],
    /** The phase's name ("Build & vote"…), as the status line and the phase pills say it. */
    stageName: (phase: Phase): string => STAGE_NAME[phase],
    /** The hero clock's words, and what it counts down to (null: no clock in this phase). */
    clockOf: (phase: Phase): { label: string; to: number | null } =>
      phase === "soon"
        ? { label: "Registration opens in", to: h.dates.registration }
        : phase === "registration"
          ? { label: "Registration closes in", to: h.dates.start }
          : phase === "live"
            ? { label: "The hackathon ends in", to: h.dates.end }
            : phase === "judging"
              ? { label: "The leaderboard is frozen. Judging is in progress", to: null }
              : { label: "This hackathon has ended", to: null },
    /** The timeline's dates (building and voting run together). */
    keyDates: (): [string, number][] => [
      ["Registration opens", h.dates.registration],
      ["Hackathon starts", h.dates.start],
      ["Hackathon ends", h.dates.end],
    ],
    phaseAt: (now: number) => phaseOf(h, now),
    prizePool: h.prizes.reduce((s, x) => s + x, 0),
    money: (n: number) => `${n.toLocaleString("en-US")} ${h.currency}`,
    /** "16 Nov, 09:00" in the hackathon's own time zone. */
    eat: (ms: number) => eatOf(h, ms),
  };
}

/** A hackathon's phase at `now` (the list reads it without making the whole campaign). */
export const phaseAt = phaseOf;

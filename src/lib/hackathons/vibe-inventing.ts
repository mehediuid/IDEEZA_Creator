// The IDEEZA Vibe Inventing Online Hackathon — the public hackathon page's data
// (owner 2026-11-16: the "IDEEZA Hackathons" prototype's landing page joins the
// website). Event facts (prizes, rules, eligibility, judging, dates) come from
// that prototype's Ethiopia launch record. The standings are SAMPLE data, made
// here from a seeded walk so every visit draws the same board, and every
// figure on the page is derived from these rows, never typed beside them (the
// prototype's 437 votes against a top three of 1,100 cannot happen).

export type Phase = "soon" | "registration" | "live" | "judging" | "results";

export type Participant = {
  id: string;
  name: string;
  /** University, or "" for the open category. */
  university: string;
  products: number;
  published: number;
  votes: number;
  referrals: number;
  buildDays: number;
  /** Places moved since the last hourly update (+ up, − down). */
  moved: number;
  /** The participant's showcased product, when they have one. */
  project?: { id: string; name: string; image: string; summary: string };
};

export const HACKATHON = {
  id: "vibe-inventing-2026",
  name: "IDEEZA Vibe Inventing Online Hackathon",
  lead: "A 160-hour online hackathon. Build products with IDEEZA AI, publish them to Give to Community, collect votes and climb the leaderboard.",
  category: "Hardware",
  where: "Ethiopia",
  minAge: 18,
  languages: "English, Amharic",
  timezone: "East Africa Time (EAT)",
  currency: "birr",
  prizes: [100_000, 40_000, 20_000],
  extras: "Bonus AI credits and merch giveaways every 2 days.",
  votesPerPerson: 10,
  minProducts: 3,
  shortlist: 10,
  // EAT = UTC+3. Registration two days before the start; 160 hours of building
  // and voting; judging for two days after.
  dates: {
    registration: Date.parse("2026-11-14T09:00:00+03:00"),
    start: Date.parse("2026-11-16T09:00:00+03:00"),
    end: Date.parse("2026-11-22T21:00:00+03:00"),
    results: Date.parse("2026-11-24T18:00:00+03:00"),
  },
  who: "University students, makers, engineers and anyone with a product idea",
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
} as const;

/** Points per action — the prototype's points table. */
export const POINTS = { build: 10, publish: 5, vote: 1, referral: 15, buildDay: 2 } as const;

export const UNIVERSITIES = [
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
] as const;

const FIRST = ["Abel", "Bethlehem", "Dawit", "Eden", "Fikir", "Hanna", "Kaleb", "Liya", "Meron", "Nahom", "Rahel", "Samuel", "Selam", "Tigist", "Yonas", "Zewdu", "Mahlet", "Biruk", "Saron", "Henok", "Mekdes", "Natnael", "Ruth", "Tewodros"];
const LAST = ["Abebe", "Bekele", "Girma", "Haile", "Kebede", "Lemma", "Mekonnen", "Tadesse", "Tesfaye", "Worku", "Alemu", "Desta", "Gebre", "Assefa", "Mulugeta", "Negash"];

// Showcased products: the platform's own sample products, so each has a real picture.
const PROJECTS = [
  { id: "lora-weather-station", name: "LoRa weather station", summary: "A solar weather station that reports over LoRa from rooftops and farms." },
  { id: "air-quality-room-sensor", name: "Air quality room sensor", summary: "Tells a classroom when to open a window, from CO2 and humidity." },
  { id: "smart-plant-watering-hub", name: "Smart plant watering hub", summary: "Waters each pot by what its soil needs, not by a timer." },
  { id: "solar-mppt-controller", name: "Solar MPPT controller", summary: "Gets more charge from a small panel into a battery." },
  { id: "soil-moisture-mesh-network", name: "Soil moisture mesh network", summary: "Sensors across a field that pass readings to one gateway." },
  { id: "line-following-micro-rover", name: "Line-following micro rover", summary: "A small rover that follows a taped line, built for teaching." },
  { id: "self-balancing-two-wheeler", name: "Self-balancing two-wheeler", summary: "A two-wheeled robot that stays upright on its own." },
  { id: "heart-rate-fitness-band", name: "Heart-rate fitness band", summary: "A band that reads heart rate and steps, and syncs to a phone." },
  { id: "gesture-control-glove", name: "Gesture control glove", summary: "A glove that turns hand movements into commands." },
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
      university: r() < 0.2 ? "" : UNIVERSITIES[Math.floor(r() * r() * UNIVERSITIES.length)],
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
    return proj && p.published > 0 ? { ...p, project: { ...proj, image: `/innovations/${proj.id}.png` } } : p;
  });
})();

/** Qualified = built the hackathon's minimum number of products. */
export const qualified = (p: Participant) => p.products >= HACKATHON.minProducts;

/** The AI quality a rank builds with (top 50 move up to Medium in the last 3 days). */
export const qualityOf = (rank: number, now: number) =>
  rank <= 50 && HACKATHON.dates.end - now <= 3 * 86_400_000 ? "Medium" : "Low";

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

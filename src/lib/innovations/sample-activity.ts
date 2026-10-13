// A sample post's Activity (owner, 2026-10-13: the post shows the project's
// Activity — now and earlier — in place of a progress bar, decision A). The
// feed's projects have no journey of their own, so each gets one here, built
// the way a maker would have logged it: a few entries on the project leading
// up to its current type, one or two on each product, every entry with proof
// (journey.ts's rule), and on some projects an "Others" entry under its own
// name, so the post reads exactly as a real one does.
//
// Pure and deterministic: the same post and `now` give the same journey. The
// entries run from the project's start to a few days before `now`, so "Now"
// reads as a living project rather than one last touched long ago. Proof files
// are the images the app ships (`/innovations/…`); `getMediaFile` reads a key
// that starts with "/" over the network. Relative imports only.

import { CATALOGUES, currentOf, shortOf, type Activity, type ActivityTarget, type MediaRef, type ProjectJourney } from "../manual/journey";
import type { InnovationPost } from "./types";

const DAY = 86_400_000;

/** The project types in their usual order; a sample walks up to its stage. */
const ORDER = CATALOGUES.project.map((t) => t.id).filter((id) => id !== "others" && id !== "planning");

const WORDS: Record<string, (title: string) => string> = {
  design: (t) => `Board, case and firmware for the ${t} are drawn up. Shared the first renders for feedback.`,
  prototype: (t) => `First working ${t} on the bench. Everything powers up; two footprints needed fixing.`,
  testing: (t) => `Ran the ${t} for two weeks straight. Logged the failures and fixed the worst three.`,
  certification: () => `Pre-compliance scan done at a local lab. Radiated emissions pass with margin.`,
  "ready-for-manufacture": () => `Files frozen, parts ordered with a 20 % buffer, and a factory quoted the first batch.`,
  "pilot-run": () => `Fifty units off the line. Yield was 94 %; the rest had a cold joint on one connector.`,
  manufacturing: () => `Batch two is in production. Lead time is down to three weeks.`,
  launched: (t) => `The ${t} is on sale. First orders shipped this week.`,
  improvement: () => `Version 1.1: a quieter power stage and a firmware fix for the reconnect bug.`,
};

/** A few posts end on an "Others" entry, named the way their makers named it. */
const OTHERS: Record<string, { name: string; words: string }> = {
  "hexapod-walking-robot": { name: "Demo at a maker fair", words: "Walked the hexapod across a table for two days at the city maker fair. Most asked about the gait code." },
  "e-ink-smartwatch": { name: "Beta units to testers", words: "Sent ten watches to early testers. Battery life is the first thing they all mentioned." },
  "pocket-synth-sequencer": { name: "Workshop with students", words: "Ran a soldering workshop where twelve students built one each. Three needed help with the keyboard matrix." },
  "lora-weather-station": { name: "Field test on a rooftop", words: "Mounted the station on a rooftop for a month. LoRa reached the gateway 2.1 km away through rain." },
};

function media(id: string, src: string, name: string): MediaRef {
  return { id, name, mime: src.endsWith(".jpg") ? "image/jpeg" : "image/png", kind: "image", size: 0, blobKey: src };
}

function entry(post: InnovationPost, n: number, target: ActivityTarget, type: string, at: number, description: string, proof: MediaRef[], customName?: string): Activity {
  return {
    v: 2,
    id: `${post.id}:act-${n}`,
    projectId: post.id,
    target,
    type,
    ...(customName ? { customName } : null),
    description,
    urls: [],
    media: proof,
    createdAt: at,
    updatedAt: at,
  };
}

/** The post's journey: project entries up to its stage (and an "Others" for some), then its products'. */
export function sampleJourneyOf(post: InnovationPost, now: number = post.updatedAt + 60 * DAY): ProjectJourney {
  const activities: Activity[] = [];
  const cover = post.media.find((m) => m.kind === "image");
  const coverSrc = cover && cover.kind === "image" ? cover.src : null;
  const proofFor = (n: number, label: string): MediaRef[] => {
    const product = post.products[n % Math.max(1, post.products.length)];
    const src = product?.image ?? coverSrc;
    return src ? [media(`${post.id}:m${n}`, src, `${label}.${src.endsWith(".jpg") ? "jpg" : "png"}`)] : [];
  };
  const stage = post.stage && ORDER.includes(post.stage) ? post.stage : "prototype";
  const steps = ORDER.slice(0, ORDER.indexOf(stage) + 1).slice(-3);
  const span = Math.max(steps.length + 1, 1);
  const start = post.createdAt;
  const end = Math.max(start + 30 * DAY, now - 5 * DAY);
  let n = 0;
  steps.forEach((type, i) => {
    const at = start + Math.round(((i + 1) / span) * (end - start));
    activities.push(entry(post, n, { kind: "project" }, type, at, WORDS[type]?.(post.title.toLowerCase()) ?? "", proofFor(n, type)));
    n += 1;
  });
  const other = OTHERS[post.slug];
  if (other) {
    activities.push(entry(post, n, { kind: "project" }, "others", end + 2 * DAY, other.words, proofFor(n, "photo"), other.name));
    n += 1;
  }
  post.products.forEach((p, i) => {
    const type = i === 0 ? stage : "prototype";
    const at = start + Math.round((0.6 + 0.1 * i) * (end - start));
    activities.push(
      entry(post, n, { kind: "product", productId: p.id }, type, at, WORDS[type]?.(p.name.toLowerCase()) ?? "", p.image ? [media(`${post.id}:p${i}`, p.image, `${p.id}.png`)] : proofFor(n, p.id)),
    );
    n += 1;
  });
  return { v: 1, activities };
}

/** The post's status chip: the project's current Activity, by its short name ("Others" by its own). */
export function sampleStatusOf(post: InnovationPost): string | null {
  const current = currentOf(sampleJourneyOf(post), post.id, { kind: "project" }, post.createdAt);
  return current ? shortOf(current) : null;
}

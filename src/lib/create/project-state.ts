// One project model, read by both the canvas (chat-thread.tsx) and the rail
// (chat-rail.tsx) — docs/superpowers/specs/2026-09-25-chat-rail-redesign-
// design.md §5. Before this module the same "changed since the build" and
// "doesn't fit" answers were worked out twice, in two components, and could
// drift. Everything here is a pure function of a ChatSession (and, once a
// build exists, its BuildJob): no hooks, no `use client`, so the same
// derivation runs in the browser and in the node:test harness.
//
// Relative imports only (like lib/spec): the test harness compiles this
// file alone with a plain `tsc`, with no `paths` mapping, so an `@/…` import
// anywhere in its dependency chain would not resolve.

import type { Companion } from "./companions";
import { buildCost } from "./credits";
import { asConceptSummary } from "../spec/hints";
import type { ConceptPart, ConceptSummary } from "./concept";
import {
  productsOf,
  statusOf,
  type BuildItem,
  type BuildItemKind,
  type BuildJob,
  type BuildStatus,
  type ChatSession,
  type ChatTurn,
  type SetupAnswer,
} from "./history";
import { batteryOf } from "../spec/batteries";
import { RADIOS, radioChoices, radioKeyOf } from "../spec/catalog";
import { blocksBuild, deriveSpec, effectiveParts, specKey } from "../spec/derive";
import { rebaseEdits, stampTurnOf } from "../spec/edits";
import { cleanEdits } from "../spec/hints";
import { cardFactsOf, chargesOf, packCellOf, standaloneOf, type SpecFactTone } from "../spec/facts";
// The radio as format.ts reads it — the card's reading — so the row, the
// card and the pairing below say one radio the same way.
import { radioOf } from "../spec/format";
import { pairsOf } from "./confidence";
import type { BatteryKey, ResolvedSpec, SpecEdits } from "../spec/types";

type SetupTurn = Extract<ChatTurn, { role: "setup" }>;
type AssistantTurn = Extract<ChatTurn, { role: "assistant" }>;

/** The key a product's spec edits, its build membership and its build
 *  snapshot are all filed under — "primary" or a companion id. */
export function productIdOf(t: AssistantTurn): string {
  return t.companionOf ?? "primary";
}

/** The name the question gave this turn's product — the same name the rail,
 *  the composer and the card use. Undefined before the question answers
 *  (or on a pre-setup chat), which callers fall back from on their own,
 *  since the fallback differs by surface ("Your product" here, "concept 1"
 *  on the card). */
export function productNameOf(setup: SetupTurn | undefined, t: AssistantTurn): string | undefined {
  if (!setup) return undefined;
  if (!t.companionOf) return setup.productName?.trim() || undefined;
  return setup.companions.find((c) => c.id === t.companionOf)?.name;
}

/** A companion's own name, for the turn by this id — what its brief opens
 *  with ("{name} for {the maker's idea}"), and what the stand-in reads as
 *  the product's own words in place of the idea it serves. Undefined for
 *  the primary, whose whole brief is its own. */
export function companionNameOf(turns: ChatTurn[], turnId: string): string | undefined {
  const t = turns.find((x) => x.id === turnId);
  if (!t || t.role !== "assistant" || !t.companionOf) return undefined;
  return productNameOf(
    turns.find((x): x is SetupTurn => x.role === "setup"),
    t,
  );
}

/** The name the rail's row gives a product, which the composer uses too:
 *  the question's name, else "Your product" — a chat from before the
 *  question, or a product the question didn't name. */
export function railNameOf(setup: SetupTurn | undefined, t: AssistantTurn): string {
  return productNameOf(setup, t) ?? "Your product";
}

// ─────────────────────────── projectState ───────────────────────────

export type ProjectState = {
  setup: SetupTurn | undefined;
  answer: SetupAnswer | undefined;
  /** One turn per product — its CURRENT concept — primary first. */
  products: AssistantTurn[];
  /** companionIds ticked off the next build; the concepts stay. */
  leftOut: Set<string>;
  /** What the next build takes: the primary always, plus every product not
   *  ticked off. */
  selected: AssistantTurn[];
  /** Each ready card's concept, as read back from storage and checked —
   *  exposed so `railRows` doesn't parse `t.concept` a second time and risk
   *  disagreeing with the specs computed here. Not part of the spec's §5
   *  table; see the R1 report's deviations. */
  concepts: Map<string, ConceptSummary | undefined>;
  /** Each ready card's parts as the maker has edited them on the sheet
   *  (lib/spec/edits.ts), with the socket its supply comes in by — the list
   *  its spec was worked out from (effectiveParts), so what its card, its
   *  rail row and its sheet say it is made of is what a build of it is made
   *  from. Absent while the concept is still being read. */
  parts: Map<string, ConceptPart[]>;
  /** Each product's edits as they apply to its current concept (rebaseEdits):
   *  a part taken out that this concept doesn't carry is no edit. By turn. */
  edits: Map<string, SpecEdits>;
  /** A product whose part changes were made on an older concept of it — the
   *  turn they were made on, by the turn now on screen, or "" when that is
   *  this turn, read again since. The sheet says they still apply. */
  editedOn: Map<string, string>;
  /** Each ready card's spec. Null while the concept is still being read. */
  specs: Map<string, ResolvedSpec | null>;
  /** A chosen product whose size its parts can't fit, not agreed as Draft —
   *  holds the build (spec S3). */
  specBlock: AssistantTurn | undefined;
  /** Is this exact drawing what the current build was made from. */
  inBuild: (t: AssistantTurn) => boolean;
  /** This product's next build would differ from what the build holds — its
   *  drawing, or its spec. The one per-product answer: `specChanged` and the
   *  rail's "Changed" tag both read it, so a legacy build with edits can't
   *  say "Spec changed" on the canvas and nothing on the row. */
  productChanged: (t: AssistantTurn) => boolean;
  /** A chosen product's concept differs from the build (drawn again, not
   *  ready, or added since). */
  conceptChanged: boolean;
  /** A chosen, built product's spec differs from what the build booked. */
  specChanged: boolean;
  changedSinceBuild: boolean;
  /** Offered, never drawn — not yet in the project. */
  available: Companion[];
  /** Drawn once, then taken out of the project — free to restore. */
  removed: Companion[];
  /** Every chosen product has a ready concept. */
  allReady: boolean;
  /** A chosen product whose latest concept failed. */
  failedChoice: AssistantTurn | undefined;
};

/** The memo block that lived in chat-thread.tsx (products, leftOut,
 *  selected, specs, specBlock, inBuild, conceptChanged, specChanged,
 *  changedSinceBuild, available, removed, allReady, failedChoice) — moved
 *  here so the canvas and the rail can't disagree about what a chat and its
 *  build mean. */
export function projectState(chat: ChatSession, job?: BuildJob | null): ProjectState {
  const setup = chat.turns.find((t): t is SetupTurn => t.role === "setup");
  const answer = setup?.answer;

  // A product taken out of the project keeps its turns (the rail is the
  // history), so membership is read from the answer, not from which
  // products happen to have been drawn.
  const products = (() => {
    const latest = new Map<string, AssistantTurn>();
    for (const t of chat.turns) {
      if (t.role !== "assistant") continue;
      latest.set(t.companionOf ?? "primary", t);
    }
    // Primary first; the companions keep the order they were offered in.
    const primary = latest.get("primary");
    const rest = [...latest.entries()]
      .filter(([k]) => k !== "primary" && (!answer || answer.picked.includes(k)))
      .map(([, t]) => t);
    return primary ? [primary, ...rest] : rest;
  })();

  // What the next build takes: the primary always (Part 4 §4.4.4), and
  // every other product the maker has not ticked off.
  const leftOut = new Set(answer?.leftOut ?? []);
  const selected = products.filter((t) => !t.companionOf || !leftOut.has(t.companionOf));

  // Each card's concept as read back from storage — checked, because a
  // stored reading from an older build of this page, or a hand-edited one,
  // put a part with no name straight into the spec's rules.
  const concepts = new Map<string, ConceptSummary | undefined>();
  for (const t of products) concepts.set(t.id, asConceptSummary(t.concept));

  // Each ready card's spec, worked out from its concept's parts, the
  // model's hints and the maker's edits. Null while the concept is still
  // being read.
  const specs = new Map<string, ResolvedSpec | null>();
  const parts = new Map<string, ConceptPart[]>();
  const editsBy = new Map<string, SpecEdits>();
  const editedOn = new Map<string, string>();
  for (const t of products) {
    const concept = t.status === "ready" ? concepts.get(t.id) : undefined;
    const stored = cleanEdits(answer?.specs?.[productIdOf(t)]);
    // Part edits outlive a Refine or a Regenerate; on the new concept they
    // are read as they apply to it.
    const rebased = concept ? rebaseEdits(stored, concept.parts, t.id) : { edits: stored, olderConcept: false };
    const edits = rebased.edits;
    editsBy.set(t.id, edits);
    // The turn they were made on — or none to name, when it is this turn,
    // read again since: the sheet says "an earlier concept".
    if (rebased.olderConcept && stored.basedOn) {
      const on = stampTurnOf(stored.basedOn);
      editedOn.set(t.id, on === t.id ? "" : on);
    }
    const spec = concept ? deriveSpec(concept.parts, concept.hints, edits) : null;
    specs.set(t.id, spec);
    // The parts the spec was worked out from — a barrel jack left from a
    // switch to the wall and back, or a port set to None, never shows here
    // when the spec and the build have dropped it.
    if (concept && spec) parts.set(t.id, effectiveParts(concept.parts, spec.battery, edits));
  }

  // A chosen product whose size its parts can't fit, and that the maker has
  // not agreed to build as Draft, holds the build (spec S3).
  const specBlock = selected.find((t) => {
    const s = specs.get(t.id);
    return s && blocksBuild(s);
  });

  // Offered, and not being built: no concept has been drawn for it and the
  // answer did not include it.
  const drawn = new Set(
    chat.turns
      .filter((t): t is AssistantTurn => t.role === "assistant" && !!t.companionOf)
      .map((t) => t.companionOf!),
  );
  const available =
    setup?.status === "answered" ? setup.companions.filter((x) => !drawn.has(x.id)) : [];
  // Drawn once, then taken out: their concepts are still here to put back.
  const removed = setup?.answer
    ? setup.companions.filter((x) => drawn.has(x.id) && !setup.answer!.picked.includes(x.id))
    : [];

  // Which drawings the current build was made from. A concept changed after
  // the build — refined, regenerated, or a product added — is not in it.
  const builtImages = new Set(
    job ? productsOf(job).map((p) => p.conceptImageUrl).filter(Boolean) : [],
  );
  const inBuild = (t: AssistantTurn) => !!t.imageUrl && builtImages.has(t.imageUrl);

  // Changed means the next build would differ from the one on screen: a
  // chosen product drawn again or added, or one the build holds that has
  // since been left out or removed.
  // A spec edited after the build is a change too: the booked snapshot is
  // what the deliverables say, so a different size or pack needs a new
  // build. A build booked before products had a spec has no snapshot to
  // compare with — it was made with no decisions at all, so any edit since
  // is one.
  const specChangedFor = (t: AssistantTurn) => {
    if (!job) return false;
    const now = specs.get(t.id);
    if (!now || !inBuild(t)) return false;
    const booked = productsOf(job).find((p) => p.id === productIdOf(t))?.spec;
    // The turn the edits were made on decides nothing that is built.
    if (!booked) return Object.keys(editsBy.get(t.id) ?? {}).some((k) => k !== "basedOn");
    return specKey(now) !== specKey(booked);
  };
  const productChanged = (t: AssistantTurn) =>
    !!job && (t.status !== "ready" || !inBuild(t) || specChangedFor(t));
  const specChanged = !!job && selected.some(specChangedFor);
  const conceptChanged =
    !!job &&
    (selected.some((t) => t.status !== "ready" || !inBuild(t)) ||
      builtImages.size !== selected.filter(inBuild).length);
  const changedSinceBuild = conceptChanged || specChanged;

  const allReady = selected.length > 0 && selected.every((t) => t.status === "ready");
  const failedChoice = selected.find((t) => t.status === "failed");

  return {
    setup,
    answer,
    products,
    leftOut,
    selected,
    concepts,
    parts,
    edits: editsBy,
    editedOn,
    specs,
    specBlock,
    inBuild,
    productChanged,
    conceptChanged,
    specChanged,
    changedSinceBuild,
    available,
    removed,
    allReady,
    failedChoice,
  };
}

// ─────────────────────────── railRows ───────────────────────────

/** The order spec §2.4's status line picks from — the first that applies
 *  wins. `conflict` outranks every build phase: a spec edited after the
 *  build to no longer fit says so before the pipeline does. */
export type RailPhase =
  | "drawing"
  | "failed"
  | "conflict"
  | "queued"
  | "running"
  | "piece-failed"
  | "built"
  | "reading"
  | "draft"
  | "ready";

export type RailRow = {
  productId: string;
  name: string;
  turnId: string;
  conceptLabel: string;
  imageUrl?: string;
  phase: RailPhase;
  /** When the current turn started drawing — the row's own elapsed clock. */
  since?: number;
  /** The card's facts for this product (format.ts `cardFacts`) but its size —
   *  its power, its radio and what it is for. One line in the row, and with
   *  the size in front it was the fact that says what the product does that
   *  got cut. A size that doesn't fit is the row's status line already.
   *  Omitted while drawing, failed, before a spec exists, and for a stand-in:
   *  those numbers are generic parts', not this product's. */
  facts: { key: string; text: string; tone: SpecFactTone }[];
  /** The model didn't answer, so the card's parts are the generic stand-in
   *  (review 2 I4) — the row says so instead of showing its numbers. */
  standIn: boolean;
  leftOut: boolean;
  tag?: "Left out" | "Not in this build" | "Changed";
  /** Present whenever a build exists and covers this product, regardless of
   *  `phase` — the pipeline is a separate element from the status line and
   *  keeps showing even while the status line reads `conflict`. */
  build?: {
    ready: number;
    total: number;
    /** 0–1, for the row's own progress bar (`scaleX`). */
    progress: number;
    failedKinds: BuildItemKind[];
    items: BuildItem[];
  };
};

function buildInfoFor(items: BuildItem[]) {
  const live = items.filter((i) => i.status !== "skipped");
  const ready = live.filter((i) => i.status === "ready").length;
  return {
    ready,
    total: live.length,
    progress: live.length ? ready / live.length : 0,
    failedKinds: live.filter((i) => i.status === "failed").map((i) => i.kind),
    items: live,
  };
}

function phaseFor(
  t: AssistantTurn,
  spec: ResolvedSpec | null,
  buildItems: ReturnType<typeof buildInfoFor> | undefined,
  jobStatus: BuildStatus | undefined,
): RailPhase {
  if (t.status === "pending") return "drawing";
  if (t.status === "failed") return "failed";
  if (spec && blocksBuild(spec)) return "conflict";
  if (buildItems) {
    if (jobStatus === "queued") return "queued";
    const failed = buildItems.failedKinds.length > 0;
    const building = buildItems.items.some((i) => i.status === "building" || i.status === "pending");
    if (failed && !building) return "piece-failed";
    if (buildItems.total > 0 && buildItems.ready === buildItems.total) return "built";
    return "running";
  }
  if (t.status === "ready" && !spec) return "reading";
  if (spec?.draftAtSize) return "draft";
  return "ready";
}

/** One selectable row per product — spec §2.4. Reads the state both the
 *  canvas and the rail share, plus the concept-numbering map every card
 *  already computes (`conceptLabels`, kept in chat-thread.tsx: it names
 *  turns from the whole chat's lineage, not this module's concern). */
export function railRows(
  state: ProjectState,
  labels: Map<string, string>,
  job?: BuildJob | null,
): RailRow[] {
  const jobStatus = job ? statusOf(job) : undefined;
  const buildProducts = job ? productsOf(job) : [];
  const buildByProductId = new Map(buildProducts.map((p) => [p.id, p]));
  const peers = peersOf(state);

  return state.products.map((t) => {
    const productId = productIdOf(t);
    const name = railNameOf(state.setup, t);
    const conceptLabel = labels.get(t.id) ?? "1";
    const spec = state.specs.get(t.id) ?? null;
    const leftOut = !!t.companionOf && state.leftOut.has(t.companionOf);
    const isPrimary = !t.companionOf;

    const buildProduct = job ? buildByProductId.get(productId) : undefined;
    const build = buildProduct ? buildInfoFor(buildProduct.items) : undefined;
    const phase = phaseFor(t, spec, build, jobStatus);

    const standIn = t.status === "ready" && !!state.concepts.get(t.id)?.fallback;
    const facts =
      t.status === "ready" && spec && !standIn
        ? // The card's own facts, run into one line: the row and the card
          // can't say two different things about the same product — both
          // read the parts as edited, the ones the build is made from. A
          // product that talks to another says who, in place of its radio.
          rowFacts(spec, state.parts.get(t.id) ?? [], linksFor(peers, productId))
            .filter((f) => f.key !== "size")
            .map((f) => ({
              key: f.key,
              text: f.label ? `${f.label} ${f.value}` : f.value,
              tone: f.tone,
            }))
        : [];

    // The primary carries no tag — its "Always built" lives on its card
    // (spec §2.4 Line 1).
    let tag: RailRow["tag"];
    if (!isPrimary) {
      if (leftOut) {
        tag = "Left out";
      } else if (job && !buildProduct) {
        tag = "Not in this build";
      } else if (job && buildProduct && state.productChanged(t)) {
        tag = "Changed";
      }
    }

    return {
      productId,
      name,
      turnId: t.id,
      conceptLabel,
      imageUrl: t.imageUrl,
      phase,
      since: t.status === "pending" ? t.ts : undefined,
      facts,
      standIn,
      leftOut,
      tag,
      build,
    };
  });
}

/** The card's facts (format.ts `cardFacts`), with the products it pairs
 *  with over its radio in place of the radio itself — and that radio fact
 *  last. The row is one line, cut at its end, and "Pairs with Remote
 *  Controller" ahead of the part cut "Drives TT gear motor", the fact that
 *  says what the product is: so power, then what it does, then its radio.
 *  A broken pairing ("Can't pair with X") is a warning, and the cut must
 *  never take a warning, so that one leads the row instead. */
function rowFacts(spec: ResolvedSpec, parts: ConceptPart[], links: ProductLink[]) {
  const pairs = links.filter((l) => l.about === "radio");
  const facts = cardFactsOf(spec, parts, radioOf(parts), pairs);
  const radio = facts.filter((f) => f.key === "radio");
  const rest = facts.filter((f) => f.key !== "radio");
  const warned = radio.filter((f) => f.tone !== "plain");
  return [...warned, ...rest, ...radio.filter((f) => f.tone === "plain")];
}

// ─────────────────────────── linksOf ───────────────────────────
//
// The products of one project work together: a car and its remote are one
// system, a spare pack swaps into the car, a charger fills its pack. An edit
// to one can break that, so the sheet says so at the edit, not the build
// review after the credits are spent (confidence.ts's compatibilityIssues is
// the same radio check, read there).

/** One product another works with, as that other one's sheet says it. */
export type ProductLink = {
  otherId: string;
  otherName: string;
  about: "radio" | "power";
  /** They still work together. */
  ok: boolean;
  text: string;
};

/** A ready product as linksFor reads it. */
export type LinkPeer = {
  id: string;
  name: string;
  primary: boolean;
  /** As edited — what is built. */
  parts: ConceptPart[];
  conceptParts: ConceptPart[];
  spec: ResolvedSpec;
};

/** The project's ready products, read with their specs. A stand-in's parts
 *  are generic ones, not the product's, so it pairs with nothing. */
export function peersOf(state: ProjectState): LinkPeer[] {
  return state.products.flatMap((t) => {
    const spec = state.specs.get(t.id);
    const concept = state.concepts.get(t.id);
    if (t.status !== "ready" || !spec || !concept || concept.fallback) return [];
    return [
      {
        id: productIdOf(t),
        name: railNameOf(state.setup, t),
        primary: !t.companionOf,
        parts: state.parts.get(t.id) ?? concept.parts,
        conceptParts: concept.parts,
        spec,
      },
    ];
  });
}

/** What `productId` works with in its project, and whether it still does:
 *  the companions it talks to over a radio, or for a companion the primary
 *  it talks to, the spare pack that swaps into it
 *  or the product it swaps into, and the charger that fills its pack or the
 *  pack it fills. Pure; `linksFor` over the same products, so a sheet can
 *  ask it of an edit before it is made. */
export function linksOf(state: ProjectState, productId: string): ProductLink[] {
  return linksFor(peersOf(state), productId);
}

export function linksFor(peers: LinkPeer[], productId: string): ProductLink[] {
  const me = peers.find((p) => p.id === productId);
  if (!me) return [];
  return [...radioLinks(peers, me), ...powerLinks(peers, me)];
}

/** The sheet's word for a product's radio — "nRF24L01", "Bluetooth LE" —
 *  or the card's reading for a module the catalog doesn't list. */
function radioLabel(parts: ConceptPart[]): string | null {
  const key = radioKeyOf(parts);
  if (key === "none") return null;
  return key ? RADIOS[key].label : radioOf(parts);
}

/** The primary and each companion that is meant to talk over a radio
 *  (ResolvedSpec.speaks), and no other pair: a car talks to its remote, and
 *  to a charger given a radio, but those two are each the car's, not each
 *  other's. The build review pairs by the same rule (confidence.ts
 *  pairsOf), so it never says two products won't talk that this never
 *  paired. */
function radioLinks(peers: LinkPeer[], me: LinkPeer): ProductLink[] {
  if (!me.spec.speaks) return [];
  const others = pairsOf(peers, (p) => p.primary).flatMap(([a, b]) =>
    a === me ? [b] : b === me ? [a] : [],
  );
  return others.flatMap((o): ProductLink[] => {
    if (!o.spec.speaks) return [];
    // Compared the way the build review compares them (compatibilityIssues).
    const a = radioOf(me.parts);
    const b = radioOf(o.parts);
    if (!a && !b) return [];
    const ok = !!a && a === b;
    const mine = radioLabel(me.parts);
    const theirs = radioLabel(o.parts);
    let text: string;
    if (ok) {
      text = `Talks to ${o.name} — both use ${mine}.`;
    } else if (theirs) {
      const key = radioKeyOf(o.parts);
      const canPick = key !== null && radioChoices(me.parts).some((c) => c.key === key);
      text = canPick
        ? `${o.name} uses ${theirs} — these two won't talk. Pick ${theirs} here, or change ${o.name}'s radio.`
        : `${o.name} uses ${theirs} — these two won't talk. Change ${o.name}'s radio${mine ? ` to ${mine}` : ""}.`;
    } else {
      text = `${o.name} has no wireless — these two won't talk until it has ${mine} too.`;
    }
    return [{ otherId: o.id, otherName: o.name, about: "radio", ok, text }];
  });
}

const isPack = (k: BatteryKey) => k !== "none" && k !== "adapter";

/** Those of `candidates` that match; with none that does, the one it is
 *  meant for — the primary, else the first — so a pack that fits nothing
 *  says so once, not once per product. */
function meantFor(candidates: LinkPeer[], match: (p: LinkPeer) => boolean): LinkPeer[] {
  const matching = candidates.filter(match);
  if (matching.length) return matching;
  const one = candidates.find((p) => p.primary) ?? candidates[0];
  return one ? [one] : [];
}

function powerLinks(peers: LinkPeer[], me: LinkPeer): ProductLink[] {
  const kind = (p: LinkPeer) => standaloneOf(p.conceptParts);
  // Products that carry a pack of their own, and the spare packs.
  const users = peers.filter((p) => !kind(p) && isPack(p.spec.battery));
  const spares = peers.filter((p) => kind(p) === "pack" && isPack(p.spec.battery));
  const chargers = peers.filter((p) => kind(p) === "charger");
  const pack = (p: LinkPeer) => batteryOf(p.spec.battery).label;
  const out: ProductLink[] = [];
  const link = (other: LinkPeer, ok: boolean, text: string) =>
    out.push({ otherId: other.id, otherName: other.name, about: "power", ok, text });

  // A spare pack has to be the pack of the product it swaps into.
  for (const spare of spares) {
    for (const user of meantFor(users, (u) => u.spec.battery === spare.spec.battery)) {
      const ok = user.spec.battery === spare.spec.battery;
      if (me.id === spare.id) {
        const b = batteryOf(spare.spec.battery);
        link(
          user,
          ok,
          ok
            ? `${b.mAh} mAh at ${b.volts} V · swaps into ${user.name}.`
            : `${user.name} uses ${pack(user)} — this won't swap into it any more.`,
        );
      } else if (me.id === user.id) {
        link(
          spare,
          ok,
          ok
            ? `${spare.name} swaps in — the same ${pack(spare)}.`
            : `${spare.name} is ${pack(spare)} — it won't swap into this any more.`,
        );
      }
    }
  }

  // A charger has to charge that pack's cells; with no product carrying a
  // pack, it is the spare pack's charger.
  for (const charger of chargers) {
    const cell = (chargesOf(charger.parts) ?? chargesOf(charger.conceptParts))?.cell;
    if (!cell) continue;
    const fills = (p: LinkPeer) => packCellOf(p.spec.battery) === cell;
    for (const target of meantFor(users.length ? users : spares, fills)) {
      const ok = fills(target);
      if (me.id === charger.id) {
        const verb = kind(target) === "pack" ? "is" : "uses";
        link(
          target,
          ok,
          ok ? `Charges ${target.name}'s ${pack(target)}.` : `Charges ${cell} — ${target.name} ${verb} ${pack(target)}.`,
        );
      } else if (me.id === target.id) {
        link(
          charger,
          ok,
          ok ? `${charger.name} charges this pack.` : `${charger.name} charges ${cell} — it can't charge this ${pack(target)}.`,
        );
      }
    }
  }
  return out;
}

// ─────────────────────────── sheetTurnOf ───────────────────────────

/** The drawing the spec sheet shows for a product: its current one, landed
 *  and read, with a spec worked out. Null while it draws (a Regenerate or a
 *  Refine starts a new one), when it failed, while it is still being read,
 *  and for a product the project doesn't hold. The sheet closes then, and
 *  stays closed — it used to vanish and come back by itself when the
 *  reading landed. */
export function sheetTurnOf(
  state: ProjectState,
  productId: string | null,
): AssistantTurn | null {
  if (productId === null) return null;
  const t = state.products.find((x) => productIdOf(x) === productId);
  return t && t.status === "ready" && state.specs.get(t.id) ? t : null;
}

// ─────────────────────────── stageOf ───────────────────────────

export type Stage = "idea" | "concepts" | "build" | "save" | "saved";

/** Where the header's stepper is — spec §2.2. */
export function stageOf(chat: ChatSession, job?: BuildJob | null): Stage {
  const setup = chat.turns.find((t): t is SetupTurn => t.role === "setup");
  if (setup && setup.status !== "answered") return "idea";
  if (!job) return "concepts";
  if (statusOf(job) !== "ready") return "build";
  if (!job.projectId) return "save";
  return "saved";
}

// ─────────────────────────── nextStep ───────────────────────────

export type NextStepTone = "working" | "attention" | "neutral";

export type JumpTarget =
  | { kind: "setup" }
  | { kind: "card" | "retry" | "spec"; productId: string }
  | { kind: "build" | "credits" | "review" | "add" };

export type NextStep = {
  tone: NextStepTone;
  text: string;
  target?: JumpTarget;
  /** The button's accessible name: its visible "Show on canvas" first, so
   *  voice control reaches it by what it says (WCAG 2.5.3), then where it goes. */
  targetLabel?: string;
};

/** The next-step slot's one sentence — spec §2.3. The first rule that
 *  matches wins; `rows` (not raw turns) decide 4–6, so the sentence can
 *  never say something the rail's own rows disagree with. */
export function nextStep(args: {
  state: ProjectState;
  rows: RailRow[];
  job?: BuildJob | null;
  balance: number;
  hydrated: boolean;
  projectName?: string;
  savedName?: string;
}): NextStep | null {
  const { state, rows, job, balance, hydrated, projectName, savedName } = args;
  const setup = state.setup;

  // #1
  if (setup && setup.status === "loading") {
    return {
      tone: "working",
      text: "Reading your idea. Nothing is charged until you answer its questions.",
    };
  }
  // #2
  if (setup && setup.status === "asking") {
    return {
      tone: "attention",
      text: "Answer the question on the canvas. Nothing is drawn or charged until you do.",
      target: { kind: "setup" },
      targetLabel: "Show on canvas — the question",
    };
  }
  // #3 — the slot shows BuildStatus instead; nothing to say here.
  if (job && statusOf(job) !== "ready") return null;

  const chosen = rows.filter((r) => !r.leftOut);

  // #4
  const failedRow = chosen.find((r) => r.phase === "failed");
  if (failedRow) {
    return {
      tone: "attention",
      text: `${failedRow.name} couldn't be drawn. Try again on its card · 1 credit.`,
      target: { kind: "retry", productId: failedRow.productId },
      targetLabel: `Show on canvas — ${failedRow.name}'s Try again`,
    };
  }

  // #5
  const conflictRow = chosen.find((r) => r.phase === "conflict");
  if (conflictRow) {
    return {
      tone: "attention",
      text: `${conflictRow.name} doesn't fit the size you set. Fix the size, or build it as Draft.`,
      target: { kind: "spec", productId: conflictRow.productId },
      targetLabel: `Show on canvas — ${conflictRow.name}'s size`,
    };
  }

  // #6
  const drawingRows = chosen.filter((r) => r.phase === "drawing");
  if (drawingRows.length === 1) {
    return {
      tone: "working",
      text: `Drawing ${drawingRows[0].name}. The build opens when it lands.`,
    };
  }
  if (drawingRows.length > 1) {
    return {
      tone: "working",
      text: `Drawing ${drawingRows.length} concepts. The build opens when they land.`,
    };
  }

  const n = state.selected.length;
  const cost = buildCost(n);
  const short = hydrated && balance < cost;

  if (job && statusOf(job) === "ready") {
    // #7 / #7b — which of the two is only known once the balance has been
    // read, so until then the slot says nothing rather than "You have 0."
    if (state.changedSinceBuild) {
      if (!hydrated) return null;
      if (short) {
        return {
          tone: "attention",
          text: `Building again costs ${cost} credits. You have ${balance}.`,
          target: { kind: "credits" },
          targetLabel: "Show on canvas — the credits notice",
        };
      }
      return {
        tone: "neutral",
        text: `Changed since the build. Build again to carry it into the deliverables · ${cost} credits.`,
        target: { kind: "build" },
        targetLabel: "Show on canvas — the Build button",
      };
    }
    // #9
    if (job.projectId) {
      const name = savedName || projectName || "your project";
      return {
        tone: "neutral",
        text: `Saved to ${name}. Add a brief to sell, give or keep it.`,
        target: { kind: "review" },
        targetLabel: "Show on canvas — the build",
      };
    }
    // #8
    const text = projectName
      ? `Build ready. Save it to ${projectName}, or open it in the editor.`
      : "Build ready. Save it as a project, or open it in the editor.";
    return { tone: "neutral", text, target: { kind: "review" }, targetLabel: "Show on canvas — the build" };
  }

  // #10 / #10b — both name the balance, so neither speaks before it's read.
  if (!job && n > 0 && state.allReady) {
    if (!hydrated) return null;
    if (short) {
      return {
        tone: "attention",
        text: `The build costs ${cost} credits. You have ${balance}. Top up to build.`,
        target: { kind: "credits" },
        targetLabel: "Show on canvas — the credits notice",
      };
    }
    const label = n === 1 ? "this product" : `${n} products`;
    return {
      tone: "neutral",
      text: `Next: build ${label} · ${cost} credits. You have ${balance}.`,
      target: { kind: "build" },
      targetLabel: "Show on canvas — the Build button",
    };
  }

  // Nothing matches — the slot is empty.
  return null;
}

// ─────────────────────────── activityOf ───────────────────────────

export type ActivityTone = "plain" | "done" | "working" | "waiting" | "error" | "neutral";

export type ActivityEntry = {
  id: string;
  tone: ActivityTone;
  title: string;
  detail?: string;
  ts: number;
};

/** The full history, oldest first — spec §2.5. A failed render that was
 *  later redrawn reads as `Couldn't draw · redrawn as Concept {label}` in a
 *  NEUTRAL tone, never red: the loudest thing in the rail must not be
 *  something that no longer matters (diagnosis item 2). `names` is the
 *  host's own `productNameOf` bound to its `setup`, so this module never
 *  has to special-case which turn's product needs which fallback. */
export function activityOf(
  chat: ChatSession,
  labels: Map<string, string>,
  names: (t: AssistantTurn) => string | undefined,
  job?: BuildJob | null,
  projectName?: string,
): ActivityEntry[] {
  const turns = chat.turns;
  const entries: ActivityEntry[] = [];

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];

    if (t.role === "user") {
      entries.push({ id: t.id, tone: "plain", title: "You", detail: t.text, ts: t.ts });
      continue;
    }

    if (t.role === "setup") {
      if (t.status === "loading") {
        entries.push({ id: `${t.id}-reading`, tone: "working", title: "Reading your idea", ts: t.ts });
        entries.push({
          id: `${t.id}-working`,
          tone: "waiting",
          title: "Working out what it needs",
          ts: t.ts,
        });
        continue;
      }

      entries.push({ id: `${t.id}-read`, tone: "done", title: "Read your idea", ts: t.ts });

      if (t.status === "asking") {
        const n = 1 + t.companions.length;
        if (n === 1) {
          entries.push({
            id: `${t.id}-needs`,
            tone: "done",
            title: "One product, nothing else needed",
            ts: t.ts,
          });
        } else {
          const primaryName = t.productName?.trim() || "Your product";
          entries.push({
            id: `${t.id}-needs`,
            tone: "done",
            title: `This needs ${n} products`,
            detail: [primaryName, ...t.companions.map((c) => c.name)].join(" · "),
            ts: t.ts,
          });
        }
        entries.push({
          id: `${t.id}-waiting`,
          tone: "waiting",
          title: "Waiting on your answer on the canvas",
          ts: t.ts,
        });
        continue;
      }

      // answered
      if (t.answer) {
        const n = 1 + t.answer.picked.length;
        const name = projectName || t.answer.projectName || "your project";
        const title = t.answer.projectId
          ? `Added to ${name} · ${n} product${n === 1 ? "" : "s"}`
          : `Started project ${name} · ${n} product${n === 1 ? "" : "s"}`;
        entries.push({ id: `${t.id}-answered`, tone: "done", title, ts: t.ts });
      }
      continue;
    }

    // assistant turn
    const name = names(t) ?? "Your product";
    const label = labels.get(t.id) ?? "1";
    const title = `${name} · Concept ${label}`;

    if (t.status === "pending") {
      entries.push({ id: t.id, tone: "working", title, detail: "Drawing", ts: t.ts });
      continue;
    }

    if (t.status === "failed") {
      const pid = productIdOf(t);
      const later = turns
        .slice(i + 1)
        .find(
          (o): o is AssistantTurn =>
            o.role === "assistant" &&
            productIdOf(o) === pid &&
            (o.status === "ready" || o.status === "pending"),
        );
      if (later) {
        const laterLabel = labels.get(later.id) ?? "1";
        entries.push({
          id: t.id,
          tone: "neutral",
          title,
          detail:
            later.status === "ready"
              ? `Couldn't draw · redrawn as Concept ${laterLabel}`
              : `Couldn't draw · redrawing as Concept ${laterLabel}`,
          ts: t.ts,
        });
      } else {
        entries.push({
          id: t.id,
          tone: "error",
          title,
          detail: "Couldn't draw · nothing was charged",
          ts: t.ts,
        });
      }
      continue;
    }

    // ready
    if (t.kind === "refine") {
      const parentLabel = t.parentTurnId ? labels.get(t.parentTurnId) ?? "1" : "1";
      entries.push({
        id: t.id,
        tone: "done",
        title,
        detail: `Refined from Concept ${parentLabel}`,
        ts: t.ts,
      });
    } else {
      // First DRAWN, not first asked: a first attempt that failed drew
      // nothing, so the render after it is this product's first drawing.
      const pid = productIdOf(t);
      const isFirst = !turns
        .slice(0, i)
        .some((o) => o.role === "assistant" && productIdOf(o) === pid && o.status === "ready");
      entries.push({
        id: t.id,
        tone: "done",
        title,
        detail: isFirst ? "Drawn" : "A fresh take",
        ts: t.ts,
      });
    }
  }

  if (job) {
    const bookedAt = job.startedAt ?? job.createdAt;
    const n = productsOf(job).length;
    const cost = buildCost(n);
    entries.push({
      id: `${job.id}-started`,
      tone: "done",
      title: `Build started · ${n} product${n === 1 ? "" : "s"} · ${cost} credits`,
      ts: bookedAt,
    });
    if (job.endedAt) {
      const ready = statusOf(job) === "ready";
      const title = ready
        ? "Build ready"
        : job.creditsRefunded
          ? "Build stopped · credits refunded"
          : "Build stopped";
      entries.push({
        id: `${job.id}-ended`,
        tone: ready ? "done" : "error",
        title,
        ts: job.endedAt,
      });
    }
  }

  // Array.prototype.sort is stable (ES2019+), so entries sharing one turn's
  // timestamp (the setup's synthetic rows) keep the order they were pushed.
  entries.sort((a, b) => a.ts - b.ts);
  return entries;
}

// ─────────────────────────── announcementFor ───────────────────────────

/** What the root announcer reads, and what `railRows` was built from at
 *  that moment — enough to notice a transition without re-deriving it. */
export type RailSnapshot = {
  rows: (Pick<RailRow, "productId" | "name" | "conceptLabel" | "phase"> &
    Partial<Pick<RailRow, "standIn">>)[];
  /** Which build is on screen — a Build again is a new job at the same
   *  status the last one started at, so the status alone can't see it. */
  buildId?: string;
  buildStatus?: BuildStatus;
};

function rowTransition(
  prev: RailSnapshot["rows"][number],
  next: RailSnapshot["rows"][number],
): string | null {
  if (prev.phase === next.phase) {
    // A stand-in read again, for real this time: the phase doesn't move, but
    // the row's spec is the product's own now — the one change a Read again
    // makes, so it is said (review 2 Minor 3).
    if (prev.standIn && !next.standIn) {
      return `${next.name}: read again — the spec now comes from Concept ${next.conceptLabel}'s own parts.`;
    }
    return null;
  }
  // A conflict is the most actionable thing this row can say, so it wins
  // even over "the render just landed".
  if (next.phase === "conflict" && prev.phase !== "conflict") {
    return `${next.name} doesn't fit the size you set.`;
  }
  if (next.phase === "drawing") {
    return `Drawing ${next.name}, Concept ${next.conceptLabel}.`;
  }
  if (prev.phase === "drawing" && next.phase === "failed") {
    return `${next.name}: Concept ${next.conceptLabel} couldn't be drawn. Nothing was charged.`;
  }
  if (prev.phase === "drawing") {
    return `${next.name}: Concept ${next.conceptLabel} is ready.`;
  }
  return null;
}

const working = (s?: BuildStatus) => s === "queued" || s === "running";

function buildTransition(prev: RailSnapshot, next: RailSnapshot): string | null {
  if (prev.buildId !== next.buildId) {
    // A new job is a new build, whatever status the last one was in.
    if (working(next.buildStatus)) return "Build started.";
    // The newest build went and an older one (or none) is back. Only a
    // queued build can be taken away, by its Cancel — and the build now on
    // screen is not "ready to review" news.
    return prev.buildStatus === "queued" ? "Build cancelled." : null;
  }
  const from = prev.buildStatus;
  const to = next.buildStatus;
  if (from === to || !to) return null;
  if (!from) return "Build started.";
  if (to === "ready") return "Build ready to review.";
  if (to === "partial") return "Build needs a retry.";
  if (to === "failed") return "Build stopped.";
  return null;
}

/** One sentence for the root-level announcer, or null — spec §6. Fires only
 *  on a transition between two snapshots, never on mount: called with the
 *  same snapshot twice (or two that happen to match), it says nothing.
 *  Several transitions in one render join with a space. */
export function announcementFor(prev: RailSnapshot, next: RailSnapshot): string | null {
  const sentences: string[] = [];
  const prevByProduct = new Map(prev.rows.map((r) => [r.productId, r]));
  for (const row of next.rows) {
    const prevRow = prevByProduct.get(row.productId);
    if (!prevRow) continue;
    const s = rowTransition(prevRow, row);
    if (s) sentences.push(s);
  }
  const buildSentence = buildTransition(prev, next);
  if (buildSentence) sentences.push(buildSentence);
  return sentences.length ? sentences.join(" ") : null;
}

// ─────────────────────────── composerTarget ───────────────────────────

export type ComposerTarget =
  /** Nothing has been drawn to change: a pre-setup chat's first words, or a
   *  chat whose question is still open (the composer is held for that). */
  | { kind: "fresh" }
  /** No product is selected — Done or Close on the spec sheet cleared it. A
   *  sentence changes nothing until one is picked; naming a new product
   *  still adds it. */
  | { kind: "none" }
  /** The composer refines this product's own latest drawing. `name` is the
   *  row's, so the composer and the selected row always agree. */
  | { kind: "refine"; productId: string; name: string; turn: AssistantTurn }
  /** The product in focus has no drawing yet — a failed first render, or one
   *  still drawing. Send is held: refining any other product's drawing in
   *  its name would charge a render to the wrong product (review 2 C1). */
  | {
      kind: "blocked";
      productId: string;
      name: string;
      why: "failed" | "drawing";
      /** Shown under the composer and on its send button, without a stop. */
      hint: string;
    };

/** Which drawing the composer's next sentence changes. Only the product in
 *  focus — the one every label under the composer names — and only its own
 *  drawing; with none in focus, none, where there is a choice to make. A
 *  chat whose project holds one product has none: with nothing selected,
 *  that one is the target — Done left the composer asking the maker to pick
 *  from a list of one. So does a chat from before the setup question, which
 *  refines its latest drawing, as it always did. A product the project no
 *  longer holds (removed) is not a target; the primary is. */
export function composerTarget(
  chat: ChatSession,
  focusedProduct: string | null,
): ComposerTarget {
  const setup = chat.turns.find((t): t is SetupTurn => t.role === "setup");
  const drawings = chat.turns.filter((t): t is AssistantTurn => t.role === "assistant");
  const lastReady = (productId?: string) => {
    for (let i = drawings.length - 1; i >= 0; i -= 1) {
      const t = drawings[i];
      if (t.status !== "ready" || !t.imageUrl) continue;
      if (productId === undefined || productIdOf(t) === productId) return t;
    }
    return undefined;
  };

  if (!setup) {
    const t = lastReady(focusedProduct ?? undefined) ?? lastReady();
    return t
      ? { kind: "refine", productId: productIdOf(t), name: railNameOf(undefined, t), turn: t }
      : { kind: "fresh" };
  }

  const inProject = (id: string) =>
    id === "primary" || !setup.answer || setup.answer.picked.includes(id);
  // A project of one product, drawn, is no choice to make. One whose
  // companions are chosen but not drawn yet still is.
  const drawn = new Set(drawings.map(productIdOf).filter(inProject));
  const alone = drawn.size === 1 && !setup.answer?.picked.length;
  const focus = focusedProduct ?? (alone ? [...drawn][0] : null);
  // Only once there is something to choose between: with the question
  // still open the composer is held, and says so, as "fresh".
  if (focus === null && drawings.length) return { kind: "none" };
  const productId =
    focus !== null && inProject(focus) && drawings.some((t) => productIdOf(t) === focus)
      ? focus
      : "primary";
  const own = drawings.filter((t) => productIdOf(t) === productId);
  if (!own.length) return { kind: "fresh" };

  const name = railNameOf(setup, own[own.length - 1]);
  const turn = lastReady(productId);
  if (turn) return { kind: "refine", productId, name, turn };

  const drawing = own.some((t) => t.status === "pending");
  return {
    kind: "blocked",
    productId,
    name,
    why: drawing ? "drawing" : "failed",
    hint: drawing
      ? `${name} has no drawing to change yet — wait for it to land`
      : `${name} has no drawing to change yet — Try again on its card`,
  };
}

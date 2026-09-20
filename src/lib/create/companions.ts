// Companion products — Part 4 spec §4.4.
//
// Some prompts describe a *system* rather than an object: a drone needs a
// remote, an earbud needs a charging case, a sensor node needs a base
// station. After the first concept is accepted the flow asks the model
// whether this is one of those, and offers the other products the system
// needs.
//
// Three rules from the spec shape this module:
//
//   • §4.4.3 Classification is automatic, and **most products are not**
//     part of a multi-product system. So the fallback — model unreachable,
//     or an answer we cannot parse — is *no companions*, never an invented
//     list. A wrong "your drone needs a dock" is worse than silence, and
//     the single-product path carries its own escape hatch.
//   • §4.4.4 The list is AI-generated and read-only. The user selects from
//     what is offered; nothing here lets them add or rename an entry.
//   • §4.4.7 Flat. A companion does not decompose further, so there is no
//     recursion and no second level in these types.

/** One offered companion. `id` is derived from the name so a selection
 *  survives a reload, and so two renders of the same list agree. */
export type Companion = {
  id: string;
  /** "Remote controller" */
  name: string;
  /** One plain-language line — §4.4.4 asks the user to understand the
   *  suggestion, not just see it. */
  why: string;
};

/** What the classifier answered for one accepted concept. Stored on the
 *  chat turn's selection state, not re-fetched: §4.8 says the list is
 *  generated once and locked for that concept. */
export type CompanionPlan = {
  /** False for the ordinary single-product build. */
  isSystem: boolean;
  companions: Companion[];
};

export const SINGLE_PRODUCT: CompanionPlan = { isSystem: false, companions: [] };

/** Stable id from a product name: lowercase, non-alphanumerics folded to
 *  one dash. Two entries that normalise to the same id would be the same
 *  product twice, and `parseCompanions` drops the duplicate. */
export function companionId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** The model's answer, or null when it is not usable. Null means the
 *  caller falls back to SINGLE_PRODUCT — see the header: an unparseable
 *  answer is not evidence of a system. */
export function parseCompanions(raw: unknown): CompanionPlan | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as { isSystem?: unknown; companions?: unknown };
  // The model is allowed to say "no". That is a real answer, and the most
  // common one, so it must not read as a parse failure.
  if (obj.isSystem === false) return SINGLE_PRODUCT;
  if (obj.isSystem !== true) return null;
  if (!Array.isArray(obj.companions)) return null;

  const companions: Companion[] = [];
  const seen = new Set<string>();
  for (const entry of obj.companions) {
    if (typeof entry !== "object" || entry === null) continue;
    const c = entry as { name?: unknown; why?: unknown };
    const name = String(c.name ?? "").trim().slice(0, 48);
    const why = String(c.why ?? "").trim().slice(0, 160);
    // Both fields are load-bearing: the spec's list has no row without a
    // reason, because a suggestion the user cannot judge is noise.
    if (!name || !why) continue;
    const id = companionId(name);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    companions.push({ id, name, why });
  }
  // A system with nothing to offer is a single-product build by another
  // name, and showing an empty selection screen would be a dead end.
  if (!companions.length) return SINGLE_PRODUCT;
  // §4.4 shows a short list. More than four is the model padding.
  return { isSystem: true, companions: companions.slice(0, 4) };
}

// The cost of a selection lives with the prices it is made of, in
// credits.tsx — see `estimateFor`. This module is imported by an edge
// route, so it stays free of the client-only store.

// ─────────────────── the rule, for when no model answers ───────────────────
//
// The header above says the fallback is no companions, and that was right
// while a model was answering: an unparseable reply is not evidence of a
// system. But the text provider this app used has stopped serving, so every
// build now takes that path, and the feature reads as "your product needs
// nothing" when in truth nothing ran. Silence that looks like an answer is
// its own kind of lie.
//
// So there is a second answer below the model: a small table of the product
// families where a companion really is a SEPARATE product, matched on the
// prompt. It is deliberately narrow and deliberately conservative — no match
// means single product, which is still the common case and still the honest
// default. It cannot invent: every companion it offers is written here, by
// hand, for a family where the answer is not in doubt. A drone is flown with
// a controller; earbuds live in a case.
//
// This is a rule, not a judgement. It knows nothing the table does not say,
// and the model takes precedence the moment one is reachable again.

// Plurals are spelled out on every head noun: a prompt says "wireless
// earbuds", and \bearbud\b does not match that — a missing "s?" silently
// drops an entire product family with no error anywhere.
type Rule = {
  /** What the prompt has to mention. */
  match: RegExp;
  /** Ruled out even when `match` hits — a phrase that means the companion is
   *  already inside this product rather than beside it. */
  unless?: RegExp;
  companions: { name: string; why: string }[];
};

const RULES: Rule[] = [
  {
    match: /\b(drones?|quadcopters?|quadrotors?|uavs?|multirotors?|rc (planes?|cars?|boats?|trucks?|helicopters?))\b/i,
    companions: [
      {
        name: "Remote controller",
        why: "The craft is flown from a separate handheld unit with its own radio and battery.",
      },
      {
        name: "Battery charger",
        why: "Flight packs are charged off the aircraft, in their own balance charger.",
      },
    ],
  },
  {
    match: /\b(earbuds?|earphones?|earpieces?|in-ear|tws)\b/i,
    companions: [
      {
        name: "Charging case",
        why: "The buds are stored and recharged in a case that carries its own cell.",
      },
    ],
  },
  {
    match: /\b(sensor nodes?|soil sensors?|weather stations?|field sensors?|remote sensors?|lora nodes?|mesh nodes?|wireless sensors?)\b/i,
    companions: [
      {
        name: "Base station",
        why: "The nodes report to a receiver that holds the radio link and the uplink.",
      },
    ],
  },
  {
    match: /\b(smart locks?|door locks?|doorbells?|intercoms?)\b/i,
    companions: [
      {
        name: "Indoor chime",
        why: "The outdoor unit needs something inside the house to announce a caller.",
      },
      {
        name: "Key fob",
        why: "A separate credential to open the lock without a phone.",
      },
    ],
  },
  {
    match: /\b(robot vacuums?|robotic vacuums?|lawn ?mower robots?|robot mowers?)\b/i,
    companions: [
      {
        name: "Charging dock",
        why: "The robot returns to a powered base to recharge and park itself.",
      },
    ],
  },
  {
    match: /\b(fitness (bands?|trackers?)|smart ?watch(es)?|wearables?|activity bands?)\b/i,
    // A watch with a plain USB port charges from a cable, which is not a
    // product of its own.
    unless: /\busb[- ]?c?\s*(port|charging|cable)\b/i,
    companions: [
      {
        name: "Charging dock",
        why: "A sealed wearable takes power through its own contact dock rather than a socket.",
      },
    ],
  },
  {
    match: /\b(wireless microphones?|lav(alier)? mics?|body ?packs?|clip-on mics?)\b/i,
    companions: [
      {
        name: "Receiver unit",
        why: "The transmitter is worn; the audio has to arrive somewhere with its own output.",
      },
    ],
  },
];

/** The deterministic answer, when no model is reachable. Conservative by
 *  construction: anything outside the table is a single product. */
export function classifyByRule(text: string): CompanionPlan {
  for (const rule of RULES) {
    if (!rule.match.test(text)) continue;
    if (rule.unless?.test(text)) continue;
    return {
      isSystem: true,
      companions: rule.companions.map((c) => ({
        id: companionId(c.name),
        name: c.name,
        why: c.why,
      })),
    };
  }
  return SINGLE_PRODUCT;
}

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

// ─────────────── what the composer was actually asked for ───────────────

// A sentence typed into the chat is one of two things, and the difference
// matters more than anything else the composer does: "make it matte black"
// is a change to the product on screen, and "add a charger" is another
// product for the project. Both used to be refines, so asking for a charger
// redrew the phone — the maker watched "Rendering concept 1.1" and got the
// same product back with a charger in the picture, if they were lucky.
//
// This is a rule, not a model, for the reason `classifyByRule` is: the text
// provider is not reliable enough to sit between a maker and their credits,
// and a wrong answer here spends one either way. It is deliberately narrow —
// anything it is not sure about is a refine, which is what the composer has
// always done and what the helper line under it promises.

/** Verbs that can open a request for a new thing. "Make" and "create" only
 *  count with an article behind them: "make a charger" asks for a product,
 *  "make it smaller" asks for a change. */
const ASK_VERB =
  "(?:add|include|attach|throw in|also add|now add|i(?:'d like| would like| also want| want| need)|we need|give me|design|build|create|make|generate)";

/** The article is what separates a thing from a property. Without one, only
 *  an explicitly additive opener ("add", "include", "also") may pass, so
 *  "make it black" can never be read as a product called "black". */
const ARTICLE = "(?:a|an|another|one more|the)";

/** Words that name a property of the picture or a degree of one, never a
 *  product. "Add more detail" and "add a drop shadow" are changes to what is
 *  on screen, and both open exactly like a request for another thing. */
const NOT_A_PRODUCT =
  /^(?:more|less|extra|additional|some|better|bigger|smaller|brighter|darker|detail|details|colour|color|colours|colors|contrast|shadow|shadows|light|lighting|background|foreground|logo|text|label|sharpness|quality|resolution|size|angle|view|style)\b/i;

const PRODUCT_ASK = new RegExp(
  `^\\s*(?:(?:and|also|plus)\\s+)?(?:${ASK_VERB}\\s+)?(?:${ARTICLE}\\s+)?([a-z0-9][a-z0-9 \\-/]{1,44}?)\\s*(?:\\s(?:also|too|as well|please)\\b.*)?[.!]?\\s*$`,
  "i",
);

/** Openers that are additive on their own, so the article may be dropped:
 *  "add charger also" is as clear as "add a charger". */
const ADDITIVE_OPENER = /^\s*(?:and\s+|also\s+|plus\s+)?(?:add|include|attach|throw in|also add|now add|we need|i\s+(?:also\s+)?need)\b/i;

/** Words that mean the maker is talking about what is already on screen, so
 *  the sentence is a change however it opens. */
const REFERS_TO_SHOWN =
  /\b(?:it|its|it's|this|that|them|these|those|the (?:image|picture|photo|concept|render|colour|color|design|model))\b/i;

/** The product being asked for, or null when the sentence is a change to the
 *  one on screen. The name comes back as the maker wrote it, trimmed. */
export function parseProductRequest(text: string): { name: string } | null {
  const line = text.trim().replace(/\s+/g, " ");
  if (!line || line.length > 90) return null;
  if (REFERS_TO_SHOWN.test(line)) return null;

  const m = PRODUCT_ASK.exec(line);
  if (!m) return null;

  // "make charger" is ambiguous and "make black" is not a product, so a
  // bare noun needs an opener that can only mean addition.
  const hadArticle = new RegExp(
    `(?:${ASK_VERB}|and|also|plus)\\s+${ARTICLE}\\s`,
    "i",
  ).test(line);
  if (!hadArticle && !ADDITIVE_OPENER.test(line)) return null;
  // A bare noun needs a verb too — "carrying case" on its own is a refine
  // of the thing on screen, not a request for one.
  const hadVerb = new RegExp(`^\\s*(?:(?:and|also|plus)\\s+)?${ASK_VERB}\\s`, "i").test(line);
  const hadConjunction = /^\s*(?:and|also|plus)\s/i.test(line);
  if (!hadVerb && !(hadConjunction && hadArticle)) return null;

  const raw = m[1].trim().replace(/\s+(?:also|too|as well)$/i, "").trim();
  if (raw.length < 3) return null;
  if (NOT_A_PRODUCT.test(raw)) return null;
  // A whole sentence is a brief, not a product name.
  if (raw.split(" ").length > 5) return null;

  const name = raw
    .split(" ")
    .map((w) => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
  return { name };
}

// Manufacturability confidence — Part 4 spec §4.3, and the cross-product
// compatibility pass §4.4.10 that feeds it.
//
// The spec's rule is that output is **always delivered** (§4.3.2). Nothing
// here withholds or fails a build; it labels what checking the output has
// passed, and lists what needs review.
//
//   `Checked`  every check the engine runs passed
//   `Draft`    a check failed, **or a check could not be run**
//
// That second trigger is the honest one today, and it is why every build
// currently lands on `Draft`. A build produces a parts list, a net graph and a
// spec — sizes, a board outline, a pack — but no copper: no tracks, no pads,
// no clearances. `runDrc` in lib/pcb/drc.ts checks real geometry, so it has
// nothing to consume, and a design-rule check that never ran cannot report a
// pass. The issue list says exactly that rather than implying a failure the
// user could fix.
//
// What *is* really checked is the assembly pass (§4.3.5) — the power budget
// and the fit inside the enclosure, both computed from the spec — and
// §4.4.10's cross-product compatibility, which two parts lists are enough for.

import { batteryOf } from "../spec/batteries";
import { RADIOS, radioKeyOf } from "../spec/catalog";
import type { RadioKey } from "../spec/types";
import { currentLabel, mm3 } from "../spec/units";
import type { BuildJob, BuildProduct } from "./history";
import type { ConceptPart } from "./concept";

/** §4.3.2 — `Verified` is deliberately absent. The spec reserves it for a
 *  paid expert review that does not exist, and says showing an unreachable
 *  top tier only tells users the platform is withholding something. */
export type Tier = "checked" | "draft";

/** §4.3.5 groups the list this way, and §4.4.10 adds the third. */
export type IssueGroup = "design-rule" | "assembly" | "compatibility";

export type Issue = {
  group: IssueGroup;
  /** Plain language, never raw checker output (§4.3.5). */
  text: string;
  /** True when the check did not run at all, as against ran and failed.
   *  Both force `Draft`, but only one of them is the user's to act on. */
  notRun?: boolean;
};

export type ProductConfidence = {
  productId: string;
  productName: string;
  tier: Tier;
  issues: Issue[];
  /** Checks that ran and passed — said, so a Draft that only waits on DRC
   *  does not read as if nothing were checked. */
  passed: string[];
};

export type BuildConfidence = {
  byProduct: ProductConfidence[];
  /** §4.4.9 — the project's headline state is the lowest tier of any
   *  product, so the user sees the weakest link without losing the detail. */
  headline: Tier;
};

// ───────────────────────── what we can read ─────────────────────────

const lower = (s: string) => s.toLowerCase();

/** Radio protocols we can recognise by name in a part. Recognition only —
 *  an unrecognised radio means we do not know what it speaks, which is
 *  reported as "could not be checked", never as a mismatch. */
const PROTOCOLS: Record<string, string> = {
  "nrf24": "nRF24",
  "esp-now": "ESP-NOW",
  espnow: "ESP-NOW",
  lora: "LoRa",
  zigbee: "Zigbee",
  "ble": "Bluetooth LE",
  bluetooth: "Bluetooth",
  wifi: "Wi-Fi",
  "wi-fi": "Wi-Fi",
  esp32: "Wi-Fi",
  esp8266: "Wi-Fi",
  "sx127": "LoRa",
  rfm9: "LoRa",
};

/** Charging and data connectors, same rule: recognition only. */
const CONNECTORS: Record<string, string> = {
  "usb-c": "USB-C",
  usbc: "USB-C",
  "type-c": "USB-C",
  micro: "Micro-USB",
  mini: "Mini-USB",
  barrel: "Barrel jack",
  "jst": "JST",
  pogo: "Pogo pins",
};

// A key found inside a word is another word: "compatible", "controllable"
// and "enable" all end in "ble" — and an HC-05 whose name or role says so
// read as Bluetooth LE. These keys match only as a word of their own.
const WHOLE_WORD: Record<string, RegExp> = { ble: /\bble\b/ };

function firstMatch(
  parts: ConceptPart[],
  table: Record<string, string>,
  categories: ConceptPart["category"][],
): string | null {
  for (const part of parts) {
    if (!categories.includes(part.category)) continue;
    const hay = `${lower(part.name)} ${lower(part.role)}`;
    for (const key of Object.keys(table)) {
      if (WHOLE_WORD[key] ? WHOLE_WORD[key].test(hay) : hay.includes(key)) return table[key];
    }
  }
  return null;
}

export function protocolOf(parts: ConceptPart[]): string | null {
  return firstMatch(parts, PROTOCOLS, ["Connectivity", "Microcontroller"]);
}

/** The name table's words the catalog has a radio for — so a module it
 *  doesn't list still prints the way the sheet names that radio. Its
 *  "Bluetooth" is Bluetooth Classic (an HC-05), which no key is. */
const PROTOCOL_KEY: Record<string, RadioKey> = {
  "Wi-Fi": "wifi",
  "Bluetooth LE": "ble",
  "ESP-NOW": "esp-now",
  nRF24: "nrf24",
  LoRa: "lora",
  Zigbee: "zigbee",
};

/** The radio a product uses, in the words the spec sheet picks it by
 *  (`RADIOS[key].label` — "nRF24L01", "LoRa SX1276"), so the review's
 *  compatibility issues name it as the sheet, the card and the rail do: a
 *  word table of its own here said "nRF24" beside a sheet that said
 *  "nRF24L01". Read the way the sheet reads it (catalog.ts): its radio
 *  module first, then the one on its MCU's die — so an ESP32 set to None
 *  says no radio, and one beside a LoRa module says LoRa, not the Wi-Fi its
 *  name carries. A module the catalog doesn't list falls back to the name
 *  table above. Null for none. */
export function radioOf(parts: ConceptPart[]): string | null {
  const key = radioKeyOf(parts);
  if (key) return key === "none" ? null : RADIOS[key].label;
  const word =
    protocolOf(parts.filter((p) => p.category === "Connectivity")) ?? protocolOf(parts);
  const said = word ? PROTOCOL_KEY[word] : undefined;
  return said ? RADIOS[said].label : word;
}

export function connectorOf(parts: ConceptPart[]): string | null {
  return firstMatch(parts, CONNECTORS, ["Connector & mech", "Power Management"]);
}

/** Every part that reads as one of the connectors above, by its own name —
 *  for a listing (the Wiring aside, §4.7) rather than `connectorOf`'s single
 *  canonical match. Recognition only, same table, same categories. */
export function connectorPartsOf(parts: ConceptPart[]): string[] {
  const categories: ConceptPart["category"][] = ["Connector & mech", "Power Management"];
  const out: string[] = [];
  for (const part of parts) {
    if (!categories.includes(part.category)) continue;
    const hay = `${lower(part.name)} ${lower(part.role)}`;
    if (Object.keys(CONNECTORS).some((key) => hay.includes(key))) out.push(part.name);
  }
  return out;
}

// ─────────────────────── the checks themselves ──────────────────────

/** Every product carries these, because none of them can run yet. Stated
 *  once, here, so the copy cannot drift between products. */
const NOT_RUN: Issue[] = [
  {
    group: "design-rule",
    notRun: true,
    text: "Design rule checks have not run — this build produces a parts list and a board outline, not a copper layout, so trace widths, clearances and via sizes cannot be measured yet.",
  },
];

/** §4.3.5 Assembly — from the booked spec. A build older than spec booking
 *  has no snapshot to check: it never chose a size against its parts or a
 *  pack against its draw, so there is nothing here to pass or fail, only to
 *  say so (I4 — a legacy build claims neither a check nor a battery). */
export function assemblyChecks(p: BuildProduct): { issues: Issue[]; passed: string[] } {
  if (!p.spec) {
    return {
      issues: [
        {
          group: "assembly",
          notRun: true,
          text: "Assembly checks have not run — this build was booked before products had a spec, so there is no size or pack to check.",
        },
      ],
      passed: [],
    };
  }
  const s = p.spec;
  const supply = s.battery === "none" ? "USB" : batteryOf(s.battery).label;
  const issues: Issue[] = [];
  const passed: string[] = [];
  if (s.drawMa > s.budgetMa) {
    issues.push({
      group: "assembly",
      text: `${p.name} draws about ${currentLabel(s.drawMa)}, but ${supply} gives ${currentLabel(s.budgetMa)} — it will brown out under load.`,
    });
  } else {
    passed.push(
      `Power budget — ${p.name} draws about ${currentLabel(s.drawMa)} of the ${currentLabel(s.budgetMa)} ${supply} gives.`,
    );
  }
  if (!s.fits) {
    issues.push({
      group: "assembly",
      text: `${p.name} doesn't fit the ${mm3(s.size)} you set — its parts need at least ${mm3(s.minSize)}.`,
    });
  } else {
    passed.push(`Enclosure fit — ${p.name}'s parts fit in ${mm3(s.size)}.`);
  }
  return { issues, passed };
}

/** §4.4.10 — the products of a project meant to work together: the primary
 *  and each companion, never two companions — a car's remote and its
 *  charger are each the car's. The rail's pairing (project-state.ts
 *  radioLinks) takes its pairs from here too, so the review never says two
 *  products won't talk that the rail never paired. Every pair used to be
 *  checked here, and two companions on different radios were told they
 *  won't talk when nothing asked them to. */
export function pairsOf<T>(products: T[], isPrimary: (p: T) => boolean): [T, T][] {
  const primary = products.find(isPrimary);
  return primary ? products.filter((p) => p !== primary).map((p): [T, T] => [primary, p]) : [];
}

/** A booked product meant to talk over a radio (ResolvedSpec.speaks) — a
 *  build older than spec booking, by the parts it was built from. A spare
 *  pack isn't, so its missing radio is no issue to raise. */
const speaks = (p: BuildProduct) => (p.spec ? p.spec.speaks : radioKeyOf(p.parts) !== "none");

/** Meant to talk, and has no radio: set to None, or its radio taken off. */
const radioOff = (p: BuildProduct) => radioKeyOf(p.parts) === "none";

/** §4.4.10 — the cross-product pass. Returns the issues for the pair,
 *  which the caller files against **both** products. */
export function compatibilityIssues(
  a: BuildProduct,
  b: BuildProduct,
): Issue[] {
  const out: Issue[] = [];

  // Only between two products meant to talk: a pack, a plate or a charger
  // has no radio to match, by design.
  if (speaks(a) && speaks(b)) {
    const pa = radioOf(a.parts);
    const pb = radioOf(b.parts);
    if (pa && pb) {
      if (pa !== pb) {
        out.push({
          group: "compatibility",
          text: `${a.name} uses ${pa} and ${b.name} uses ${pb} — they cannot talk to each other until both use the same radio.`,
        });
      }
    } else if ((pa && radioOff(b)) || (pb && radioOff(a))) {
      // A radio set to None is a pairing broken, as the sheet says — not a
      // check that couldn't run.
      const [has, lacks, radio] = pa ? [a, b, pa] : [b, a, pb];
      out.push({
        group: "compatibility",
        text: `${lacks.name} has no radio and ${has.name} uses ${radio} — they cannot talk to each other until both use the same radio.`,
      });
    } else if (!(radioOff(a) && radioOff(b))) {
      // A radio we can't name. Saying nothing here would read as a pass.
      const unknown = [a, b].filter((p) => !radioOf(p.parts) && !radioOff(p));
      out.push({
        group: "compatibility",
        notRun: true,
        text: `Radio match between ${a.name} and ${b.name} could not be checked — ${
          unknown.length === 2 ? "neither names a radio" : `${unknown[0].name} does not name a radio`
        } we recognise.`,
      });
    }
  }

  const ca = connectorOf(a.parts);
  const cb = connectorOf(b.parts);
  if (ca && cb && ca !== cb) {
    out.push({
      group: "compatibility",
      text: `${a.name} charges over ${ca} and ${b.name} over ${cb} — one cable will not serve both.`,
    });
  }

  return out;
}

/** The whole job's confidence. Pure — it reads the products and nothing
 *  else, so the badge on screen is the badge this function returns. */
export function checkBuild(
  job: BuildJob,
  products: BuildProduct[],
): BuildConfidence {
  const byProduct: ProductConfidence[] = products.map((p) => {
    const assembly = assemblyChecks(p);
    return {
      productId: p.id,
      productName: p.name,
      tier: "draft" as Tier,
      issues: [...NOT_RUN, ...assembly.issues],
      passed: assembly.passed,
    };
  });

  // §4.4.10 — the primary and each companion, and a failure lands on both
  // sides of it.
  const entryOf = new Map(products.map((p, i) => [p, byProduct[i]]));
  for (const [a, b] of pairsOf(products, (p) => p.id === "primary")) {
    const issues = compatibilityIssues(a, b);
    if (!issues.length) continue;
    entryOf.get(a)!.issues.push(...issues);
    entryOf.get(b)!.issues.push(...issues);
  }

  for (const entry of byProduct) {
    // A product is `Checked` only when nothing is outstanding. Today the
    // NOT_RUN design-rule entry guarantees that never happens; the rule is
    // written the way it will behave once the checks exist, rather than
    // hardcoding the current answer.
    entry.tier = entry.issues.length === 0 ? "checked" : "draft";
  }

  return {
    byProduct,
    // §4.4.9 — the lowest tier is the headline.
    headline: byProduct.some((p) => p.tier === "draft") ? "draft" : "checked",
  };
}

/** What the badge says, and what it means underneath (§4.3.2's table). */
export const TIER_LABEL: Record<Tier, string> = {
  checked: "Checked",
  draft: "Draft",
};

export const TIER_MEANING: Record<Tier, string> = {
  checked: "Automated design rule checks passed",
  // Not "design rule issues": what is found today is a works-with mismatch
  // between two products, and the sentence has to be true of every group.
  draft: "Issues found — review them before you manufacture",
};

/** What `Draft` means when nothing was found because nothing could run — the
 *  case on every build today. "Issues found" there was a claim about checks
 *  the rows beneath it said never ran. */
export const DRAFT_UNCHECKED_MEANING =
  "Not checked yet — the design rule checks can't run on this build, so nothing has been verified. Nothing was found wrong either; review it before you manufacture.";

/** `Draft` when the assembly checks ran and passed and only the design rule
 *  checks are outstanding — true of most builds now. */
export const DRAFT_PARTLY_CHECKED_MEANING =
  "Power and fit were checked and passed. The design rule checks can't run on this build yet, so the board itself isn't verified — review it before you manufacture.";

/** §4.3.4 — the sentence that has to be on screen wherever `Draft` is,
 *  because the spec calls this copy the single most likely source of a
 *  refund dispute in the flow. */
export const DRAFT_CREDIT_NOTE =
  "A Draft result is a finished build, not a failure — no credits are refunded. Generation quality varies with how complex the idea is. A build that stops because something broke on our side is a different thing, and that one is always refunded.";

/** Job-level convenience so surfaces do not each rebuild the product list. */
export function confidenceFor(
  job: BuildJob,
  products: BuildProduct[],
): BuildConfidence {
  return checkBuild(job, products);
}

// The concept stage's network — which of a project's products talk to each
// other, and what travels between them, worked out from the prompt before
// anything is built (docs/superpowers/specs/2026-09-30-concept-network-
// design.md, S4). The rail's Network section reads it, the spec sheet's
// Wireless section asks it whether a product's radio is the network's, and
// Save turns it into the project's network (lib/network/from-concept.ts).
//
// Two answers, the model's first: the companions call already asks it how the
// products talk, and its links are kept on the setup turn. A product the model
// named nothing for — or every product, when it did not answer, and any
// product added later from the composer — gets the rule's answer below.
//
// The protocol is never stored here. It is the products' own radio, read off
// their parts as edited (radioKeyOf), so the spec sheet and the network can't
// disagree; changing it writes SpecEdits.radio on both ends, the way the
// Wireless select does.
//
// Pure, relative imports only: the node:test harness runs the tsc output.

import type { Carries, MapLink, ProtocolKey, Role, SensorType } from "../network/types";
import { bandOf, protocolOfRadio, protocolShort } from "../network/catalog";
import { ROLE_LABEL, detectSensor, pickMaster, roleOf } from "../network/derive";
import { RADIOS, isDriveMotor, isMcu, radioChoices, radioKeyOf } from "../spec/catalog";
import { deriveSpec } from "../spec/derive";
import { effectiveEdits, resetSection, sectionEdited, stampEdits } from "../spec/edits";
import { standaloneOf } from "../spec/facts";
import { cleanEdits } from "../spec/hints";
import type { AiHints, RadioKey, SpecEdits } from "../spec/types";
import { radioOf } from "./confidence";
import {
  APP,
  CLOUD,
  asLinkEdit,
  asNetworkReply,
  linkIdOf,
  type AppKind,
  type LinkEdit,
  type LinkSeed,
  type NetworkEdits,
  type NetworkReply,
} from "./network-reply";
import type { ConceptPart } from "./concept";
import { productIdOf, railNameOf, type ProjectState } from "./project-state";

export {
  APP,
  CLOUD,
  asNetworkReply,
  linkIdOf,
  parseNetworkReply,
  type AppKind,
  type LinkEdit,
  type LinkSeed,
  type NetworkEdits,
  type NetworkReply,
} from "./network-reply";

// ───────────────────────── the products ─────────────────────────

/** A product as the network reads it. */
export type NetEnd = {
  id: string;
  name: string;
  primary: boolean;
  /** As edited — what is built. */
  parts: ConceptPart[];
  conceptParts: ConceptPart[];
  /** Meant to talk over a radio (ResolvedSpec.speaks). */
  speaks: boolean;
  /** Built: its radio is the build's, and no link it is on can change. */
  locked: boolean;
};

/** A product on the canvas, with what a radio edit is worked out from. */
export type NetPeer = NetEnd & { edits: SpecEdits; hints?: AiHints; turnId: string };

/** The project's products that have a spec — a stand-in's too: with the
 *  model down every product is one, and its parts are what gets built. */
export function netPeersOf(state: ProjectState): NetPeer[] {
  return state.products.flatMap((t): NetPeer[] => {
    const spec = state.specs.get(t.id);
    const concept = state.concepts.get(t.id);
    if (t.status !== "ready" || !spec || !concept) return [];
    return [
      {
        id: productIdOf(t),
        name: railNameOf(state.setup, t),
        primary: !t.companionOf,
        parts: state.parts.get(t.id) ?? concept.parts,
        conceptParts: concept.parts,
        speaks: spec.speaks,
        locked: state.locked.has(t.id),
        edits: state.edits.get(t.id) ?? {},
        hints: concept.hints,
        turnId: t.id,
      },
    ];
  });
}

// ───────────────────────── the rule ─────────────────────────

/** Sends commands to the main product. */
const COMMANDER = /\b(?:remotes?|controllers?|transmitters?|handhelds?)\b/i;
/** Collects what the main product reports. */
const COLLECTOR = /\b(?:base stations?|hubs?|gateways?|receivers?)\b/i;
/** Never on a link, whatever else its name says. */
const NO_LINK = /\b(?:charg\w*|docks?|cases?|spare|packs?|batter(?:y|ies))\b/i;
/** The prompt asks for the product to be reached from anywhere. */
const CLOUD_WORDS = /\b(?:cloud|internet|anywhere)\b|\bremote(?:ly)?\s+access/i;

/** The rule's link for one companion, or null: a remote-like one commands
 *  the main product, a base-station-like one collects its readings, and a
 *  charger, dock, case, spare pack — or one with no radio — is on none. */
export function ruleLinkFor(companion: NetEnd): LinkSeed | null {
  if (companion.primary || !companion.speaks) return null;
  if (NO_LINK.test(companion.name) || standaloneOf(companion.conceptParts)) return null;
  if (COMMANDER.test(companion.name)) return { from: companion.id, to: "primary", carries: "commands", twoWay: false };
  if (COLLECTOR.test(companion.name)) return { from: "primary", to: companion.id, carries: "sensor", twoWay: false };
  return null;
}

const senses = (parts: ConceptPart[]) => parts.some((p) => p.category === "Sensor");
const acts = (parts: ConceptPart[]) =>
  parts.some((p) => p.category === "Actuator" || p.category === "Display & I/O");

/** A product on no link with a radio talks to the phone app — the cloud
 *  when the prompt asks for it from anywhere. A product that only reports
 *  sends readings; anything else is told what to do and says how it is. */
function appLinkFor(product: NetEnd, kind: AppKind): LinkSeed {
  const to = kind === "cloud" ? CLOUD : APP;
  return senses(product.parts) && !acts(product.parts)
    ? { from: product.id, to, carries: "sensor", twoWay: false }
    : { from: product.id, to, carries: "data+commands", twoWay: true };
}

// ───────────────────────── the links ─────────────────────────

export type LinkProblem =
  /** Both ends have a radio, and not the same one. */
  | { kind: "mismatch" }
  /** This end has no radio. */
  | { kind: "no-radio"; productId: string }
  /** The product's radio is not one a phone, or the cloud, can take. */
  | { kind: "app"; app: AppKind; radio: string };

export type ConceptLink = {
  id: string;
  from: string;
  to: string;
  twoWay: boolean;
  carries: Carries;
  /** The model's or the rule's, before the maker's edit. */
  suggested: LinkSeed;
  source: "ai" | "rules";
  /** The radio both ends use; null while they don't agree, or for a module
   *  the catalog doesn't list. */
  radio: RadioKey | null;
  /** What the link runs over, as the network names it; null while the ends
   *  don't agree. */
  protocol: ProtocolKey | null;
  /** The radio's words when there is no protocol to name it by. */
  radioText: string | null;
  middle: "direct" | "cloud";
  problem: LinkProblem | null;
  /** The maker's edit to it — its direction, what travels, or the radios
   *  Change link set. */
  edit: LinkEdit | null;
  /** Differs from the suggestion: Back to suggested is offered. */
  edited: boolean;
  /** An end is built, so the link is what was built. */
  locked: boolean;
};

/** The radios a phone and the cloud can take. */
const APP_RADIOS: Record<AppKind, RadioKey[]> = { phone: ["wifi", "ble"], cloud: ["wifi", "cellular"] };

const endIsProduct = (id: string) => id !== APP && id !== CLOUD;
const appKindOf = (id: string): AppKind | null => (id === APP ? "phone" : id === CLOUD ? "cloud" : null);

function radioOfLink(
  seed: LinkSeed,
  byId: Map<string, NetEnd>,
): Pick<ConceptLink, "radio" | "protocol" | "radioText" | "problem"> {
  const a = byId.get(seed.from);
  const b = byId.get(seed.to);
  const app = appKindOf(seed.to) ?? appKindOf(seed.from);
  if (app) {
    const p = a ?? b!;
    const key = radioKeyOf(p.parts);
    if (key === "none") return { radio: null, protocol: null, radioText: null, problem: { kind: "no-radio", productId: p.id } };
    if (key === null) return { radio: null, protocol: null, radioText: radioOf(p.parts), problem: null };
    if (!APP_RADIOS[app].includes(key)) {
      return { radio: key, protocol: null, radioText: null, problem: { kind: "app", app, radio: RADIOS[key].label } };
    }
    return { radio: key, protocol: app === "cloud" && key === "wifi" ? "WM" : protocolOfRadio(key), radioText: null, problem: null };
  }
  const ka = radioKeyOf(a!.parts);
  const kb = radioKeyOf(b!.parts);
  const none = ka === "none" ? a! : kb === "none" ? b! : null;
  if (none) return { radio: null, protocol: null, radioText: null, problem: { kind: "no-radio", productId: none.id } };
  if (ka !== null && ka === kb) return { radio: ka, protocol: protocolOfRadio(ka), radioText: null, problem: null };
  const ra = radioOf(a!.parts);
  if (ka === null && kb === null && ra && ra === radioOf(b!.parts)) {
    return { radio: null, protocol: null, radioText: ra, problem: null };
  }
  return { radio: null, protocol: null, radioText: null, problem: { kind: "mismatch" } };
}

/** A controller companion's link as it has to read: the controller starts
 *  it and sends commands. The model sometimes draws it backwards — the
 *  product reporting telemetry to its remote — and then the link is two-way:
 *  commands from the controller, telemetry back. */
export function normalizeSeed(seed: LinkSeed, byId: Map<string, NetEnd>): LinkSeed {
  const isController = (id: string) => {
    const p = byId.get(id);
    return !!p && !p.primary && COMMANDER.test(p.name) && !NO_LINK.test(p.name);
  };
  const a = isController(seed.from);
  const b = isController(seed.to);
  if (a === b || !endIsProduct(seed.from) || !endIsProduct(seed.to)) return seed;
  if (a) return seed.carries === "commands" || seed.carries === "data+commands" ? seed : { ...seed, carries: "commands" };
  return { from: seed.to, to: seed.from, carries: "commands", twoWay: true };
}

/** Every link the project's products make, suggested and then as the maker
 *  changed it: the model's links between products the project holds, the
 *  rule's for each companion the model said nothing about, and — with no
 *  link between products at all — the main product's link to the phone app
 *  or the cloud, when it has a radio. */
export function conceptLinks(
  peers: NetEnd[],
  input: { reply?: NetworkReply | null; edits?: NetworkEdits | null; prompt?: string },
): ConceptLink[] {
  const byId = new Map(peers.map((p) => [p.id, p]));
  const reply = input.reply ?? null;
  const seeds: { seed: LinkSeed; source: "ai" | "rules" }[] = [];
  const taken = new Set<string>();
  const add = (seed: LinkSeed, source: "ai" | "rules") => {
    const id = linkIdOf(seed.from, seed.to);
    if (taken.has(id)) return;
    taken.add(id);
    seeds.push({ seed, source });
  };
  for (const seed of reply?.links ?? []) {
    if (byId.has(seed.from) && byId.has(seed.to)) add(normalizeSeed(seed, byId), "ai");
  }
  const covered = new Set(seeds.flatMap(({ seed }) => [seed.from, seed.to]));
  for (const p of peers) {
    if (covered.has(p.id)) continue;
    const seed = ruleLinkFor(p);
    if (seed && byId.has(seed.to) && byId.has(seed.from)) add(seed, "rules");
  }
  const main = peers.find((p) => p.primary);
  if (!seeds.length && main?.speaks) {
    // The model's word for a lone product, when it gave one.
    const kind: AppKind = reply?.app ?? (CLOUD_WORDS.test(input.prompt ?? "") ? "cloud" : "phone");
    add(appLinkFor(main, kind), reply?.app ? "ai" : "rules");
  }

  const edits = input.edits?.links ?? {};
  return seeds.map(({ seed, source }) => {
    const id = linkIdOf(seed.from, seed.to);
    const edit = asLinkEdit(edits[id]);
    const dir = edit?.direction && (edit.direction.from === seed.from || edit.direction.from === seed.to) ? edit.direction : null;
    const from = dir ? dir.from : seed.from;
    const to = from === seed.from ? seed.to : seed.from;
    const twoWay = dir ? dir.twoWay : seed.twoWay;
    const carries = edit?.carries ?? seed.carries;
    const ends = [seed.from, seed.to].filter(endIsProduct);
    return {
      id,
      from,
      to,
      twoWay,
      carries,
      suggested: seed,
      source,
      ...radioOfLink(seed, byId),
      middle: seed.to === CLOUD || seed.from === CLOUD ? "cloud" : "direct",
      edit,
      edited: !!edit,
      locked: ends.some((e) => byId.get(e)?.locked),
    };
  });
}

// ───────────────────────── what a row says ─────────────────────────

/** The name of a link's end — a product's own, or the phone app, the cloud. */
export function endName(id: string, peers: NetEnd[]): string {
  if (id === APP) return "Phone app";
  if (id === CLOUD) return "Cloud";
  return peers.find((p) => p.id === id)?.name ?? "Removed product";
}

/** "Remote controller → Car", "Lamp ↔ Phone app". */
export function endsLine(link: ConceptLink, peers: NetEnd[]): string {
  return `${endName(link.from, peers)} ${link.twoWay ? "↔" : "→"} ${endName(link.to, peers)}`;
}

const MIDDLE_WORD = { direct: "Direct", cloud: "Through cloud" } as const;

/** "nRF24 · 2.4 GHz · Direct" — null while the ends don't agree on a radio
 *  (the problem line says so instead). */
export function connectsLine(link: ConceptLink): string | null {
  if (link.problem) return null;
  if (link.protocol) {
    // Wi-Fi to the cloud runs MQTT over Wi-Fi; the row says the radio.
    const short = link.protocol === "WM" ? "Wi-Fi" : protocolShort(link.protocol);
    return [short, bandOf(link.protocol), MIDDLE_WORD[link.middle]].filter(Boolean).join(" · ");
  }
  return link.radioText ? `${link.radioText} · ${MIDDLE_WORD[link.middle]}` : null;
}

/** The owner's words for a link that can't work yet — the fix is in Change
 *  link. */
export function problemLine(link: ConceptLink, peers: NetEnd[]): string | null {
  const p = link.problem;
  if (!p) return null;
  if (p.kind === "mismatch") return "These two can't talk yet — pick one protocol";
  if (p.kind === "no-radio") return `${endName(p.productId, peers)} has no radio yet — pick a protocol to add one`;
  return p.app === "phone"
    ? `A phone can't talk ${p.radio} — pick one protocol`
    : `${p.radio} can't reach the cloud — pick one protocol`;
}

// What a product is told to do, by its first actuator — the words a command
// link carries.
const COMMAND_WORDS: [RegExp, string][] = [
  [/servo|stepper|actuator/, "position"],
  [/led|lamp|bulb|light|dimmer/, "light"],
  [/relay|switch|solenoid|valve|lock/, "on and off"],
  [/pump|fan/, "speed"],
  [/display|oled|lcd|e-?paper|screen/, "display"],
  [/buzzer|speaker|siren/, "alert"],
];

function commandWord(parts: ConceptPart[]): string {
  if (parts.some(isDriveMotor)) return "steering and throttle";
  for (const p of parts) {
    if (p.category !== "Actuator" && p.category !== "Display & I/O") continue;
    const n = p.name.toLowerCase();
    const hit = COMMAND_WORDS.find(([re]) => re.test(n));
    if (hit) return hit[1];
  }
  return "";
}

const READING_WORDS: Record<SensorType, string> = {
  "temp-hum": "temperature and humidity",
  temp: "temperature",
  hum: "humidity",
  pir: "motion",
  reed: "door",
  soil: "soil moisture",
  gas: "gas",
  light: "light level",
  pressure: "pressure",
  current: "power",
  imu: "motion",
  ultrasonic: "distance",
  ir: "IR",
  ph: "pH",
  gps: "location",
  battery: "battery level",
  none: "sensor",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Steering and throttle commands", "Soil moisture readings" — what travels,
 *  in plain words, from what the ends are made of. */
export function travelsLine(link: ConceptLink, peers: NetEnd[]): string {
  const partsOf = (id: string) => peers.find((p) => p.id === id)?.parts ?? [];
  // A command goes to a product; on a link to the app or the cloud, that is
  // the product end.
  const told = endIsProduct(link.to) ? link.to : link.from;
  const sender = endIsProduct(link.from) ? link.from : link.to;
  const command = commandWord(partsOf(told));
  const sensor = detectSensor(partsOf(sender));
  const readings = READING_WORDS[sensor];
  switch (link.carries) {
    case "commands": {
      const words = command ? `${cap(command)} commands` : "Commands";
      return link.twoWay ? `${words}, with telemetry back` : words;
    }
    case "sensor":
      return `${cap(readings)} readings`;
    case "events":
      return sensor === "pir" ? "Motion events" : sensor === "reed" ? "Open and close events" : "Events";
    case "data+commands": {
      const data = sensor === "none" ? "Status" : `${cap(readings)} readings`;
      return `${data} and ${command ? `${command} commands` : "commands"}`;
    }
  }
}

/** As MapLinks, for the role rules — a link whose ends don't agree yet takes
 *  the first protocol the others agree on, so it is not read as a second
 *  interface. */
function asMapLinks(links: ConceptLink[]): MapLink[] {
  const fallback = links.find((l) => l.protocol)?.protocol ?? "WF";
  return links.map((l) => ({
    id: l.id,
    from: l.from,
    to: l.to,
    fromSide: "right",
    toSide: "left",
    protocol: l.protocol ?? fallback,
    initiator: l.twoWay ? "both" : "source",
    middle: l.middle,
    carries: l.carries,
    label: "",
  }));
}

/** Each product's role on the network, by the Figma role rules (derive.ts). */
export function rolesOf(links: ConceptLink[]): Map<string, Role> {
  const map = asMapLinks(links);
  const ids = [...new Set(links.flatMap((l) => [l.from, l.to]).filter(endIsProduct))];
  const master = pickMaster(ids, map);
  return new Map(ids.map((id) => [id, roleOf(id, map, master)]));
}

/** "Remote controller: Master · Car: Slave" — the products on this link. */
export function rolesLine(link: ConceptLink, roles: Map<string, Role>, peers: NetEnd[]): string {
  return [link.from, link.to]
    .filter(endIsProduct)
    .map((id) => `${endName(id, peers)}: ${ROLE_LABEL[roles.get(id) ?? "Peer"]}`)
    .join(" · ");
}

// ───────────────────────── the whole section ─────────────────────────

export type ConceptNetwork = {
  /** The rail shows its Network section. */
  show: boolean;
  /** The maker added it. Until then the section only offers it: nothing is
   *  read-only on the sheet and Save writes no network. */
  added: boolean;
  /** A product is still being drawn or read, so its links aren't known yet. */
  working: boolean;
  links: ConceptLink[];
  peers: NetPeer[];
  roles: Map<string, Role>;
  /** The products on a link — whose radio is the network's to choose. */
  onLink: Set<string>;
};

/** The section's whole model, off the project the rail reads. It shows once
 *  the question is answered and a product has its parts, and hides when no
 *  product has a radio. */
export function conceptNetworkOf(state: ProjectState): ConceptNetwork {
  const peers = netPeersOf(state);
  const setup = state.setup;
  const answered = setup?.status === "answered" && !!state.answer;
  const working = state.products.some((t) => t.status === "pending" || (t.status === "ready" && !state.specs.get(t.id)));
  const added = state.answer?.network?.added === true;
  const links = answered
    ? conceptLinks(peers, {
        reply: asNetworkReply(setup?.network),
        edits: state.answer?.network,
        prompt: setup?.prompt,
      })
    : [];
  // With no radio anywhere there is no link to show, and the section hides —
  // as it does once a build holds the products, if it was never added.
  const show = answered && peers.length > 0 && (links.length > 0 || working) && (added || state.locked.size === 0);
  return {
    show,
    added,
    working,
    links,
    peers,
    roles: rolesOf(links),
    onLink: added ? new Set(links.flatMap((l) => [l.from, l.to]).filter(endIsProduct)) : new Set(),
  };
}

// ───────────────────────── Change link ─────────────────────────

/** The radios the link's ends can all carry — the Protocol field's options.
 *  A product with no chip carries none; a phone or the cloud only what they
 *  take. */
export function protocolChoices(link: ConceptLink, peers: NetEnd[]): RadioKey[] {
  const ends = [link.from, link.to];
  let keys: RadioKey[] | null = null;
  for (const id of ends) {
    const app = appKindOf(id);
    const p = peers.find((x) => x.id === id);
    const own: RadioKey[] = app
      ? APP_RADIOS[app]
      : p && p.parts.some(isMcu)
        ? radioChoices(p.parts).map((c) => c.key).filter((k) => k !== "none")
        : [];
    keys = keys ? keys.filter((k) => own.includes(k)) : own;
  }
  return keys ?? [];
}

/** An edit as the spec sheet stores one: checked against the parts, and
 *  stamped with the drawing it was made on (spec-sheet.tsx's `edit`). */
function sheetEdit(peer: NetPeer, next: SpecEdits): SpecEdits {
  const now = deriveSpec(peer.conceptParts, peer.hints, cleanEdits(next));
  return stampEdits(effectiveEdits(next, peer.conceptParts, now.battery), peer.edits, peer.turnId);
}

/** A protocol picked for the link: SpecEdits.radio on each product end whose
 *  radio isn't that one already, so both ends' parts, cost and power move as
 *  a Wireless change moves them. */
export function protocolChange(
  link: ConceptLink,
  peers: NetPeer[],
  key: RadioKey,
): { productId: string; edits: SpecEdits }[] {
  return [link.from, link.to].flatMap((id) => {
    const p = peers.find((x) => x.id === id);
    if (!p || radioKeyOf(p.parts) === key) return [];
    return [{ productId: p.id, edits: sheetEdit(p, { ...p.edits, radio: key }) }];
  });
}

/** Back to suggested: the radios Change link set on this link's ends, back
 *  to their concept's as the Wireless section's Reset puts them. A radio set
 *  on the sheet before the network was added is the maker's, and stays. */
export function radioReset(link: ConceptLink, peers: NetPeer[]): { productId: string; edits: SpecEdits }[] {
  const on = new Set(link.edit?.radioOn ?? []);
  return [link.from, link.to].flatMap((id) => {
    const p = peers.find((x) => x.id === id);
    if (!p || !on.has(id) || !sectionEdited(p.edits, "connects", p.conceptParts)) return [];
    return [{ productId: p.id, edits: sheetEdit(p, resetSection(p.edits, "connects", p.conceptParts)) }];
  });
}

/** Remove network: every radio Change link set, put back — each product
 *  once, whichever links set it. */
export function networkReset(net: Pick<ConceptNetwork, "links" | "peers">): { productId: string; edits: SpecEdits }[] {
  const seen = new Set<string>();
  return net.links.flatMap((l) => radioReset(l, net.peers)).filter((r) => !seen.has(r.productId) && !!seen.add(r.productId));
}

/** What the maker set, as an edit over the suggestion — null when it is the
 *  suggestion, so the link reads as suggested again. `radioOn` adds the
 *  products whose radio this save set to the ones set before. */
export function linkEditFor(
  link: ConceptLink,
  set: { from: string; twoWay: boolean; carries: Carries },
  radioOn: string[] = [],
): LinkEdit | null {
  const s = link.suggested;
  const out: LinkEdit = {};
  if (set.from !== s.from || set.twoWay !== s.twoWay) out.direction = { from: set.from, twoWay: set.twoWay };
  if (set.carries !== s.carries) out.carries = set.carries;
  const on = [...new Set([...(link.edit?.radioOn ?? []), ...radioOn])];
  if (on.length) out.radioOn = on;
  return out.direction || out.carries || out.radioOn ? out : null;
}

export const CARRIES_LABEL: Record<Carries, string> = {
  commands: "Commands",
  sensor: "Sensor readings",
  events: "Events",
  "data+commands": "Data and commands",
};

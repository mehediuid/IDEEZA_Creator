// On Save, the concept network becomes the project's network (concept-network
// design S5): the links the rail showed, read against what was built, as a
// Network the project page's Network tab and the Connection Map open on. Only
// when the project has none — once one exists, the Connection Map is the
// maker's and nothing here touches it.
//
// Pure, relative imports only: the node:test harness runs the tsc output.

import { productsOf, type BuildJob, type ChatSession, type ChatTurn } from "../create/history";
import { APP, CLOUD, conceptLinks, type ConceptLink, type NetEnd } from "../create/concept-network";
import { asNetworkReply } from "../create/network-reply";
import { radioKeyOf } from "../spec/catalog";
import { defaultLabel, frequencyFor, pickMaster, settingsFor } from "./derive";
import { boxOf, facingSides } from "./geometry";
import { layoutNodes } from "./planner";
import { sanitizeNetwork } from "./store";
import type { Intent, MapLink, NetProduct, Network, ProtocolKey } from "./types";

/** The concept links between the products a build made, as the chat left
 *  them: the model's answer and the maker's edits on its setup turn, and the
 *  build's own parts — what was built, which is what the network runs on. */
export function builtLinks(job: BuildJob, chat: ChatSession | null): { links: ConceptLink[]; ends: NetEnd[] } {
  const ends: NetEnd[] = productsOf(job).map((p) => ({
    id: p.id,
    name: p.id === "primary" ? job.title : p.name,
    primary: p.id === "primary",
    parts: p.parts,
    conceptParts: p.parts,
    speaks: p.spec ? p.spec.speaks : radioKeyOf(p.parts) !== "none",
    locked: true,
  }));
  const setup = chat?.turns.find((t): t is Extract<ChatTurn, { role: "setup" }> => t.role === "setup");
  const links = conceptLinks(ends, {
    reply: asNetworkReply(setup?.network),
    edits: setup?.answer?.network,
    prompt: setup?.prompt ?? job.conceptPrompt,
  });
  return { links, ends };
}

const norm = (s: string) => s.trim().toLowerCase();

/** The project's Network from concept links. Each product end is matched by
 *  name to the network's products (networkProducts); a link whose ends don't
 *  agree on a radio has no protocol to run on and is left for the Connection
 *  Map. Null when no link is left. */
export function networkFromConcept(input: {
  projectId: string;
  name: string;
  products: NetProduct[];
  links: ConceptLink[];
  ends: NetEnd[];
  now: number;
}): Network | null {
  const byName = new Map(input.products.map((p) => [norm(p.name), p]));
  const nodeOf = (end: string): string | null => {
    if (end === APP) return "app";
    if (end === CLOUD) return "broker";
    const name = input.ends.find((e) => e.id === end)?.name;
    return (name && byName.get(norm(name))?.id) || null;
  };
  const kept = input.links.flatMap((l) => {
    const from = nodeOf(l.from);
    const to = nodeOf(l.to);
    return from && to && l.protocol ? [{ link: l, from, to, protocol: l.protocol }] : [];
  });
  if (!kept.length) return null;

  const intent: Intent = kept.some((k) => k.to === "broker" || k.from === "broker")
    ? "cloud"
    : kept.some((k) => k.to === "app" || k.from === "app")
      ? "ctrl"
      : "p2p";
  const ids = new Set(kept.flatMap((k) => [k.from, k.to]));
  const products = input.products.filter((p) => ids.has(p.id));
  // The planner's boxes for the goal, less the ones no link uses — a phone
  // app reached over BLE needs no broker.
  const nodes = layoutNodes(intent, products).filter((n) => ids.has(n.id));
  const box = (id: string) => nodes.find((n) => n.id === id);
  const links: MapLink[] = kept.map((k, i) => {
    const a = box(k.from);
    const b = box(k.to);
    const raw = {
      from: k.from,
      to: k.to,
      initiator: k.link.twoWay ? ("both" as const) : ("source" as const),
      middle: k.link.middle,
      carries: k.link.carries,
    };
    return {
      id: `ln_concept_${i + 1}`,
      ...raw,
      protocol: k.protocol,
      ...(a && b ? facingSides(boxOf(a), boxOf(b)) : { fromSide: "right" as const, toSide: "left" as const }),
      label: defaultLabel(raw, products),
    };
  });
  const productIds = products.map((p) => p.id);
  const masterId = pickMaster(productIds, links);
  const protocol: ProtocolKey = links[0].protocol;
  const cloudType = intent === "cloud" ? "mqtt" : "none";
  const base = {
    links,
    masterId,
    protocol,
    frequency: frequencyFor(protocol, "2.4"),
    repeater: "none" as const,
    topology: intent === "p2p" ? ("p2p" as const) : ("star" as const),
    cloudType: cloudType as Network["cloudType"],
    products: {},
  };
  const network: Network = {
    version: 1,
    projectId: input.projectId,
    name: input.name,
    cloudName: "",
    cloudPassword: "",
    ...base,
    intent,
    method: "ai",
    mapSource: kept.some((k) => k.link.source === "ai") ? "ai" : "rules",
    productIds,
    nodes,
    products: settingsFor(products, base),
    createdAt: input.now,
    updatedAt: input.now,
  };
  return sanitizeNetwork(network, input.projectId);
}

/** What Save writes: the network for this project, or null — when the
 *  project has one already (the Connection Map is the maker's), or when the
 *  concept had no link to give it. */
export function networkForSave(input: {
  existing: Network | null;
  projectId: string;
  name: string;
  products: NetProduct[];
  job: BuildJob;
  chat: ChatSession | null;
  now: number;
}): Network | null {
  if (input.existing) return null;
  const { links, ends } = builtLinks(input.job, input.chat);
  return networkFromConcept({ ...input, links, ends });
}

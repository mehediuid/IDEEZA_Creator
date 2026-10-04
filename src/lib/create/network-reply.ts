// How the model said a project's products talk, and the maker's edits to it
// — the shapes the setup turn stores, and the strict parse of the model's
// reply. Its own module because the companions route imports it, and that
// route must stay free of the client store (concept-network.ts reads the
// project model, which imports it).

import type { Carries } from "../network/types";
import { companionId } from "./companions";

/** The two ends that are not products. */
export const APP = "app";
export const CLOUD = "cloud";
export type AppKind = "phone" | "cloud";

/** One link as the model answered it, by product id ("primary" or a
 *  companion id). `from` starts the conversation. */
export type LinkSeed = { from: string; to: string; carries: Carries; twoWay: boolean };

/** The model's answer, kept on the setup turn beside the companions. `app`
 *  is what a lone product talks to. */
export type NetworkReply = { links: LinkSeed[]; app: AppKind | null };

/** The maker's change to one link, over the suggestion: who sends, what
 *  travels, and the products whose radio Change link set — the radios Back to
 *  suggested and Remove network put back. Absent fields follow the
 *  suggestion. */
export type LinkEdit = {
  direction?: { from: string; twoWay: boolean };
  carries?: Carries;
  radioOn?: string[];
};
/** On the setup answer. The network is optional: nothing about it shows, is
 *  read-only or is saved until the maker adds it (`added`). Edits by link id. */
export type NetworkEdits = { added?: boolean; links: Record<string, LinkEdit> };

export const CARRIES: Carries[] = ["commands", "sensor", "events", "data+commands"];

/** The model's words for what travels, as the network's own. */
const AI_CARRIES: Record<string, Carries> = {
  commands: "commands",
  sensor: "sensor",
  events: "events",
  data: "data+commands",
};

/** A link's id: its two ends, sorted — the same whichever way it points. */
export function linkIdOf(a: string, b: string): string {
  return [a, b].sort().join("~");
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";

// ───────────────────────── the model's answer ─────────────────────────

/** The companions reply's `links` and `app`, strictly: a name that is not
 *  one of the products it returned — or the main product, by `product` or
 *  "main" — drops its link, as does anything else out of shape. Null when
 *  there is nothing usable, so the rule answers. */
export function parseNetworkReply(
  raw: unknown,
  companions: { id: string; name: string }[],
  product?: string,
): NetworkReply | null {
  if (!isObj(raw)) return null;
  const main = product ? companionId(product) : "";
  const endOf = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const id = companionId(v.trim());
    if (!id) return null;
    if (id === "main" || id === "primary" || (main && id === main)) return "primary";
    return companions.find((c) => c.id === id || companionId(c.name) === id)?.id ?? null;
  };
  const links: LinkSeed[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(raw.links) ? raw.links.slice(0, 12) : []) {
    if (!isObj(item)) continue;
    const from = endOf(item.from);
    const to = endOf(item.to);
    const carries = typeof item.carries === "string" ? AI_CARRIES[item.carries] : undefined;
    if (!from || !to || from === to || !carries || typeof item.twoWay !== "boolean") continue;
    const id = linkIdOf(from, to);
    if (seen.has(id)) continue;
    seen.add(id);
    links.push({ from, to, carries, twoWay: item.twoWay });
  }
  const app = raw.app === "phone" || raw.app === "cloud" ? raw.app : null;
  if (!links.length && !app) return null;
  return { links, app };
}

/** A stored reply, shape-checked on the way back in. */
export function asNetworkReply(raw: unknown): NetworkReply | null {
  if (!isObj(raw)) return null;
  const links = (Array.isArray(raw.links) ? raw.links : []).filter(
    (l): l is LinkSeed =>
      isObj(l) &&
      typeof l.from === "string" &&
      typeof l.to === "string" &&
      l.from !== l.to &&
      CARRIES.includes(l.carries as Carries) &&
      typeof l.twoWay === "boolean",
  );
  const app = raw.app === "phone" || raw.app === "cloud" ? raw.app : null;
  return links.length || app ? { links, app } : null;
}

export function asLinkEdit(raw: unknown): LinkEdit | null {
  if (!isObj(raw)) return null;
  const out: LinkEdit = {};
  const d = raw.direction;
  if (isObj(d) && typeof d.from === "string" && typeof d.twoWay === "boolean") {
    out.direction = { from: d.from, twoWay: d.twoWay };
  }
  if (CARRIES.includes(raw.carries as Carries)) out.carries = raw.carries as Carries;
  if (Array.isArray(raw.radioOn)) {
    const on = raw.radioOn.filter((x): x is string => typeof x === "string");
    if (on.length) out.radioOn = on;
  }
  return out.direction || out.carries || out.radioOn ? out : null;
}

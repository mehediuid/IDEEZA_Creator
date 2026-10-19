// Every Messages address (spec §6): the list, one conversation, and
// `/messages/new`, which an entry point opens to find or start a conversation.
// `as` names who the tab acts as (demo). Pure.

import type { ContextRef, PersonId } from "./types";

export const MESSAGES_HREF = "/messages";
/** "Who can message you" and quiet mode, in Settings › Profile & Share (settings spec D13). */
export const MESSAGE_SETTINGS_HREF = "/settings/profile-share#message";
/** Quiet mode, in Settings › Profile & Share. */
export const QUIET_MODE_HREF = "/settings/profile-share#quiet-mode";
/** Hidden words, in Settings › Blocking. */
export const HIDDEN_WORDS_HREF = "/settings/blocking#hide-words";

export type StartParams =
  | { kind: "direct"; to: PersonId; projectId: string; about: ContextRef }
  | { kind: "post"; to: PersonId; slug: string }
  | { kind: "team"; projectId: string };

function withAs(path: string, q: URLSearchParams, as?: PersonId): string {
  if (as) q.set("as", as);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export function aboutParamOf(c: ContextRef): string {
  return c.kind === "purchase" ? `purchase:${c.saleId}` : c.kind;
}

export function aboutIn(raw: string | null | undefined): ContextRef | null {
  if (!raw) return null;
  if (raw === "listing" || raw === "team" || raw === "post") return { kind: raw };
  const m = /^purchase:(.+)$/.exec(raw);
  return m ? { kind: "purchase", saleId: m[1] } : null;
}

export function messagesHref(as?: PersonId): string {
  return withAs(MESSAGES_HREF, new URLSearchParams(), as);
}

export function conversationHref(id: string, opts: { as?: PersonId; about?: ContextRef | null } = {}): string {
  const q = new URLSearchParams();
  if (opts.about) q.set("about", aboutParamOf(opts.about));
  return withAs(`${MESSAGES_HREF}/${encodeURIComponent(id)}`, q, opts.as);
}

export function startHref(p: StartParams, as?: PersonId): string {
  const q = new URLSearchParams();
  if (p.kind === "team") q.set("team", p.projectId);
  else {
    q.set("to", p.to);
    if (p.kind === "direct") {
      q.set("project", p.projectId);
      q.set("about", aboutParamOf(p.about));
    } else q.set("post", p.slug);
  }
  return withAs(`${MESSAGES_HREF}/new`, q, as);
}

type Params = { get(name: string): string | null };

export function parseStart(sp: Params): StartParams | null {
  const team = sp.get("team");
  if (team) return { kind: "team", projectId: team };
  const to = sp.get("to");
  if (!to) return null;
  const post = sp.get("post");
  if (post) return { kind: "post", to, slug: post };
  const projectId = sp.get("project");
  const about = aboutIn(sp.get("about"));
  if (!projectId || !about || about.kind === "post") return null;
  return { kind: "direct", to, projectId, about };
}

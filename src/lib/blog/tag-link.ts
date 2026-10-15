// The Tag link (Figma E4, owner decision D-13): the writer picks one of their IDEEZA
// projects, or pastes an ideeza.com address. Both are kept in the draft's `projectId`:
// a project id as before, or the address in its https form. Readers are sent to the
// project's public page — its Innovations post once it is shared there — never to the
// writer's own working page, which only the writer can open. Pure, so node:test loads it.

import { mineSlugOf, postHref } from "../innovations/slug";

/** The Figma's own words in the field (E4). */
export const TAG_LINK_PLACEHOLDER = "ex. ideeza.com/your product";

export const TAG_LINK_REFUSED = "Paste a link to a page on ideeza.com, or pick one of your projects.";

const HOSTS = new Set(["ideeza.com", "www.ideeza.com"]);

/** A typed or pasted ideeza.com address → "https://ideeza.com/…"; anything else → null. */
export function ideezaHref(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, "")}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;
  return `https://ideeza.com${url.pathname === "/" ? "" : url.pathname}${url.search}${url.hash}`;
}

/** Whether a stored Tag link is an address rather than a project id. */
export function isTagAddress(v: string): boolean {
  return /^https:\/\/ideeza\.com(\/|$|\?|#)/.test(v);
}

/** What the Tag link needs to know about a project. */
export type TagProject = { id: string; name: string; showcasedAt?: unknown };

export type TagLink =
  | {
      kind: "project";
      id: string;
      name: string;
      /** Where a reader goes: the project's Innovations post, or null while it is private. */
      publicHref: string | null;
      /** Where the writer goes: their own project page. */
      ownerHref: string;
    }
  | { kind: "address"; href: string; label: string }
  /** A project that has since been deleted (or is not in this browser). */
  | { kind: "missing" };

const shared = (p: TagProject) => typeof p.showcasedAt === "number" && Number.isFinite(p.showcasedAt);

/** The stored Tag link, read against the writer's projects; null when there is none. */
export function tagLinkOf(value: string | null, projects: readonly TagProject[]): TagLink | null {
  if (!value) return null;
  if (isTagAddress(value)) return { kind: "address", href: value, label: value.replace(/^https:\/\//, "") };
  const p = projects.find((x) => x.id === value);
  if (!p) return { kind: "missing" };
  const name = p.name.trim() || "Untitled project";
  return {
    kind: "project",
    id: p.id,
    name,
    publicHref: shared(p) ? postHref(mineSlugOf({ id: p.id, name: p.name })) : null,
    ownerHref: `/projects/${encodeURIComponent(p.id)}`,
  };
}

/** The line under a project in the Tag link list: whether readers can open it. */
export function projectReach(p: TagProject): string {
  return shared(p) ? "Shared on Innovations" : "Private: readers can't open it yet";
}

/** The field's error when the linked project is gone. */
export const TAG_LINK_MISSING = "This project is no longer here. Pick another one or remove the link.";

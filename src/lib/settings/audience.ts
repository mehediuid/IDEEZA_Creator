// Settings › Privacy & safety — the rules behind its rows (spec
// docs/superpowers/specs/2026-10-19-settings-design.md §5.10; D9 maps Figma's
// friends and groups to our model: Anyone · People you work with · Only me).
// Every rule reads your settings record and how the other person stands to you
// (`Tie`), so the profile and comments answer the same way. Who can message
// you lives in Messages' own store (D13, lib/messages/rules.ts `canStart`).
// The "who can" rows v2 hides (follow, see who you follow, add you to a team,
// invite you to a team conversation, save and link, V4) keep their fields in
// the record and have no rule here until a feature reads them.
//
// Pure, relative imports only.

import { HIDDEN_WORDS_MAX, cleanWords, quietModeOn, type Reach, type SettingsV1 } from "./prefs";

/** How someone stands to you beyond one conversation: on one of your project teams, holding a
 *  share of one of your projects, or owning a copy. */
export type Tie = "team" | "share" | "copy" | null;

/** The other person, as a rule sees them. */
export type Audience = { tie: Tie; blocked: boolean };

/** Anyone; People you work with = your project teams; Only me = nobody else. */
export function reachAllows(reach: Reach, tie: Tie): boolean {
  return reach === "everyone" || (reach === "work" && tie === "team");
}

const STRICTNESS: Record<Reach, number> = { everyone: 0, work: 1, nobody: 2 };

export function stricterReach(a: Reach, b: Reach): Reach {
  return STRICTNESS[a] >= STRICTNESS[b] ? a : b;
}

/** Who may comment on your shared projects now: a break narrows it to people you work with. */
export function commentRuleOf(s: SettingsV1, now: number): Reach {
  return quietModeOn(s, now) ? stricterReach(s.audience.comment, "work") : s.audience.comment;
}

export function canComment(s: SettingsV1, o: Audience & { isOwner: boolean }, now: number): boolean {
  if (o.isOwner) return true;
  return !o.blocked && reachAllows(commentRuleOf(s, now), o.tie);
}

/** A locked profile shows people you don't work with your name, photo and "This profile is locked". */
export function seesLockedProfile(s: SettingsV1, o: { tie: Tie; isOwner: boolean }): boolean {
  return s.audience.locked && !o.isOwner && o.tie !== "team";
}

// ─────────────────────────────── quiet mode ───────────────────────────────

export type QuietChoice = "off" | "24h" | "7d";

export const QUIET_MS: Record<Exclude<QuietChoice, "off">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

/** When quiet mode chosen now ends; null = off. */
export function quietUntilFor(choice: QuietChoice, now: number): number | null {
  return choice === "off" ? null : now + QUIET_MS[choice];
}

/** "Tue, 20 Oct, 3:04 PM": when quiet mode ends, in this browser's locale. */
export function quietEndLabel(at: number): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(at);
}

// ─────────────────────────────── hidden words ───────────────────────────────

const WORD_CHAR = "[\\p{L}\\p{N}\\p{M}_]";
const patterns = new Map<string, RegExp>();
/** Zero-width space, non-joiner, joiner, word joiner and BOM: invisible, and typed or not
 *  depending on the keyboard (Bangla conjuncts often carry a ZWJ or ZWNJ). */
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;

/** The one form text and words are compared in: NFC (so "ো" typed as one sign or as "ে" + "া"
 *  is the same), without zero-width characters. */
export function matchForm(text: string): string {
  return text.normalize("NFC").replace(ZERO_WIDTH, "");
}

function patternOf(raw: string): RegExp {
  const word = matchForm(raw);
  let re = patterns.get(word);
  if (re) return re;
  const tag = word.startsWith("#");
  const body = (tag ? word.slice(1) : word)
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  // "tree" is the word anywhere, a #tree too; "#tree" is only the tag.
  const before = tag ? "(?<![\\p{L}\\p{N}\\p{M}_#])#" : `(?<!${WORD_CHAR})`;
  re = new RegExp(`${before}${body}(?!${WORD_CHAR})`, "iu");
  patterns.set(word, re);
  return re;
}

/** The first hidden word `text` uses, or null. Whole words in any case; a plain word also
 *  matches its #tag; both sides compared in `matchForm`. */
export function hiddenWordIn(text: string, words: readonly string[]): string | null {
  if (!text) return null;
  const form = matchForm(text);
  for (const w of words) if (w && patternOf(w).test(form)) return w;
  return null;
}

export function hasHiddenWord(text: string, words: readonly string[]): boolean {
  return hiddenWordIn(text, words) !== null;
}

/** "tree, #Tree\nNFT" → ["tree", "#tree", "nft"]: commas or new lines, each in `matchForm`, a
 *  bare "#" dropped. */
export function wordsFromInput(input: string): string[] {
  return cleanWords(
    input
      .split(/[,\n]/)
      .map(matchForm)
      .filter((w) => w.trim().replace(/^#+/, "").trim() !== ""),
  );
}

/** `current` with what was typed added; `over` = how many didn't fit under the limit. */
export function addWords(current: readonly string[], input: string): { words: string[]; over: number } {
  const fresh = wordsFromInput(input).filter((w) => !current.includes(w));
  const room = Math.max(0, HIDDEN_WORDS_MAX - current.length);
  return { words: [...current, ...fresh.slice(0, room)], over: Math.max(0, fresh.length - room) };
}

export function wordsRemaining(words: readonly string[]): number {
  return Math.max(0, HIDDEN_WORDS_MAX - words.length);
}

// ─────────────────────────────── people you've met ───────────────────────────────

export type MetWhere = "messages" | "comments" | "marketplace";

/** Someone Privacy & safety › Block someone can find: a person you've met, and where. */
export type MetPerson = { id: string; where: MetWhere[] };

/**
 * The people you've met, in the one person-id scheme ("feed:k1", "buyer-mira", "ctb_…"):
 * the other person of each of your direct conversations, whoever wrote in a comment thread you
 * took part in or on a post of yours, and whoever bought from your projects. You are never in it.
 */
export function peopleMet(input: {
  me: string;
  conversations: readonly { kind: "direct" | "team"; participants: readonly { id: string }[] }[];
  /** Each stored comment thread: whether the post is yours or you wrote in it, and its authors. */
  threads: readonly { yours: boolean; authorIds: readonly string[] }[];
  buyerIds: readonly string[];
}): MetPerson[] {
  const out = new Map<string, MetWhere[]>();
  const add = (id: string, where: MetWhere) => {
    if (!id || id === input.me) return;
    const list = out.get(id) ?? [];
    if (!list.includes(where)) list.push(where);
    out.set(id, list);
  };
  for (const c of input.conversations) {
    if (c.kind !== "direct" || !c.participants.some((p) => p.id === input.me)) continue;
    for (const p of c.participants) add(p.id, "messages");
  }
  for (const t of input.threads) if (t.yours) for (const id of t.authorIds) add(id, "comments");
  for (const id of input.buyerIds) add(id, "marketplace");
  return [...out].map(([id, where]) => ({ id, where }));
}

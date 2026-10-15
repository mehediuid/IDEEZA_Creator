// Why the IDEEZA team sends a blog back or removes it. Each reason is a plain
// title plus how to fix it (one action, no idioms); a review round may add what
// it found ("We counted 92 words…"), and the writer sees both. A removal is
// final (owner D-3), so its rows never say how to fix. Relative imports only
// (node:test loads this).

import type { ReviewReason } from "./types";

export type ReasonInfo = { title: string; fix: string };

export const REASONS: Readonly<Record<string, ReasonInfo>> = {
  "needs-detail": { title: "Needs more detail.", fix: "Add the steps you took, photos, results or what you learned." },
  "off-topic": { title: "Not about making hardware.", fix: "Write about how you made, shipped or sold a hardware product." },
  "reads-like-ad": { title: "Looks like an advertisement.", fix: "Tell how you made it. Keep one link to your product or project." },
  "image-rights": {
    title: "We can't tell if you may use some images.",
    fix: "Use your own images, or images you have permission to use. Say where each one comes from in its caption.",
  },
  "hard-to-follow": { title: "Hard to follow.", fix: "Split it into short sections, each with its own heading." },
  "personal-unsafe": { title: "Personal or unsafe information.", fix: "Remove private details (phone numbers, home addresses) and any unsafe steps." },
};

const FALLBACK: ReasonInfo = { title: "Needs changes.", fix: "The IDEEZA team didn't add details. Use Report a problem to ask what to change." };

export function reasonInfo(id: string): ReasonInfo {
  return REASONS[id] ?? FALLBACK;
}

/** What a removed blog's panel says in place of a fix (owner D-3: removal is final). */
export const REMOVED_FINAL = "Blogs the IDEEZA team removes can't be edited or published again.";

/** One round's reasons with exact repeats dropped, so every count and every list agree. */
export function uniqueReasons(reasons: readonly ReviewReason[]): ReviewReason[] {
  const seen = new Set<string>();
  const out: ReviewReason[] = [];
  for (const r of reasons) {
    const key = `${r.id}\n${r.detail.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** "1 thing to fix", "3 things to fix". */
export function thingsLine(n: number): string {
  return `${n} thing${n === 1 ? "" : "s"} to fix`;
}

// "Suggest from my work" (owner decision D7, spec 2026-10-14-creator-profile-design.md):
// the prompt that asks for a one-line headline from your shared projects only
// — their titles and stories, never a private project, a chat or a draft —
// and the cleaning of the model's reply into one plain line of at most 60
// characters. A reply that isn't a headline (JSON, the provider's quota or
// rate-limit prose, nothing) is null: the dialog then says it couldn't write
// one, and never fills in text of its own. Pure, relative imports only.

import { HEADLINE_MAX } from "./fields";

const MAX_PROJECTS = 6;
const TITLE_MAX = 80;
const STORY_MAX = 300;

export const HEADLINE_SYSTEM =
  "You write the one-line headline on a hardware maker's profile. " +
  "Reply with the headline only: plain text, one line, at most 60 characters, no quotes, no emoji, no hashtags. " +
  "Say what this person builds, in their own plain words, from the projects given. " +
  "Do not invent skills, employers, years or claims the projects don't show. Start with a verb or a noun, not 'I am'.";

export function headlinePrompt(projects: readonly { title: string; story: string }[]): string | null {
  const rows = projects
    .map((p) => ({ title: p.title.trim().slice(0, TITLE_MAX), story: p.story.trim().replace(/\s+/g, " ").slice(0, STORY_MAX) }))
    .filter((p) => p.title)
    .slice(0, MAX_PROJECTS);
  if (!rows.length) return null;
  return ["Projects this maker has shared:", ...rows.map((p) => (p.story ? `- ${p.title}: ${p.story}` : `- ${p.title}`))].join("\n");
}

const NOT_A_HEADLINE = /rate.?limit|quota|too many requests|try again later|queue full|error/i;

export function cleanHeadline(reply: string): string | null {
  const line = reply
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return null;
  if (/^[[{]/.test(line) || NOT_A_HEADLINE.test(line)) return null;
  let text = line
    .replace(/[*_`#>]/g, "")
    .replace(/^["'“‘\s]+|["'”’\s]+$/g, "")
    .replace(/^headline\s*:\s*/i, "")
    .replace(/^["'“‘\s]+|["'”’\s]+$/g, "")
    .replace(/[.!\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  if (text.length > HEADLINE_MAX) {
    const cut = text.slice(0, HEADLINE_MAX + 1);
    const space = cut.lastIndexOf(" ");
    text = (space > 20 ? cut.slice(0, space) : text.slice(0, HEADLINE_MAX)).replace(/[,;:\s]+$/g, "");
  }
  return text || null;
}

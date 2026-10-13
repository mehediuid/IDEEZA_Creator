// Why the IDEEZA team sends an article back or takes it down. Each reason is a
// short name plus how to fix it, so the writer knows what to change; a review
// round may add a detail line of its own ("you have 92").

export type ReasonInfo = { title: string; fix: string };

export const REASONS: Readonly<Record<string, ReasonInfo>> = {
  "needs-detail": { title: "Needs more detail.", fix: "Show what you built and how: steps, photos, results or what you learned." },
  "off-topic": { title: "Off topic for IDEEZA.", fix: "Articles should help people make, ship or sell hardware products." },
  "reads-like-ad": { title: "Reads like an ad.", fix: "Share how you made it. One link to your product or project is fine." },
  "image-rights": { title: "Image rights unclear.", fix: "Use images you made or are allowed to use, and say where they're from." },
  "hard-to-follow": { title: "Hard to follow.", fix: "Split it into short sections, each with its own heading." },
  "personal-unsafe": { title: "Personal or unsafe information.", fix: "Remove private details or unsafe instructions." },
};

export function reasonInfo(id: string): ReasonInfo {
  return REASONS[id] ?? { title: "Needs changes.", fix: "Read the IDEEZA writing guide, then send it again." };
}

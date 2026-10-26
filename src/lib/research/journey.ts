// The first-product journey a tester's funnel is built from: the same steps as the guide
// (lib/tour/guide.ts), read from the app's own data. A milestone is reported the first time it
// becomes true; the analytics tool puts the steps in order and times the gaps.
//
// Unlike the guide, a project made another way doesn't tick the steps before it: the funnel shows
// what the tester actually did.
//
// Pure: the host reads the stores.

export const JOURNEY = [
  "idea_sent",
  "question_answered",
  "concept_ready",
  "build_started",
  "project_saved",
  "editor_opened",
  "minted",
  "shared",
] as const;

export type JourneyId = (typeof JOURNEY)[number];

export type JourneyFacts = Record<JourneyId, boolean>;

/** Just the parts of the stores the journey reads. */
export type JourneySource = {
  chats: readonly { turns: readonly { role: string; status?: string }[] }[];
  builds: readonly unknown[];
  projects: readonly { editorOpened?: object; mint?: unknown; showcasedAt?: number | null }[];
};

export function journeyFacts({ chats, builds, projects }: JourneySource): JourneyFacts {
  const turns = (role: string) => chats.flatMap((c) => c.turns.filter((t) => t.role === role));
  const images = turns("assistant");
  return {
    idea_sent: chats.length > 0,
    // A chat that asked no question counts once it draws, as in the guide.
    question_answered:
      chats.some((c) => c.turns.some((t) => t.role === "setup" && t.status === "answered")) ||
      chats.some((c) => !c.turns.some((t) => t.role === "setup") && c.turns.some((t) => t.role === "assistant")),
    concept_ready: images.some((t) => t.status === "ready"),
    build_started: builds.length > 0,
    project_saved: projects.length > 0,
    editor_opened: projects.some((p) => Object.keys(p.editorOpened ?? {}).length > 0),
    minted: projects.some((p) => !!p.mint),
    shared: projects.some((p) => typeof p.showcasedAt === "number"),
  };
}

export function newMilestones(facts: JourneyFacts, sent: readonly JourneyId[]): JourneyId[] {
  return JOURNEY.filter((id) => facts[id] && !sent.includes(id));
}

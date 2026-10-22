// The Tour Guide panel's journey (spec D7): Idea → Concept → Build → Edit → Earn, each ticked by
// something actually done in this browser, never by having watched a chapter.
//
// Pure, with the stores' shapes narrowed to what it reads (the chats and the projects).

export type JourneyStage = "idea" | "concept" | "build" | "edit" | "earn";

export const JOURNEY: readonly { id: JourneyStage; label: string }[] = [
  { id: "idea", label: "Idea" },
  { id: "concept", label: "Concept" },
  { id: "build", label: "Build" },
  { id: "edit", label: "Edit" },
  { id: "earn", label: "Earn" },
];

type Chat = { turns: readonly { role: string; status?: string }[] };
type Project = {
  status: string;
  buildId?: string;
  builds?: readonly unknown[];
  editorOpened?: Readonly<Record<string, unknown>>;
  lastOpened?: unknown;
  mint?: unknown;
};

/** Which stages are done:
 *  - Idea: an idea was sent, or a project was started by hand.
 *  - Concept: the AI drew a concept, or a project holds a build (a build is made from one).
 *  - Build: a project was saved, built by AI or by hand.
 *  - Edit: a product was opened in an editor.
 *  - Earn: a project was minted. */
export function journeyOf(chats: readonly Chat[], projects: readonly Project[]): Record<JourneyStage, boolean> {
  const built = projects.some((p) => !!p.buildId || (p.builds?.length ?? 0) > 0);
  return {
    idea: chats.length > 0 || projects.length > 0,
    concept: built || chats.some((c) => c.turns.some((t) => t.role === "assistant" && t.status === "ready")),
    build: projects.length > 0,
    edit: projects.some((p) => Object.keys(p.editorOpened ?? {}).length > 0 || p.lastOpened !== undefined),
    earn: projects.some((p) => p.mint !== undefined || p.status === "completed"),
  };
}

/** The first stage not done yet: where the journey is. `null` once every stage is done. */
export function journeyNow(done: Record<JourneyStage, boolean>): JourneyStage | null {
  return JOURNEY.find((s) => !done[s.id])?.id ?? null;
}

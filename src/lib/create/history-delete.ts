// Deleting a concept chat from History (/history): the chat goes, with its
// prompts and its concept images' addresses, and so do the builds started
// from it, except a build a project holds (the project is your work and
// keeps its build) and nothing while one of its builds is queued or running.
// Pure; no imports (node:test loads it).

export type BuildLite = { id: string; chatId: string; status: string; projectId?: string };

export type ChatDeletePlan = {
  /** A build from this chat is queued or running: the chat can't go yet. */
  busy: boolean;
  /** The builds that go with the chat. */
  drop: string[];
  /** The builds that stay because a project holds them. */
  kept: number;
};

type ProjectLite = { buildId?: string; builds?: { buildId: string }[]; products?: { source?: { buildId: string } }[] };

/** Every build a project holds: the one it was made from, the ones it attached, the ones its products came from. */
export function projectBuildIds(projects: readonly ProjectLite[]): Set<string> {
  const out = new Set<string>();
  for (const p of projects) {
    if (p.buildId) out.add(p.buildId);
    for (const r of p.builds ?? []) out.add(r.buildId);
    for (const r of p.products ?? []) if (r.source) out.add(r.source.buildId);
  }
  return out;
}

export function chatDeletePlan(chatId: string, builds: readonly BuildLite[], inProject: ReadonlySet<string>): ChatDeletePlan {
  const mine = builds.filter((b) => b.chatId === chatId);
  const held = (b: BuildLite) => !!b.projectId || inProject.has(b.id);
  return {
    busy: mine.some((b) => b.status === "queued" || b.status === "running"),
    drop: mine.filter((b) => !held(b)).map((b) => b.id),
    kept: mine.filter(held).length,
  };
}

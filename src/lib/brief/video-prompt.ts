// The deterministic 10-second scene sentence that stands in for the model in
// /api/refine's "video" mode. The Prompt Help modal reads the same function,
// so a model that is down and a round-trip that never lands answer with the
// one sentence instead of two copies drifting apart.

export function videoScenePrompt(idea: string): string {
  const trimmed = idea.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
  if (!trimmed) return "";
  return `Cinematic close-up of ${trimmed}, slow orbit on a clean studio backdrop, soft key light, subtle reflections, 10 seconds.`;
}

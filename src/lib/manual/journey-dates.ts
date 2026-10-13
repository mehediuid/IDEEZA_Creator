// When a product joined its project (spec §4): the date its default Planning
// carries. The first saved build of the product's lineage (its chat), never
// before the project itself; a hand-made product, or one whose build left
// nothing to read, takes the project's creation.
//
// Pure, type imports only.

import type { BuildRef, ProjectProduct } from "./project-read";

export function productAddedAt(
  project: { createdAt: number },
  refs: readonly Pick<BuildRef, "chatId" | "savedAt">[],
  product: Pick<ProjectProduct, "built">,
): number {
  const chatId = product.built?.ref.chatId ?? null;
  if (chatId === null) return project.createdAt;
  const times = refs.filter((r) => r.chatId === chatId && r.savedAt !== null).map((r) => r.savedAt as number);
  return times.length ? Math.max(project.createdAt, Math.min(...times)) : project.createdAt;
}

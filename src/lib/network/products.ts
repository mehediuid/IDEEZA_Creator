// The products a network can hold: the project's own products, each read
// against the AI build it was saved from (when there is one) for its concept
// image and its parts — which is where the MCU, radio and sensor chips come
// from. A hand-made project has names and nothing else, and says so.

import { productsOf, type BuildJob } from "@/lib/create/history";
import type { ManualProject } from "@/lib/manual/projects";
import { productFromParts } from "./derive";
import type { NetProduct } from "./types";

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "product"
  );
}

export function networkProducts(project: ManualProject, build: BuildJob | null): NetProduct[] {
  const built = build ? productsOf(build) : [];
  const listed =
    project.products ??
    (built.length
      ? built.map((b) => ({ name: b.name || b.title, description: b.description ?? b.summary }))
      : [{ name: project.productName.trim() || project.name, description: project.description }]);

  const taken = new Set<string>();
  return listed.map((item) => {
    const key = item.name.trim().toLowerCase();
    const source = built.find(
      (b) => b.title.trim().toLowerCase() === key || b.name.trim().toLowerCase() === key,
    );
    let id = `p-${slug(item.name)}`;
    for (let n = 2; taken.has(id); n++) id = `p-${slug(item.name)}-${n}`;
    taken.add(id);
    return productFromParts({
      id,
      name: item.name.trim() || "Untitled product",
      description: item.description,
      imageUrl: source?.conceptImageUrl || undefined,
      parts: source?.parts ?? [],
    });
  });
}

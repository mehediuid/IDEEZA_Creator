// The products a network can hold: the project's own products, each read
// against the AI build it came from (when there is one) for its concept image
// and its parts — which is where the MCU, radio and sensor chips come from.
// A hand-made project has names and nothing else, and says so.
//
// COR-48: every build the project holds, not only the newest. A listed
// product is resolved the way the Products tab resolves it (sourceOf(), via
// productsOfProject()), so a product from another chat's build, or one a
// later version dropped, still gets its parts. Ids stay `p-<slug(name)>`, so
// a saved network keeps resolving.
//
// Value imports are relative: the unit tests run the tsc output under plain
// node, and tsc does not rewrite the `@/*` paths.

import { productsOf, type BuildProduct } from "../create/history";
import { productsOfProject, type BuildRef } from "../manual/project-read";
import type { ManualProject } from "../manual/projects";
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

type Listed = { name: string; description: string; source: BuildProduct | undefined };

/** What the network lists, each with the build product behind it. */
function listedOf(project: ManualProject, refs: BuildRef[]): Listed[] {
  if (project.products) {
    // productsOfProject() walks productRowsOf(), which is `project.products`
    // itself whenever that list has anything in it — same rows, same order.
    const resolved = project.products.length ? productsOfProject(project, refs) : [];
    return project.products.map((row, i) => ({
      name: row.name,
      description: row.description,
      source: resolved[i]?.built?.product,
    }));
  }
  // A project that never had a list: the newest build's products, as before.
  const newest = refs.reduce<BuildRef["job"]>(
    (best, r) => (r.job && (!best || r.job.createdAt > best.createdAt) ? r.job : best),
    null,
  );
  const built = newest ? productsOf(newest) : [];
  if (built.length) {
    return built.map((b) => ({ name: b.name || b.title, description: b.description ?? b.summary, source: b }));
  }
  return [{ name: project.productName.trim() || project.name, description: project.description, source: undefined }];
}

export function networkProducts(project: ManualProject, refs: BuildRef[]): NetProduct[] {
  const taken = new Set<string>();
  return listedOf(project, refs).map((item) => {
    let id = `p-${slug(item.name)}`;
    for (let n = 2; taken.has(id); n++) id = `p-${slug(item.name)}-${n}`;
    taken.add(id);
    return productFromParts({
      id,
      name: item.name.trim() || "Untitled product",
      description: item.description,
      imageUrl: item.source?.conceptImageUrl || undefined,
      parts: item.source?.parts ?? [],
    });
  });
}

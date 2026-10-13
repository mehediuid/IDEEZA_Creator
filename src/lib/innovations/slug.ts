// Addresses of Innovations posts. A sample post keeps its feed slug; a post of
// this browser's own project gets its name plus the end of its id, so it can
// never collide with a sample or with another project of the same name.
//
// Relative imports only.

export const postIdOfSample = (feedId: string) => `sample:${feedId}`;
export const postIdOfProject = (projectId: string) => `mine:${projectId}`;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** "smart-lamp-mv5ljom0". */
export function mineSlugOf(project: { id: string; name: string }): string {
  const tail = project.id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-8) || "post";
  return `${slugify(project.name) || "project"}-${tail}`;
}

export function findMineBySlug<P extends { id: string; name: string }>(projects: readonly P[], slug: string): P | null {
  return projects.find((p) => mineSlugOf(p) === slug) ?? null;
}

export const postHref = (slug: string) => `/innovations/${slug}`;
export const postProductHref = (slug: string, productId: string) => `/innovations/${slug}/products/${encodeURIComponent(productId)}`;
export const commentAnchor = (commentId: string) => `comment-${commentId}`;

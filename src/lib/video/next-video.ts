// "Next video" (owner, 2026-11-18): a maker starts a project's videos one after another — each one
// storyboard first, then its render — and never waits for a render to finish before starting the
// next. Once a video is rendering, the next one to start is the first product after it (then from
// the top) with no video yet or a failed one, and last the project video when the project needs one
// and it isn't made, rendering or waiting for review.
//
// Pure, relative imports only.

import type { ProjectProduct } from "../manual/project-read";
import type { VideoJob } from "./jobs";
import { productVideoStatus } from "./product-video";
import { needsProjectVideo, projectVideoStatusOf } from "./project-video";
import { PROJECT_VIDEO_KEY, type ProjectVideos } from "./types";

export type NextVideo = { productId: string; name: string };

export const PROJECT_VIDEO_NAME = "Project video";

/** The video to start after `after` (a product id or `PROJECT_VIDEO_KEY`), or null when every one
 *  has started. `products` are the project's, in order; dropped ones are skipped. */
export function nextVideoOf(input: {
  products: ProjectProduct[];
  videos: ProjectVideos | null;
  jobs: VideoJob[];
  now: number;
  after: string | null;
}): NextVideo | null {
  const current = input.products.filter((p) => p.dropped === null);
  const open = (id: string) => {
    const s = productVideoStatus(input.videos?.products[id], input.jobs, input.now);
    return s.state === "none" || s.state === "failed";
  };
  const at = current.findIndex((p) => p.id === input.after);
  const order = at >= 0 ? [...current.slice(at + 1), ...current.slice(0, at)] : current;
  const product = order.find((p) => p.id !== input.after && open(p.id));
  if (product) return { productId: product.id, name: product.name.trim() || "Not named yet" };
  if (input.after === PROJECT_VIDEO_KEY || !needsProjectVideo(input.products)) return null;
  const project = projectVideoStatusOf({
    products: input.products,
    videos: input.videos,
    jobs: input.jobs,
    now: input.now,
  });
  return project.state === "make" || project.state === "failed" || project.state === "outdated"
    ? { productId: PROJECT_VIDEO_KEY, name: PROJECT_VIDEO_NAME }
    : null;
}

// Tutorials (Figma User Panel V2 › Tutorial, node 38577:5711; plan
// https://claude.ai/artifact/NjJyuT2UfyjebTKUed8SbC). Categories hold topics; a
// topic is either a page (it has blocks) or a group of pages (it has
// children, the menu's third level). Every count and IDZ total on screen is
// worked out from this content, never typed in.
//
// Types only, with relative imports, so node:test reads the same contract.

import type { Amount } from "../wallet/types";

export type TutorialVideo = {
  kind: "video";
  /** Unique across all tutorials: the reward is paid once per id. */
  id: string;
  /** What the video shows, for its label and the wallet line. */
  title: string;
  /** IDZ paid once the video has been watched (owner D2: 2.0 per video). */
  reward: Amount;
  /** The file, once the owner has sent it (D1). Until then the slot reads
   *  "Video coming soon" and pays nothing. */
  src?: string;
  poster?: string;
};

export type TutorialBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "image"; src: string; alt: string }
  | TutorialVideo;

export type TutorialTopic = {
  /** Unique within its category: the page's address is /tutorials/<category>/<slug>. */
  slug: string;
  title: string;
  /** One line on what the page teaches (the tab's description). */
  summary?: string;
  /** A page's body. */
  blocks?: TutorialBlock[];
  /** A group's pages. A topic has blocks or children, never both. */
  children?: TutorialTopic[];
};

export type TutorialCategory = {
  slug: string;
  title: string;
  description: string;
  cover: { src: string; alt: string };
  topics: TutorialTopic[];
};

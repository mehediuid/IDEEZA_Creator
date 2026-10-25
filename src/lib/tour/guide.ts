// The first-product guide (owner, 2026-10-25: "both" — a guide that stays with a new user, and the
// full tour in the panel). It walks a new user through making their first product, one real step
// at a time: a small card says what to do now, Show me points at the control, and the card moves
// on by itself when the user has done it. The facts are the app's own (a chat, its answered
// question, a drawn concept, a build, a saved project, an editor opened, a mint, a share), never a
// Next button, so it is right whichever way the user got there.
//
// Pure: the host reads the facts from the stores.

import type { PageRef } from "./types";

export type GuideStepId = "idea" | "answer" | "concept" | "build" | "save" | "editor" | "mint" | "share";

/** Where a guide step's control is: a page, or the user's newest chat. */
export type GuidePlace = PageRef | "chat";

export type GuideStep = {
  id: GuideStepId;
  title: string;
  /** What to do now. */
  body: string;
  /** While the app is working on this step (reading the idea, drawing, building): what is
   *  happening, and that the user can wait or look around. */
  waiting?: string;
  /** The `data-tour` control the step points at. */
  target: string;
  place: GuidePlace;
  /** The editors have no phone layout: a phone skips the step. */
  desktopOnly?: boolean;
};

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "idea",
    title: "Write your idea",
    body: "Say what you want to make in plain words, like “a lamp that turns on when I clap”, then press the arrow.",
    target: "home-composer",
    place: "home",
  },
  {
    id: "answer",
    title: "Answer the AI's question",
    body: "Answer its questions on the canvas: choose the project this is for, then press Start drawing. Nothing is charged before that.",
    waiting: "AI is reading your idea. Its question shows here in a few seconds.",
    target: "chat-question",
    place: "chat",
  },
  {
    id: "concept",
    title: "See your concept",
    body: "AI draws your product once you press Start drawing. If a drawing stops, press Try again on its card.",
    waiting: "AI is drawing your product. It usually takes under a minute.",
    target: "chat-concept",
    place: "chat",
  },
  {
    id: "build",
    title: "Press Build",
    body: "Your concept is ready. Check What to build on its card, then press Build. AI makes the PCB, code, 3D model, assembly and wiring.",
    target: "chat-build",
    place: "chat",
  },
  {
    id: "save",
    title: "Save your project",
    body: "Your build is ready. Look over each part, then press Save Project and give it a name.",
    waiting: "Your build is running, about a minute. You can look around; the bell tells you when it's ready.",
    target: "chat-save",
    place: "chat",
  },
  {
    id: "editor",
    title: "Open it in the editor",
    body: "On your product's page, press Open in editor. AI already made every part; change anything you like.",
    target: "product-editor",
    place: "product",
    desktopOnly: true,
  },
  {
    id: "mint",
    title: "Mint it",
    body: "Minting records the design as yours. It's a free testnet demo: press Start mint and follow the steps.",
    target: "earn-step-mint",
    place: "earn-overview",
  },
  {
    id: "share",
    title: "Share it",
    body: "Show it to the community: open ⋯ on your project and choose Share to Innovations. It asks for the videos first.",
    target: "project-actions",
    place: "project",
  },
];

/** What the guide reads to know where the user is. */
export type GuideFacts = {
  hasChat: boolean;
  /** The newest chat's question is still loading. */
  reading: boolean;
  /** The newest chat's question has been answered (or it asked none). */
  answered: boolean;
  /** A concept in the newest chat is being drawn. */
  drawing: boolean;
  /** A concept in the newest chat has been drawn. */
  conceptReady: boolean;
  /** The newest chat has a build (queued, running or done). */
  buildStarted: boolean;
  /** That build is still under way. */
  building: boolean;
  hasProject: boolean;
  /** A product of a project has been opened in an editor. */
  editorSeen: boolean;
  minted: boolean;
  shared: boolean;
  phone: boolean;
};

/** Each step is done when its fact is true. A project made another way (by hand, or before the
 *  guide) counts for everything up to the save. */
const DONE: Record<GuideStepId, (f: GuideFacts) => boolean> = {
  idea: (f) => f.hasProject || f.hasChat,
  answer: (f) => f.hasProject || f.answered,
  concept: (f) => f.hasProject || f.conceptReady,
  build: (f) => f.hasProject || f.buildStarted,
  save: (f) => f.hasProject,
  editor: (f) => f.editorSeen,
  mint: (f) => f.minted,
  share: (f) => f.shared,
};

/** The steps this screen walks: a phone leaves out the editor. */
export function guideSteps(phone: boolean): GuideStep[] {
  return GUIDE_STEPS.filter((s) => !(phone && s.desktopOnly));
}

export type GuideNow = { step: GuideStep; index: number; total: number; waiting: boolean };

/** The step the user is on, its place in the walk, and whether the app is still working on it;
 *  null once every step is done (the first product is finished). */
export function guideNow(f: GuideFacts): GuideNow | null {
  const steps = guideSteps(f.phone);
  const index = steps.findIndex((s) => !DONE[s.id](f));
  if (index < 0) return null;
  const step = steps[index];
  const waiting = (step.id === "answer" && f.reading) || (step.id === "concept" && f.drawing) || (step.id === "save" && f.building);
  return { step, index, total: steps.length, waiting };
}

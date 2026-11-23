// The guide's words on the phone: the web's (lib/tour/guide.ts GUIDE_STEPS), except where the
// phone's control has another name — Generate (the AI box's send), the question in the chat (no
// canvas), the Build line's Options (What to build), Save project, Share to Feed (the phone has
// no Innovations) and the build bar (no bell) — and the editor, which only a computer opens.

import type { GuideStep, GuideStepId } from "@/lib/tour/guide";

const PHONE: Partial<Record<GuideStepId, { body?: string; waiting?: string }>> = {
  idea: { body: "Say what you want to make in plain words, like “a lamp that turns on when I clap”, then press Generate." },
  answer: { body: "Answer its questions in the chat: choose the project this is for, then press Start drawing. Nothing is charged before that." },
  build: { body: "Your concept is ready. Check Options on the Build line, then press Build. AI makes the PCB, code, 3D model, assembly and wiring." },
  save: {
    body: "Your build is ready. Look over each part, then press Save project and give it a name.",
    waiting: "Your build is running, about a minute. You can look around; the build bar tells you when it's ready.",
  },
  editor: { body: "On a computer, open your product's page and press Open in editor. AI already made every part; change anything you like." },
  share: { body: "Show it to the community: open ⋯ on your project and choose Share to Feed. It asks for the videos first." },
};

/** What to do now, or what the app is doing while it works on the step. */
export function phoneStepWords(step: GuideStep, waiting: boolean): string {
  const own = PHONE[step.id];
  if (waiting) return own?.waiting ?? step.waiting ?? own?.body ?? step.body;
  return own?.body ?? step.body;
}

/** The editor step, which the phone leaves out of its count. */
export const ON_A_COMPUTER = "On a computer";

/** The guide's last card (the web's GuideDone), for the phone's tour. */
export const GUIDE_DONE = {
  title: "Your first product is done",
  body: "You made it, minted it and shared it. The tour shows the rest of IDEEZA, tab by tab.",
  action: "Take the tour",
};

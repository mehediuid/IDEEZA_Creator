"use client";

// The first-product guide on the phone (AUTH-5): the web's guide (lib/tour/guide.ts), read the
// same way from the same stores — the chats and builds of the AI tab, the projects, the guide's
// own state in `ideeza:tour` — so a step done on either side counts on both. The phone walks the
// web's phone steps (`guideSteps(true)`: the editor needs a computer, so it is left out of the
// count and shown as such). What changes is only where each step happens on the phone and, where
// the phone's control has another name, the words (words.ts).

import { usePathname } from "next/navigation";
import { useTourRecord } from "@/components/tour/use-tour";
import { useAuth } from "@/lib/account/auth";
import { useCreateHistory } from "@/lib/create/history";
import { takesPlanSlot } from "@/lib/create/upsell";
import { earnHref } from "@/lib/manual/earn-route";
import { phoneHrefOf, phoneProjectHref } from "@/lib/manual/phone-project";
import { useManualProjects } from "@/lib/manual/projects";
import { guideFactsOf, guideNow, type GuideFacts, type GuideNow, type GuideStep } from "@/lib/tour/guide";

/** The guide is on for the signed-in account: opened (Start with my idea), not closed or done. */
export function useGuideOn(): boolean {
  const rec = useTourRecord();
  const { signedIn } = useAuth();
  return signedIn && (rec?.guide === "open" || rec?.guide === "small");
}

/** The screens, besides the five tabs, where a step happens, so the strip shows there too: the
 *  AI chat (the question, the concept, Build, Save project), the project page (⋯ › Share to
 *  Feed) and its Earn › Overview (Start mint). */
export function isGuideScreen(pathname: string): boolean {
  return (
    /^\/m\/ai\/chat\/[^/]+$/.test(pathname) ||
    (/^\/m\/projects\/[^/]+(\/earn)?$/.test(pathname) && !/^\/m\/projects\/purchased(\/|$)/.test(pathname))
  );
}

export type PhoneGuide = {
  facts: GuideFacts;
  /** The step the user is on; null once the first product is done. */
  now: GuideNow | null;
  /** Where that step happens on the phone; null when there is nowhere yet (no project). */
  href: string | null;
  /** That screen is the one open. */
  here: boolean;
};

const newest = <T extends { updatedAt?: number }>(list: readonly T[]): T | null =>
  list.reduce<T | null>((best, x) => (!best || (x.updatedAt ?? 0) > (best.updatedAt ?? 0) ? x : best), null);

const pathOf = (href: string) => href.split(/[?#]/)[0];

/** Where the user's first product stands, and where its next step happens on the phone; null
 *  until the stores are read. */
export function usePhoneGuide(): PhoneGuide | null {
  const pathname = usePathname();
  const { hydrated: historyReady, chats, builds } = useCreateHistory();
  const { hydrated: projectsReady, projects } = useManualProjects();
  if (!historyReady || !projectsReady) return null;
  const chat = newest(chats);
  const facts = guideFactsOf({ chat, builds, projects, inEditor: false, phone: true });
  const now = guideNow(facts);
  // The project a step is about, as on the web: the one on screen, else the one changed last —
  // the user's own only.
  const own = projects.filter((p) => takesPlanSlot(p.id));
  const shown = /^\/m\/projects\/([^/]+)/.exec(pathname)?.[1];
  const project = (shown && own.find((p) => p.id === decodeURIComponent(shown))) || newest(own);
  const hrefOf = (step: GuideStep): string | null => {
    if (step.place === "chat") return chat ? `/m/ai/chat/${encodeURIComponent(chat.id)}` : "/m/ai";
    if (step.place === "home") return "/m/ai";
    if (step.place === "earn-overview") return project ? phoneHrefOf(earnHref(project.id)) : null;
    if (step.place === "project") return project ? phoneProjectHref(project.id) : null;
    // The editor: on a computer.
    return null;
  };
  const href = now ? hrefOf(now.step) : null;
  const here = !!href && decodeURIComponent(pathname) === decodeURIComponent(pathOf(href));
  return { facts, now, href, here };
}

"use client";

// TourHost — the Tour Guide for every page (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md;
// study https://claude.ai/artifact/W6TzTM8bS39MuDB5YyPxW7). Mounted once at the root, beside Report a
// problem's host, so it reaches the editors too. It shows the Welcome (the whole platform on one
// screen) on Home to a browser that hasn't made anything yet; runs a chapter step by step over the
// `data-tour` controls and ends it with Up next, the next real step on the user's path (`nextFor`);
// shows the chat's tips and the editor modules' tips as their parts appear; offers a page's chapter
// on a visit; brings a half-done part back once; greets someone who arrived from a shared link; points
// once at where the tours live; and opens the Tour Guide panel when Support › Tour Guide, ⌘K or an
// editor's Help asks (openTourGuide, lib/tour/open.ts). What was seen is kept in `ideeza:tour`, what
// was turned down on this visit in the visit memory (visit.ts).

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCredits } from "@/lib/create/credits";
import { useCreateHistory } from "@/lib/create/history";
import { editorHref, parseEditorPath } from "@/lib/manual/editor-scope";
import { earnHref } from "@/lib/manual/earn-route";
import type { EditorStep } from "@/lib/manual/p2-types";
import { productRowsOf } from "@/lib/manual/project-read";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { TOUR_CHAPTERS, chapterById } from "@/lib/tour/chapters";
import { TOUR_EVENT, type TourRequest } from "@/lib/tour/open";
import {
  editorStepOf,
  fixedHrefOf,
  moduleTipFor,
  moduleTipsOn,
  nextFor,
  offerFor,
  pageMatches,
  placeFits,
  placeOf,
  readinessOf,
  runnableSteps,
  tipFrom,
  tipsOn,
} from "@/lib/tour/places";
import {
  chapterStatus,
  emptyTour,
  shouldWelcome,
  withArrival,
  withChapter,
  withOffered,
  withOffers,
  withPointed,
  withTipSeen,
  withTipsOn,
  withWelcome,
  withWelcomeClosed,
} from "@/lib/tour/state";
import type { ChapterId, ChapterState, JourneyFacts, PageRef, TourChapter, TourStep as Step, UpNext } from "@/lib/tour/types";
import { ChapterOffer, CornerCard } from "./chapter-offer";
import { findTargets, isPhone, isShown } from "./targets";
import { TourGuidePanel } from "./tour-guide-panel";
import { TourStep } from "./tour-step";
import { updateTour, useTourRecord } from "./use-tour";
import { noteVisit, readVisit, withId } from "./visit";
import { WelcomeDialog } from "./welcome-dialog";

type Run = {
  id: ChapterId;
  steps: Step[];
  index: number;
  /** Which way the last move went, so a step that can't be shown is passed in the same direction. */
  dir: 1 | -1;
  /** How many steps were on screen in this run: none means the chapter couldn't be shown here. */
  shown: number;
  /** The step's page is open (a step about another page goes there first). */
  arrived: boolean;
  /** The step came up on a page just opened for it, still loading: it waits longer for its control. */
  navigated: boolean;
  /** The page a move to another page left from; landing anywhere but the step's page pauses the
   *  chapter rather than leaving it waiting out of sight. */
  from: string | null;
  /** What had focus before the tour, given it back at the end. */
  opener: HTMLElement | null;
};

type TipChapter = "chat" | "modules";
type Tip = { id: TipChapter; index: number };

/** The Welcome waits for the page to settle, and for any other dialog to close. */
const WELCOME_DELAY_MS = 600;
/** A visit's offer waits a little longer: the page is the point, the offer an aside. */
const OFFER_DELAY_MS = 1200;
/** Neither a tip nor an offer opens while someone is typing. */
const TYPING_MS = 2500;
/** An ending tour fades out (the fast duration) before it is taken away. */
const LEAVE_MS = 120;
/** How long Up next waits for a control it hands the focus to (the prompt box on Home). */
const FOCUS_WAIT_MS = 5000;

const still = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";

const newest = <T extends { updatedAt?: number }>(list: readonly T[]): T | null =>
  list.reduce<T | null>((best, x) => (!best || (x.updatedAt ?? 0) > (best.updatedAt ?? 0) ? x : best), null);

/** Focuses the first shown match of `selector` once the page has drawn it. */
function focusWhenReady(selector: string) {
  const since = performance.now();
  const look = () => {
    const el = [...document.querySelectorAll<HTMLElement>(selector)].find(isShown);
    if (el) return el.focus();
    if (performance.now() - since < FOCUS_WAIT_MS) window.setTimeout(look, 100);
  };
  window.setTimeout(look, 0);
}

/** The page's own heading takes the focus when a tour ends with nothing to give it back to. */
function focusPage() {
  const h1 = [...document.querySelectorAll<HTMLElement>("main h1, h1")].find(isShown);
  if (!h1) return;
  if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
  h1.focus({ preventScroll: true });
}

/** A shared post, listing or creator profile: where someone who was sent a link lands. */
function arrivalOf(pathname: string): "post" | "listing" | "profile" | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  if (parts[0] === "innovations") return "post";
  if (parts[0] === "marketplace") return "listing";
  if (parts[0] === "creators" && parts[1] !== "me") return "profile";
  return null;
}

const ARRIVAL_BODY: Record<"post" | "listing" | "profile", string> = {
  post: "This project was made on IDEEZA, where anyone turns an idea into a real electronic product.",
  listing: "This is for sale on IDEEZA, where anyone turns an idea into a real electronic product.",
  profile: "This creator builds on IDEEZA, where anyone turns an idea into a real electronic product.",
};

/** Where the tours live, pointed at once: the sidebar's Support › Tour Guide, or the phone's menu. */
const pointerStep = (phone: boolean): Step =>
  phone
    ? { target: "menu", title: "Tours live here", body: "Open the menu, then Support › Tour Guide, to start, replay or pick up any tour." }
    : { target: "support-tour", title: "Tours live here", body: "Support › Tour Guide starts, replays or picks up any tour, any time." };

export function TourHost() {
  const rec = useTourRecord();
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: historyReady, chats } = useCreateHistory();
  const { hydrated: creditsReady, balance } = useCredits();
  const [run, setRun] = React.useState<Run | null>(null);
  const [panel, setPanel] = React.useState<{ anchor: HTMLElement | null } | null>(null);
  const [welcome, setWelcome] = React.useState(false);
  const [tip, setTip] = React.useState<Tip | null>(null);
  const [offer, setOffer] = React.useState<ChapterId | null>(null);
  const [pointer, setPointer] = React.useState(false);
  const [card, setCard] = React.useState<"resume" | "arrival" | null>(null);
  const [leaving, setLeaving] = React.useState(false);
  // The visit memory is read on each render; this bumps a render after it changes.
  const [, setVisitTick] = React.useState(0);
  const here = placeOf(pathname);

  // What is on screen fades out before it goes; anything started meanwhile cancels the going.
  const leaveToken = React.useRef(0);
  const leave = (after: () => void) => {
    const token = ++leaveToken.current;
    if (still()) return after();
    setLeaving(true);
    window.setTimeout(() => {
      if (leaveToken.current !== token) return;
      after();
      setLeaving(false);
    }, LEAVE_MS);
  };

  // When someone last pressed a key: tips and offers wait for a pause in typing.
  const lastKey = React.useRef(0);
  React.useEffect(() => {
    const onKey = () => {
      lastKey.current = Date.now();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  const quiet = () => !document.querySelector('[aria-modal="true"]') && Date.now() - lastKey.current >= TYPING_MS;

  // The project a step is about: the one on screen (its page, its Earn, its editor), else the one
  // changed last.
  const projectNow = (): ManualProject | null => {
    const parts = pathname.split("/").filter(Boolean);
    const onScreen =
      parts[0] === "projects" && parts[1]
        ? projects.find((p) => p.id === decodeURIComponent(parts[1]))
        : parts[0] === "project" && parts[1]
          ? projects.find((p) => p.slug === parts[1])
          : undefined;
    return onScreen ?? newest(projects);
  };

  /** What the path needs to know of the user's own work. */
  const facts = (): JourneyFacts => ({
    hasChat: chats.length > 0,
    hasProject: projects.length > 0,
    minted: !!projectNow()?.mint,
    phone: isPhone(),
  });

  // The address of a step's page; `null` when there is nothing to show yet (no project).
  const hrefOf = (page: PageRef): string | null => {
    const fixed = fixedHrefOf(page);
    if (fixed) return fixed;
    const project = projectNow();
    const parts = pathname.split("/").filter(Boolean);
    switch (page) {
      case "project":
        return project ? `/projects/${encodeURIComponent(project.id)}` : null;
      case "product": {
        if (!project) return null;
        const row = parts[2] === "products" && parts[3] ? decodeURIComponent(parts[3]) : productRowsOf(project)[0].id;
        return `/projects/${encodeURIComponent(project.id)}/products/${encodeURIComponent(row)}`;
      }
      case "earn-overview":
        return project ? earnHref(project.id) : null;
      case "earn-sell":
        return project ? earnHref(project.id, "sell") : null;
      case "earn-plan":
        return project ? earnHref(project.id, "plan") : null;
      case "earn-money":
        return project ? earnHref(project.id, "money") : null;
      case "post": {
        // The first post on the feed the step before showed.
        const link = document.querySelector<HTMLAnchorElement>('[data-tour~="feed-card"] a[href^="/innovations/"]');
        return link?.getAttribute("href") ?? null;
      }
      default: {
        const step = editorStepOf(page) as EditorStep | null;
        if (!step) return null;
        const editor = parseEditorPath(pathname);
        if (editor?.productId) return editorHref(editor.slug, editor.productId, step);
        return project ? editorHref(project, productRowsOf(project)[0].id, step) : null;
      }
    }
  };

  // Where a chapter goes when it is started somewhere it can't run and its step has no page of
  // its own: the latest chat (the chat's tips), the project's PCB editor (the editors'), Home.
  const chapterHref = (chapter: TourChapter): string | null => {
    if (chapter.place === "chat") {
      const chat = newest(chats);
      return chat ? `/chat/${chat.id}` : null;
    }
    if (chapter.place === "editor" || chapter.place === "pcb") return hrefOf("editor-pcb");
    return "/";
  };

  /** Whether the page a step needs is the one open. */
  const stepFits = (chapter: TourChapter, step: Step) => (step.page ? pageMatches(step.page, pathname) : placeFits(chapter, here));

  /** Puts `r` on step `to`, opening that step's page first when it is another one. A step with
   *  nowhere to go is passed, in the same direction. */
  const goTo = (r: Run, to: number, dir: 1 | -1) => {
    const chapter = chapterById(r.id);
    for (let i = to; i >= 0 && i < r.steps.length; i += dir) {
      const step = r.steps[i];
      if (stepFits(chapter, step)) return setRun({ ...r, index: i, dir, arrived: true, navigated: false, from: null });
      const href = step.page ? hrefOf(step.page) : chapterHref(chapter);
      if (!href) continue;
      setRun({ ...r, index: i, dir, arrived: false, navigated: true, from: pathname });
      router.push(href);
      return;
    }
    if (dir < 0) return;
    finish(r, r.shown > 0 ? "done" : "paused", r.shown > 0 ? r.steps.length - 1 : 0);
  };

  /** Starts a chapter (or turns its tips on); false when it can't run here and now. */
  const begin = (id: ChapterId, step = 0, opener: HTMLElement | null = null): boolean => {
    const chapter = chapterById(id);
    const f = facts();
    // Never into a part this screen can't show (the editors on a phone) or that has nothing yet.
    if (!readinessOf(id, f).ok) return false;
    leaveToken.current++;
    setLeaving(false);
    setPointer(false);
    setCard(null);
    if (chapter.tips) {
      // Tips aren't a run: they are turned on, and show as their parts land.
      const fits = placeFits(chapter, here);
      const href = fits ? null : chapterHref(chapter);
      if (!fits && !href) return false;
      setPanel(null);
      setWelcome(false);
      setOffer(null);
      updateTour((prev) =>
        chapter.tips === "any-order" ? withTipsOn(prev, id, chapterStatus(prev, id).kind === "done") : withChapter(prev, id, "paused", step),
      );
      if (href) router.push(href);
      return true;
    }
    const steps = runnableSteps(chapter, f);
    if (steps.length === 0) return false;
    const start = Math.min(Math.max(step, 0), steps.length - 1);
    const first = steps[start];
    if (!stepFits(chapter, first) && !(first.page ? hrefOf(first.page) : chapterHref(chapter))) return false;
    setPanel(null);
    setWelcome(false);
    setOffer(null);
    goTo({ id, steps, index: start, dir: 1, shown: 0, arrived: false, navigated: false, from: null, opener }, start, 1);
    return true;
  };

  // Once, the first time the user turns something down or finishes a part, the tour points at
  // where it lives (Support › Tour Guide, or the phone's menu), after what was on screen has gone.
  const pointLater = React.useRef(false);
  const point = () => {
    if (rec?.pointed || pointLater.current) return;
    pointLater.current = true;
    updateTour((prev) => withPointed(prev));
    window.setTimeout(() => setPointer(true), LEAVE_MS + 300);
  };

  const finish = (r: Run, state: ChapterState, step = r.index) => {
    updateTour((prev) => withChapter(prev, r.id, state, step));
    if (state === "paused") noteVisit((v) => ({ ...v, paused: withId(v.paused, r.id) }));
    leave(() => setRun(null));
    const back = r.opener;
    if (back && isShown(back)) back.focus({ preventScroll: true });
    else focusPage();
  };

  /** Takes the next step on the path: a chapter starts; an action is opened for the user to do.
   *  False when a chapter couldn't start. */
  const takeNext = (next: UpNext, opener: HTMLElement | null): boolean => {
    if (next.kind === "chapter") return begin(next.id, 0, opener);
    if (next.kind === "write") {
      if (pathname !== "/") router.push("/");
      focusWhenReady('[data-tour~="home-composer"] textarea');
    } else if (next.kind === "chat") {
      const chat = newest(chats);
      if (chat) router.push(`/chat/${chat.id}`);
    } else {
      const project = projectNow();
      if (project) router.push(earnHref(project.id));
    }
    return true;
  };

  // Asked from the sidebar, ⌘K, an editor's Help and the phone's menu.
  const onRequest = React.useEffectEvent((req: TourRequest) => {
    if (req.kind === "panel") {
      // The sidebar's link toggles it, as the footer's popovers do.
      if (panel && req.anchor && panel.anchor === req.anchor) return setPanel(null);
      if (run) finish(run, "paused");
      setWelcome(false);
      setOffer(null);
      setTip(null);
      setPointer(false);
      setCard(null);
      setPanel({ anchor: req.anchor });
    } else {
      begin(req.id, req.step ?? 0, document.activeElement instanceof HTMLElement ? document.activeElement : null);
    }
  });
  React.useEffect(() => {
    const listener = (e: Event) => onRequest((e as CustomEvent<TourRequest>).detail);
    window.addEventListener(TOUR_EVENT, listener);
    return () => window.removeEventListener(TOUR_EVENT, listener);
  }, []);

  // A step opened on another page waits until that page is open. After that a step whose control
  // goes away (the page changed under it) pauses the chapter by itself.
  if (run && !run.arrived && stepFits(chapterById(run.id), run.steps[run.index])) setRun({ ...run, arrived: true });

  // The move landed somewhere else (a redirect, or a click while the page was opening): the
  // chapter pauses instead of waiting out of sight for a page that isn't coming.
  const strayed = React.useEffectEvent(() => {
    if (run && !run.arrived && run.from !== null && pathname !== run.from) finish(run, "paused");
  });
  React.useEffect(() => strayed(), [pathname]);

  const visit = readVisit();
  const hasActivity = projects.length > 0 || chats.length > 0;

  // The Welcome: on Home, to someone who hasn't made anything yet (or whose tours were reset);
  // closed once, it comes back on a later visit.
  const due =
    rec !== undefined &&
    projectsReady &&
    historyReady &&
    !run &&
    !panel &&
    shouldWelcome(rec, { pathname, hasActivity, laterThisVisit: visit.welcomeLater });
  React.useEffect(() => {
    if (!due) return;
    const timer = window.setTimeout(() => {
      if (!document.querySelector('[aria-modal="true"]')) setWelcome(true);
    }, WELCOME_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [due]);
  const welcomeOpen = welcome && due;

  // The tips: the chat's first tip not yet seen whose part of the chat is on screen, or the
  // module tip for the editor module just opened.
  const phoneNow = typeof window !== "undefined" && isPhone();
  const tipsLive = rec !== undefined && !run && !panel && !welcomeOpen && !pointer;
  const chatTips = tipsLive && here === "chat" && historyReady && tipsOn(rec, chats.length);
  const moduleTip = tipsLive && (here === "editor" || here === "pcb") && moduleTipsOn(rec, phoneNow) ? moduleTipFor(rec, pathname) : null;
  if (tip && !(tip.id === "chat" ? chatTips : moduleTip === tip.index)) setTip(null);
  const from = tipFrom(rec ?? null);
  React.useEffect(() => {
    if (tip !== null || (!chatTips && moduleTip === null)) return;
    const steps = chapterById(chatTips ? "chat" : "modules").steps;
    let timer = 0;
    const look = () => {
      timer = 0;
      if (!quiet()) {
        timer = window.setTimeout(look, TYPING_MS);
        return;
      }
      if (chatTips) {
        for (let i = from; i < steps.length; i++) if (findTargets(steps[i].target)) return setTip({ id: "chat", index: i });
      } else if (moduleTip !== null && findTargets(steps[moduleTip].target)) {
        setTip({ id: "modules", index: moduleTip });
      }
    };
    const soon = () => {
      if (!timer) timer = window.setTimeout(look, 400);
    };
    const observer = new MutationObserver(soon);
    observer.observe(document.body, { childList: true, subtree: true });
    soon();
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [chatTips, moduleTip, tip, from]);
  const seenTip = (t: Tip, state: ChapterState = "paused") => {
    const total = chapterById(t.id).steps.length;
    updateTour((prev) => {
      if (state === "skipped") return withChapter(prev, t.id, "skipped", t.index);
      if (t.id === "modules") return withTipSeen(prev, "modules", t.index, total);
      const last = t.index === total - 1;
      return withChapter(prev, "chat", last ? "done" : "paused", last ? t.index : t.index + 1);
    });
    leave(() => setTip(null));
    if (state === "skipped") point();
  };

  // A visit's offer: one chapter, after the page settles, while nothing else is up. Not now once
  // waits for a later visit.
  const offerDue =
    rec !== undefined && projectsReady && !run && !panel && !welcomeOpen && tip === null && !pointer && card === null
      ? offerFor(rec, here, phoneNow, visit.declined)
      : null;
  React.useEffect(() => {
    if (!offerDue) return;
    let timer = 0;
    const look = () => {
      if (quiet()) setOffer(offerDue);
      else timer = window.setTimeout(look, TYPING_MS);
    };
    timer = window.setTimeout(look, OFFER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [offerDue]);
  const offered = offer && offer === offerDue ? chapterById(offer) : null;

  // A part left half-way on an earlier visit comes back once, on a page where it can run.
  const resumable =
    rec && projectsReady && historyReady && !run && !panel && !welcomeOpen && tip === null && !pointer && !offerDue
      ? (TOUR_CHAPTERS.find((c) => {
          const at = rec.chapters[c.id];
          if (c.tips || !at || at.state !== "paused" || at.step === 0) return false;
          if (visit.paused.includes(c.id) || visit.resumed.includes(c.id)) return false;
          return placeFits(c, here) && readinessOf(c.id, facts()).ok;
        }) ?? null)
      : null;
  // Someone who opened a shared post, listing or profile and has made nothing here yet.
  const arrival =
    rec !== undefined && projectsReady && historyReady && !hasActivity && !rec?.arrival && (!rec || rec.welcome === "unseen") && !run && !panel
      ? arrivalOf(pathname)
      : null;
  const cardDue = arrival ? "arrival" : resumable ? "resume" : null;
  React.useEffect(() => {
    if (!cardDue) return;
    const timer = window.setTimeout(() => setCard(cardDue), OFFER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [cardDue]);
  const cardShown = card && card === cardDue ? card : null;

  const current = run && run.arrived ? run.steps[run.index] : null;
  const move = (to: number, dir: 1 | -1) => run && goTo(run, to, dir);
  const upNext = run ? nextFor(facts(), rec ?? null, run.id) : null;

  // A control that never showed up: the step is passed, in the direction of travel. Back past the
  // start returns to where the user was; forward past the end finishes, unless nothing could be
  // shown at all.
  const onMissing = () => {
    if (!run) return;
    const to = run.index + run.dir;
    if (to >= 0 && to < run.steps.length) return move(to, run.dir);
    if (run.dir < 0) return move(run.index + 1, 1);
    finish(run, run.shown > 0 ? "done" : "paused", run.shown > 0 ? run.steps.length - 1 : 0);
  };

  const tipChapter = tip ? chapterById(tip.id) : null;
  const tipStep = tip && tipChapter ? tipChapter.steps[tip.index] : null;
  const said = current
    ? `Step ${run!.index + 1} of ${run!.steps.length}: ${current.title}`
    : tipStep
      ? `Tip: ${tipStep.title}. ${tipStep.body}`
      : offered
        ? `A quick tour of this page is ready: ${offered.name}.`
        : "";

  const panelNext = panel ? nextFor(facts(), rec ?? null, null) : null;

  return (
    <>
      <WelcomeDialog
        open={welcomeOpen}
        credits={creditsReady ? balance : null}
        phone={phoneNow}
        onStart={() => {
          updateTour((prev) => withWelcome(prev, "started"));
          begin("start", 0, null);
        }}
        onLookAround={() => {
          updateTour((prev) => withWelcome(prev, "started"));
          begin("way", 0, null);
        }}
        onByHand={() => {
          updateTour((prev) => withWelcome(prev, "started"));
          setWelcome(false);
          // Home's own Build manually, then its Create Project, which makes the empty project.
          const manual = [...document.querySelectorAll<HTMLElement>('[data-tour~="home-mode"] [role="radio"]')].find((b) =>
            /build manually/i.test(b.textContent ?? ""),
          );
          manual?.click();
          focusWhenReady('[data-tour~="home-create"]');
        }}
        onClose={() => {
          updateTour((prev) => withWelcomeClosed(prev));
          noteVisit((v) => ({ ...v, welcomeLater: true }));
          setVisitTick((n) => n + 1);
          setWelcome(false);
          point();
        }}
      />
      {/* One layer for a whole chapter (or a tip): steps glide into one another. */}
      {run ? (
        <TourStep
          key="run"
          step={run.steps[run.index]}
          waiting={!run.arrived}
          index={run.index}
          total={run.steps.length}
          first={run.shown === 0 || run.navigated}
          upNext={upNext}
          leaving={leaving}
          onPrev={() => move(run.index - 1, -1)}
          onNext={() => move(run.index + 1, 1)}
          onDone={() => {
            finish(run, "done");
            point();
          }}
          onSkip={() => {
            finish(run, "skipped");
            point();
          }}
          onUpNext={() => {
            if (!upNext) return;
            updateTour((prev) => withChapter(prev, run.id, "done", run.steps.length - 1));
            if (upNext.kind !== "chapter") leave(() => setRun(null));
            if (!takeNext(upNext, run.opener)) leave(() => setRun(null));
          }}
          onShown={() => setRun((r) => r && { ...r, shown: r.shown + 1, navigated: false })}
          onMissing={onMissing}
          // Seen to the last step counts as done (on a phone, tapping the menu the step points at).
          onLost={() => finish(run, run.index === run.steps.length - 1 ? "done" : "paused")}
        />
      ) : tip && tipStep && tipChapter ? (
        <TourStep
          key={`tips-${tip.id}`}
          tips
          step={tipStep}
          // In any order (the editor modules'), the count is of the tips shown so far.
          index={tip.id === "modules" ? (rec?.chapters.modules?.seen?.length ?? 0) : tip.index}
          total={tipChapter.steps.length}
          first={false}
          leaving={leaving}
          onPrev={() => undefined}
          onNext={() => seenTip(tip)}
          onDone={() => seenTip(tip)}
          onSkip={() => seenTip(tip, "skipped")}
          onShown={() => undefined}
          onMissing={() => setTip(null)}
          // Used, or moved on (an answered question goes away): it was seen.
          onLost={() => seenTip(tip)}
        />
      ) : pointer ? (
        <TourStep
          key="pointer"
          single
          step={pointerStep(phoneNow)}
          index={0}
          total={1}
          first
          doneLabel="Got it"
          leaving={leaving}
          onPrev={() => undefined}
          onNext={() => undefined}
          onDone={() => leave(() => setPointer(false))}
          onSkip={() => leave(() => setPointer(false))}
          onShown={() => undefined}
          onMissing={() => setPointer(false)}
          onLost={() => setPointer(false)}
        />
      ) : null}
      {offered && (
        <ChapterOffer
          key={offered.id}
          chapter={offered}
          steps={runnableSteps(offered, facts()).length}
          inEditor={here === "editor" || here === "pcb"}
          onStart={() => begin(offered.id, 0, document.activeElement instanceof HTMLElement ? document.activeElement : null)}
          onDecline={() => {
            updateTour((prev) => withOffered(prev, offered.id));
            noteVisit((v) => ({ ...v, declined: withId(v.declined, offered.id) }));
            setVisitTick((n) => n + 1);
            setOffer(null);
            point();
          }}
        />
      )}
      {cardShown === "resume" && resumable && (
        <CornerCard
          key={`resume-${resumable.id}`}
          title="Pick up where you left off"
          body={`${resumable.name} · step ${(rec?.chapters[resumable.id]?.step ?? 0) + 1} of ${runnableSteps(resumable, facts()).length}`}
          primary="Resume"
          secondary="Not now"
          inEditor={here === "editor" || here === "pcb"}
          onPrimary={() => {
            noteVisit((v) => ({ ...v, resumed: withId(v.resumed, resumable.id) }));
            begin(resumable.id, rec?.chapters[resumable.id]?.step ?? 0, null);
          }}
          onSecondary={() => {
            // Once is enough: the panel keeps its Resume.
            const at = rec?.chapters[resumable.id]?.step ?? 0;
            updateTour((prev) => withChapter(prev, resumable.id, "skipped", at));
            noteVisit((v) => ({ ...v, resumed: withId(v.resumed, resumable.id) }));
            setVisitTick((n) => n + 1);
            setCard(null);
          }}
        />
      )}
      {cardShown === "arrival" && arrival && (
        <CornerCard
          key="arrival"
          title="Made on IDEEZA"
          body={ARRIVAL_BODY[arrival]}
          primary="Make your own"
          secondary="Look around"
          onPrimary={() => {
            updateTour((prev) => withArrival(prev));
            setCard(null);
            router.push("/");
          }}
          onSecondary={() => {
            updateTour((prev) => withArrival(prev));
            setCard(null);
          }}
        />
      )}
      {panel && (
        <TourGuidePanel
          anchor={panel.anchor}
          rec={rec ?? null}
          ready={{ hasProject: projects.length > 0, hasChat: chats.length > 0 }}
          atHome={here === "home"}
          upNext={panelNext}
          onUpNext={() => {
            if (!panelNext) return;
            const opener = panel.anchor;
            setPanel(null);
            takeNext(panelNext, opener);
          }}
          onStart={(id, step) => begin(id, step, panel.anchor)}
          onGoHome={() => {
            setPanel(null);
            router.push("/");
          }}
          onOffers={(on) => updateTour((prev) => withOffers(prev, on))}
          onReset={() => updateTour(() => emptyTour())}
          onClose={() => {
            const back = panel.anchor;
            setPanel(null);
            if (back && isShown(back)) back.focus({ preventScroll: true });
          }}
        />
      )}
      {/* Each step and tip is said once as it opens; an offer, once as it appears. */}
      <div aria-live="polite" className="sr-only">
        {said}
      </div>
    </>
  );
}

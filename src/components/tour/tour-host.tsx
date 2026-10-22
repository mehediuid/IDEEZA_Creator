"use client";

// TourHost — the Tour Guide for every page (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md).
// Mounted once at the root, beside Report a problem's host, so it reaches the editors too. It
// shows the Welcome on Home to a browser that hasn't made anything yet, runs a chapter step by
// step over the `data-tour` controls, shows the chat's tips as each part of a chat lands, offers
// a page's chapter the first time that page is opened, and opens the Tour Guide panel when
// Support › Tour Guide or ⌘K asks (openTourGuide, lib/tour/open.ts). What was seen, skipped or
// left half-way is kept in `ideeza:tour`, so the panel can offer Replay or Resume.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCreateHistory } from "@/lib/create/history";
import { editorHref, parseEditorPath } from "@/lib/manual/editor-scope";
import { earnHref } from "@/lib/manual/earn-route";
import type { EditorStep } from "@/lib/manual/p2-types";
import { productRowsOf } from "@/lib/manual/project-read";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { chapterById, nextChapterOf } from "@/lib/tour/chapters";
import { TOUR_EVENT, type TourRequest } from "@/lib/tour/open";
import { editorStepOf, fixedHrefOf, offerFor, pageMatches, placeFits, placeOf, tipFrom, tipsOn } from "@/lib/tour/places";
import { emptyTour, shouldWelcome, withChapter, withOffered, withOffers, withWelcome } from "@/lib/tour/state";
import type { ChapterId, ChapterState, PageRef, TourChapter, TourStep as Step } from "@/lib/tour/types";
import { ChapterOffer } from "./chapter-offer";
import { findTargets, isPhone, isShown } from "./targets";
import { TourGuidePanel } from "./tour-guide-panel";
import { TourStep } from "./tour-step";
import { updateTour, useTourRecord } from "./use-tour";
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
  /** What had focus before the tour, given it back at the end. */
  opener: HTMLElement | null;
};

/** The Welcome waits for the page to settle, and for any other dialog to close. */
const WELCOME_DELAY_MS = 600;
/** A first-visit offer waits a little longer: the page is the point, the offer an aside. */
const OFFER_DELAY_MS = 1200;
/** Neither a tip nor an offer opens while someone is typing. */
const TYPING_MS = 2500;
/** An ending tour fades out (the fast duration) before it is taken away. */
const LEAVE_MS = 120;

const still = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";

const newest = <T extends { updatedAt?: number }>(list: readonly T[]): T | null =>
  list.reduce<T | null>((best, x) => (!best || (x.updatedAt ?? 0) > (best.updatedAt ?? 0) ? x : best), null);

export function TourHost() {
  const rec = useTourRecord();
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: historyReady, chats } = useCreateHistory();
  const [run, setRun] = React.useState<Run | null>(null);
  const [panel, setPanel] = React.useState<{ anchor: HTMLElement | null } | null>(null);
  const [welcome, setWelcome] = React.useState(false);
  const [tip, setTip] = React.useState<number | null>(null);
  const [offer, setOffer] = React.useState<ChapterId | null>(null);
  const [leaving, setLeaving] = React.useState(false);
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

  // The address of a step's page; `null` when there is nothing to show yet (no project).
  const hrefOf = (page: PageRef): string | null => {
    const fixed = fixedHrefOf(page);
    if (fixed) return fixed;
    const project = projectNow();
    const parts = pathname.split("/").filter(Boolean);
    switch (page) {
      case "project":
        // The Share chapter ends on your project's ⋯; without a project yet, on My projects.
        return project ? `/projects/${encodeURIComponent(project.id)}` : "/projects";
      case "product": {
        if (!project) return null;
        const row = parts[2] === "products" && parts[3] ? decodeURIComponent(parts[3]) : productRowsOf(project)[0].id;
        return `/projects/${encodeURIComponent(project.id)}/products/${encodeURIComponent(row)}`;
      }
      case "earn-overview":
        return project ? earnHref(project.id) : null;
      case "earn-sell":
        return project ? earnHref(project.id, "sell") : null;
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
  // its own: Home, the latest chat (the tips).
  const chapterHref = (chapter: TourChapter): string | null => {
    if (chapter.place === "chat") {
      const chat = newest(chats);
      return chat ? `/chat/${chat.id}` : null;
    }
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
      if (stepFits(chapter, step)) return setRun({ ...r, index: i, dir, arrived: true, navigated: false });
      const href = step.page ? hrefOf(step.page) : chapterHref(chapter);
      if (!href) continue;
      setRun({ ...r, index: i, dir, arrived: false, navigated: true });
      router.push(href);
      return;
    }
    if (dir < 0) return;
    finish(r, r.shown > 0 ? "done" : "paused", r.shown > 0 ? r.steps.length - 1 : 0);
  };

  const begin = (id: ChapterId, step = 0, opener: HTMLElement | null = null) => {
    const chapter = chapterById(id);
    leaveToken.current++;
    setLeaving(false);
    if (chapter.tips) {
      // Tips aren't a run: they are turned on, and show as the chat's parts land.
      const href = here === "chat" ? null : chapterHref(chapter);
      if (here !== "chat" && !href) return;
      setPanel(null);
      setWelcome(false);
      setOffer(null);
      updateTour((prev) => withChapter(prev, id, "paused", step));
      if (href) router.push(href);
      return;
    }
    const start = Math.min(Math.max(step, 0), chapter.steps.length - 1);
    const first = chapter.steps[start];
    if (!stepFits(chapter, first) && !(first.page ? hrefOf(first.page) : chapterHref(chapter))) return;
    setPanel(null);
    setWelcome(false);
    setOffer(null);
    goTo({ id, steps: chapter.steps, index: start, dir: 1, shown: 0, arrived: false, navigated: false, opener }, start, 1);
  };

  const finish = (r: Run, state: ChapterState, step = r.index) => {
    updateTour((prev) => withChapter(prev, r.id, state, step));
    leave(() => setRun(null));
    const back = r.opener;
    if (back && isShown(back)) back.focus({ preventScroll: true });
  };

  // Asked from the sidebar, ⌘K and the phone's menu.
  const onRequest = React.useEffectEvent((req: TourRequest) => {
    if (req.kind === "panel") {
      // The sidebar's link toggles it, as the footer's popovers do.
      if (panel && req.anchor && panel.anchor === req.anchor) return setPanel(null);
      if (run) finish(run, "paused");
      setWelcome(false);
      setOffer(null);
      setTip(null);
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

  // The Welcome: once, on Home, to someone who hasn't made anything yet (or whose tours were reset).
  const due =
    rec !== undefined &&
    projectsReady &&
    historyReady &&
    !run &&
    !panel &&
    shouldWelcome(rec, { pathname, hasActivity: projects.length > 0 || chats.length > 0 });
  React.useEffect(() => {
    if (!due) return;
    const timer = window.setTimeout(() => {
      if (!document.querySelector('[aria-modal="true"]')) setWelcome(true);
    }, WELCOME_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [due]);

  // The chat's tips: the first one not yet seen whose part of the chat is on screen.
  const tipsLive =
    here === "chat" && rec !== undefined && historyReady && tipsOn(rec, chats.length) && !run && !panel && !(welcome && due);
  if (!tipsLive && tip !== null) setTip(null);
  const from = tipFrom(rec ?? null);
  React.useEffect(() => {
    if (!tipsLive || tip !== null) return;
    const steps = chapterById("chat").steps;
    let timer = 0;
    const look = () => {
      timer = 0;
      if (!quiet()) {
        timer = window.setTimeout(look, TYPING_MS);
        return;
      }
      for (let i = from; i < steps.length; i++) {
        if (findTargets(steps[i].target)) return setTip(i);
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
  }, [tipsLive, tip, from]);
  const seenTip = (i: number, state: ChapterState = "paused") => {
    const last = i === chapterById("chat").steps.length - 1;
    updateTour((prev) =>
      state === "skipped" ? withChapter(prev, "chat", "skipped", i) : withChapter(prev, "chat", last ? "done" : "paused", last ? i : i + 1),
    );
    leave(() => setTip(null));
  };

  // A first visit's offer: one chapter, after the page settles, while nothing else is up.
  const offerDue =
    rec !== undefined && projectsReady && !run && !panel && !(welcome && due) && tip === null
      ? offerFor(rec, here, isPhone())
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

  const current = run && run.arrived ? run.steps[run.index] : null;
  const move = (to: number, dir: 1 | -1) => run && goTo(run, to, dir);

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

  const next = run ? nextChapterOf(run.id) : null;
  const tipStep = tip !== null ? chapterById("chat").steps[tip] : null;
  const said = current
    ? `Step ${run!.index + 1} of ${run!.steps.length}: ${current.title}`
    : tipStep
      ? `Tip ${tip! + 1} of ${chapterById("chat").steps.length}: ${tipStep.title}`
      : offered
        ? `A quick tour of this page is ready: ${offered.name}.`
        : "";

  return (
    <>
      <WelcomeDialog
        open={welcome && due}
        onStart={() => {
          updateTour((prev) => withWelcome(prev, "started"));
          begin("start", 0, null);
        }}
        onDecline={() => {
          updateTour((prev) => withWelcome(prev, "declined"));
          setWelcome(false);
        }}
      />
      {/* One layer for a whole chapter (or the chat's tips): steps glide into one another. */}
      {run && current ? (
        <TourStep
          key="run"
          step={current}
          index={run.index}
          total={run.steps.length}
          first={run.shown === 0 || run.navigated}
          nextPart={run.index === run.steps.length - 1 ? next : null}
          leaving={leaving}
          onPrev={() => move(run.index - 1, -1)}
          onNext={() => move(run.index + 1, 1)}
          onDone={() => finish(run, "done")}
          onSkip={() => finish(run, "skipped")}
          onNextPart={() => {
            if (!next) return;
            updateTour((prev) => withChapter(prev, run.id, "done", run.index));
            begin(next.id, 0, run.opener);
          }}
          onShown={() => setRun((r) => r && { ...r, shown: r.shown + 1, navigated: false })}
          onMissing={onMissing}
          // Seen to the last step counts as done (on a phone, tapping the menu the step points at).
          onLost={() => finish(run, run.index === run.steps.length - 1 ? "done" : "paused")}
        />
      ) : tip !== null && tipStep ? (
        <TourStep
          key="tips"
          tips
          step={tipStep}
          index={tip}
          total={chapterById("chat").steps.length}
          first={false}
          nextPart={null}
          leaving={leaving}
          onPrev={() => undefined}
          onNext={() => seenTip(tip)}
          onDone={() => seenTip(tip)}
          onSkip={() => seenTip(tip, "skipped")}
          onNextPart={() => undefined}
          onShown={() => undefined}
          onMissing={() => setTip(null)}
          // Used, or moved on (an answered question goes away): it was seen.
          onLost={() => seenTip(tip)}
        />
      ) : null}
      {offered && (
        <ChapterOffer
          key={offered.id}
          chapter={offered}
          steps={offered.steps.length}
          inEditor={here === "editor" || here === "pcb"}
          onStart={() => begin(offered.id, 0, document.activeElement instanceof HTMLElement ? document.activeElement : null)}
          onDecline={() => {
            updateTour((prev) => withOffered(prev, offered.id));
            setOffer(null);
          }}
        />
      )}
      {panel && (
        <TourGuidePanel
          anchor={panel.anchor}
          rec={rec ?? null}
          ready={{ hasProject: projects.length > 0, hasChat: chats.length > 0 }}
          atHome={here === "home"}
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

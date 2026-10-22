"use client";

// TourHost — the Tour Guide for every page (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md).
// Mounted once at the root, beside Report a problem's host. It shows the Welcome on Home to a
// browser that hasn't made anything yet, runs a chapter step by step over the `data-tour`
// controls, and opens the Tour Guide panel when Support › Tour Guide or ⌘K asks
// (openTourGuide, lib/tour/open.ts). What was seen, skipped or left half-way is kept in
// `ideeza:tour`, so the panel can offer Replay or Resume.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCreateHistory } from "@/lib/create/history";
import { useManualProjects } from "@/lib/manual/projects";
import { chapterById, nextChapterOf, stepsFor } from "@/lib/tour/chapters";
import { TOUR_EVENT, type TourRequest } from "@/lib/tour/open";
import { emptyTour, shouldWelcome, withChapter, withWelcome } from "@/lib/tour/state";
import type { ChapterId, ChapterState, TourStep as Step } from "@/lib/tour/types";
import { isPhone, isShown } from "./targets";
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
  /** The run's page was reached (a chapter started elsewhere goes there first). */
  arrived: boolean;
  /** What had focus before the tour, given it back at the end. */
  opener: HTMLElement | null;
};

/** The Welcome waits for the page to settle, and for any other dialog to close. */
const WELCOME_DELAY_MS = 600;

export function TourHost() {
  const rec = useTourRecord();
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: historyReady, chats } = useCreateHistory();
  const [run, setRun] = React.useState<Run | null>(null);
  const [panel, setPanel] = React.useState<{ anchor: HTMLElement | null } | null>(null);
  const [welcome, setWelcome] = React.useState(false);

  const begin = React.useCallback(
    (id: ChapterId, step = 0, opener: HTMLElement | null = null) => {
      const chapter = chapterById(id);
      const steps = stepsFor(chapter, isPhone());
      const there = !chapter.route || pathname === chapter.route;
      setPanel(null);
      setWelcome(false);
      setRun({ id, steps, index: Math.min(Math.max(step, 0), steps.length - 1), dir: 1, shown: 0, arrived: there, opener });
      if (!there) router.push(chapter.route!);
    },
    [pathname, router],
  );

  const finish = React.useCallback((r: Run, state: ChapterState, step = r.index) => {
    updateTour((prev) => withChapter(prev, r.id, state, step));
    setRun(null);
    const back = r.opener;
    if (back && isShown(back)) back.focus({ preventScroll: true });
  }, []);

  // Asked from the sidebar, ⌘K and the phone's menu.
  const onRequest = React.useEffectEvent((req: TourRequest) => {
    if (req.kind === "panel") {
      if (run) finish(run, "paused");
      setWelcome(false);
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

  // A chapter started from another page waits until its own page is open. After that a step
  // whose control goes away (the page changed under it) pauses the chapter by itself.
  const route = run ? chapterById(run.id).route : undefined;
  if (run && route && pathname === route && !run.arrived) setRun({ ...run, arrived: true });

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

  const current = run && run.arrived ? run.steps[run.index] : null;

  const move = (to: number, dir: 1 | -1) => run && setRun({ ...run, index: to, dir });

  const onMissing = () => {
    if (!run) return;
    const to = run.index + run.dir;
    if (to >= 0 && to < run.steps.length) return move(to, run.dir);
    // Nothing more that way: back past the start returns to where the user was; forward past
    // the end finishes, unless nothing could be shown at all.
    if (run.dir < 0) return move(run.index + 1, 1);
    finish(run, run.shown > 0 ? "done" : "paused", run.shown > 0 ? run.steps.length - 1 : 0);
  };

  const next = nextChapterOf(run?.id ?? "account");

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
      {run && current && (
        <TourStep
          key={`${run.id}:${run.index}`}
          step={current}
          index={run.index}
          total={run.steps.length}
          first={run.shown === 0}
          nextPart={run.index === run.steps.length - 1 ? next : null}
          onPrev={() => move(run.index - 1, -1)}
          onNext={() => move(run.index + 1, 1)}
          onDone={() => finish(run, "done")}
          onSkip={() => finish(run, "skipped")}
          onNextPart={() => {
            if (!next) return;
            updateTour((prev) => withChapter(prev, run.id, "done", run.index));
            begin(next.id, 0, run.opener);
          }}
          onShown={() => setRun((r) => r && { ...r, shown: r.shown + 1 })}
          onMissing={onMissing}
          onLost={() => finish(run, "paused")}
        />
      )}
      {panel && (
        <TourGuidePanel
          anchor={panel.anchor}
          rec={rec ?? null}
          onStart={(id, step) => begin(id, step, panel.anchor)}
          onReset={() => updateTour(() => emptyTour())}
          onClose={() => {
            const back = panel.anchor;
            setPanel(null);
            if (back && isShown(back)) back.focus({ preventScroll: true });
          }}
        />
      )}
      {/* Each step is said once as it opens. */}
      <div aria-live="polite" className="sr-only">
        {run && current ? `Step ${run.index + 1} of ${run.steps.length}: ${current.title}` : ""}
      </div>
    </>
  );
}


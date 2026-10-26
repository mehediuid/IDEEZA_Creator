"use client";

// Usability testing (lib/research/tester.ts): every browser on the deployed site is a tester from
// its first visit (its record is settled before the app hydrates, instrumentation-client.ts).
// While it is on, this starts PostHog and Clarity (trackers.ts) and reports the journey's
// milestones, the Welcome's answer and the guide's state, Report a problem opening, and the app's
// calls that failed or kept the tester waiting. Renders only the notice, until it is answered.
//
// Off on a developer's machine, and paused while a tour plays (owner, 2026-10-26).

import * as React from "react";
import { useCreateHistory } from "@/lib/create/history";
import { useManualProjects } from "@/lib/manual/projects";
import { REPORT_EVENT } from "@/lib/support/open-report";
import { REPORT_OPENED, apiEvent, apiRouteOf, callProblem, journeyEvent, tourEvents } from "@/lib/research/events";
import { JOURNEY, journeyFacts, newMilestones } from "@/lib/research/journey";
import { isTracking, showsNotice, turnedOff, withBaseline, withNoticed, withPersona, withSent } from "@/lib/research/tester";
import { useTourRecord } from "@/components/tour/use-tour";
import { ResearchNotice } from "./research-notice";
import { tourCovering, tourPlaying, useSignal } from "./signals";
import {
  pauseTrackers,
  renameTrackers,
  researchConfig,
  researchRunsHere,
  send,
  startTrackers,
  stopTrackers,
  watchCalls,
  type ResearchConfig,
} from "./trackers";
import { updateTester, useTesterRecord } from "./use-tester";

const CONFIG = researchConfig();

/** A failing or slow route is reported once a minute at most (a poll can fail every second). */
const REPEAT_MS = 60_000;

export function ResearchHost() {
  return CONFIG ? <ResearchRun config={CONFIG} /> : null;
}

const noChange = () => () => {};

function ResearchRun({ config }: { config: ResearchConfig }) {
  const here = React.useSyncExternalStore(noChange, researchRunsHere, () => false);
  const rec = useTesterRecord() ?? null;
  const tour = useTourRecord();
  const playing = useSignal(tourPlaying);
  const covered = useSignal(tourCovering);
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: historyReady, chats, builds } = useCreateHistory();

  const facts = React.useMemo(
    () => (projectsReady && historyReady ? journeyFacts({ chats, builds, projects }) : null),
    [projectsReady, historyReady, chats, builds, projects],
  );
  const on = here && isTracking(rec);

  React.useEffect(() => {
    if (on && rec) startTrackers(config, rec);
    else if (here && rec && !isTracking(rec)) stopTrackers();
  }, [here, on, rec, config]);

  React.useEffect(() => {
    if (rec) renameTrackers(rec);
  }, [rec]);

  React.useEffect(() => {
    pauseTrackers(playing);
  }, [playing]);

  // The journey: first, what this browser had already done counts as the starting point; then each
  // milestone the first time it is reached. `reported` keeps a second run of this effect (before
  // the record's write comes back) from sending one twice.
  const reported = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (!on || !rec || !facts) return;
    if (!rec.baseline) {
      const already = JOURNEY.filter((id) => facts[id]);
      already.forEach((id) => reported.current.add(id));
      updateTester((prev) => (prev ? withBaseline(prev, already) : prev));
      return;
    }
    const fresh = newMilestones(facts, rec.sent).filter((id) => !reported.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => {
      reported.current.add(id);
      send(journeyEvent(id));
    });
    updateTester((prev) => (prev ? withSent(prev, fresh) : prev));
  }, [on, rec, facts]);

  const lastTour = React.useRef(tour);
  React.useEffect(() => {
    const prev = lastTour.current;
    lastTour.current = tour;
    if (on) tourEvents(prev, tour).forEach(send);
  }, [on, tour]);

  React.useEffect(() => {
    if (!on) return;
    const onReport = () => send(REPORT_OPENED);
    window.addEventListener(REPORT_EVENT, onReport);
    const last = new Map<string, number>();
    const stop = watchCalls((url, status, ms) => {
      const route = apiRouteOf(url, window.location.origin);
      const problem = route ? callProblem(status, ms) : null;
      if (!route || !problem) return;
      const key = `${route} ${problem}`;
      const now = Date.now();
      if (now - (last.get(key) ?? -Infinity) < REPEAT_MS) return;
      last.set(key, now);
      send(apiEvent(route, problem, ms, status));
    });
    return () => {
      window.removeEventListener(REPORT_EVENT, onReport);
      stop();
    };
  }, [on]);

  if (!here || !showsNotice(rec) || covered) return null;
  return (
    <ResearchNotice
      onPersona={(id) => updateTester((prev) => (prev ? withPersona(prev, id) : prev))}
      onGotIt={() => updateTester((prev) => (prev ? withNoticed(prev) : prev))}
      onTurnOff={() => updateTester((prev) => (prev ? turnedOff(prev) : prev))}
    />
  );
}

// The two tools every tester's session goes to (owner, 2026-10-26, both on free plans): PostHog
// for the replay, the journey's events and the funnel; Microsoft Clarity for heatmaps on every
// page. Every browser on the deployed site is a tester; a browser turned off with `?tester=off`
// (the team's own) and a developer's machine download nothing from either.
//
// PostHog goes through this app's own `/ixp` (a rewrite in next.config.ts), so an ad blocker that
// blocks PostHog's own address doesn't lose the tester's data. Clarity can't be routed that way.
//
// What is hidden: everything typed into a box (both tools mask inputs; Clarity also numbers and
// email addresses on the page), request and response bodies, and nothing outside this tab.

import type { PostHog } from "posthog-js";
import { isTourNoise, type ResearchEvent } from "@/lib/research/events";
import { isLocalHost, type TesterRecord } from "@/lib/research/tester";

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

/** PostHog's ingestion, through this app (next.config.ts rewrites it to the region's host). */
export const POSTHOG_PROXY = "/ixp";

export type ResearchConfig = { posthogKey: string | null; posthogUi: string; clarityId: string | null };

/** Which tools are set up for this deployment; null when neither is. */
export function researchConfig(): ResearchConfig | null {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || null;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID || null;
  if (!posthogKey && !clarityId) return null;
  // us.i.posthog.com → us.posthog.com: the app's own address, for the toolbar's links.
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  return { posthogKey, clarityId, posthogUi: host.replace("://us.i.", "://us.").replace("://eu.i.", "://eu.") };
}

/** Not on a developer's machine (owner: no need to run it locally), unless
 *  NEXT_PUBLIC_RESEARCH_LOCAL=on asks for it, to check the trackers before a deploy. */
export function researchRunsHere(): boolean {
  return process.env.NEXT_PUBLIC_RESEARCH_LOCAL === "on" || !isLocalHost(window.location.hostname);
}

let posthog: PostHog | null = null;
let startedFor: TesterRecord | null = null;
let clarityOn = false;
let paused = false;
const waiting: ResearchEvent[] = [];

function clarity(...args: unknown[]) {
  window.clarity?.(...args);
}

function loadClarity(id: string) {
  if (window.clarity) return;
  // Clarity's own loader: calls made before its script arrives wait in `q`.
  const stub = function () {
    // eslint-disable-next-line prefer-rest-params -- the tag replays `arguments` objects from `q`
    (stub.q = stub.q ?? []).push(arguments);
  } as ClarityFn;
  window.clarity = stub;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** Who this is, told to Clarity again after each start: a stop forgets it. */
function nameForClarity(rec: TesterRecord) {
  clarity("consent");
  clarity("identify", rec.code, undefined, undefined, rec.code);
  clarity("set", "tester", rec.code);
  if (rec.persona) clarity("set", "persona", rec.persona);
}

/** Starts both tools for a tester who said yes. Once per tester per page load. */
export function startTrackers(config: ResearchConfig, rec: TesterRecord): void {
  if (startedFor?.code === rec.code) return;
  startedFor = rec;
  if (config.clarityId) {
    clarityOn = true;
    loadClarity(config.clarityId);
    nameForClarity(rec);
    if (paused) clarity("stop");
  }
  if (config.posthogKey) {
    const key = config.posthogKey;
    void import("posthog-js").then(({ default: ph }) => {
      // Turned off while the library was still on its way.
      if (startedFor?.code !== rec.code) return;
      ph.init(key, {
        api_host: POSTHOG_PROXY,
        ui_host: config.posthogUi,
        defaults: "2026-08-30",
        person_profiles: "identified_only",
        capture_dead_clicks: true,
        capture_exceptions: true,
        session_recording: {
          maskAllInputs: true,
          recordHeaders: false,
          recordBody: false,
          // The PCB, 3D and assembly views draw on a canvas: a few frames a second shows what the
          // tester was looking at without filling the replay.
          captureCanvas: { recordCanvas: true, canvasFps: 2, canvasQuality: "0.4" },
        },
        before_send: (event) => (paused && event && isTourNoise(event.event) ? null : event),
      });
      // A browser turned off once and named again by a tester link: PostHog kept the opt-out.
      if (ph.has_opted_out_capturing()) ph.opt_in_capturing();
      ph.identify(rec.code, rec.persona ? { persona: rec.persona } : undefined);
      ph.register({ tester: rec.code, persona: rec.persona ?? "none" });
      if (paused) ph.stopSessionRecording();
      posthog = ph;
      waiting.splice(0).forEach(send);
    });
  }
}

/** The persona the tester picked on the notice, told to both tools. */
export function renameTrackers(rec: TesterRecord): void {
  if (!startedFor || startedFor.code !== rec.code || startedFor.persona === rec.persona) return;
  startedFor = rec;
  if (clarityOn && !paused && rec.persona) clarity("set", "persona", rec.persona);
  if (rec.persona) {
    posthog?.setPersonProperties({ persona: rec.persona });
    posthog?.register({ persona: rec.persona });
  }
}

/** Turned off (`?tester=off`): nothing more is sent from this page on, and Clarity forgets its cookies. */
export function stopTrackers(): void {
  if (!startedFor) return;
  startedFor = null;
  waiting.length = 0;
  if (clarityOn) {
    clarity("consent", false);
    clarity("stop");
    clarityOn = false;
  }
  posthog?.stopSessionRecording();
  posthog?.opt_out_capturing();
}

export function send(event: ResearchEvent): void {
  if (!startedFor) return;
  clarity("event", event.clarity);
  if (posthog) posthog.capture(event.name, event.props);
  else waiting.push(event);
}

/** While a tour plays: no replay, no pages or clicks; on again when it ends. Clarity's own pause
 *  only holds its work back and sends the tour's clicks on resume, so it is stopped and started
 *  again, as Clarity itself does on every page change: the session carries on with a new page. */
export function pauseTrackers(on: boolean): void {
  if (on === paused) return;
  paused = on;
  if (!startedFor) return;
  if (clarityOn) {
    clarity(on ? "stop" : "start");
    if (!on) nameForClarity(startedFor);
  }
  if (on) posthog?.stopSessionRecording();
  else posthog?.startSessionRecording();
}

/** Watches this app's `/api` calls and reports each one that fails or keeps the tester waiting.
 *  Returns the way to stop watching. */
export function watchCalls(report: (url: string, status: number | null, ms: number) => void): () => void {
  const original = window.fetch;
  const watched: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const start = performance.now();
    try {
      const res = await original.call(window, input, init);
      report(url, res.status, performance.now() - start);
      return res;
    } catch (err) {
      // A call the page itself cancelled (it moved on) isn't the tester's problem.
      if (!(err instanceof DOMException && err.name === "AbortError")) report(url, null, performance.now() - start);
      throw err;
    }
  };
  window.fetch = watched;
  return () => {
    if (window.fetch === watched) window.fetch = original;
  };
}

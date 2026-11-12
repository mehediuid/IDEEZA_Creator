"use client";

// The render tray (mobile Figma 11l–11o, 11y): the web's render toasts as the
// phone's M02 toast, following the maker around the app, 8 above whatever is
// at the foot (the tab bar, a bottom action bar, the home indicator — the
// FOOT_ATTR marks, as kit/toast.tsx finds them). One at a time, the rest
// behind the web's "+N more videos" line:
// · rendering (11l): "Rendering {Product} · Take n", the progress and time
//   left, Cancel — which asks first (11y);
// · ready (11m): "Take n is ready", Review (the product's review, 11b), or
//   Watch once it was settled elsewhere;
// · failed (11n): "Take n couldn't be made", the web's failure line, Try again
//   (the form, from that take);
// · the nudge (11o): every current product has its video — Make project video.
// The tray carries FLOAT_ATTR, so a toast stacks above it instead of over it.
// × hides one (the web's acknowledge). Mounted by the web's
// GlobalRenderIndicator on /m paths, inside the phone only: on a phone, or in
// the desktop's phone frame (never the desktop page around it). It stays off
// the camera, a buyer's view and the screen already showing that render.

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Alert02Icon, Cancel01Icon, CheckmarkCircle04Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { isProductJob, useVideoJobs, type VideoJob } from "@/components/video-jobs/video-jobs-provider";
import { useCreateHistory } from "@/lib/create/history";
import { subscribeStores } from "@/lib/key-store";
import { can, type Viewer } from "@/lib/manual/permissions";
import { buildsOf, productsOfProject } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useGuards } from "@/lib/manual/use-write-guard";
import { trayHiddenFor, trayItemOf, trayNudgeOf, trayStackOf, type TrayItem, type TrayJobFacts } from "@/lib/video/phone-video";
import { isProjectKey, projectVideoStatusOf } from "@/lib/video/project-video";
import { readProjectVideos } from "@/lib/video/store";
import { PROJECT_VIDEO_KEY } from "@/lib/video/types";
import { cn } from "@/lib/utils";
import { FramedProvider, useDeviceMode } from "../../device";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { FLOAT_ATTR, FOOT_ATTR } from "../../kit/toast";
import { T } from "../../type";

/** The phone app's root (mobile-root.tsx): the tray lives inside it, so it is the phone's own. */
const APP_ID = "m-app";
const OWNER: Viewer = { kind: "local-owner" };

export function PhoneRenderTray() {
  const mode = useDeviceMode();
  if (mode !== "phone" && mode !== "framed") return null;
  return (
    <FramedProvider value={mode === "framed"}>
      <Tray />
    </FramedProvider>
  );
}

/** The phone's root once it is on the page, and the tray's distance from its foot (8 above the
 *  highest thing marked as the foot), kept true as screens come and go. */
function useHost(): { host: HTMLElement | null; bottom: number } {
  const [state, setState] = React.useState<{ host: HTMLElement | null; bottom: number }>({ host: null, bottom: 0 });
  React.useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const host = document.getElementById(APP_ID);
      let bottom = 0;
      if (host) {
        const floor = host.getBoundingClientRect().bottom;
        let top = floor;
        host.querySelectorAll<HTMLElement>(`[${FOOT_ATTR}]`).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.height > 0 && r.top < top) top = r.top;
        });
        const gap = parseFloat(getComputedStyle(host).getPropertyValue("--spacing-4")) || 0;
        bottom = Math.round(floor - top + gap);
      }
      setState((s) => (s.host === host && s.bottom === bottom ? s : { host, bottom }));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return state;
}

/** Each shown job's take facts, read from the videos store as one string, so the tray follows a
 *  take used, cancelled or failed in any tab. */
function factsKeyOf(jobs: VideoJob[]): string {
  const out: Record<string, Omit<TrayJobFacts, "name" | "renderable">> = {};
  for (const j of jobs) {
    if (!isProductJob(j)) continue;
    const take = readProjectVideos(j.projectId!)?.products[j.productId!]?.takes.find((t) => t.id === j.id);
    out[j.id] = {
      n: take?.n ?? 0,
      waiting: !!take?.toReview && !!take.readyAt && !take.failure,
      failure: take?.failure?.kind ?? null,
      durationMs: take?.clip?.durationMs ?? null,
    };
  }
  return JSON.stringify(out);
}

function Tray() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { host, bottom } = useHost();
  const { jobs, hydrated, now, acknowledge, cancelRender } = useVideoJobs();
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  const guards = useGuards();
  const [cancelling, setCancelling] = React.useState<{ takeId: string; n: number } | null>(null);

  const visible = React.useMemo(() => (hydrated ? jobs.filter((j) => j.acknowledged !== true && isProductJob(j)) : []), [jobs, hydrated]);
  const factsKey = React.useSyncExternalStore(subscribeStores, () => factsKeyOf(visible), () => "{}");
  const facts = React.useMemo(() => JSON.parse(factsKey) as Record<string, Omit<TrayJobFacts, "name" | "renderable">>, [factsKey]);

  /** The maker's own project, while they may still render for it. */
  const renderable = (projectId: string | null | undefined) => {
    const project = projects.find((p) => p.id === projectId);
    return project && can(OWNER, "video.generate", { locked: guards.lockOf(project) !== null }) ? project : null;
  };

  // The nudge: a project whose last product video just landed in this tab, while its project video
  // can be made (or updated); dropped on ×, on its action, or once that's no longer so.
  const [nudgeIds, setNudgeIds] = React.useState<string[]>([]);
  const seenStage = React.useRef(new Map<string, VideoJob["stage"]>());
  React.useEffect(() => {
    if (!hydrated) return;
    const landed: string[] = [];
    for (const j of jobs) {
      const before = seenStage.current.get(j.id);
      seenStage.current.set(j.id, j.stage);
      if (before && before !== "done" && j.stage === "done" && isProductJob(j) && !isProjectKey(j.productId)) landed.push(j.projectId!);
    }
    if (landed.length === 0) return;
    // A job turning done is the event this answers; the stage map above is how it is seen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNudgeIds((prev) => [...new Set([...prev, ...landed])]);
  }, [jobs, hydrated]);
  const dropNudge = (projectId: string) => setNudgeIds((prev) => prev.filter((id) => id !== projectId));

  const nudges: TrayItem[] = [];
  for (const projectId of nudgeIds) {
    const project = renderable(projectId);
    if (!project || trayHiddenFor(pathname, { projectId, productId: PROJECT_VIDEO_KEY })) continue;
    const products = productsOfProject(project, buildsOf(project, builds));
    const s = projectVideoStatusOf({ products, videos: readProjectVideos(projectId), jobs, now });
    const update = s.state === "outdated" && s.total > 0 && s.ready === s.total;
    if (s.state === "make" || update) nudges.push(trayNudgeOf(projectId, s.total, update));
  }
  const items = [...visible]
    .reverse()
    .filter((j) => !trayHiddenFor(pathname, j))
    .map((j) => {
      const f = facts[j.id];
      if (!f) return null;
      return trayItemOf(j, { ...f, name: j.render?.productName ?? "", renderable: renderable(j.projectId) !== null }, now);
    })
    .filter((x): x is TrayItem => x !== null);
  const { shown, more } = trayStackOf(nudges, items);
  if (!host) return null;

  const act = (item: TrayItem) => {
    const a = item.action;
    if (!a) return;
    if (a.kind === "cancel") return setCancelling({ takeId: a.takeId, n: a.n });
    if (item.jobId) acknowledge(item.jobId);
    else dropNudge(item.key.slice("nudge:".length));
    router.push(a.href);
  };
  const hide = (item: TrayItem) => {
    if (item.jobId) acknowledge(item.jobId);
    else dropNudge(item.key.slice("nudge:".length));
  };

  return (
    <>
      {createPortal(
        <div
          role="status"
          aria-live="polite"
          aria-label="Video render status"
          // A toast stands above the tray, never on it (kit/toast.tsx).
          {...{ [FLOAT_ATTR]: "" }}
          className="pointer-events-none absolute inset-x-8 z-overlay flex flex-col items-center gap-4"
          style={{ bottom }}
        >
          {shown && <TrayCard key={shown.key} item={shown} onAction={() => act(shown)} onHide={() => hide(shown)} />}
          {more && (
            <p className={cn(T.caption, "pointer-events-auto rounded-full border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-6 py-1 shadow-1")}>
              {more}
            </p>
          )}
        </div>,
        host,
      )}
      <ConfirmSheet
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title="Cancel this render?"
        body={`Take ${cancelling?.n ?? ""} stops and isn’t saved. You can start it again later.`}
        verb="Cancel render"
        destructive
        cancelLabel="Keep rendering"
        onConfirm={() => {
          if (cancelling) cancelRender(cancelling.takeId);
        }}
      />
    </>
  );
}

const LEAD: Record<Exclude<TrayItem["tone"], "progress">, { icon: typeof CheckmarkCircle04Icon; fill: string }> = {
  success: { icon: CheckmarkCircle04Icon, fill: "bg-[var(--color-icon-success)]" },
  error: { icon: Alert02Icon, fill: "bg-[var(--color-icon-error)]" },
  info: { icon: InformationCircleIcon, fill: "bg-[var(--color-icon-brand)]" },
};

/** M02 Toast: radius/xl, bg/surface-raised, border/subtle, Elevation/2; 14 / 14 / 14 / 16 padding,
 *  12 between the lead and the text; a progress bar in place of the lead while it renders. */
function TrayCard({ item, onAction, onHide }: { item: TrayItem; onAction: () => void; onHide: () => void }) {
  const lead = item.tone === "progress" ? null : LEAD[item.tone];
  return (
    <div className="pointer-events-auto flex w-full items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface-raised py-7 pl-8 pr-7 shadow-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-normal motion-safe:ease-decelerate">
      {lead && (
        <span aria-hidden className={cn("mt-1 inline-flex size-[20px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-text-inverse)]", lead.fill)}>
          <Icon icon={lead.icon} size={14} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className={cn(T.bodyStrong, "truncate")}>{item.title}</p>
        <p className={cn(T.body, "line-clamp-2")}>{item.supporting}</p>
        {item.progress !== null && <ProgressBar value={item.progress} label={item.title} />}
        {item.action && (
          <div className="flex pt-4">
            <button
              type="button"
              onClick={onAction}
              className={cn(T.rowTitle, "-my-6 inline-flex min-h-[44px] items-center outline-none hover:underline focus-visible:underline text-text-brand")}
            >
              {item.action.label}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label={`Hide — ${item.title}`}
        onClick={onHide}
        className="-m-4 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Cancel01Icon} size={16} />
      </button>
    </div>
  );
}

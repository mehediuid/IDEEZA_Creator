"use client";

// Videos on the phone (CL-030; the web's videos-dock.tsx, its words, the phone's way). A maker
// starts a project's videos one after another and keeps working, so one bar follows them around
// the app, docked like a mini-player into the screen's foot dock slot (kit/dock.tsx; the Feed's
// top slot; with neither it floats 8 above the foot), never over the content (mobile UX lens 13):
// · the bar — a ring with the overall progress (the number to review once nothing renders),
//   "Videos", the summary ("2 rendering · 1 to review", "1 didn't finish", "1 waiting") and the
//   badge with the number to review. A tap opens the Videos sheet;
// · the Videos sheet (M09) — "They keep going while you work. …", one group per project (its
//   name, then each product's video and the project video, each with its state and ONE action:
//   Review · Generate AI video · Make project video · Try again · Cancel, which asks first; a
//   settled ready video a quiet Replace, CL-015), a
//   row to Media (or Earn › Sell when something waits) and, when something waits, "Waiting for
//   videos · Main NFT listing goes live on Explore marketplace when the video is ready (0 of 1
//   now)."; the switch "Notify me on this browser · for every video" pinned at its foot;
// · moment cards only (they replaced the stack of progress toasts and the old "Make project
//   video" nudge — the project video no longer waits for the product videos): "Video ready ·
//   review it" (Review), "Video render failed" (Try again), "Now on Explore marketplace" (View);
//   each hides after 7 seconds, one at a time, above the bar.
// The web's `openVideosPanel(projectId)` (a held item's Review videos, the project header's line)
// opens the sheet at that project. Mounted by the web's GlobalRenderIndicator on /m, inside the
// phone only (on a phone, or in the desktop's phone frame). None of it in a buyer's view (the
// market, a preview) or on the camera; the bar stays off the video screens, which show the render
// themselves.

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  Alert02Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CheckmarkCircle04Icon,
  InformationCircleIcon,
  Loading03Icon,
  LockIcon,
  Store01Icon,
  Video01Icon,
  VideoOffIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { projectVideosWaitOf } from "@/components/video-jobs/held-wait";
import { isProductJob, useVideoJobs, type VideoJob } from "@/components/video-jobs/video-jobs-provider";
import { setVideosPanel, subscribeVideosPanel, videosPanelOpen, videosPanelProject } from "@/components/video-jobs/videos-panel-store";
import { useCreateHistory } from "@/lib/create/history";
import { parseStored, readStoredKey, subscribeStores } from "@/lib/key-store";
import { phoneEarnHref, phoneProductVideoHref } from "@/lib/manual/phone-earn";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { buildsOf, productsOfProject, type ProjectProduct } from "@/lib/manual/project-read";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { useGuards } from "@/lib/manual/use-write-guard";
import { heldLabelOf, heldOf, useHeld, type HeldItem, type HeldLive } from "@/lib/market/held";
import { useNotifyAll, writeNotifyAll } from "@/lib/video/notify-pref";
import { phoneProjectVideoHref, phoneTakeHref, trayHiddenFor } from "@/lib/video/phone-video";
import { productVideoStatus, sanitizeProjectVideos } from "@/lib/video/product-video";
import { needsProjectVideo, projectVideoStatusOf, type ProjectVideoStatus } from "@/lib/video/project-video";
import { PROJECT_VIDEO_KEY, VIDEOS_KEY, type ProductVideoStatus, type ProjectVideos } from "@/lib/video/types";
import { REPLACE_LABEL, projectActionLabel, projectRowCopy, statusCopy } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { FramedProvider, useDeviceMode } from "../../device";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { useDockSlot } from "../../kit/dock";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../../kit/list";
import { PRESSED, PRESSED_DIM } from "../../kit/press";
import { Sheet } from "../../kit/sheet";
import { FLOAT_ATTR, FOOT_ATTR } from "../../kit/toast";
import { T } from "../../type";
import { phoneHeldWhere } from "./held";
import { NotifySwitch } from "./notify-switch";

/** The phone app's root (mobile-root.tsx): the tray lives inside it, so it is the phone's own. */
const APP_ID = "m-app";
/** The web's moment toasts hide after 7 seconds. */
const MOMENT_MS = 7000;

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

type Tone = "error" | "neutral" | "success" | "warning" | "brand";
type Glyph = "check" | "cross" | "alert" | "lock" | "info" | "eye" | "spinner";
type RowAction = { label: string; quiet?: boolean; aria?: string } & ({ href: string; ack?: string } | { cancel: { takeId: string; n: number } });
type Row = {
  key: string;
  name: string;
  project: boolean;
  text: string;
  sub: string | null;
  tone: Tone;
  icon: Glyph;
  progress: number | null;
  action: RowAction | null;
};
type Group = {
  project: ManualProject;
  rows: Row[];
  held: HeldItem[];
  wait: { ready: number; total: number } | null;
  rendering: number;
  review: number;
  failed: number;
  progress: number[];
};
type Moment = { id: string; kind: "ready" | "failed" | "live"; name: string; at: number; job?: VideoJob; live?: HeldLive };

const GLYPH: Record<Glyph, IconValue> = {
  check: CheckmarkCircle02Icon,
  cross: VideoOffIcon,
  alert: Alert02Icon,
  lock: LockIcon,
  info: InformationCircleIcon,
  eye: ViewIcon,
  spinner: Loading03Icon,
};
const INK: Record<Tone, string> = {
  success: "text-text-success",
  error: "text-text-error",
  warning: "text-text-warning",
  brand: "text-text-brand",
  neutral: "text-text-secondary",
};

function decode(raw: string, projectId: string): ProjectVideos | null {
  const { value } = parseStored(raw || null);
  return value === undefined ? null : sanitizeProjectVideos(value, projectId);
}

/** A product's video row: its state and its one action (the web's panel). */
function productRow(projectId: string, p: ProjectProduct, s: ProductVideoStatus): Row {
  const copy = statusCopy(s);
  let action: RowAction | null = null;
  if (s.state === "review") action = { label: "Review", href: phoneTakeHref(projectId, p.id, { review: s.take.id }) };
  else if (s.state === "ready" && s.review) action = { label: "Review", href: phoneTakeHref(projectId, p.id, { review: s.review.id }) };
  else if (s.state === "none") action = { label: "Generate AI video", href: phoneProductVideoHref(projectId, p.id) };
  else if (s.state === "failed") action = { label: "Try again", href: phoneTakeHref(projectId, p.id, { from: s.take.id }), ack: s.take.id };
  else if (s.state === "rendering") action = { label: "Cancel", quiet: true, cancel: { takeId: s.take.id, n: s.take.n } };
  // A settled ready video: a new take, while the one in use stays until the maker chooses (CL-015).
  else if (s.state === "ready" && !s.next)
    action = { label: REPLACE_LABEL, quiet: true, aria: `Replace ${displayProductName(p.name)} video`, href: phoneTakeHref(projectId, p.id, { from: s.take.id }) };
  return {
    key: p.id,
    name: displayProductName(p.name),
    project: false,
    text: copy.text,
    sub: copy.sub,
    tone: copy.tone,
    icon: copy.icon,
    progress: copy.progress,
    action,
  };
}

/** The project video's row: its state and its one action (Make, Update, Try again, Review, Cancel). */
function projectRow(projectId: string, s: ProjectVideoStatus): Row {
  const copy = projectRowCopy(s);
  const label = projectActionLabel(copy.action);
  const review = s.review ?? (s.video.state === "review" ? s.video.take : null);
  let action: RowAction | null = label
    ? {
        label,
        href: phoneProjectVideoHref(projectId, copy.action === "review" && review ? review.id : undefined),
        ack: s.video.state === "failed" ? s.video.take.id : undefined,
      }
    : null;
  if (s.state === "rendering") {
    const v = s.video;
    const take = v.state === "rendering" ? v.take : v.state === "ready" && v.next ? v.next.take : null;
    if (take) action = { label: "Cancel", quiet: true, cancel: { takeId: take.id, n: take.n } };
  }
  return { key: PROJECT_VIDEO_KEY, name: "Project video", project: true, text: copy.text, sub: copy.sub, tone: copy.tone, icon: copy.icon, progress: copy.progress, action };
}

function Tray() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { host, bottom } = useHost();
  const footSlot = useDockSlot("foot");
  const topSlot = useDockSlot("top");
  const dock = footSlot ?? topSlot;
  const { jobs, hydrated, now, acknowledge, cancelRender } = useVideoJobs();
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  const guards = useGuards();
  const { store: held, hydrated: heldReady } = useHeld();
  const notifyAll = useNotifyAll();
  const open = React.useSyncExternalStore(subscribeVideosPanel, videosPanelOpen, () => false);
  const focusProject = React.useSyncExternalStore(subscribeVideosPanel, videosPanelProject, () => null);
  const [cancelling, setCancelling] = React.useState<{ takeId: string; n: number } | null>(null);

  // Every project's videos as one string, so a take chosen anywhere re-reads them.
  const ids = projects.map((p) => p.id);
  const raws = React.useSyncExternalStore(
    subscribeStores,
    () => ids.map((id) => readStoredKey(VIDEOS_KEY(id)) ?? "").join("\u0001"),
    () => "",
  );

  const groups = React.useMemo<Group[]>(() => {
    if (!hydrated) return [];
    const parts = raws.split("\u0001");
    const out: Group[] = [];
    projects.forEach((project, i) => {
      if (guards.lockOf(project) !== null) return; // sold in full: nothing more is made for it
      const videos = decode(parts[i] ?? "", project.id);
      const projectJobs = jobs.filter((j) => j.projectId === project.id && isProductJob(j));
      const items = heldOf(held, project.id);
      const products = productsOfProject(project, buildsOf(project, builds));
      const current = products.filter((p) => p.dropped === null);
      const statuses = current.map((p) => ({ p, s: productVideoStatus(videos?.products[p.id], jobs, now) }));
      const pv = needsProjectVideo(products) ? projectVideoStatusOf({ products, videos, jobs, now }) : null;
      const rendering = statuses.filter(({ s }) => s.state === "rendering" || (s.state === "ready" && !!s.next)).length + (pv?.state === "rendering" ? 1 : 0);
      const review = statuses.filter(({ s }) => s.state === "review" || (s.state === "ready" && !!s.review)).length + (pv?.review ? 1 : 0);
      const failed = projectJobs.filter((j) => j.stage === "failed" && j.acknowledged !== true).length;
      const active = projectJobs.some((j) => j.stage !== "done" && j.stage !== "failed");
      if (!active && review === 0 && failed === 0 && items.length === 0) return;
      const rows: Row[] = statuses.map(({ p, s }) => productRow(project.id, p, s));
      if (pv) rows.push(projectRow(project.id, pv));
      const progress: number[] = [];
      for (const { s } of statuses) {
        if (s.state === "rendering") progress.push(s.progress);
        else if (s.state === "ready" && s.next) progress.push(s.next.progress);
      }
      if (pv?.state === "rendering") {
        const v = pv.video;
        progress.push(v.state === "rendering" ? v.progress : v.state === "ready" && v.next ? v.next.progress : 0);
      }
      const wait = items.length ? projectVideosWaitOf(products, videos, jobs, now) : null;
      out.push({ project, rows, held: items, wait, rendering, review, failed, progress });
    });
    return out;
  }, [hydrated, raws, projects, jobs, now, builds, held, guards]);

  // ── moment cards: a take ready to review, a failed render, a listing or post gone live ──
  const [moments, setMoments] = React.useState<Moment[]>([]);
  const seenStage = React.useRef(new Map<string, VideoJob["stage"]>());
  const [mountedAt] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!hydrated) return;
    const fresh: Moment[] = [];
    for (const j of jobs) {
      const before = seenStage.current.get(j.id);
      seenStage.current.set(j.id, j.stage);
      if (!isProductJob(j) || !before || before === j.stage) continue;
      const name = j.productId === PROJECT_VIDEO_KEY ? "Project video" : (j.render?.productName || j.title || "Your video");
      if (j.stage === "done") fresh.push({ id: `ready:${j.id}`, kind: "ready", name, at: Date.now(), job: j });
      else if (j.stage === "failed" && j.acknowledged !== true) fresh.push({ id: `failed:${j.id}`, kind: "failed", name, at: Date.now(), job: j });
    }
    if (fresh.length === 0) return;
    // A job changing stage is the event this answers; the stage map is how it is seen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoments((prev) => [...prev, ...fresh].slice(-3));
  }, [jobs, hydrated]);
  const liveKey = heldReady ? held.live.filter((l) => l.at >= mountedAt).map((l) => l.id).join(",") : "";
  const shownLive = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (!liveKey) return;
    const fresh = held.live.filter((l) => l.at >= mountedAt && !shownLive.current.has(l.id));
    if (fresh.length === 0) return;
    for (const l of fresh) shownLive.current.add(l.id);
    // A listing going live is the event this answers.
    setMoments((prev) => [...prev, ...fresh.map((l) => ({ id: `live:${l.id}`, kind: "live" as const, name: l.projectName || "Your project", at: Date.now(), live: l }))].slice(-3));
  }, [liveKey, held.live, mountedAt]);
  // Each card hides itself.
  React.useEffect(() => {
    if (moments.length === 0) return;
    const oldest = Math.min(...moments.map((t) => t.at));
    const t = window.setTimeout(() => setMoments((prev) => prev.filter((x) => Date.now() - x.at < MOMENT_MS)), Math.max(200, oldest + MOMENT_MS - Date.now()));
    return () => window.clearTimeout(t);
  }, [moments]);

  const visible = groups.length > 0;
  // Asked open with nothing going on (what waited went live meanwhile): it closes.
  React.useEffect(() => {
    if (open && hydrated && !visible) setVideosPanel(false);
  }, [open, hydrated, visible]);
  // The sheet opens at the project it was asked for.
  React.useEffect(() => {
    if (!open || !focusProject) return;
    const raf = requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-videos-project="${CSS.escape(focusProject)}"]`)?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(raf);
  }, [open, focusProject]);

  if (!host) return null;
  const away = trayHiddenFor(pathname, null);
  const onVideoScreen = /^\/m\/projects\/[^/]+\/(products\/[^/]+\/video|video)$/.test(pathname);
  const shownMoment = open || away ? null : ([...moments].reverse().find((m) => !m.job || !trayHiddenFor(pathname, m.job)) ?? null);
  const showBar = visible && !away && !onVideoScreen;

  const rendering = groups.reduce((n, g) => n + g.rendering, 0);
  const review = groups.reduce((n, g) => n + g.review, 0);
  const failed = groups.reduce((n, g) => n + g.failed, 0);
  const waiting = groups.reduce((n, g) => n + g.held.length, 0);
  const progress = groups.flatMap((g) => g.progress);
  const pct = progress.length ? progress.reduce((a, b) => a + b, 0) / progress.length : 100;
  const summary =
    [rendering ? `${rendering} rendering` : "", review ? `${review} to review` : "", failed ? `${failed} didn't finish` : "", !rendering && !review && !failed && waiting ? `${waiting} waiting` : ""]
      .filter(Boolean)
      .join(" · ") || "All set";

  const go = (href: string, ack?: string) => {
    if (ack) acknowledge(ack);
    setVideosPanel(false);
    router.push(href);
  };
  const act = (a: RowAction) => {
    if ("cancel" in a) setCancelling(a.cancel);
    else go(a.href, a.ack);
  };
  const hideMoment = (id: string) => setMoments((prev) => prev.filter((x) => x.id !== id));
  const momentAction = (m: Moment): { label: string; run: () => void } | null => {
    if (m.kind === "live" && m.live) {
      const l = m.live;
      return {
        label: "View",
        run: () => {
          hideMoment(m.id);
          router.push(l.kind === "share" ? phoneProjectHref(l.projectId) : phoneEarnHref(l.projectId, "sell"));
        },
      };
    }
    const j = m.job;
    if (!j?.projectId || !j.productId) return null;
    const failedNow = m.kind === "failed";
    const href =
      j.productId === PROJECT_VIDEO_KEY
        ? phoneProjectVideoHref(j.projectId, failedNow ? undefined : j.id)
        : phoneTakeHref(j.projectId, j.productId, failedNow ? { from: j.id } : { review: j.id });
    return {
      label: failedNow ? "Try again" : "Review",
      run: () => {
        hideMoment(m.id);
        if (failedNow) acknowledge(j.id);
        router.push(href);
      },
    };
  };

  return (
    <>
      {/* Said once from a region that is always on the page (the cards themselves move into a dock). */}
      {createPortal(
        <p role="status" aria-live="polite" className="sr-only">
          {shownMoment ? momentTitle(shownMoment) : ""}
        </p>,
        host,
      )}
      {(showBar || shownMoment) &&
        createPortal(
          <div
            role="group"
            aria-label="Videos"
            // A toast stands above the tray, never on it (kit/toast.tsx).
            {...{ [FLOAT_ATTR]: "" }}
            className={cn(
              "flex flex-col items-stretch gap-4",
              dock ? (dock === footSlot ? "px-8 pb-4 pt-4" : "px-8 pb-4") : "pointer-events-none absolute inset-x-8 z-overlay",
            )}
            style={dock ? undefined : { bottom }}
          >
            {shownMoment && <MomentCard key={shownMoment.id} moment={shownMoment} action={momentAction(shownMoment)} onHide={() => hideMoment(shownMoment.id)} />}
            {showBar && (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={`Videos · ${summary}`}
                onClick={() => setVideosPanel(true)}
                className={cn(
                  "pointer-events-auto flex min-h-[56px] w-full items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand bg-bg-surface-raised py-4 pl-4 pr-6 text-left shadow-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  PRESSED,
                )}
              >
                <Ring pct={pct} label={review > 0 && rendering === 0 ? String(review) : `${Math.round(pct)}%`} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={T.bodyStrong}>Videos</span>
                  <span className={cn(T.meta, "truncate")}>{summary}</span>
                </span>
                {review > 0 && (
                  <Badge tone="brand-solid" className="shrink-0 tabular-nums">
                    {review}
                  </Badge>
                )}
                <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={ArrowUp01Icon} size={20} />
                </span>
              </button>
            )}
          </div>,
          dock ?? host,
        )}
      <Sheet
        open={open && visible && !away}
        onClose={() => setVideosPanel(false)}
        title="Videos"
        description="They keep going while you work. Each one waits for your review before it's used."
        footer={<NotifySwitch on={notifyAll} onToggle={() => writeNotifyAll(!notifyAll)} />}
      >
        <div className="flex flex-col gap-10 pb-4">
          {groups.map((g) => (
            <GroupSection key={g.project.id} group={g} onAct={act} onGo={(href) => go(href)} />
          ))}
        </div>
      </Sheet>
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

function GroupSection({ group, onAct, onGo }: { group: Group; onAct: (a: RowAction) => void; onGo: (href: string) => void }) {
  const { project, rows, held, wait } = group;
  const toSell = held.length > 0;
  const wheres = [...new Set(held.map((h) => phoneHeldWhere(h.kind)))].join(" and ");
  return (
    <section data-videos-project={project.id} aria-label={project.name} className="flex scroll-mt-4 flex-col gap-4">
      <h3 className={cn(T.section, "break-words")}>{project.name}</h3>
      <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
        {rows.map((r) => (
          <VideoRow key={r.key} row={r} onAct={onAct} />
        ))}
        <li>
          <button type="button" onClick={() => onGo(toSell ? phoneEarnHref(project.id, "sell") : phoneProjectHref(project.id, "media"))} className={cn(LIST_ROW, PRESSED)}>
            <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
              <Icon icon={toSell ? Store01Icon : Video01Icon} size={24} />
            </span>
            <span className={cn(T.body, "min-w-0 flex-1 text-text-primary")}>{toSell ? "Earn › Sell" : "Media"}</span>
            <Chevron />
          </button>
        </li>
      </ul>
      {held.length > 0 && wait && (
        <p className={cn(T.meta, "rounded-lg bg-bg-warning-subtle px-6 py-4 text-text-primary")}>
          {`Waiting for videos · ${held.map(heldLabelOf).join(", ")} ${held.length === 1 ? "goes" : "go"} live on ${wheres} when ${
            wait.total === 1 ? "the video is" : `all ${wait.total} videos are`
          } ready (${wait.ready} of ${wait.total} now).`}
        </p>
      )}
    </section>
  );
}

function VideoRow({ row, onAct }: { row: Row; onAct: (a: RowAction) => void }) {
  const action = row.action;
  return (
    <li className={cn(LIST_ROW, "items-start hover:bg-transparent active:bg-transparent")}>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.rowTitle, "break-words")}>{row.name}</span>
        {!row.project && <span className={cn(T.meta, "text-text-tertiary")}>Product video</span>}
        <span className={cn(T.meta, "flex items-start gap-2")}>
          <span aria-hidden className={cn("mt-[2px] shrink-0", INK[row.tone])}>
            <Icon icon={GLYPH[row.icon]} size={14} />
          </span>
          <span className="min-w-0 break-words">{row.text}</span>
        </span>
        {row.progress !== null && <ProgressBar value={row.progress} label={`${row.name} video`} />}
        {row.sub && <span className={cn(T.meta, "break-words text-text-tertiary")}>{row.sub}</span>}
      </span>
      {action && (
        <Button
          hierarchy={action.quiet ? "ghost" : "secondary"}
          size="lg"
          className="min-h-[44px] shrink-0"
          aria-label={action.aria ?? `${action.label} · ${row.name}`}
          onClick={() => onAct(action)}
        >
          {action.label}
        </Button>
      )}
    </li>
  );
}

function momentTitle(m: Moment): string {
  if (m.kind === "live" && m.live) return `Now on ${phoneHeldWhere(m.live.kind)}`;
  return m.kind === "failed" ? "Video render failed" : "Video ready · review it";
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <span aria-hidden className="relative inline-flex size-[40px] shrink-0 items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-border-default)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="var(--color-border-brand)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, pct)) / 100)}
        />
      </svg>
      <span className={cn(T.micro, "tabular-nums text-text-primary")}>{label}</span>
    </span>
  );
}

const LEAD: Record<Moment["kind"], { icon: IconValue; fill: string }> = {
  ready: { icon: CheckmarkCircle04Icon, fill: "bg-[var(--color-icon-success)]" },
  failed: { icon: Alert02Icon, fill: "bg-[var(--color-icon-error)]" },
  live: { icon: CheckmarkCircle04Icon, fill: "bg-[var(--color-icon-brand)]" },
};

/** M02 Toast: radius/xl, bg/surface-raised, border/subtle, Elevation/2; the lead disc, the moment
 *  ("Video ready · review it"), what it is about, its one action and ×. */
function MomentCard({ moment, action, onHide }: { moment: Moment; action: { label: string; run: () => void } | null; onHide: () => void }) {
  const lead = LEAD[moment.kind];
  const about = moment.kind === "live" ? `${moment.name} is live` : moment.name;
  return (
    <div className="pointer-events-auto flex w-full items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface-raised py-7 pl-8 pr-7 shadow-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-normal motion-safe:ease-decelerate">
      <span aria-hidden className={cn("mt-1 inline-flex size-[20px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-text-inverse)]", lead.fill)}>
        <Icon icon={lead.icon} size={14} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className={cn(T.bodyStrong, "truncate")}>{momentTitle(moment)}</p>
        <p className={cn(T.body, "line-clamp-2")}>{about}</p>
        {action && (
          <div className="flex pt-4">
            <button
              type="button"
              onClick={action.run}
              className={cn(T.rowTitle, "-my-6 inline-flex min-h-[44px] items-center text-text-brand outline-none hover:underline focus-visible:underline", PRESSED_DIM)}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label={`Hide — ${momentTitle(moment)}`}
        onClick={onHide}
        className={cn(
          "-m-4 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
          PRESSED,
        )}
      >
        <Icon icon={Cancel01Icon} size={16} />
      </button>
    </div>
  );
}

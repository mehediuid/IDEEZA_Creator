"use client";

// The Videos button and panel (owner, 2026-11-18, D4; plan https://claude.ai/artifact/G4kRAcJwNotoZHCAF77Lr7):
// a maker starts a project's videos one after another and goes on working, so one button in the
// bottom-right corner, on every page, carries them all — a ring with the overall progress and
// "Videos · 2 rendering · 1 to review". It replaces the stack of progress toasts.
//
// - The panel: each project with something going on, its products' videos and the project video in
//   order, each with its state and its one action — Review (opens that take's review), Generate AI
//   video / Make project video (the storyboard-first flow), Try again, or Cancel while it renders.
//   A project whose listing or post waits for its videos (lib/market/held.ts) says when it goes live.
//   "Notify me on this browser" is one switch for every video (D5).
// - Short toasts only for moments: a video ready to review, a render that failed, and a listing or
//   post that just went live. Each hides itself after a few seconds — the panel keeps the rest.
// - Buyer views (Preview as buyer / contributor, Explore marketplace) show none of it.

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button, Checkbox, ProgressBar } from "@/components/ideeza";
import { useCreateHistory } from "@/lib/create/history";
import { parseStored, readStoredKey, subscribeStores } from "@/lib/key-store";
import { AS_PARAM, BUYER_VIEW, CONTRIBUTOR_VIEW, VIEW_PARAM } from "@/lib/manual/buyer-preview";
import { buildsOf, productsOfProject, type ProjectProduct } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { useGuards } from "@/lib/manual/use-write-guard";
import { heldLabelOf, heldOf, heldWhereOf, useHeld, type HeldItem, type HeldLive } from "@/lib/market/held";
import type { VideoJob } from "@/lib/video/jobs";
import { useNotifyAll, writeNotifyAll } from "@/lib/video/notify-pref";
import { productVideoStatus, sanitizeProjectVideos } from "@/lib/video/product-video";
import { needsProjectVideo, projectVideoStatusOf, type ProjectVideoStatus } from "@/lib/video/project-video";
import { PROJECT_VIDEO_KEY, VIDEOS_KEY, type ProductVideoStatus, type ProjectVideos } from "@/lib/video/types";
import { projectActionLabel, projectRowCopy, statusCopy } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { projectVideosWaitOf } from "./held-wait";
import { openProjectVideoDialog } from "./project-video-dialog";
import { openVideoFlow } from "./video-flow";
import { isProductJob, useVideoJobs } from "./video-jobs-provider";
import { StatusGlyph } from "./video-player";
import { setVideosPanel, subscribeVideosPanel, videosPanelOpen, videosPanelProject } from "./videos-panel-store";

const TOAST_MS = 7000;
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

type Row = {
  key: string;
  productId: string;
  name: string;
  kind: "Product video" | "Project video";
  text: string;
  sub: string | null;
  tone: "error" | "neutral" | "success" | "warning" | "brand";
  icon: "check" | "cross" | "alert" | "lock" | "info" | "eye" | "spinner";
  progress: number | null;
  action: { label: string; run: () => void; quiet?: boolean } | null;
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

/** A buyer view: Preview as buyer / as a contributor, or Explore marketplace. */
function useBuyerView(): boolean {
  const pathname = usePathname();
  const search = useSearchParams();
  const view = search.get(VIEW_PARAM);
  const preview = view === BUYER_VIEW || (view === CONTRIBUTOR_VIEW && search.has(AS_PARAM));
  return preview || /^\/marketplace(\/|$)/.test(pathname ?? "");
}

function decode(raw: string, projectId: string): ProjectVideos | null {
  const { value } = parseStored(raw || null);
  return value === undefined ? null : sanitizeProjectVideos(value, projectId);
}

export function VideosDock() {
  const { jobs, hydrated, now, cancelRender } = useVideoJobs();
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  const guards = useGuards();
  const { store: held, hydrated: heldReady } = useHeld();
  const buyerView = useBuyerView();
  const notifyAll = useNotifyAll();
  const open = React.useSyncExternalStore(subscribeVideosPanel, videosPanelOpen, () => false);
  const focusProject = React.useSyncExternalStore(subscribeVideosPanel, videosPanelProject, () => null);

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
      const failedJobs = projectJobs.filter((j) => j.stage === "failed" && j.acknowledged !== true).length;
      const active = projectJobs.some((j) => j.stage !== "done" && j.stage !== "failed");
      if (!active && review === 0 && failedJobs === 0 && items.length === 0) return;
      const rows: Row[] = statuses.map(({ p, s }) => productRow(project, p, s, cancelRender));
      if (pv) rows.push(projectRow(project, pv, cancelRender));
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
      out.push({ project, rows, held: items, wait, rendering, review, failed: failedJobs, progress });
    });
    return out;
  }, [hydrated, raws, projects, jobs, now, builds, held, guards, cancelRender]);

  // ── moment toasts: a take ready to review, a failed render, a listing or post gone live ──
  const [toasts, setToasts] = React.useState<{ id: string; kind: "ready" | "failed" | "live"; title: string; at: number; job?: VideoJob; live?: HeldLive }[]>([]);
  const seenStage = React.useRef(new Map<string, VideoJob["stage"]>());
  const [mountedAt] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!hydrated) return;
    const fresh: typeof toasts = [];
    for (const j of jobs) {
      const before = seenStage.current.get(j.id);
      seenStage.current.set(j.id, j.stage);
      if (!isProductJob(j) || !before || before === j.stage) continue;
      if (j.stage === "done") fresh.push({ id: `ready:${j.id}`, kind: "ready", title: j.title || "Your video", at: Date.now(), job: j });
      else if (j.stage === "failed" && j.acknowledged !== true) fresh.push({ id: `failed:${j.id}`, kind: "failed", title: j.title || "Your video", at: Date.now(), job: j });
    }
    if (fresh.length === 0) return;
    // A job changing stage is the event this answers; the stage map is how it is seen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToasts((prev) => [...prev, ...fresh].slice(-3));
  }, [jobs, hydrated]);
  const liveKey = heldReady ? held.live.filter((l) => l.at >= mountedAt).map((l) => l.id).join(",") : "";
  const shownLive = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (!liveKey) return;
    const fresh = held.live.filter((l) => l.at >= mountedAt && !shownLive.current.has(l.id));
    if (fresh.length === 0) return;
    for (const l of fresh) shownLive.current.add(l.id);
    // A listing going live is the event this answers.
    setToasts((prev) =>
      [...prev, ...fresh.map((l) => ({ id: `live:${l.id}`, kind: "live" as const, title: l.projectName || "Your project", at: Date.now(), live: l }))].slice(-3),
    );
  }, [liveKey, held.live, mountedAt]);
  // Each toast hides itself.
  React.useEffect(() => {
    if (toasts.length === 0) return;
    const oldest = Math.min(...toasts.map((t) => t.at));
    const t = window.setTimeout(() => setToasts((prev) => prev.filter((x) => Date.now() - x.at < TOAST_MS)), Math.max(200, oldest + TOAST_MS - Date.now()));
    return () => window.clearTimeout(t);
  }, [toasts]);

  const [slot, setSlot] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    // The toast layer's "render" slot (app/layout.tsx) is in the DOM only after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlot(document.getElementById("ideeza-toast-layer-render"));
  }, []);

  // The panel jumps to the project it was opened for.
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open || !focusProject) return;
    panelRef.current?.querySelector<HTMLElement>(`[data-project="${CSS.escape(focusProject)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, focusProject]);
  // Escape closes it.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVideosPanel(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!slot || buyerView) return null;
  const rendering = groups.reduce((n, g) => n + g.rendering, 0);
  const review = groups.reduce((n, g) => n + g.review, 0);
  const failed = groups.reduce((n, g) => n + g.failed, 0);
  const waiting = groups.reduce((n, g) => n + g.held.length, 0);
  const progress = groups.flatMap((g) => g.progress);
  const visible = groups.length > 0;
  const shownToasts = open ? [] : toasts.slice(-1);
  if (!visible && shownToasts.length === 0) return null;

  const pct = progress.length ? progress.reduce((a, b) => a + b, 0) / progress.length : 100;
  const summary =
    [rendering ? `${rendering} rendering` : "", review ? `${review} to review` : "", failed ? `${failed} didn't finish` : "", !rendering && !review && !failed && waiting ? `${waiting} waiting` : ""]
      .filter(Boolean)
      .join(" · ") || "All set";

  return createPortal(
    <div className="flex flex-col items-end gap-[8px]">
      {open && visible && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Videos"
          className="ix-render-toast pointer-events-auto flex max-h-[min(640px,calc(100dvh-120px))] w-[440px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface shadow-3"
        >
          <div className="flex items-start gap-4 border-b border-solid border-border px-6 py-5">
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-md font-semibold text-text-primary">Videos</h2>
              <p className="m-0 text-sm text-text-secondary">They keep going while you work. Each one waits for your review before it&apos;s used.</p>
            </div>
            <CloseButton label="Close Videos" onClick={() => setVideosPanel(false)} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {groups.map((g) => (
              <section key={g.project.id} data-project={g.project.id} aria-label={g.project.name} className="flex flex-col gap-3 border-b border-solid border-border px-6 py-5 last:border-b-0">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="m-0 min-w-0 truncate text-sm font-semibold uppercase tracking-caps text-text-tertiary">{g.project.name}</h3>
                  <Link
                    href={g.held.length ? `/projects/${encodeURIComponent(g.project.id)}/earn/sell` : `/projects/${encodeURIComponent(g.project.id)}?tab=media`}
                    onClick={() => setVideosPanel(false)}
                    className="shrink-0 text-sm font-semibold text-text-link outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {g.held.length ? "Earn › Sell ›" : "Media ›"}
                  </Link>
                </div>
                <ul role="list" className="m-0 flex list-none flex-col gap-1 p-0">
                  {g.rows.map((r) => (
                    <PanelRow key={r.key} row={r} />
                  ))}
                </ul>
                {g.held.length > 0 && g.wait && (
                  <p className="m-0 rounded-lg bg-bg-warning-subtle px-4 py-3 text-sm text-text-primary">
                    <span className="font-semibold">Waiting for videos · </span>
                    {g.held.map(heldLabelOf).join(", ")} {g.held.length === 1 ? "goes" : "go"} live on {[...new Set(g.held.map((h) => heldWhereOf(h.kind)))].join(" and ")} when{" "}
                    {g.wait.total === 1 ? "the video is" : `all ${g.wait.total} videos are`} ready ({g.wait.ready} of {g.wait.total} now).
                  </p>
                )}
              </section>
            ))}
          </div>
          <div className="border-t border-solid border-border px-6 py-4">
            <button
              type="button"
              role="checkbox"
              aria-checked={notifyAll}
              onClick={() => writeNotifyAll(!notifyAll)}
              className={cn("flex min-h-[32px] items-center gap-[10px] rounded-md px-[4px] text-left text-sm font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus", TAP)}
            >
              <Checkbox checked={notifyAll} decorative />
              Notify me on this browser · for every video
            </button>
          </div>
        </div>
      )}

      {shownToasts.map((t) => (
        <MomentToast key={t.id} toast={t} onHide={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
      ))}

      {visible && (
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setVideosPanel(!open)}
          className="ix-render-toast pointer-events-auto flex h-[52px] items-center gap-4 rounded-full border border-solid border-[var(--color-border-brand)] bg-bg-surface py-2 pl-2 pr-6 text-left shadow-3 outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Ring pct={pct} label={review > 0 && rendering === 0 ? String(review) : `${Math.round(pct)}%`} />
          <span className="flex flex-col leading-tight">
            <span className="text-md font-semibold text-text-primary">Videos</span>
            <span className="text-sm text-text-secondary">{summary}</span>
          </span>
          {review > 0 && (
            <span className="ml-1 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-bg-brand px-1 text-xs font-bold text-text-on-brand" aria-label={`${review} to review`}>
              {review}
            </span>
          )}
        </button>
      )}
    </div>,
    slot,
  );
}

function productRow(project: ManualProject, p: ProjectProduct, s: ProductVideoStatus, cancel: (id: string) => void): Row {
  const copy = statusCopy(s);
  const name = displayProductName(p.name);
  let action: Row["action"] = null;
  if (s.state === "review") action = { label: "Review", run: () => go(() => openVideoFlow(project.id, p.id, { review: s.take.id })) };
  else if (s.state === "ready" && s.review) {
    const id = s.review.id;
    action = { label: "Review", run: () => go(() => openVideoFlow(project.id, p.id, { review: id })) };
  } else if (s.state === "none") action = { label: "Generate AI video", run: () => go(() => openVideoFlow(project.id, p.id)) };
  else if (s.state === "failed") {
    const id = s.take.id;
    action = { label: "Try again", run: () => go(() => openVideoFlow(project.id, p.id, { from: id })) };
  } else if (s.state === "rendering") {
    const id = s.take.id;
    action = { label: "Cancel", run: () => cancel(id), quiet: true };
  }
  return { key: p.id, productId: p.id, name, kind: "Product video", text: copy.text, sub: copy.sub, tone: copy.tone, icon: copy.icon, progress: copy.progress, action };
}

function projectRow(project: ManualProject, s: ProjectVideoStatus, cancel: (id: string) => void): Row {
  const copy = projectRowCopy(s);
  const label = projectActionLabel(copy.action);
  let action: Row["action"] = label ? { label, run: () => go(() => openProjectVideoDialog(project.id)) } : null;
  if (s.state === "rendering") {
    const v = s.video;
    const take = v.state === "rendering" ? v.take : v.state === "ready" && v.next ? v.next.take : null;
    if (take) action = { label: "Cancel", run: () => cancel(take.id), quiet: true };
  }
  return {
    key: PROJECT_VIDEO_KEY,
    productId: PROJECT_VIDEO_KEY,
    name: "Project video",
    kind: "Project video",
    text: copy.text,
    sub: copy.sub,
    tone: copy.tone,
    icon: copy.icon,
    progress: copy.progress,
    action,
  };
}

/** Opening a video's dialog closes the panel first. */
function go(open: () => void) {
  setVideosPanel(false);
  requestAnimationFrame(open);
}

function PanelRow({ row }: { row: Row }) {
  return (
    <li className="flex items-center gap-4 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-md font-semibold text-text-primary">
          {row.name}
          {row.kind === "Project video" ? null : <span className="ml-2 text-sm font-normal text-text-tertiary">Product video</span>}
        </span>
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          <StatusGlyph icon={row.icon} tone={row.tone} size={14} />
          <span className="min-w-0">{row.text}</span>
        </span>
        {row.progress !== null && <ProgressBar value={row.progress} label={`${row.name} video`} className="max-w-[220px]" />}
        {row.sub && <span className="text-sm text-text-tertiary">{row.sub}</span>}
      </div>
      {row.action && (
        <Button type="button" hierarchy={row.action.quiet ? "ghost" : "secondary"} size="md" className={cn("shrink-0", TAP)} onClick={row.action.run}>
          {row.action.label}
        </Button>
      )}
    </li>
  );
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <span aria-hidden className="relative inline-flex size-[36px] shrink-0 items-center justify-center">
      <svg width="36" height="36" viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-border-default)" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-border-brand)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, pct)) / 100)} />
      </svg>
      <span className="text-xs font-bold tabular-nums text-text-primary">{label}</span>
    </span>
  );
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus",
        TAP,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function MomentToast({
  toast,
  onHide,
}: {
  toast: { kind: "ready" | "failed" | "live"; title: string; job?: VideoJob; live?: HeldLive };
  onHide: () => void;
}) {
  const live = toast.kind === "live";
  const failed = toast.kind === "failed";
  const j = toast.job;
  const kicker = live
    ? `Now on ${heldWhereOf(toast.live!.kind)}`
    : failed
      ? "Video render failed"
      : "Video ready · review it";
  const title = live ? `${toast.title} is live` : toast.title;
  const action: { label: string; href: string } | { label: string; run: () => void } | null =
    live && toast.live
      ? {
          label: "View",
          href:
            toast.live.kind === "share"
              ? `/projects/${encodeURIComponent(toast.live.projectId)}`
              : `/projects/${encodeURIComponent(toast.live.projectId)}/earn/sell`,
        }
      : j && j.projectId && j.productId
        ? {
            label: failed ? "Try again" : "Review",
            run: () => {
              onHide();
              if (j.productId === PROJECT_VIDEO_KEY) openProjectVideoDialog(j.projectId!);
              else openVideoFlow(j.projectId!, j.productId!, failed ? { from: j.id } : { review: j.id });
            },
          }
        : null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "ix-render-toast pointer-events-auto flex w-[400px] max-w-[calc(100vw-32px)] items-center gap-[12px] rounded-2xl border border-solid bg-bg-surface px-[14px] py-[10px] shadow-3",
        failed ? "border-[var(--color-border-error)]" : live ? "border-[var(--color-border-brand)]" : "border-[var(--color-border-success)]",
      )}
    >
      <span className={cn("inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg", failed ? "bg-bg-error-subtle" : live ? "bg-bg-brand-subtle" : "bg-bg-success-subtle")}>
        <StatusGlyph icon={failed ? "alert" : "check"} tone={failed ? "error" : live ? "brand" : "success"} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm text-text-tertiary">{kicker}</p>
        <p className="m-0 truncate text-md font-semibold text-text-primary">{title}</p>
      </div>
      {action &&
        ("href" in action ? (
          <Link
            href={action.href}
            onClick={onHide}
            className="inline-flex h-[32px] shrink-0 items-center rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.run}
            className="inline-flex h-[32px] shrink-0 items-center rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {action.label}
          </button>
        ))}
      <CloseButton label={`Hide — ${title}`} onClick={onHide} />
    </div>
  );
}

"use client";

// VideoJobsProvider — the global video-render job store, and the worker that
// turns a product video's render into a real file (Phase 2 VIDEO P2-VIDEO-2,
// 3, 18).
//
// Lives at the root of the app so a render survives navigation: the ticker
// and the corner toasts keep running on every page. Jobs persist to
// localStorage, so a reload resumes them where they left off.
//
// Two kinds of job share the store:
// - A **product video** (Phase 2): `job.id` is the take id, and the job
//   carries `projectId`, `productId` and `render`. Its five stages run on the
//   demo timer as before; when it reaches the last one ("Encoding &
//   finalising"), this tab draws and encodes the clip (clip-renderer.ts),
//   stores it (clip-store.ts), marks the take ready (`finishTake`), and only
//   then sets `done`. Until the file is stored, progress holds at 99 %.
//   One tab encodes a take, under the Web Lock `ideeza-video:<takeId>`;
//   other tabs pick the result up through the storage event.
// - A **legacy** job (the v1 Brief's timer-only clip, `render` absent): one
//   stored before the Brief moved to per-product takes (T26) still ticks to
//   `done` and never makes a file; nothing starts one any more.
//   `migrateLegacyClip` (VideoUpkeep) converts a finished one into a real
//   Take 1.
//
// × on a toast acknowledges a job instead of deleting it (P2-VIDEO-3, D7).
// Terminal, acknowledged product-video jobs are pruned — the take keeps its
// own terminal state. A cancelled take is acknowledged the moment any tab
// sees it, so a cancel leaves no "failed" toast in this tab or another. On
// `ideeza:project-deleted`, the project's running jobs are cancelled and its
// clip files deleted (P2-VIDEO-18). Once a project is sold in full, a render
// that finishes keeps its take but never becomes the product's video.
//
// The demo speed multiplier (`DEMO_SPEED`, lib/video/jobs) turns the
// 20-minute budget into ~30 seconds; flip it to 1 for a real backend.

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  DEMO_SPEED,
  STAGE_BUDGETS_SEC,
  STAGE_ORDER,
  type VideoJob,
  type VideoJobStage,
} from "@/lib/video/jobs";
import { onProjectDeleted } from "@/lib/manual/events";
import { projectLockOf } from "@/lib/manual/edit-gate";
import { readMarketNow } from "@/lib/market/market-store";
import { readBriefDraft } from "@/lib/brief/project-brief";
import { useCreateHistory } from "@/lib/create/history";
import { buildsOf, productsOfProject } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { resolveProject } from "@/lib/manual/project-route";
import { useManualProjects, type ManualProject, type ProductSource } from "@/lib/manual/projects";
import { ClipStoreError, deleteClips, deleteProjectClips, putClip, verifyClips } from "@/lib/video/clip-store";
// A namespace, so `pv.useTake` — a reducer, not a hook — reads as one.
import * as pv from "@/lib/video/product-video";
import { readProjectVideos, writeProjectVideos } from "@/lib/video/store";
import type { OnScreenLines, ProductVideo, ProjectVideos, VideoFailureKind, VideoQuality } from "@/lib/video/types";
import { renderTitle } from "@/lib/video/video-copy";

export {
  STAGE_BUDGETS_SEC,
  STAGE_LABELS,
  STAGE_ORDER,
  TOTAL_RENDER_SECONDS,
  etaLabel,
  progressOf,
  type VideoJob,
  type VideoJobStage,
} from "@/lib/video/jobs";

/** What a Generate needs: which product, what to draw, and the take's inputs. */
export type ProductVideoSpec = {
  projectId: string;
  projectName: string;
  productId: string;
  /** Its display name ("Not named yet" for an unnamed product). */
  productName: string;
  prompt: string;
  lines: OnScreenLines;
  quality: VideoQuality;
  /** The build product whose image is drawn; null = no image. */
  source: ProductSource | null;
  /** The `/api/concept/image/<id>` reference, never a copy. */
  imageUrl: string | null;
};

export type StartResult = { ok: true; takeId: string; n: number } | { ok: false };
export type TakeWrite = { ok: boolean };

type Ctx = {
  jobs: VideoJob[];
  hydrated: boolean;
  /** The clock the progress maths reads: it moves every 500 ms while
   *  anything renders, so render stays pure (no Date.now() in a component). */
  now: number;
  setBrowserNotify: (id: string, enabled: boolean) => void;
  acknowledge: (id: string) => void;
  /** Drops a legacy job (it has no take to fail). */
  dismiss: (id: string) => void;
  // ── Phase 2: product videos ──
  startProductVideo: (spec: ProductVideoSpec) => StartResult;
  /** Fails the take with `cancelled`; no clip is kept. */
  cancelRender: (takeId: string) => void;
  /** Makes a ready take the product's video (P2-VIDEO-8). */
  pickTake: (projectId: string, productId: string, takeId: string) => TakeWrite;
  /** Removes a take that isn't in use, and its file. */
  deleteTake: (projectId: string, productId: string, takeId: string) => TakeWrite;
  saveDraft: (projectId: string, productId: string, draft: NonNullable<ProductVideo["draft"]>) => TakeWrite;
};

const VideoJobsContext = React.createContext<Ctx | null>(null);

const STORAGE_KEY = "ideeza:videoJobs";
const TICK_MS = 500;

const terminal = (j: VideoJob) => j.stage === "done" || j.stage === "failed";
/** A Phase 2 product-video job (the legacy Brief job has no `render`). */
export const isProductJob = (j: VideoJob) => !!j.render && !!j.projectId && !!j.productId;
const prunable = (j: VideoJob) => isProductJob(j) && terminal(j) && j.acknowledged === true;

function loadJobs(): VideoJob[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as VideoJob[]).filter((j) => j && typeof j.id === "string");
  } catch {
    return [];
  }
}

const rank = (j: VideoJob) => (terminal(j) ? STAGE_ORDER.length + 1 : STAGE_ORDER.indexOf(j.stage));

/** Another tab's list folded into ours: each job keeps whichever copy is
 *  further along, and an acknowledgement in either tab holds. A finished job
 *  the other tab no longer lists was pruned there (acknowledged, cancelled or
 *  dismissed), so it goes here too — kept, this tab would write it back. */
function mergeJobs(local: VideoJob[], stored: VideoJob[]): VideoJob[] {
  const listed = new Set(stored.map((s) => s.id));
  const byId = new Map<string, VideoJob>();
  for (const j of local) if (!terminal(j) || listed.has(j.id)) byId.set(j.id, j);
  for (const s of stored) {
    const l = byId.get(s.id);
    if (!l) {
      byId.set(s.id, s);
      continue;
    }
    const pick = rank(s) > rank(l) ? s : l;
    const acknowledged = l.acknowledged === true || s.acknowledged === true;
    byId.set(s.id, (pick.acknowledged === true) === acknowledged ? pick : { ...pick, acknowledged });
  }
  return [...byId.values()]
    .filter((j) => !prunable(j))
    .sort((a, b) => a.startedAt - b.startedAt || (a.id < b.id ? -1 : 1));
}

function newTakeId(): string {
  let s = "";
  while (s.length < 8) s += Math.floor(Math.random() * 36).toString(36);
  return `take_${s}`;
}

/** Applies `fn` to one product's record, read fresh, and writes it back.
 *  `fn` returning null (or the same object) writes nothing. */
function writeProduct(
  projectId: string,
  productId: string,
  fn: (v: ProductVideo | undefined) => ProductVideo | null,
): { ok: boolean; after: ProductVideo | null } {
  const record: ProjectVideos = readProjectVideos(projectId) ?? { version: 1, projectId, products: {} };
  const before = record.products[productId];
  const after = fn(before);
  if (!after) return { ok: false, after: null };
  if (after === before) return { ok: true, after };
  const ok = writeProjectVideos(projectId, { ...record, products: { ...record.products, [productId]: after } }).ok;
  return { ok, after };
}

/** A take cancelled by its maker: its job ends acknowledged, with no toast. */
const cancelled = (take: { failure?: { kind: string } } | undefined) => take?.failure?.kind === "cancelled";

function takeOf(j: VideoJob) {
  if (!j.projectId || !j.productId) return undefined;
  return readProjectVideos(j.projectId)?.products[j.productId]?.takes.find((t) => t.id === j.id);
}

function notifyReady(j: VideoJob) {
  if (!j.browserNotify || typeof window === "undefined" || !("Notification" in window) || !document.hidden) return;
  try {
    new Notification("Your IDEEZA video is ready", {
      body: j.title ? `${j.title} — tap to review.` : "Tap to review.",
    });
  } catch {}
}

export function VideoJobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = React.useState<VideoJob[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [now, setNow] = React.useState(0);
  // Takes this tab is encoding right now, and how to stop each one.
  const encoding = React.useRef(new Map<string, AbortController>());
  // The latest list, for handlers that must not re-subscribe on every tick.
  const jobsRef = React.useRef(jobs);
  React.useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);
  // The projects, for the lock an encode that ends seconds later reads.
  const { projects } = useManualProjects();
  const projectsRef = React.useRef(projects);
  React.useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Hydrate from localStorage after mount.
  React.useEffect(() => {
    // Reading localStorage in the state initialiser would render different
    // markup on the server and the client — so the store hydrates here, once,
    // after mount, on purpose.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJobs(loadJobs().filter((j) => !prunable(j)));
    setNow(Date.now());
    setHydrated(true);
  }, []);

  // Persist whenever jobs change — only when the text differs, so two tabs
  // folding each other's writes in settle instead of echoing.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      const next = JSON.stringify(jobs);
      if (window.localStorage.getItem(STORAGE_KEY) !== next) window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, [jobs, hydrated]);

  // Another tab's jobs: a render it started, or one it finished or cancelled.
  React.useEffect(() => {
    if (!hydrated) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      // A take cancelled in the other tab is gone from its list: keeping this
      // tab's copy would write it back, and the two tabs would pass it to and fro.
      setJobs((prev) => mergeJobs(prev, loadJobs()).filter((j) => !(isProductJob(j) && cancelled(takeOf(j)))));
      setNow(Date.now());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated]);

  // Single global ticker advances every active job. Stays mounted while at
  // least one job is active; bails when every job is done/failed.
  const hasActive = jobs.some((j) => !terminal(j));
  React.useEffect(() => {
    if (!hydrated || !hasActive) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setJobs((prev) => {
        let mutated = false;
        const next = prev.map((j) => {
          if (terminal(j)) return j;
          if (isProductJob(j)) {
            // The take is the truth: another tab (or this one) may already
            // have finished, failed or cancelled it, or it may be gone.
            const take = takeOf(j);
            if (!take) {
              mutated = true;
              return { ...j, stage: "failed" as VideoJobStage, acknowledged: true };
            }
            if (take.failure) {
              mutated = true;
              return { ...j, stage: "failed" as VideoJobStage, ...(cancelled(take) ? { acknowledged: true } : null) };
            }
            if (take.readyAt) {
              mutated = true;
              notifyReady(j);
              return { ...j, stage: "done" as VideoJobStage };
            }
          }
          const stageBudget = STAGE_BUDGETS_SEC[j.stage as Exclude<VideoJobStage, "done" | "failed">];
          const stageElapsedSec = ((t - j.stageStartedAt) / 1000) * DEMO_SPEED;
          if (stageElapsedSec < stageBudget) return j;
          const idx = STAGE_ORDER.indexOf(j.stage);
          const nextStage = STAGE_ORDER[idx + 1] as VideoJobStage | undefined;
          if (nextStage) {
            mutated = true;
            return { ...j, stage: nextStage, stageStartedAt: t };
          }
          // A product video is done only once its file is stored: it holds
          // at 99 % on "Encoding & finalising" until then.
          if (isProductJob(j)) return j;
          // Final stage just finished — mark done. Fire a browser notification
          // if the user opted in and the tab is hidden.
          mutated = true;
          notifyReady(j);
          return { ...j, stage: "done" as VideoJobStage };
        });
        // Always return a new array so progress-derived components re-render
        // even when no stage flipped — the elapsed-time tick is what drives
        // the progress bar between flips.
        return mutated ? next.filter((j) => !prunable(j)) : [...prev];
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [hydrated, hasActive]);

  // ── the encoder: one run per take at its last stage, in this tab ──
  const settle = React.useCallback((id: string, stage: "done" | "failed", extra?: Partial<VideoJob>) => {
    setJobs((prev) =>
      prev
        .map((j) => {
          if (j.id !== id) return j;
          const next = { ...j, stage: stage as VideoJobStage, ...extra };
          if (stage === "done" && j.stage !== "done") notifyReady(next);
          return next;
        })
        .filter((j) => !prunable(j)),
    );
    setNow(Date.now());
  }, []);

  const encode = React.useCallback(
    (job: VideoJob) => {
      const id = job.id;
      const projectId = job.projectId!;
      const productId = job.productId!;
      const render = job.render!;
      const ac = new AbortController();
      encoding.current.set(id, ac);

      const fail = (kind: VideoFailureKind) => {
        writeProduct(projectId, productId, (v) =>
          v && v.takes.some((t) => t.id === id) ? pv.failTake(v, id, kind, Date.now()) : null,
        );
        settle(id, "failed");
      };

      const run = async () => {
        const take = takeOf(job);
        if (!take) return settle(id, "failed", { acknowledged: true });
        if (take.failure) return settle(id, "failed", cancelled(take) ? { acknowledged: true } : undefined);
        if (take.readyAt) return settle(id, "done");

        // Loaded on first use: the muxer stays out of every page's bundle.
        const { ClipRenderError, renderClip } = await import("./clip-renderer");
        let clip;
        try {
          clip = await renderClip(
            { lines: render.lines, imageUrl: render.imageUrl, productName: render.productName, quality: job.quality },
            { signal: ac.signal },
          );
        } catch (e) {
          if (ac.signal.aborted) return;
          const kind = e instanceof ClipRenderError ? e.kind : "encode";
          if (kind === "cancelled") return;
          return fail(kind);
        }
        if (ac.signal.aborted) return;
        try {
          await putClip({
            takeId: id,
            projectId,
            productId,
            video: clip.video,
            poster: clip.poster,
            mime: clip.mime,
            width: clip.width,
            height: clip.height,
            durationMs: clip.durationMs,
            createdAt: Date.now(),
            usedImage: clip.usedImage,
          });
        } catch (e) {
          if (ac.signal.aborted) return;
          return fail(e instanceof ClipStoreError && e.kind === "failed" ? "encode" : "storage");
        }
        // The project may have been deleted, or the take cancelled or
        // evicted, while the file was written: then the file goes too, and
        // nothing re-creates the swept record.
        const still = readProjectVideos(projectId)?.products[productId]?.takes.find((t) => t.id === id);
        if (ac.signal.aborted || !still || still.failure) {
          void deleteClips([id]).catch(() => undefined);
          return;
        }
        const meta = {
          mime: clip.mime,
          width: clip.width,
          height: clip.height,
          durationMs: clip.durationMs,
          bytes: clip.video.size,
        };
        // Sold in full (read from the sales as they are now: another tab may
        // have just sold the rest), the buyer's product keeps the video it was sold with.
        const owner = projectsRef.current.find((p) => p.id === projectId);
        const locked = !!owner && projectLockOf(owner, readMarketNow().sales) !== null;
        const wrote = writeProduct(projectId, productId, (v) => {
          if (!v) return null;
          const next = pv.finishTake(v, id, meta, Date.now());
          return locked ? { ...next, inUseId: v.inUseId } : next;
        });
        if (!wrote.ok) {
          void deleteClips([id]).catch(() => undefined);
          return fail("storage");
        }
        settle(id, "done");
      };

      const finish = () => {
        if (encoding.current.get(id) === ac) encoding.current.delete(id);
      };
      const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
      const guarded = locks?.request
        ? locks.request(`ideeza-video:${id}`, { ifAvailable: true }, async (lock) => {
            // Another tab holds it: that tab encodes, and its write reaches
            // this one through the storage event.
            if (lock) await run();
          })
        : run();
      Promise.resolve(guarded)
        .catch(() => {
          if (!ac.signal.aborted) fail("encode");
        })
        .finally(finish);
    },
    [settle],
  );

  // Start an encode for every product video at its last stage that no run in
  // this tab owns — which also resumes one a reload interrupted.
  React.useEffect(() => {
    if (!hydrated) return;
    for (const j of jobs) {
      if (isProductJob(j) && j.stage === "encoding" && !encoding.current.has(j.id)) encode(j);
    }
  }, [jobs, hydrated, encode]);

  // Deleting a project cancels its renders and drops its clip files (P2-VIDEO-18).
  React.useEffect(
    () =>
      onProjectDeleted((projectId) => {
        for (const [id, ac] of encoding.current) {
          if (jobsRef.current.some((j) => j.id === id && j.projectId === projectId)) {
            ac.abort();
            encoding.current.delete(id);
          }
        }
        setJobs((prev) => prev.filter((j) => j.projectId !== projectId));
        void deleteProjectClips(projectId).catch(() => undefined);
      }),
    [],
  );
  const setBrowserNotify = React.useCallback((id: string, enabled: boolean) => {
    if (enabled && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") Notification.requestPermission().catch(() => undefined);
    }
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, browserNotify: enabled } : j)));
  }, []);

  const acknowledge = React.useCallback((id: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, acknowledged: true } : j)).filter((j) => !prunable(j)));
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const startProductVideo = React.useCallback((spec: ProductVideoSpec): StartResult => {
    const id = newTakeId();
    const t = Date.now();
    let evicted: string[] = [];
    let n = 0;
    const wrote = writeProduct(spec.projectId, spec.productId, (v) => {
      const res = pv.startTake(
        v,
        { productId: spec.productId, prompt: spec.prompt, lines: spec.lines, quality: spec.quality, source: spec.source },
        t,
        id,
      );
      evicted = res.evicted;
      n = res.video.takes.find((x) => x.id === id)?.n ?? 1;
      return res.video;
    });
    if (!wrote.ok) return { ok: false };
    const gone = new Set(evicted);
    if (gone.size) {
      for (const e of gone) {
        encoding.current.get(e)?.abort();
        encoding.current.delete(e);
      }
      void deleteClips([...gone]).catch(() => undefined);
    }
    setJobs((prev) => [
      ...prev.filter((j) => !gone.has(j.id)),
      {
        id,
        title: renderTitle(spec.productName, spec.projectName),
        prompt: spec.prompt,
        quality: spec.quality,
        stage: "queued",
        startedAt: t,
        stageStartedAt: t,
        emailReminder: null,
        browserNotify: false,
        acknowledged: false,
        minted: false,
        projectId: spec.projectId,
        productId: spec.productId,
        render: { lines: spec.lines, imageUrl: spec.imageUrl, productName: spec.productName },
      },
    ]);
    setNow(t);
    return { ok: true, takeId: id, n };
  }, []);

  const cancelRender = React.useCallback((id: string) => {
    const job = jobsRef.current.find((j) => j.id === id);
    encoding.current.get(id)?.abort();
    encoding.current.delete(id);
    if (job?.projectId && job.productId) {
      writeProduct(job.projectId, job.productId, (v) => {
        const take = v?.takes.find((t) => t.id === id);
        return v && take && !take.readyAt && !take.failure ? pv.failTake(v, id, "cancelled", Date.now()) : null;
      });
    }
    void deleteClips([id]).catch(() => undefined);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setNow(Date.now());
  }, []);

  const pickTake = React.useCallback((projectId: string, productId: string, id: string): TakeWrite => {
    const res = writeProduct(projectId, productId, (v) => (v ? pv.useTake(v, id) : null));
    return { ok: res.ok && res.after?.inUseId === id };
  }, []);

  const deleteTake = React.useCallback((projectId: string, productId: string, id: string): TakeWrite => {
    const res = writeProduct(projectId, productId, (v) => (v ? pv.deleteTake(v, id) : null));
    const removed = res.ok && !!res.after && !res.after.takes.some((t) => t.id === id);
    if (removed) {
      encoding.current.get(id)?.abort();
      encoding.current.delete(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      void deleteClips([id]).catch(() => undefined);
    }
    return { ok: removed };
  }, []);

  const saveDraft = React.useCallback(
    (projectId: string, productId: string, draft: NonNullable<ProductVideo["draft"]>): TakeWrite =>
      writeProduct(projectId, productId, (v) => ({ ...(v ?? { takes: [], inUseId: null }), draft })),
    [],
  );

  const value: Ctx = React.useMemo(
    () => ({
      jobs,
      hydrated,
      now,
      setBrowserNotify,
      acknowledge,
      dismiss,
      startProductVideo,
      cancelRender,
      pickTake,
      deleteTake,
      saveDraft,
    }),
    [
      jobs,
      hydrated,
      now,
      setBrowserNotify,
      acknowledge,
      dismiss,
      startProductVideo,
      cancelRender,
      pickTake,
      deleteTake,
      saveDraft,
    ],
  );

  return <VideoJobsContext.Provider value={value}>{children}</VideoJobsContext.Provider>;
}

export function useVideoJobs(): Ctx {
  const ctx = React.useContext(VideoJobsContext);
  if (!ctx) throw new Error("useVideoJobs must be used inside <VideoJobsProvider>");
  return ctx;
}

// ─────────────────────────── upkeep: verify and migrate ───────────────────────────

/** The project an address is about: `/projects/<id|slug>[/…]` or the
 *  editor flow's `/project/<slug>/<step>` (the Brief among them). */
function projectForPath(pathname: string | null, projects: ManualProject[]): ManualProject | null {
  if (!pathname) return null;
  const m = /^\/projects?\/([^/?#]+)/.exec(pathname);
  if (!m) return null;
  let seg = m[1];
  try {
    seg = decodeURIComponent(seg);
  } catch {
    // A malformed escape: match it as written.
  }
  return resolveProject(projects, seg) ?? null;
}

/**
 * P2-VIDEO-19 and P2-VIDEO-5, run whenever a page about one project loads —
 * its page, a product page, the Brief:
 * - `verifyClips`: a ready take whose file is gone from this browser turns
 *   `lost`, so the gate and every status stay honest;
 * - on the project's first read (no video record yet), the Brief's old
 *   single clip becomes Take 1 of the headline product, with a real render
 *   queued — the old job never had a file.
 * Renders nothing. Mounted by GlobalRenderIndicator, inside the history
 * provider it needs for the headline product's image.
 */
export function VideoUpkeep() {
  const pathname = usePathname();
  const { hydrated, projects } = useManualProjects();
  const { hydrated: historyHydrated, builds } = useCreateHistory();
  const { hydrated: jobsHydrated, jobs, startProductVideo } = useVideoJobs();
  const project = hydrated ? projectForPath(pathname, projects) : null;
  const projectId = project?.id ?? null;
  const tried = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (!projectId) return;
    void verifyClips(projectId).catch(() => undefined);
  }, [projectId, pathname]);

  // Only a legacy job finishing can change what the migration decides.
  const legacyDone = jobs
    .filter((j) => !isProductJob(j) && j.stage === "done")
    .map((j) => j.id)
    .join(",");
  const jobsNow = React.useRef(jobs);
  React.useEffect(() => {
    jobsNow.current = jobs;
  }, [jobs]);
  React.useEffect(() => {
    if (!project || !historyHydrated || !jobsHydrated) return;
    if (tried.current.has(project.id) || readProjectVideos(project.id) !== null) return;
    const move = pv.migrateLegacyClip(project, readBriefDraft(project.id), jobsNow.current, Date.now());
    if (!move) return;
    tried.current.add(project.id);
    const product = productsOfProject(project, buildsOf(project, builds)).find((x) => x.id === move.productId);
    startProductVideo({
      ...move.input,
      projectId: project.id,
      projectName: project.name,
      productName: displayProductName(product?.name ?? ""),
      imageUrl: product?.built?.product.conceptImageUrl || null,
    });
  }, [project, historyHydrated, jobsHydrated, builds, legacyDone, startProductVideo]);

  return null;
}

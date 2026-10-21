"use client";

// The Project video dialog (owner, 2026-10-21; docs/superpowers/specs/2026-10-21-project-video-design.md,
// D1, D6–D8). It makes the one video for the whole project from its products' in-use videos.
// Opened from the project row's Make / Update / Try again (the readiness dialog, ← Back to it),
// from the Media tab's Regenerate, and from anywhere through `openProjectVideoDialog`.
//
// - A timeline: Intro, each current product's cut, Outro, each as long as it plays, and the total.
// - The scenes in order: the intro's title and line, each product's chapter label with ↑ ↓ (focus
//   follows the moved product), and the outro's line, each at most 60 characters. Products can't
//   be left out (D7).
// - Quality as in Generate video (720p with the Disruptor plan), an optional sound, and the
//   honesty line: it is made in this browser and silent for now.
// - What the maker sets is kept as the project video's draft (400 ms after the last edit), laid
//   over each visit's fresh takes and lengths (`mergeJoinDraft`).
// - Generate project video starts the render and closes; the row shows its progress. Opened while
//   a render runs it shows that render; opened before every product has its video it says so.

import * as React from "react";
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, IconButton, ModalFrame, ProgressBar, TextInput } from "@/components/ideeza";
import { useCreateHistory } from "@/lib/create/history";
import { useCreatePlan } from "@/lib/create/plan";
import { buildsOf, productsOfProject, type ProjectProduct } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { currentProductsOf } from "@/lib/manual/readiness";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";
import { etaLabel, progressOf } from "@/lib/video/jobs";
import {
  INTRO_MS,
  OUTRO_MS,
  cutMs,
  defaultJoinPlan,
  joinLengthMs,
  mergeJoinDraft,
  projectVideoStatusOf,
} from "@/lib/video/project-video";
import { useProjectVideos } from "@/lib/video/store";
import { PROJECT_VIDEO_KEY, qualityOpen, type JoinPlan, type OnScreenLines, type VideoQuality } from "@/lib/video/types";
import {
  LINE_MAX,
  PROJECT_HONESTY,
  PROJECT_VIDEO_TITLE,
  RENDER_KEEPS_RUNNING,
  projectRowCopy,
  stageLine,
} from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { QualityField } from "./generate-video-dialog";
import { VideoThumb } from "./project-video-row";
import { useVideoJobs } from "./video-jobs-provider";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
/** ↑ ↓: the secondary icon button's border drawn, greyed at either end, a touch target on touch. */
const MOVE =
  "border-solid disabled:text-text-disabled disabled:hover:bg-transparent max-md:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]";
/** The cards' fill (intro, outro) and the products' fills, in turn; white text clears 4.5:1 on each. */
const CARD_FILL = "bg-violet-900";
const CUT_FILLS = [
  "bg-[var(--color-blue-700)]",
  "bg-[var(--color-yellow-700)]",
  "bg-[var(--color-green-700)]",
  "bg-[var(--color-red-700)]",
  "bg-[var(--color-orange-700)]",
];

/** "5 s", "7.5 s". */
function secs(ms: number): string {
  return `${Math.round(ms / 100) / 10} s`;
}

export function projectVideoDescription(projectName: string, productCount: number): string {
  return `${projectName} · made from your ${productCount === 1 ? "product video" : `${productCount} product videos`}`;
}

export type ProjectVideoDialogProps = {
  open: boolean;
  project: Pick<ManualProject, "id" | "name" | "description">;
  /** Every product (dropped included); the current ones are cut, in this order. */
  products: ProjectProduct[];
  onClose: () => void;
  /** Opened from the readiness dialog: "← Back" returns there. */
  back?: { label: string; onBack: () => void };
};

export function ProjectVideoDialog(props: ProjectVideoDialogProps) {
  // Mounted only while open, so each visit starts from the project's current videos.
  if (!props.open) return null;
  return <ProjectVideoDialogOpen {...props} />;
}

function ProjectVideoDialogOpen({ project, products, onClose, back }: ProjectVideoDialogProps) {
  const { record, hydrated } = useProjectVideos(project.id);
  const { jobs, now, hydrated: jobsHydrated, startProjectVideo, saveDraft, cancelRender } = useVideoJobs();
  const { sub } = useCreatePlan();
  const current = React.useMemo(() => currentProductsOf(products), [products]);
  const ready = hydrated && jobsHydrated;
  const status = projectVideoStatusOf({ products, videos: record, jobs, now });

  // The fresh plan (the products' in-use takes, in order) under what the maker has set.
  const fresh = React.useMemo(
    () =>
      defaultJoinPlan({
        projectName: project.name,
        description: project.description,
        products: current.map((p) => ({ id: p.id, name: displayProductName(p.name) })),
        videos: record,
        jobs,
        now,
      }),
    [project.name, project.description, current, record, jobs, now],
  );
  const [edit, setEdit] = React.useState<JoinPlan | undefined>(undefined);
  const [quality, setQuality] = React.useState<VideoQuality>("low");
  const [sound, setSound] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  // The saved draft, read once the store is: the visit starts from it.
  const [started, setStarted] = React.useState(false);
  if (ready && !started) {
    const saved = record?.products[PROJECT_VIDEO_KEY]?.draft;
    setStarted(true);
    setEdit(saved?.join);
    setQuality(saved?.quality ?? "low");
    setSound(saved?.audioPrompt ?? "");
  }
  const plan = fresh ? mergeJoinDraft(edit, fresh) : null;

  // Kept as the draft 400 ms after the last edit (Generate video's debounce).
  const edited = React.useRef(false);
  const latest = React.useRef({ plan, quality, sound });
  React.useEffect(() => {
    latest.current = { plan, quality, sound };
  });
  const draftOf = React.useCallback(() => {
    const { plan: p, quality: q, sound: s } = latest.current;
    return p ? { prompt: "", lines: [p.intro[0], p.intro[1], p.outro] as OnScreenLines, quality: q, audioPrompt: s, join: p } : null;
  }, []);
  React.useEffect(() => {
    if (!edited.current) return;
    const t = window.setTimeout(() => {
      const d = draftOf();
      if (d) saveDraft(project.id, PROJECT_VIDEO_KEY, d);
    }, 400);
    return () => window.clearTimeout(t);
  }, [edit, quality, sound, draftOf, saveDraft, project.id]);
  const change = (next: JoinPlan) => {
    edited.current = true;
    setError(null);
    setEdit(next);
  };

  // Focus follows a moved product: its same arrow, or the other one at either end.
  const moveRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const [moved, setMoved] = React.useState<{ id: string; dir: -1 | 1; n: number } | null>(null);
  React.useEffect(() => {
    if (!moved) return;
    const same = moveRefs.current.get(`${moved.id}:${moved.dir}`);
    const other = moveRefs.current.get(`${moved.id}:${-moved.dir}`);
    (same && !same.disabled ? same : other)?.focus();
  }, [moved]);
  const keepMoveRef = (key: string, el: HTMLButtonElement | null) => {
    if (el) moveRefs.current.set(key, el);
    else moveRefs.current.delete(key);
  };
  const move = (i: number, dir: -1 | 1) => {
    if (!plan) return;
    const j = i + dir;
    if (j < 0 || j >= plan.cuts.length) return;
    const cuts = [...plan.cuts];
    [cuts[i], cuts[j]] = [cuts[j], cuts[i]];
    change({ ...plan, cuts });
    setMoved((m) => ({ id: cuts[j].productId, dir, n: (m?.n ?? 0) + 1 }));
  };

  const primaryRef = React.useRef<HTMLButtonElement>(null);
  const generate = () => {
    if (!plan) return;
    const d = draftOf();
    if (d) saveDraft(project.id, PROJECT_VIDEO_KEY, { ...d, join: plan });
    const res = startProjectVideo({
      projectId: project.id,
      projectName: project.name,
      plan,
      quality: qualityOpen(quality, sub.tier) ? quality : "low",
      audioPrompt: sound.trim(),
    });
    if (!res.ok) {
      setError(WRITE_ERROR_MESSAGE);
      return;
    }
    onClose();
  };

  // A render already running: its progress, the way Generate video opens on one.
  const v = status.video;
  const renderingTake = v.state === "rendering" ? v.take : v.state === "ready" && v.next ? v.next.take : null;
  const renderingJob = renderingTake ? jobs.find((j) => j.id === renderingTake.id) : undefined;

  let body: React.ReactNode;
  let footer: React.ReactNode;
  if (!ready) {
    body = <div aria-busy="true" className="h-[240px] rounded-lg bg-bg-subtle motion-safe:animate-pulse" />;
    footer = null;
  } else if (status.state === "rendering" && renderingTake && renderingJob) {
    const { total, etaSec } = progressOf(renderingJob, now);
    body = (
      <div className="flex flex-col gap-6">
        <h3 className="text-md font-semibold text-text-primary">{stageLine(renderingTake.n, renderingJob.stage)}</h3>
        <ProgressBar value={total} label={`${project.name} project video`} />
        <p className="text-sm text-text-secondary">{etaLabel(etaSec)} left</p>
        <p className="text-sm text-text-secondary">{RENDER_KEEPS_RUNNING}</p>
        <p className="text-sm text-text-tertiary">{PROJECT_HONESTY}</p>
      </div>
    );
    footer = (
      <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
        <Button type="button" hierarchy="ghost" size="lg" className={TAP} onClick={() => cancelRender(renderingTake.id)}>
          Cancel render
        </Button>
        <Button ref={primaryRef} type="button" hierarchy="primary" size="lg" className={TAP} onClick={onClose}>
          Close
        </Button>
      </div>
    );
  } else if (!plan) {
    // Not every product has its video yet: why, and nothing to press but Close.
    body = <Banner tone="info">{projectRowCopy(status).text}</Banner>;
    footer = (
      <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
        <Button ref={primaryRef} type="button" hierarchy="primary" size="lg" className={TAP} onClick={onClose}>
          Close
        </Button>
      </div>
    );
  } else {
    const total = joinLengthMs(plan);
    const nameOf = new Map(current.map((p) => [p.id, displayProductName(p.name)]));
    const imageOf = new Map(current.map((p) => [p.id, p.built?.product.conceptImageUrl || null]));
    const setIntro = (i: 0 | 1, text: string) => {
      const intro: [string, string] = [plan.intro[0], plan.intro[1]];
      intro[i] = text.slice(0, LINE_MAX);
      change({ ...plan, intro });
    };
    body = (
      <div className="flex flex-col gap-8 [container-type:inline-size]">
        <Timeline plan={plan} nameOf={nameOf} total={total} each={cutMs(plan.cuts.length)} />

        <ol aria-label="Scenes" className="m-0 flex list-none flex-col gap-4 p-0">
          <Scene thumb={<CardThumb label="Intro" />} title="Intro" span={secs(INTRO_MS)}>
            <TextInput aria-label="Intro title" maxLength={LINE_MAX} value={plan.intro[0]} onValueChange={(t) => setIntro(0, t)} />
            <TextInput aria-label="Intro line" maxLength={LINE_MAX} value={plan.intro[1]} onValueChange={(t) => setIntro(1, t)} />
          </Scene>
          {plan.cuts.map((c, i) => {
            const name = nameOf.get(c.productId) ?? c.label;
            // One product has nothing to swap with: no arrows at all (D3: it's one click).
            const moves =
              plan.cuts.length > 1 ? (
                <span className="flex gap-2">
                  <IconButton
                    ref={(el) => keepMoveRef(`${c.productId}:-1`, el)}
                    hierarchy="secondary"
                    size="md"
                    icon={<Icon icon={ArrowUp01Icon} size={18} />}
                    aria-label={`Move ${name} earlier`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className={MOVE}
                  />
                  <IconButton
                    ref={(el) => keepMoveRef(`${c.productId}:1`, el)}
                    hierarchy="secondary"
                    size="md"
                    icon={<Icon icon={ArrowDown01Icon} size={18} />}
                    aria-label={`Move ${name} later`}
                    disabled={i === plan.cuts.length - 1}
                    onClick={() => move(i, 1)}
                    className={MOVE}
                  />
                </span>
              ) : undefined;
            return (
              <Scene
                key={c.productId}
                thumb={
                  <span aria-hidden className="relative block size-[40px] overflow-hidden rounded-lg bg-bg-surface-raised">
                    <VideoThumb takeId={c.takeId} image={imageOf.get(c.productId) ?? null} />
                  </span>
                }
                title={name}
                span={`${secs(c.ms)} from its video`}
                actions={moves}
              >
                <TextInput
                  aria-label={`${name} line`}
                  maxLength={LINE_MAX}
                  value={c.label}
                  onValueChange={(t) =>
                    change({ ...plan, cuts: plan.cuts.map((x, j) => (j === i ? { ...x, label: t.slice(0, LINE_MAX) } : x)) })
                  }
                />
              </Scene>
            );
          })}
          <Scene thumb={<CardThumb label="Outro" />} title="Outro" span={secs(OUTRO_MS)}>
            <TextInput
              aria-label="Outro line"
              maxLength={LINE_MAX}
              value={plan.outro}
              onValueChange={(t) => change({ ...plan, outro: t.slice(0, LINE_MAX) })}
            />
          </Scene>
        </ol>

        <QualityField
          value={quality}
          seconds={Math.round(total / 1000)}
          onChange={(q) => {
            edited.current = true;
            setQuality(q);
          }}
        />

        <SoundField
          value={sound}
          onChange={(s) => {
            edited.current = true;
            setSound(s);
          }}
        />

        <p className="text-sm leading-relaxed text-text-tertiary">{PROJECT_HONESTY}</p>
      </div>
    );
    footer = (
      <div className="ml-auto flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button ref={primaryRef} type="button" hierarchy="primary" size="lg" className={TAP} onClick={generate}>
            Generate project video
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-text-error">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="md"
      title={PROJECT_VIDEO_TITLE}
      description={projectVideoDescription(project.name, current.length)}
      initialFocus={primaryRef}
      footer={footer}
    >
      {back && (
        <button
          type="button"
          onClick={back.onBack}
          aria-label={back.label}
          className={cn(
            "-ml-2 mb-6 inline-flex min-h-[32px] items-center gap-2 rounded-md px-2 text-sm font-semibold text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus",
            TAP,
          )}
        >
          <Icon icon={ArrowLeft01Icon} size={16} />
          Back
        </button>
      )}
      {body}
    </ModalFrame>
  );
}

/** The scenes as a proportional strip: Intro, each product, Outro, each with its length. */
function Timeline({ plan, nameOf, total, each }: { plan: JoinPlan; nameOf: Map<string, string>; total: number; each: number }) {
  const segments = [
    { key: "intro", name: "Intro", ms: INTRO_MS, fill: CARD_FILL },
    ...plan.cuts.map((c, i) => ({ key: c.productId, name: nameOf.get(c.productId) ?? c.label, ms: c.ms, fill: CUT_FILLS[i % CUT_FILLS.length] })),
    { key: "outro", name: "Outro", ms: OUTRO_MS, fill: CARD_FILL },
  ];
  const said = `${segments.map((s) => `${s.name} ${secs(s.ms)}`).join(", ")}. ${secs(total)} in all.`;
  return (
    <div className="flex flex-col gap-2">
      <div role="img" aria-label={said} className="flex h-[48px] overflow-hidden rounded-lg">
        {segments.map((s) => (
          <div
            key={s.key}
            // The share of the strip is the scene's length: data, not style.
            style={{ flexGrow: s.ms, flexBasis: 0 }}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center border-r border-solid border-[color-mix(in_srgb,var(--color-text-on-brand)_30%,transparent)] px-2 text-text-on-brand last:border-r-0",
              s.fill,
            )}
          >
            <span className="max-w-full truncate text-sm font-semibold">{s.name}</span>
            <span className="max-w-full truncate text-sm tabular-nums">{secs(s.ms)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm tabular-nums text-text-secondary">
        <span>{`${secs(total)} in all · each product ${secs(each)}`}</span>
        <span>Scenes play in this order</span>
      </div>
    </div>
  );
}

function Scene({
  thumb,
  title,
  span,
  actions,
  children,
}: {
  thumb: React.ReactNode;
  title: string;
  span: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 rounded-lg border border-solid border-border px-6 py-5 [@container(max-width:439px)]:grid-cols-[40px_minmax(0,1fr)]">
      {thumb}
      <div className="flex min-w-0 flex-col gap-2">
        <span className="break-words text-sm text-text-tertiary">
          <span className="text-md font-semibold text-text-primary">{title}</span> · {span}
        </span>
        {children}
      </div>
      {actions ? <div className="[@container(max-width:439px)]:col-start-2">{actions}</div> : <span aria-hidden />}
    </li>
  );
}

/** The intro and outro cards' thumb: a micro-label on the brand card (the row names it too). */
function CardThumb({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-[40px] items-center justify-center rounded-lg text-2xs font-bold uppercase tracking-caps text-text-on-brand", CARD_FILL)}
    >
      {label}
    </span>
  );
}

function SoundField({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-md font-semibold text-text-primary">
        Sound
        <span className="text-sm font-normal text-text-tertiary">Optional — left to AI when empty</span>
      </label>
      <TextInput
        id={id}
        size="lg"
        value={value}
        onValueChange={onChange}
        placeholder="e.g. upbeat electronic, light whoosh between scenes"
      />
    </div>
  );
}

// ─────────────────────────── opening it from anywhere ───────────────────────────

// The dialog also lives in one host at the app's root (`ProjectVideoDialogHost`, in
// app/layout.tsx), the way Make videos' does (make-videos.tsx): a toast or a render's Try again
// can open it for a project with only its id, over whatever page the maker is on.

export type ProjectVideoRequest = {
  projectId: string;
  /** What had focus: it gets focus back on close while it is still on the page. */
  opener: HTMLElement | null;
};

let current: ProjectVideoRequest | null = null;
const listeners = new Set<() => void>();
const publish = (next: ProjectVideoRequest | null) => {
  current = next;
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Opens the Project video dialog for a project, over the page the maker is on. */
export function openProjectVideoDialog(projectId: string) {
  publish({ projectId, opener: document.activeElement instanceof HTMLElement ? document.activeElement : null });
}

/** Mounted once, at the app's root. */
export function ProjectVideoDialogHost() {
  const request = React.useSyncExternalStore(subscribe, () => current, () => null);
  if (!request) return null;
  return <HostedProjectVideoDialog key={request.projectId} request={request} onEnd={() => publish(null)} />;
}

function HostedProjectVideoDialog({ request, onEnd }: { request: ProjectVideoRequest; onEnd: () => void }) {
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  const project = projects.find((p) => p.id === request.projectId);
  const products = React.useMemo(() => (project ? productsOfProject(project, buildsOf(project, builds)) : []), [project, builds]);
  if (!project) return null;
  const close = () => {
    onEnd();
    requestAnimationFrame(() => {
      const at = document.activeElement;
      if ((!at || at === document.body) && request.opener?.isConnected) request.opener.focus();
    });
  };
  return <ProjectVideoDialog open project={project} products={products} onClose={close} />;
}

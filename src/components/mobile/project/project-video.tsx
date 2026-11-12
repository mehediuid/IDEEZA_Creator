"use client";

// 03d · Project video (full screen) and 03e · review the take. The web's
// Project video dialog on its own screen: a timeline strip (each part's share
// is its length), "19 s in all · each product 5 s", the Intro (title + line),
// each current product in play order (↑ ↓ move it, its label), the Outro,
// quality (720p with the Disruptor plan), the optional sound prompt kept for
// the model, then Generate project video — rendered in this browser by the
// web's video jobs (it keeps going if you leave). A render in progress shows
// its progress with Cancel render. A finished take nobody chose yet comes
// first (`?review=` or the status's own): Use this video · Make another take
// (the same scenes) · Change scenes · Decide later. While it can't be made
// yet (11q, blocked), each product is listed with its video's state and the
// web's action (Generate AI video…), so the screen is never a dead end.

import * as React from "react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { TextInput } from "@/components/ideeza/text-input";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useCreatePlan } from "@/lib/create/plan";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { currentProductsOf } from "@/lib/manual/readiness";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";
import { progressOf } from "@/lib/video/jobs";
import { INTRO_MS, OUTRO_MS, cutMs, defaultJoinPlan, joinLengthMs, mergeJoinDraft, projectVideoStatusOf } from "@/lib/video/project-video";
import { useProjectVideos } from "@/lib/video/store";
import { PROJECT_VIDEO_KEY, VIDEO_QUALITY, qualityOpen, type JoinPlan, type OnScreenLines, type VideoQuality } from "@/lib/video/types";
import { HIGH_LOCKED_NOTE, LINE_MAX, PROJECT_HONESTY, RENDER_KEEPS_RUNNING } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { useToast } from "../kit/toast";
import { useGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import type { Ready } from "./context";
import { Thumb } from "./parts";
import { ProjectLoading, ProjectMissing } from "./project-screen";
import { ReadinessRows, useReadinessOf } from "./sheets";
import { PhoneVideo } from "./video";

const secs = (ms: number) => `${Math.round(ms / 100) / 10} s`;

export function ProjectVideoScreen({ projectId, reviewId }: { projectId: string; reviewId: string | null }) {
  const data = useProjectPageData(projectId, "project");
  if (data.state === "loading") return <ProjectLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  return <ProjectVideo data={data} reviewId={reviewId} />;
}

/** 11q · nothing to make yet: each product's video, with the way to make the ones missing. */
function Blocked({ data }: { data: Ready }) {
  const readiness = useReadinessOf(data.project, data.view, data.brief, "videos");
  return <ReadinessRows readiness={readiness} projectId={data.project.id} projectVideo={false} />;
}

function ProjectVideo({ data, reviewId }: { data: Ready; reviewId: string | null }) {
  const { project } = data;
  const products = data.view.products;
  const toast = useToast();
  const back = phoneProjectHref(project.id, "media");
  const goBack = useGoBack(back);
  const { record, hydrated } = useProjectVideos(project.id);
  const { jobs, now, hydrated: jobsHydrated, startProjectVideo, saveDraft, cancelRender, pickTake, declineTake, acknowledge } = useVideoJobs();
  const { sub } = useCreatePlan();
  const current = React.useMemo(() => currentProductsOf(products), [products]);
  const ready = hydrated && jobsHydrated;
  const status = projectVideoStatusOf({ products, videos: record, jobs, now });
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
  const [editing, setEditing] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  if (ready && !started) {
    const saved = record?.products[PROJECT_VIDEO_KEY]?.draft;
    setStarted(true);
    setEdit(saved?.join);
    setQuality(saved?.quality ?? "low");
    setSound(saved?.audioPrompt ?? "");
  }
  const plan = fresh ? mergeJoinDraft(edit, fresh) : null;
  const draftOf = (p: JoinPlan) => ({ prompt: "", lines: [p.intro[0], p.intro[1], p.outro] as OnScreenLines, quality, audioPrompt: sound, join: p });
  const change = (next: JoinPlan) => {
    setError(null);
    setEdit(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    if (!plan) return;
    const j = i + dir;
    if (j < 0 || j >= plan.cuts.length) return;
    const cuts = [...plan.cuts];
    [cuts[i], cuts[j]] = [cuts[j], cuts[i]];
    change({ ...plan, cuts });
  };

  const takes = record?.products[PROJECT_VIDEO_KEY]?.takes ?? [];
  const asked = reviewId ? takes.find((t) => t.id === reviewId && t.toReview && t.readyAt && !t.failure) ?? null : null;
  const reviewTake = editing ? null : (asked ?? status.review);
  const v = status.video;
  // A take shown for review here is seen: its corner notice goes, as the web's Review does.
  const reviewJob = reviewTake ? jobs.find((j) => j.id === reviewTake.id) : undefined;
  React.useEffect(() => {
    if (reviewJob && !reviewJob.acknowledged) acknowledge(reviewJob.id);
  }, [reviewJob, acknowledge]);
  const renderingTake = v.state === "rendering" ? v.take : v.state === "ready" && v.next ? v.next.take : null;
  const renderingJob = renderingTake ? jobs.find((j) => j.id === renderingTake.id) : undefined;

  const generate = () => {
    if (!plan) return;
    saveDraft(project.id, PROJECT_VIDEO_KEY, draftOf(plan));
    const res = startProjectVideo({ projectId: project.id, projectName: project.name, plan, quality: qualityOpen(quality, sub.tier) ? quality : "low", audioPrompt: sound.trim() });
    if (!res.ok) return setError(WRITE_ERROR_MESSAGE);
    toast({ title: `Making the project video · Take ${res.n}` });
    setEditing(false);
  };
  const useIt = () => {
    if (!reviewTake) return;
    if (!pickTake(project.id, PROJECT_VIDEO_KEY, reviewTake.id).ok) return setError(WRITE_ERROR_MESSAGE);
    toast({ title: `Take ${reviewTake.n} is now the project video.` });
    goBack();
  };
  const anotherTake = () => {
    if (!reviewTake || !fresh) return;
    declineTake(project.id, PROJECT_VIDEO_KEY, reviewTake.id);
    const res = startProjectVideo({
      projectId: project.id,
      projectName: project.name,
      plan: mergeJoinDraft(reviewTake.join, fresh),
      quality: qualityOpen(reviewTake.quality, sub.tier) ? reviewTake.quality : "low",
      audioPrompt: reviewTake.audioPrompt ?? "",
    });
    if (!res.ok) return setError(WRITE_ERROR_MESSAGE);
    toast({ title: `Making another take · Take ${res.n}` });
  };
  const changeScenes = () => {
    if (!reviewTake) return;
    declineTake(project.id, PROJECT_VIDEO_KEY, reviewTake.id);
    if (reviewTake.join) setEdit(reviewTake.join);
    setQuality(reviewTake.quality);
    setSound(reviewTake.audioPrompt ?? "");
    setEditing(true);
  };

  let body: React.ReactNode;
  let footer: React.ReactNode = null;
  if (!ready) {
    body = <div aria-busy="true" className="h-[240px] rounded-lg bg-bg-subtle motion-safe:animate-pulse" />;
  } else if (reviewTake) {
    body = (
      <div className="flex flex-col gap-6">
        <PhoneVideo takeId={reviewTake.id} label={`${project.name} project video, take ${reviewTake.n}`} />
        <p className={T.meta}>
          Take {reviewTake.n} · {VIDEO_QUALITY[reviewTake.quality].resolution}
          {reviewTake.clip ? ` · ${secs(reviewTake.clip.durationMs)}` : ""}
        </p>
        <h2 className={T.section}>Is this the video you want?</h2>
        {status.video.state === "ready" && status.video.take.id !== reviewTake.id && (
          <p className={T.body}>Take {status.video.take.n} stays in use until you choose.</p>
        )}
      </div>
    );
    footer = (
      <>
        <Button size="xl" className="w-full" onClick={useIt}>
          Use this video
        </Button>
        {fresh && (
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={anotherTake}>
            Make another take
          </Button>
        )}
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={changeScenes}>
          Change scenes
        </Button>
        <Button hierarchy="ghost" size="xl" className="w-full" onClick={goBack}>
          Decide later
        </Button>
      </>
    );
  } else if (renderingTake && !editing) {
    const p = renderingJob ? progressOf(renderingJob, now) : null;
    const pct = p ? p.total : 0;
    body = (
      <div className="flex flex-col gap-6">
        <h2 className={T.section}>Making take {renderingTake.n}</h2>
        <ProgressBar value={pct} label={`${project.name} project video`} />
        <p className={T.body}>{RENDER_KEEPS_RUNNING}</p>
      </div>
    );
    footer = (
      <>
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => cancelRender(renderingTake.id)}>
          Cancel render
        </Button>
        <Button hierarchy="ghost" size="xl" className="w-full" onClick={goBack}>
          Close
        </Button>
      </>
    );
  } else if (!plan) {
    body = (
      <div className="flex flex-col gap-6">
        <Banner tone="info" title="Not yet">
          {status.state === "waiting"
            ? `The project video is made from every product's video. ${status.ready} of ${status.total} are ready.`
            : "Every current product needs a video in use first."}
        </Banner>
        <Blocked data={data} />
      </div>
    );
  } else {
    const total = joinLengthMs(plan);
    const each = cutMs(plan.cuts.length);
    const nameOf = (id: string) => displayProductName(current.find((p) => p.id === id)?.name ?? "");
    const thumbOf = (id: string) => current.find((p) => p.id === id)?.built?.product.conceptImageUrl ?? null;
    const setIntro = (i: 0 | 1, text: string) => {
      const intro: [string, string] = [...plan.intro];
      intro[i] = text.slice(0, LINE_MAX);
      change({ ...plan, intro });
    };
    const locked = !qualityOpen("high", sub.tier);
    body = (
      <div className="flex flex-col gap-6">
        <p className={T.meta}>{project.name} · made from your product videos</p>
        <div aria-hidden className={cn(T.micro, "flex h-[28px] overflow-hidden rounded-md border-[length:var(--border-width-1)] border-solid border-border")}>
          <span className="flex items-center justify-center bg-bg-brand-subtle px-2 text-text-brand" style={{ flexGrow: INTRO_MS }}>
            Intro
          </span>
          {plan.cuts.map((c) => (
            <span key={c.productId} className="flex min-w-0 items-center justify-center border-l-[length:var(--border-width-1)] border-solid border-border-subtle px-1 text-text-secondary" style={{ flexGrow: c.ms }}>
              <span className="truncate">{nameOf(c.productId)}</span>
            </span>
          ))}
          <span className="flex items-center justify-center border-l-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-brand-subtle px-2 text-text-brand" style={{ flexGrow: OUTRO_MS }}>
            Outro
          </span>
        </div>
        <p className={cn(T.meta, "flex justify-between gap-4")}>
          <span>
            {secs(total)} in all · each product {secs(each)}
          </span>
          <span>Scenes play in this order</span>
        </p>

        <Part label="Intro" sub={secs(INTRO_MS)}>
          <TextInput size="xl" aria-label="Intro title" maxLength={LINE_MAX} value={plan.intro[0]} onValueChange={(t) => setIntro(0, t)} />
          <TextInput size="xl" aria-label="Intro line" maxLength={LINE_MAX} value={plan.intro[1]} onValueChange={(t) => setIntro(1, t)} />
        </Part>
        {plan.cuts.map((c, i) => (
          <div key={c.productId} className="flex items-start gap-6">
            <Thumb url={thumbOf(c.productId)} />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-4">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn(T.rowTitle, "truncate")}>{nameOf(c.productId)}</span>
                  <span className={T.meta}>{secs(c.ms)} from its video</span>
                </span>
                <Button hierarchy="secondary" size="xl" iconOnly aria-label={`Move ${nameOf(c.productId)} earlier`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <Icon icon={ArrowUp01Icon} size={20} />
                </Button>
                <Button hierarchy="secondary" size="xl" iconOnly aria-label={`Move ${nameOf(c.productId)} later`} disabled={i === plan.cuts.length - 1} onClick={() => move(i, 1)}>
                  <Icon icon={ArrowDown01Icon} size={20} />
                </Button>
              </div>
              <TextInput
                size="xl"
                aria-label={`${nameOf(c.productId)} label`}
                maxLength={LINE_MAX}
                value={c.label}
                onValueChange={(t) => change({ ...plan, cuts: plan.cuts.map((x, j) => (j === i ? { ...x, label: t.slice(0, LINE_MAX) } : x)) })}
              />
            </div>
          </div>
        ))}
        <Part label="Outro" sub={secs(OUTRO_MS)}>
          <TextInput size="xl" aria-label="Outro line" maxLength={LINE_MAX} value={plan.outro} onValueChange={(t) => change({ ...plan, outro: t.slice(0, LINE_MAX) })} />
        </Part>

        <div role="radiogroup" aria-label="Video quality" className="flex flex-col gap-4">
          <p className={T.rowTitle}>Select video quality · {secs(total)}</p>
          {(["low", "high"] as const).map((q) => {
            const off = q === "high" && locked;
            const on = quality === q;
            return (
              <label
                key={q}
                className={cn(
                  "relative flex items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid p-6",
                  on ? "border-border-brand bg-bg-brand-subtle" : "border-border",
                  off ? "cursor-not-allowed" : "cursor-pointer",
                )}
              >
                <input type="radio" name="m-pv-quality" className="sr-only" checked={on} disabled={off} onChange={() => setQuality(q)} />
                <Radio checked={on} disabled={off} decorative className="mt-1" />
                <span className="flex flex-col gap-1">
                  <span className={cn(T.rowTitle, "flex items-center gap-4")}>
                    {VIDEO_QUALITY[q].label}
                    {q === "high" && <Badge tone="brand">Disruptor</Badge>}
                  </span>
                  <span className={T.meta}>
                    {secs(total)} · {VIDEO_QUALITY[q].resolution}
                  </span>
                </span>
              </label>
            );
          })}
          {locked && <p className={T.meta}>{HIGH_LOCKED_NOTE}</p>}
        </div>
        <label className="flex flex-col gap-2">
          <span className={T.rowTitle}>Sound</span>
          <span className={T.meta}>Optional — left to AI when empty</span>
          <TextInput size="xl" value={sound} onValueChange={setSound} placeholder="e.g. upbeat electronic, light whoosh between scenes" />
        </label>
        <p className={cn(T.meta, "text-text-tertiary")}>{PROJECT_HONESTY}</p>
      </div>
    );
    footer = (
      <>
        <Button size="xl" className="w-full" onClick={generate}>
          Generate project video
        </Button>
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={goBack}>
          Cancel
        </Button>
      </>
    );
  }

  return (
    <Screen
      top={<TopBar back={back} title={reviewTake ? "Review the take" : "Project video"} />}
      footer={footer ? <BottomBar className="gap-4 pt-8">{footer}</BottomBar> : undefined}
      className="px-8 pb-12"
    >
      {body}
      {error && (
        <p role="alert" className={cn(T.body, "pt-6 text-text-error")}>
          {error}
        </p>
      )}
    </Screen>
  );
}

function Part({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-6">
      <span className={cn(T.caption, "flex size-[56px] shrink-0 items-center justify-center rounded-md bg-bg-brand-subtle text-text-brand")}>{label}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="flex flex-col">
          <span className={T.rowTitle}>{label}</span>
          <span className={T.meta}>{sub}</span>
        </span>
        {children}
      </div>
    </div>
  );
}

"use client";

// 03d · Project video (full screen) and 03e · review the take. The web's
// Project video dialog on its own screen (CL-030: it never waits for the
// product videos — its storyboard is drafted from the products themselves):
// "{project} · drafted from your n products’ prompts and specs", a timeline
// strip (each part's share is its length), "n s in all · each product 5 s",
// the Intro (title + line, 2 s), each current product in play order (↑ ↓ move
// it; its concept image, its label and its scene line, "5 s · from its prompt
// and spec"), the Outro (2 s, Built with IDEEZA), quality (720p with the
// Disruptor plan: Get Disruptor opens its checkout), the optional sound prompt
// kept for the model, then Generate project video — rendered in this browser
// by the web's video jobs (it keeps going if you leave). A render in progress
// shows its progress, the one notify switch and Cancel render; the bar's one
// primary is "Next video: {product}" while a product's video hasn't started
// ("The project video keeps rendering while you set up the next one."), else
// Close ("Every video of this project has started."). A finished take nobody
// chose yet comes first (`?review=` or the status's own): Use this video in
// the bar (the note above it while another take is in use), then Make another
// take (the same scenes) · Change scenes · Decide later as rows, as the
// product video's review draws them (project-earn/video/review.tsx). One
// product: no project video, its video is the project's (CL-025).

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { TextInput } from "@/components/ideeza/text-input";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { projectVideoDescription } from "@/components/video-jobs/project-video-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useCreatePlan } from "@/lib/create/plan";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { currentProductsOf } from "@/lib/manual/readiness";
import { phoneProductVideoHref } from "@/lib/manual/phone-earn";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";
import { progressOf } from "@/lib/video/jobs";
import { nextVideoOf } from "@/lib/video/next-video";
import { useNotifyAll, writeNotifyAll } from "@/lib/video/notify-pref";
import { trayProgressLine } from "@/lib/video/phone-video";
import { INTRO_MS, OUTRO_MS, cutMs, defaultJoinPlan, joinLengthMs, mergeJoinDraft, projectVideoStatusOf } from "@/lib/video/project-video";
import { useProjectVideos } from "@/lib/video/store";
import { PROJECT_VIDEO_KEY, VIDEO_QUALITY, qualityOpen, type JoinPlan, type OnScreenLines, type VideoQuality } from "@/lib/video/types";
import { LINE_MAX, PROJECT_HONESTY, SINGLE_PRODUCT_NOTE, projectRowCopy, stageLine } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { HighLockedNote } from "../project-earn/video/form";
import { NotifySwitch } from "../project-earn/video/notify-switch";
import { ChoiceList, UseBar } from "../project-earn/video/review";
import { useToast } from "../kit/toast";
import { useGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import type { Ready } from "./context";
import { Thumb } from "./parts";
import { ProjectLoading, ProjectMissing } from "./project-screen";
import { PhoneVideo } from "./video";

const secs = (ms: number) => `${Math.round(ms / 100) / 10} s`;
/** The web's RENDER_KEEPS_RUNNING, where the phone shows the render: the Videos bar, at the foot. */
const KEEPS_RUNNING = "You can close this — the render keeps running, and its progress shows at the bottom of the screen.";

export function ProjectVideoScreen({ projectId, reviewId }: { projectId: string; reviewId: string | null }) {
  const data = useProjectPageData(projectId, "project");
  if (data.state === "loading") return <ProjectLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  return <ProjectVideo data={data} reviewId={reviewId} />;
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
  const router = useRouter();
  const notifyAll = useNotifyAll();
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const current = React.useMemo(() => currentProductsOf(products), [products]);
  const ready = hydrated && jobsHydrated;
  const status = projectVideoStatusOf({ products, videos: record, jobs, now });
  const next = nextVideoOf({ products, videos: record, jobs, now, after: PROJECT_VIDEO_KEY });
  // Drawn from the products (CL-030): each one's concept image and a line from its prompt and spec.
  const fresh = React.useMemo(
    () =>
      defaultJoinPlan({
        projectName: project.name,
        description: project.description,
        products: current.map((p) => ({
          id: p.id,
          name: displayProductName(p.name),
          imageUrl: p.built?.product.conceptImageUrl || null,
          line: p.description,
        })),
      }),
    [project.name, project.description, current],
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
    // It stays on its render, with Next video (CL-030): the screen says it, no toast.
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
  } else if (status.state === "single") {
    // One product: no project video to make; its video is the project's (owner, 2026-11-17).
    body = (
      <Banner tone="info" title="One product, one video">
        {SINGLE_PRODUCT_NOTE}
      </Banner>
    );
  } else if (reviewTake) {
    body = (
      <div className="flex flex-col gap-6">
        <PhoneVideo takeId={reviewTake.id} label={`${project.name} project video, take ${reviewTake.n}`} />
        <p className={T.meta}>
          Take {reviewTake.n} · {VIDEO_QUALITY[reviewTake.quality].resolution}
          {reviewTake.clip ? ` · ${secs(reviewTake.clip.durationMs)}` : ""}
        </p>
        <h2 className={T.section}>Is this the video you want?</h2>
        {/* One primary in the bar; the other answers are rows (the product video's review). */}
        <ChoiceList
          label="Other choices"
          choices={[
            ...(fresh ? [{ title: "Make another take", text: "The same scenes, a new render", onClick: anotherTake }] : []),
            { title: "Change scenes", text: "The intro, the order, the labels", onClick: changeScenes },
            { title: "Decide later", text: "Keep it to review from the row", onClick: goBack },
          ]}
        />
      </div>
    );
    footer = (
      <UseBar
        label="Use this video"
        note={status.video.state === "ready" && status.video.take.id !== reviewTake.id ? `Take ${status.video.take.n} stays in use until you choose.` : null}
        onUse={useIt}
      />
    );
  } else if (renderingTake && !editing) {
    const p = renderingJob ? progressOf(renderingJob, now) : null;
    const notifyOn = notifyAll || renderingJob?.browserNotify === true;
    body = (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-8">
          <h2 className={T.section}>{renderingJob ? stageLine(renderingTake.n, renderingJob.stage) : `Making take ${renderingTake.n}`}</h2>
          <ProgressBar value={p ? p.total : 0} label={`${project.name} project video`} />
          {p && <p className={T.meta}>{trayProgressLine(p.total, p.etaSec)}</p>}
          <div className="-my-3">
            <NotifySwitch on={notifyOn} onToggle={() => writeNotifyAll(!notifyOn)} />
          </div>
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className={cn(T.rowTitle, "-my-3 inline-flex min-h-[44px] items-center self-start text-text-error outline-none hover:underline focus-visible:underline")}
          >
            Cancel render
          </button>
        </div>
        <p className={T.meta}>{KEEPS_RUNNING}</p>
        <p className={cn(T.meta, "text-text-tertiary")}>{PROJECT_HONESTY}</p>
      </div>
    );
    // Next video (CL-030): a product's video starts while this one renders; it takes this screen's place.
    footer = next ? (
      <>
        <Button size="xl" className="w-full" onClick={() => router.replace(phoneProductVideoHref(project.id, next.productId))}>
          {`Next video: ${next.name}`}
        </Button>
        <p className={T.meta}>The project video keeps rendering while you set up the next one.</p>
      </>
    ) : (
      <>
        <Button size="xl" className="w-full" onClick={goBack}>
          Close
        </Button>
        <p className={T.meta}>Every video of this project has started.</p>
      </>
    );
  } else if (!plan) {
    // No current product to draw a scene from: why, and nothing to press.
    body = <Banner tone="info">{projectRowCopy(status).text}</Banner>;
  } else {
    const total = joinLengthMs(plan);
    const each = cutMs(plan.cuts.length);
    const nameOf = (id: string) => displayProductName(current.find((p) => p.id === id)?.name ?? "");
    const thumbOf = (id: string) => current.find((p) => p.id === id)?.built?.product.conceptImageUrl || null;
    const setIntro = (i: 0 | 1, text: string) => {
      const intro: [string, string] = [...plan.intro];
      intro[i] = text.slice(0, LINE_MAX);
      change({ ...plan, intro });
    };
    const locked = !qualityOpen("high", sub.tier);
    body = (
      <div className="flex flex-col gap-6">
        <p className={T.meta}>{projectVideoDescription(project.name, current.length)}</p>
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
            <Thumb url={c.imageUrl ?? thumbOf(c.productId)} />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-4">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn(T.rowTitle, "truncate")}>{nameOf(c.productId)}</span>
                  <span className={T.meta}>{c.takeId ? `${secs(c.ms)} from its video` : `${secs(c.ms)} · from its prompt and spec`}</span>
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
              {!c.takeId && (
                <TextInput
                  size="xl"
                  aria-label={`${nameOf(c.productId)} scene line`}
                  maxLength={LINE_MAX}
                  placeholder="What this scene says"
                  value={c.line ?? ""}
                  onValueChange={(t) => change({ ...plan, cuts: plan.cuts.map((x, j) => (j === i ? { ...x, line: t.slice(0, LINE_MAX) } : x)) })}
                />
              )}
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
          {locked && <HighLockedNote />}
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
      <Button size="xl" className="w-full" onClick={generate}>
        Generate project video
      </Button>
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
      <ConfirmSheet
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this render?"
        body={`Take ${renderingTake?.n ?? ""} stops and isn’t saved. You can start it again later.`}
        verb="Cancel render"
        destructive
        cancelLabel="Keep rendering"
        onConfirm={() => {
          if (renderingTake) cancelRender(renderingTake.id);
        }}
      />
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

"use client";

// 11 · Generate video (full screen): the web's Generate video dialog on its
// own phone screen, "For {Product} · {Project}" under the top bar, every view
// of it in the mobile Figma's layout, its one primary at the foot (the top
// bar's Back is the dialog's Cancel: it leaves, as Cancel did):
// · the form (11, 11p, 11q, 11r): AR or AI; AI's prompts (Need prompt help?
//   opens 11i–11k), Auto generate video / audio, the quality; Generate video
//   storyboard, held with the web's reason while nothing is written (11q).
//   AR's Open camera asks first (11s) and opens the camera (…/ar, 11c).
//   What the maker types is kept as the product's draft (400 ms).
// · drafting (11e): /api/video/storyboard (up to 50 s; no answer → drafted
//   from the maker's own words); Cancel.
// · storyboard (11f, `?step=storyboard`, so Back returns to the form):
//   Generate video · Regenerate storyboard (asks first once a scene was
//   edited, 11z).
// · render (11g): "Take n · Stage i of 5 · …", the progress, Notify me when
//   it's ready; Cancel render (asks first, 11y) · Close in one row. Close
//   (and Back) go back to where the maker came from, which opens what it
//   had open (nav-trail useBackState: the Sell gate, a sheet); the render
//   keeps going and the tray follows.
// · review (11b, `?review=<takeId>`): Use this video at the foot, the web's
//   other choices as rows; a clip this phone recorded or uploaded reviews as
//   11d (Use this clip at the foot).
// · failed (11h): the one failure line; Try again (the form, from that take,
//   as `?from=<takeId>` does) · Close.
// The take is the web's: the same record (`ideeza:video:<projectId>`) the
// Media tab and the Sell / Give readiness read.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Spinner } from "@/components/ideeza/spinner";
import {
  formValueOf,
  storyboardInputOf,
  videoFormBlocker,
  type VideoFormValue,
  type VideoTarget,
} from "@/components/video-jobs/generate-video-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useCreatePlan } from "@/lib/create/plan";
import { phoneProductArHref, phoneProductVideoHref } from "@/lib/manual/phone-earn";
import { formatDate } from "@/lib/manual/project-summary";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";
import { progressOf } from "@/lib/video/jobs";
import { clipMetaOf, trayProgressLine } from "@/lib/video/phone-video";
import { productVideoStatus } from "@/lib/video/product-video";
import { useProjectVideos } from "@/lib/video/store";
import { draftStoryboard, linesOfStoryboard, sanitizeStoryboard, type Storyboard } from "@/lib/video/storyboard";
import { qualityOpen, type VideoTake } from "@/lib/video/types";
import { FAILURE_COPY, honestyLine, renderTitle, stageLine, storyboardHonesty } from "@/lib/video/video-copy";
import { BottomBar } from "../../kit/bottom-bar";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { useToast } from "../../kit/toast";
import { PhoneVideo } from "../../project/video";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";
import { CameraAskSheet, cameraPermission } from "./camera-ask";
import { VideoFormFields } from "./form";
import { PromptHelpSheet } from "./prompt-help";
import { ChoiceList, TakeReview, UseBar, clipKeptLine, inUseNote } from "./review";
import { StoryboardEditor } from "./storyboard";
import { VideoLoading, VideoUnavailable, useLeave, useRecordedTakes, useVideoScope } from "./target";
import { cn } from "@/lib/utils";
import { T } from "../../type";

const TITLE = "Generate video";
/** The web's RENDER_KEEPS_RUNNING, where the phone shows the render: its tray, at the foot. */
const KEEPS_RUNNING = "You can close this — the render keeps running, and its progress shows at the bottom of the screen.";

export function ProductVideoScreen({
  projectId,
  productId,
  reviewId,
  fromId,
}: {
  projectId: string;
  productId: string;
  reviewId: string | null;
  fromId: string | null;
}) {
  const scope = useVideoScope(projectId, productId);
  if (scope.state === "loading") return <VideoLoading title={TITLE} />;
  if (scope.state === "missing") return <VideoUnavailable title={TITLE} projectId={projectId} />;
  if (scope.refused) return <VideoUnavailable title={TITLE} projectId={projectId} reason={scope.refused} />;
  return <GenerateVideo key={`${projectId}:${productId}`} target={scope.target} reviewId={reviewId} fromId={fromId} />;
}

type Mode =
  | { kind: "form" }
  | { kind: "drafting"; prev: Storyboard | null }
  | { kind: "storyboard"; storyboard: Storyboard; edited: boolean }
  | { kind: "take"; id: string };

function GenerateVideo({ target, reviewId, fromId }: { target: VideoTarget; reviewId: string | null; fromId: string | null }) {
  const router = useRouter();
  const search = useSearchParams();
  const step = search.get("step");
  const toast = useToast();
  const leave = useLeave(target.projectId);
  const { record } = useProjectVideos(target.projectId);
  const { jobs, now, startProductVideo, cancelRender, setBrowserNotify, acknowledge, pickTake, declineTake, saveDraft } = useVideoJobs();
  const { sub } = useCreatePlan();
  const recorded = useRecordedTakes();
  const video = record?.products[target.productId];
  const videoHref = phoneProductVideoHref(target.projectId, target.productId);
  const arHref = `${phoneProductArHref(target.projectId, target.productId)}?from=video`;

  // The take asked for; else a render already running; else the form asked for; else a take
  // waiting for its review (the web's order).
  const [mode, setMode] = React.useState<Mode>(() => {
    const asked = reviewId ? video?.takes.find((t) => t.id === reviewId && t.readyAt && !t.failure) : undefined;
    if (asked) return { kind: "take", id: asked.id };
    const latest = video?.takes[video.takes.length - 1];
    const running = latest && !latest.readyAt && !latest.failure && jobs.some((j) => j.id === latest.id && j.stage !== "done" && j.stage !== "failed");
    if (running) return { kind: "take", id: latest.id };
    if (fromId) return { kind: "form" };
    const status = productVideoStatus(video, jobs, now);
    const waiting = status.state === "review" ? status.take : status.state === "ready" ? status.review : undefined;
    return waiting ? { kind: "take", id: waiting.id } : { kind: "form" };
  });
  const [value, setValue] = React.useState<VideoFormValue>(() =>
    formValueOf(target, video, fromId ? video?.takes.find((t) => t.id === fromId) : null),
  );
  const [tried, setTried] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [help, setHelp] = React.useState(false);
  const [askCamera, setAskCamera] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [confirmRedraft, setConfirmRedraft] = React.useState(false);
  const blockId = React.useId();

  // The maker's words, kept as the product's draft 400 ms after typing stops.
  const edited = React.useRef(false);
  React.useEffect(() => {
    if (!edited.current) return;
    const t = window.setTimeout(
      () =>
        saveDraft(target.projectId, target.productId, {
          prompt: value.prompt,
          lines: value.lines,
          quality: value.quality,
          audioPrompt: value.audioPrompt,
          auto: { video: value.autoVideo, audio: value.autoAudio },
        }),
      400,
    );
    return () => window.clearTimeout(t);
  }, [value, saveDraft, target.projectId, target.productId]);
  const change = (next: VideoFormValue) => {
    edited.current = true;
    setError(null);
    setValue(next);
  };

  const take = mode.kind === "take" ? (video?.takes.find((t) => t.id === mode.id) ?? null) : null;
  const job = take ? jobs.find((j) => j.id === take.id) : undefined;
  const how = take ? recorded[take.id] : undefined;
  const view: "form" | "drafting" | "storyboard" | "render" | "review" | "clip" | "failed" =
    mode.kind === "drafting"
      ? "drafting"
      : mode.kind === "storyboard" && step === "storyboard"
        ? "storyboard"
        : !take
          ? "form"
          : take.failure
            ? "failed"
            : take.readyAt
              ? how
                ? "clip"
                : "review"
              : job && job.stage !== "done" && job.stage !== "failed"
                ? "render"
                : "failed";

  // A finished take shown here is seen: its tray notice goes, as the web's review does.
  React.useEffect(() => {
    if ((view === "review" || view === "clip") && job && !job.acknowledged) acknowledge(job.id);
  }, [view, job, acknowledge]);

  const blocker = videoFormBlocker(value);

  // ── drafting the storyboard: the model, or this phone's draft when it doesn't answer in 50 s ──
  const drafting = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => drafting.current?.abort(), []);
  const draftStoryboardNow = async (prev: Storyboard | null) => {
    if (blocker) {
      setTried(true);
      return;
    }
    const input = storyboardInputOf(target, value);
    const ctrl = new AbortController();
    drafting.current = ctrl;
    const timer = window.setTimeout(() => ctrl.abort(), 50_000);
    setError(null);
    setMode({ kind: "drafting", prev });
    let storyboard: Storyboard = draftStoryboard(input);
    try {
      const res = await fetch("/api/video/storyboard", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = res.ok ? ((await res.json()) as { storyboard?: unknown }) : null;
      storyboard = sanitizeStoryboard(data?.storyboard) ?? storyboard;
    } catch {
      // Cancelled, offline or timed out: a cancel leaves; anything else keeps the draft.
      if (drafting.current !== ctrl) return;
    } finally {
      window.clearTimeout(timer);
    }
    if (drafting.current !== ctrl) return;
    drafting.current = null;
    setMode({ kind: "storyboard", storyboard, edited: false });
    if (step !== "storyboard") router.push(`${videoHref}?step=storyboard`);
  };
  const cancelDrafting = () => {
    const prev = mode.kind === "drafting" ? mode.prev : null;
    drafting.current?.abort();
    drafting.current = null;
    setMode(prev && step === "storyboard" ? { kind: "storyboard", storyboard: prev, edited: false } : { kind: "form" });
  };

  const startFrom = (spec: { prompt: string; lines: VideoTake["lines"]; quality: VideoTake["quality"]; audioPrompt?: string; auto?: VideoTake["auto"]; storyboard?: Storyboard }) =>
    startProductVideo({
      projectId: target.projectId,
      projectName: target.projectName,
      productId: target.productId,
      productName: target.productName,
      source: target.source,
      imageUrl: target.imageUrl,
      ...spec,
      quality: qualityOpen(spec.quality, sub.tier) ? spec.quality : "low",
    });

  const generate = (storyboard: Storyboard) => {
    const res = startFrom({
      prompt: value.autoVideo ? "" : value.prompt.trim(),
      lines: linesOfStoryboard(storyboard, value.lines),
      quality: value.quality,
      audioPrompt: value.autoAudio ? "" : value.audioPrompt.trim(),
      auto: { video: value.autoVideo, audio: value.autoAudio },
      storyboard,
    });
    if (!res.ok) return setError(WRITE_ERROR_MESSAGE);
    setMode({ kind: "take", id: res.takeId });
    // The storyboard step leaves the history: Back from the render leaves the screen.
    if (step === "storyboard") router.back();
  };

  const toForm = (from: VideoTake | null) => {
    setValue(formValueOf(target, video, from));
    setTried(false);
    setError(null);
    setMode({ kind: "form" });
  };

  // ── the review: the maker's word on a finished take ──
  const chooseTake = (chosen: VideoTake, reviewed: VideoTake) => {
    setError(null);
    if (!pickTake(target.projectId, target.productId, chosen.id).ok) return setError("That take couldn't be put in use. Try again.");
    if (chosen.id !== reviewed.id) declineTake(target.projectId, target.productId, reviewed.id);
    toast({ title: `${target.productName} take ${chosen.n} is in use.` });
    leave();
  };
  const makeAnother = (t: VideoTake) => {
    setError(null);
    declineTake(target.projectId, target.productId, t.id);
    const res = startFrom({ prompt: t.prompt, lines: t.lines, quality: t.quality, audioPrompt: t.audioPrompt, auto: t.auto, storyboard: t.storyboard });
    if (!res.ok) return setError(WRITE_ERROR_MESSAGE);
    setMode({ kind: "take", id: res.takeId });
  };
  const editStoryboard = (t: VideoTake) => {
    setError(null);
    declineTake(target.projectId, target.productId, t.id);
    const from = formValueOf(target, video, t);
    setValue(from);
    setTried(false);
    setMode({ kind: "storyboard", storyboard: t.storyboard ?? draftStoryboard(storyboardInputOf(target, from)), edited: false });
    router.push(`${videoHref}?step=storyboard`);
  };
  const changePrompt = (t: VideoTake) => {
    declineTake(target.projectId, target.productId, t.id);
    toForm(t);
  };

  const openCamera = async () => {
    const state = await cameraPermission();
    if (state === "granted" || state === "denied") router.push(arHref);
    else setAskCamera(true);
  };

  const forLine = (
    <p className={cn(T.meta, "pb-8")}>{renderTitle(`For ${target.productName}`, target.projectName)}</p>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode = null;
  let title = TITLE;
  if (view === "form") {
    const shownBlocker = value.method === "ai" ? blocker : null;
    body = (
      <div className="flex flex-col gap-8">
        <VideoFormFields
          target={target}
          value={value}
          onChange={change}
          onHelp={() => setHelp(true)}
          describedBy={shownBlocker && tried ? blockId : undefined}
        />
      </div>
    );
    footer = (
      <>
        {shownBlocker && (
          <p id={blockId} className={T.meta}>
            {shownBlocker}
          </p>
        )}
        {value.method === "ai" ? (
          <Button
            size="xl"
            className={cn("w-full", blocker && "cursor-not-allowed opacity-60")}
            aria-disabled={!!blocker || undefined}
            aria-describedby={shownBlocker ? blockId : undefined}
            onClick={() => {
              // Stays pressable while something is missing: the press marks the empty prompt and goes to it (the web, and the mint's 13h).
              if (blocker) requestAnimationFrame(() => document.querySelector<HTMLElement>('textarea[aria-invalid="true"]')?.focus());
              void draftStoryboardNow(null);
            }}
          >
            Generate video storyboard
          </Button>
        ) : (
          <Button size="xl" className="w-full" onClick={() => void openCamera()}>
            Open camera
          </Button>
        )}
      </>
    );
  } else if (view === "drafting") {
    body = (
      <div role="status" className="flex flex-col items-center gap-4 pt-8 text-center">
        <Spinner size={32} />
        <p className={T.section}>Drafting your storyboard…</p>
        <p className={T.body}>
          AI is writing 3 scenes for {target.productName} from your prompts. This can take up to 40 seconds.
        </p>
      </div>
    );
    footer = (
      <Button hierarchy="secondary" size="xl" className="w-full" onClick={cancelDrafting}>
        Cancel
      </Button>
    );
  } else if (view === "storyboard" && mode.kind === "storyboard") {
    const sb = mode.storyboard;
    title = "Review your storyboard";
    body = (
      <div className="flex flex-col gap-8">
        <StoryboardEditor storyboard={sb} onChange={(next) => setMode({ kind: "storyboard", storyboard: next, edited: true })} />
        <p className={cn(T.meta, "text-text-tertiary")}>{storyboardHonesty(target.productName)}</p>
      </div>
    );
    footer = (
      <>
        <Button size="xl" className="w-full" onClick={() => generate(sb)}>
          Generate video
        </Button>
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => (mode.edited ? setConfirmRedraft(true) : void draftStoryboardNow(sb))}>
          Regenerate storyboard
        </Button>
      </>
    );
  } else if (view === "render" && take && job) {
    const { total, etaSec } = progressOf(job, now);
    body = (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface p-8">
          <h2 className={T.section}>{stageLine(take.n, job.stage)}</h2>
          <ProgressBar value={total} label={`${target.productName} video`} />
          <p className={T.meta}>{trayProgressLine(total, etaSec)}</p>
          <label className="relative -my-3 flex min-h-[44px] cursor-pointer items-center gap-4">
            <input type="checkbox" className="peer sr-only" checked={job.browserNotify} onChange={() => setBrowserNotify(job.id, !job.browserNotify)} />
            <Checkbox checked={job.browserNotify} decorative className="peer-focus-visible:shadow-focus-brand" />
            <span className={cn(T.body, "text-text-primary")}>Notify me when it&apos;s ready</span>
          </label>
        </div>
        <p className={T.meta}>{KEEPS_RUNNING}</p>
        <p className={cn(T.meta, "text-text-tertiary")}>{honestyLine(target.productName)}</p>
      </div>
    );
    // One row (owner 2026-11-15): Close goes back to where the maker came from, the render goes on.
    footer = (
      <div className="flex gap-4">
        <Button hierarchy="secondary" size="xl" className="min-w-0 flex-1" onClick={() => setConfirmCancel(true)}>
          Cancel render
        </Button>
        <Button size="xl" className="min-w-0 flex-1" onClick={leave}>
          Close
        </Button>
      </div>
    );
  } else if (view === "review" && take) {
    title = "Review the video";
    body = (
      <TakeReview
        take={take}
        video={video}
        productName={target.productName}
        onUse={(chosen) => chooseTake(chosen, take)}
        choices={[
          { title: "Make another take", text: "The same storyboard, a new render", onClick: () => makeAnother(take) },
          { title: "Edit storyboard", text: "Change the scenes, or ask AI again", onClick: () => editStoryboard(take) },
          { title: "Change the prompt", text: "Start from what it should show", onClick: () => changePrompt(take) },
          { title: "Decide later", text: "Keep it to review from the row", onClick: leave },
        ]}
      />
    );
    footer = <UseBar label="Use this video" note={inUseNote(take, video)} error={error} onUse={() => chooseTake(take, take)} />;
  } else if (view === "clip" && take && how) {
    title = "Your clip";
    body = (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <PhoneVideo takeId={take.id} label={`${target.productName} clip, take ${take.n}`} />
          <p className={T.meta}>{clipMetaOf(take.clip?.durationMs ?? 0, how, formatDate(take.readyAt ?? take.createdAt))}</p>
          <p className={T.meta}>{clipKeptLine(target.productName)}</p>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className={T.section}>Is this the clip you want?</h2>
          <ChoiceList
            label="Other choices"
            choices={[
              {
                title: "Record again",
                text: "A new 10-second clip",
                onClick: () => {
                  declineTake(target.projectId, target.productId, take.id);
                  router.push(arHref);
                },
              },
              { title: "Decide later", text: "Keep it to review from the row", onClick: leave },
            ]}
          />
        </div>
      </div>
    );
    footer = <UseBar label="Use this clip" note={inUseNote(take, video)} error={error} onUse={() => chooseTake(take, take)} />;
  } else {
    const kind = take?.failure?.kind ?? "interrupted";
    body = <Banner tone="error">{FAILURE_COPY[kind]}</Banner>;
    footer = (
      <div className="flex gap-4">
        <Button hierarchy="secondary" size="xl" className="min-w-0 flex-1" onClick={leave}>
          Close
        </Button>
        <Button size="xl" className="min-w-0 flex-1" onClick={() => toForm(take)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <Screen top={<TopBar back title={title} />} footer={footer ? <BottomBar className="gap-6 pt-8">{footer}</BottomBar> : undefined} className="px-8 pb-12">
      {forLine}
      {body}
      {error && view !== "review" && view !== "clip" && (
        <p role="alert" className={cn(T.body, "pt-6 text-text-error")}>
          {error}
        </p>
      )}
      <PromptHelpSheet
        open={help}
        productName={target.productName}
        productDescription={target.description}
        onUse={(prompt) => change({ ...value, prompt, autoVideo: false })}
        onClose={() => setHelp(false)}
      />
      <CameraAskSheet
        open={askCamera}
        onClose={() => setAskCamera(false)}
        onAllow={() => {
          setAskCamera(false);
          router.push(`${arHref}&asked=1`);
        }}
      />
      <ConfirmSheet
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this render?"
        body={`Take ${take?.n ?? ""} stops and isn’t saved. You can start it again later.`}
        verb="Cancel render"
        destructive
        cancelLabel="Keep rendering"
        onConfirm={() => {
          if (take) cancelRender(take.id);
        }}
      />
      <ConfirmSheet
        open={confirmRedraft}
        onClose={() => setConfirmRedraft(false)}
        title="Regenerate the storyboard?"
        body="AI writes 3 new scenes. Your changes to these scenes will be lost."
        verb="Regenerate"
        cancelLabel="Keep these scenes"
        onConfirm={() => {
          if (mode.kind === "storyboard") void draftStoryboardNow(mode.storyboard);
        }}
      />
    </Screen>
  );
}

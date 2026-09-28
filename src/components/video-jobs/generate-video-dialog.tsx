"use client";

// The Generate AI video dialog (Phase 2 VIDEO P2-VIDEO-6, Figma 41505:154911)
// and its body, `VideoForm`, which the Brief's preview step reuses inline
// (P2-VIDEO-17). One dialog for every entry point (P2-VIDEO-7): a readiness
// row, a Media tile, the product page's Media panel, a failed render toast.
//
// Views:
// - form: the prompt (with "Help me write it"), the three on-screen lines,
//   Video quality (Low free; High shown, locked), the honesty note, then
//   Cancel · Generate video. An empty prompt blocks Generate with its reason.
//   What the maker types is saved as the product's draft (400 ms debounce).
// - render: "Take {n} · Stage {i} of 5 · {label}", the progress, the time
//   left, "Notify me on this browser"; Cancel render · Close. Closing leaves
//   the render running — its toast carries on in the corner.
// - result: the player (never autoplaying) and "Take {n} is now {Product}'s
//   video."; Regenerate · Done (or Continue, back to the gate).
// - failed: the failure copy; Close · Try again.
// Opening on a product that is already rendering goes straight to the render
// view. Owner only: callers mount it where can(viewer, "video.generate").

import * as React from "react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { PromptHelpModal } from "@/components/brief/prompt-help-modal";
import { Banner, Button, Checkbox, ModalFrame, ProgressBar, TextInput, Textarea } from "@/components/ideeza";
import { videoScenePrompt } from "@/lib/brief/video-prompt";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ManualProject, ProductSource } from "@/lib/manual/projects";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";
import { etaLabel, progressOf } from "@/lib/video/jobs";
import { defaultLines } from "@/lib/video/product-video";
import { useProjectVideos } from "@/lib/video/store";
import {
  VIDEO_QUALITY,
  type OnScreenLines,
  type ProductVideo,
  type VideoQuality,
  type VideoTake,
} from "@/lib/video/types";
import {
  FAILURE_COPY,
  HIGH_LOCKED_NOTE,
  LINE_MAX,
  PROMPT_BLOCKER,
  PROMPT_PLACEHOLDER,
  RENDER_KEEPS_RUNNING,
  SILENT_NOTE,
  honestyLine,
  renderTitle,
  stageLine,
} from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { useVideoJobs } from "./video-jobs-provider";
import { VideoPlayer } from "./video-player";

// ─────────────────────────── the target ───────────────────────────

/** Which product a video is for, and what its frames are drawn from. */
export type VideoTarget = {
  projectId: string;
  projectName: string;
  productId: string;
  /** The display name ("Not named yet" for an unnamed product). */
  productName: string;
  description: string;
  /** The product's concept image reference, when it has one. */
  imageUrl: string | null;
  /** The build product that image belongs to (the take's `source`). */
  source: ProductSource | null;
};

export function videoTargetOf(project: Pick<ManualProject, "id" | "name">, product: ProjectProduct): VideoTarget {
  const built = product.built;
  const imageUrl = built?.product.conceptImageUrl || null;
  return {
    projectId: project.id,
    projectName: project.name,
    productId: product.id,
    productName: displayProductName(product.name),
    description: product.description,
    imageUrl,
    source: built && imageUrl ? { buildId: built.ref.buildId, productId: built.product.id } : null,
  };
}

// ─────────────────────────── the form ───────────────────────────

export type VideoFormValue = { prompt: string; lines: OnScreenLines; quality: VideoQuality };

/** What the form opens on: a take's own inputs (Regenerate, Try again), the
 *  saved draft, or a fresh prompt and the default lines. */
export function formValueOf(target: VideoTarget, video?: ProductVideo, from?: VideoTake | null): VideoFormValue {
  if (from) return { prompt: from.prompt, lines: [...from.lines] as OnScreenLines, quality: from.quality };
  if (video?.draft) return { prompt: video.draft.prompt, lines: [...video.draft.lines] as OnScreenLines, quality: video.draft.quality };
  const idea = [target.productName, target.description.trim()].filter(Boolean).join(": ");
  return {
    prompt: videoScenePrompt(idea),
    lines: defaultLines(target.productName, target.description),
    quality: "low",
  };
}

/** Why Generate can't go ahead yet; null when it can. */
export function videoFormBlocker(value: VideoFormValue): string | null {
  return value.prompt.trim() ? null : PROMPT_BLOCKER;
}

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const SCENES = ["Scene 1 · 0–3 s", "Scene 2 · 3–6 s", "Scene 3 · 6–10 s"] as const;
const QUALITIES: VideoQuality[] = ["low", "high"];

export type VideoFormProps = {
  target: VideoTarget;
  value: VideoFormValue;
  onChange: (next: VideoFormValue) => void;
  promptRef?: React.Ref<HTMLTextAreaElement>;
  /** Links the prompt to the blocked Generate button's reason. */
  describedBy?: string;
  /** The prompt help dialog opened or closed (a parent dialog is covered meanwhile). */
  onHelpOpenChange?: (open: boolean) => void;
};

/** The dialog's body, reused inline by the Brief (P2-VIDEO-17). The Generate
 *  button is the caller's: primary in the dialog, secondary in the Brief. */
export function VideoForm({ target, value, onChange, promptRef, describedBy, onHelpOpenChange }: VideoFormProps) {
  const id = React.useId();
  const [help, setHelp] = React.useState(false);
  const openHelp = (open: boolean) => {
    setHelp(open);
    onHelpOpenChange?.(open);
  };
  const setLine = (i: 0 | 1 | 2, text: string) => {
    const lines = [...value.lines] as OnScreenLines;
    lines[i] = text.slice(0, LINE_MAX);
    onChange({ ...value, lines });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <label htmlFor={`${id}-prompt`} className="text-sm font-semibold text-text-primary">
            What should the video show?
          </label>
          <button
            type="button"
            onClick={() => openHelp(true)}
            className={cn(
              "inline-flex min-h-[24px] items-center rounded-md text-sm font-semibold text-text-primary underline underline-offset-2 outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus",
              TAP,
            )}
          >
            Help me write it
          </button>
        </div>
        <Textarea
          ref={promptRef}
          id={`${id}-prompt`}
          rows={4}
          value={value.prompt}
          onValueChange={(prompt) => onChange({ ...value, prompt })}
          placeholder={PROMPT_PLACEHOLDER}
          aria-describedby={describedBy}
          invalid={!value.prompt.trim() && !!describedBy}
        />
      </div>

      <details className="group rounded-lg border border-solid border-border">
        <summary
          className={cn(
            "flex min-h-[40px] cursor-pointer items-center rounded-lg px-6 text-sm font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            TAP,
          )}
        >
          On-screen text (3)
        </summary>
        <div className="flex flex-col gap-6 border-t border-solid border-border px-6 pb-6 pt-5">
          <p className="text-sm text-text-secondary">Shown over the video, one line per scene.</p>
          {SCENES.map((label, i) => {
            const n = value.lines[i].length;
            return (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor={`${id}-line-${i}`} className="text-sm font-medium text-text-primary">
                    {label}
                  </label>
                  <span id={`${id}-count-${i}`} className="text-xs tabular-nums text-text-tertiary">
                    {n}/{LINE_MAX}
                  </span>
                </div>
                <TextInput
                  id={`${id}-line-${i}`}
                  size="lg"
                  maxLength={LINE_MAX}
                  value={value.lines[i]}
                  onValueChange={(text) => setLine(i as 0 | 1 | 2, text)}
                  aria-describedby={`${id}-count-${i}`}
                  containerClassName="max-md:!h-[var(--touch-min)] [@media(pointer:coarse)]:!h-[var(--touch-min)]"
                />
              </div>
            );
          })}
        </div>
      </details>

      <QualityField value={value.quality} onChange={(quality) => onChange({ ...value, quality })} />

      <div className="flex flex-col gap-1 text-sm text-text-tertiary">
        <p>{honestyLine(target.productName)}</p>
        <p>{SILENT_NOTE}</p>
      </div>

      <PromptHelpModal
        open={help}
        productName={target.productName}
        productDescription={target.description}
        onUse={(prompt) => {
          onChange({ ...value, prompt });
          openHelp(false);
        }}
        onClose={() => openHelp(false)}
      />
    </div>
  );
}

/** "Video quality": two cards, a radiogroup. High is shown with its Upgrade
 *  tag but locked (§5 Q1): arrow keys skip it, and Enter or a click on it
 *  does nothing — the reason sits under the group. */
function QualityField({ value, onChange }: { value: VideoQuality; onChange: (q: VideoQuality) => void }) {
  const noteId = React.useId();
  const refs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const enabled = QUALITIES.filter((q) => VIDEO_QUALITY[q].available);
  const move = (dir: 1 | -1) => {
    const at = enabled.indexOf(value);
    const next = enabled[(at + dir + enabled.length) % enabled.length];
    if (next && next !== value) onChange(next);
    refs.current[next ?? value]?.focus();
  };
  return (
    <div className="flex flex-col gap-3">
      <p id={`${noteId}-label`} className="text-sm font-semibold text-text-primary">
        Video quality
      </p>
      <div role="radiogroup" aria-labelledby={`${noteId}-label`} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUALITIES.map((q) => {
          const tier = VIDEO_QUALITY[q];
          const checked = value === q;
          const locked = !tier.available;
          return (
            <div
              key={q}
              ref={(el) => {
                refs.current[q] = el;
              }}
              role="radio"
              aria-checked={checked}
              aria-disabled={locked || undefined}
              aria-describedby={locked ? noteId : undefined}
              tabIndex={checked ? 0 : -1}
              onClick={() => {
                if (!locked) onChange(q);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(-1);
                } else if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  if (!locked) onChange(q);
                }
              }}
              className={cn(
                "flex min-h-[var(--touch-min)] items-center justify-between gap-4 rounded-lg border border-solid px-6 py-5 outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
                checked ? "border-border-brand bg-bg-brand-subtle" : "border-border",
                locked ? "cursor-not-allowed" : "cursor-pointer hover:bg-bg-subtle",
              )}
            >
              <span className="flex items-center gap-4">
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-solid",
                    checked ? "border-border-brand" : "border-border-strong",
                  )}
                >
                  {checked && <span className="size-[9px] rounded-full bg-bg-brand" />}
                </span>
                <span className="flex flex-col">
                  <span className={cn("text-sm font-semibold", locked ? "text-text-secondary" : "text-text-primary")}>{tier.label}</span>
                  <span className="text-xs text-text-secondary">
                    {tier.resolution} · {tier.seconds} sec
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "rounded-full px-[8px] py-[2px] text-xs font-semibold",
                  locked ? "bg-bg-subtle text-text-secondary" : "bg-bg-success-subtle text-text-success",
                )}
              >
                {tier.tag}
              </span>
            </div>
          );
        })}
      </div>
      <p id={noteId} className="text-sm text-text-secondary">
        {HIGH_LOCKED_NOTE}
      </p>
    </div>
  );
}

// ─────────────────────────── the dialog ───────────────────────────

export type GenerateVideoDialogProps = {
  open: boolean;
  target: VideoTarget | null;
  onClose: () => void;
  /** Opened from the readiness dialog: "← Back" returns there, and the
   *  result's second button is Continue (back, with the row now ready). */
  back?: { label: string; onBack: () => void };
  /** Pre-fill the form from this take (a failed toast's Try again). */
  fromTakeId?: string | null;
  /** Where focus goes on close when the control that opened the dialog is
   *  gone — a tile's Generate button turns into "Rendering" once it's used. */
  fallbackFocus?: () => HTMLElement | null;
};

export function GenerateVideoDialog(props: GenerateVideoDialogProps) {
  // Mounted only while open, so each visit starts from the product's current state.
  if (!props.open || !props.target) return null;
  return <GenerateVideoDialogOpen {...props} target={props.target} />;
}

type Mode = { kind: "form"; from: string | null } | { kind: "take"; id: string };

function GenerateVideoDialogOpen({
  target,
  onClose,
  back,
  fromTakeId,
  fallbackFocus,
}: GenerateVideoDialogProps & { target: VideoTarget }) {
  const { record, hydrated } = useProjectVideos(target.projectId);
  const { jobs, now, startProductVideo, cancelRender, setBrowserNotify, acknowledge } = useVideoJobs();
  const video = record?.products[target.productId];

  // A render already running for this product: straight to its view.
  const [mode, setMode] = React.useState<Mode>(() => {
    const latest = video?.takes[video.takes.length - 1];
    const running = latest && !latest.readyAt && !latest.failure && jobs.some((j) => j.id === latest.id && j.stage !== "done" && j.stage !== "failed");
    return running ? { kind: "take", id: latest.id } : { kind: "form", from: fromTakeId ?? null };
  });
  const [value, setValue] = React.useState<VideoFormValue>(() =>
    formValueOf(target, video, fromTakeId ? video?.takes.find((t) => t.id === fromTakeId) : null),
  );
  const [help, setHelp] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tried, setTried] = React.useState(false);

  const promptRef = React.useRef<HTMLTextAreaElement>(null);
  const focusRef = React.useRef<HTMLElement | null>(null);
  const blockId = React.useId();

  // The maker's words, kept as the product's draft (400 ms after typing stops).
  const { saveDraft } = useVideoJobs();
  const edited = React.useRef(false);
  React.useEffect(() => {
    if (!edited.current) return;
    const t = window.setTimeout(() => saveDraft(target.projectId, target.productId, value), 400);
    return () => window.clearTimeout(t);
  }, [value, saveDraft, target.projectId, target.productId]);
  const change = (next: VideoFormValue) => {
    edited.current = true;
    setError(null);
    setValue(next);
  };

  const take = mode.kind === "take" ? video?.takes.find((t) => t.id === mode.id) ?? null : null;
  const job = take ? jobs.find((j) => j.id === take.id) : undefined;
  const view: "form" | "render" | "result" | "failed" = !take
    ? "form"
    : take.failure
      ? "failed"
      : take.readyAt
        ? "result"
        : job && job.stage !== "done" && job.stage !== "failed"
          ? "render"
          : "failed";

  // Each view hands focus to its own heading; the form's is the prompt.
  const viewKey = `${view}:${take?.id ?? ""}`;
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      if (view === "form") return;
    }
    const el = view === "form" ? promptRef.current : focusRef.current;
    const frame = requestAnimationFrame(() => el?.focus());
    return () => cancelAnimationFrame(frame);
    // `view` changes only with `viewKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  // On close the frame hands focus back to its opener; when that control has
  // left the page, the caller's fallback takes it instead of <body>.
  const fallback = React.useRef(fallbackFocus);
  React.useEffect(() => {
    fallback.current = fallbackFocus;
  }, [fallbackFocus]);
  React.useEffect(
    () => () => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!active || active === document.body) fallback.current?.()?.focus();
      });
    },
    [],
  );

  // Shown here, so the corner doesn't also announce it.
  React.useEffect(() => {
    if (view === "result" && job && !job.acknowledged) acknowledge(job.id);
  }, [view, job, acknowledge]);

  const blocker = videoFormBlocker(value);
  const generate = () => {
    if (blocker) {
      setTried(true);
      promptRef.current?.focus();
      return;
    }
    const res = startProductVideo({
      projectId: target.projectId,
      projectName: target.projectName,
      productId: target.productId,
      productName: target.productName,
      prompt: value.prompt.trim(),
      lines: value.lines.map((l) => l.trim()) as OnScreenLines,
      quality: VIDEO_QUALITY[value.quality].available ? value.quality : "low",
      source: target.source,
      imageUrl: target.imageUrl,
    });
    if (!res.ok) {
      setError(WRITE_ERROR_MESSAGE);
      return;
    }
    setMode({ kind: "take", id: res.takeId });
  };
  const toForm = (from: VideoTake | null) => {
    setValue(formValueOf(target, video, from));
    setTried(false);
    setMode({ kind: "form", from: from?.id ?? null });
  };

  const setFocus = (el: HTMLElement | null) => {
    focusRef.current = el;
  };

  let body: React.ReactNode;
  let footer: React.ReactNode;
  if (view === "form") {
    body = (
      <VideoForm
        target={target}
        value={value}
        onChange={change}
        promptRef={promptRef}
        describedBy={blocker && tried ? blockId : undefined}
        onHelpOpenChange={setHelp}
      />
    );
    footer = (
      <div className="ml-auto flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy="primary"
            size="lg"
            aria-disabled={blocker ? true : undefined}
            aria-describedby={blocker ? blockId : undefined}
            className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
            onClick={generate}
          >
            Generate video
          </Button>
        </div>
        {blocker && (
          <p id={blockId} className="text-sm text-text-secondary">
            {blocker}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-text-error">
            {error}
          </p>
        )}
      </div>
    );
  } else if (view === "render" && take && job) {
    const { total, etaSec } = progressOf(job, now);
    body = (
      <div className="flex flex-col gap-6">
        <h3 ref={setFocus} tabIndex={-1} className="text-md font-semibold text-text-primary outline-none">
          {stageLine(take.n, job.stage)}
        </h3>
        <ProgressBar value={total} label={`${target.productName} video`} />
        <p className="text-sm text-text-secondary">{etaLabel(etaSec)} left</p>
        <p className="text-sm text-text-secondary">{RENDER_KEEPS_RUNNING}</p>
        <button
          type="button"
          role="checkbox"
          aria-checked={job.browserNotify}
          onClick={() => setBrowserNotify(job.id, !job.browserNotify)}
          className={cn(
            "flex min-h-[32px] items-center gap-[10px] self-start rounded-md px-[4px] text-left text-sm font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            TAP,
          )}
        >
          <Checkbox checked={job.browserNotify} decorative />
          Notify me on this browser
        </button>
        <p className="text-xs text-text-tertiary">{honestyLine(target.productName)}</p>
      </div>
    );
    footer = (
      <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
        <Button type="button" hierarchy="ghost" size="lg" className={TAP} onClick={() => cancelRender(take.id)}>
          Cancel render
        </Button>
        <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={onClose}>
          Close
        </Button>
      </div>
    );
  } else if (view === "result" && take) {
    body = (
      <div className="flex flex-col gap-6">
        <VideoPlayer take={take} productName={target.productName} projectId={target.projectId} owner onGenerate={() => toForm(take)} />
        <p ref={setFocus} tabIndex={-1} className="text-md font-semibold text-text-primary outline-none">
          Take {take.n} is now {target.productName}&apos;s video.
        </p>
      </div>
    );
    footer = (
      <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
        <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={() => toForm(take)}>
          Regenerate
        </Button>
        <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={back ? back.onBack : onClose}>
          {back ? "Continue" : "Done"}
        </Button>
      </div>
    );
  } else {
    const kind = take?.failure?.kind ?? "interrupted";
    body = (
      <div ref={setFocus} tabIndex={-1} className="outline-none">
        <Banner tone="error">{FAILURE_COPY[kind]}</Banner>
      </div>
    );
    footer = (
      <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
        <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
          Close
        </Button>
        <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={() => toForm(take)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <ModalFrame
      open
      onClose={onClose}
      covered={help}
      size="md"
      title="Generate AI video"
      description={renderTitle(`For ${target.productName}`, target.projectName)}
      initialFocus={view === "form" ? promptRef : focusRef}
      footer={hydrated ? footer : null}
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
      {hydrated ? body : <div aria-busy="true" className="h-[240px] rounded-lg bg-bg-subtle motion-safe:animate-pulse" />}
    </ModalFrame>
  );
}

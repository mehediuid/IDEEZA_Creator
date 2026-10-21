"use client";

// The Generate video dialog (owner, 2026-10-12: the Figma "Generate Video" →
// "Review your storyboard" flow; first Phase 2 VIDEO P2-VIDEO-6). One dialog
// for every entry point (P2-VIDEO-7): a readiness row, a Media tile, the
// product page's Media panel, a failed render toast.
//
// Views:
// - form (Figma "Generate Video"): AR or AI. AR is the phone hand-off
//   (ar-record-panel.tsx). AI asks for the video prompt (with "Need prompt
//   help?" and Auto generate video), the audio prompt (Auto generate audio,
//   on by default) and the quality (Low 480p free; High 720p shown, locked),
//   then Generate video storyboard. A prompt that's neither written nor left
//   to AI blocks it, with the reason. What the maker types is kept as the
//   product's draft (400 ms debounce).
// - drafting: "Drafting your storyboard…" while /api/video/storyboard asks
//   the model (up to 50 s); Cancel goes back to the form. No answer → the
//   storyboard drafted from the maker's own words (lib/video/storyboard.ts).
// - storyboard (Figma "Review your storyboard"): ← Back to Generate video;
//   three scenes, 0–3s · 3–6s · 6–10s, each Visual description, Background
//   audio, Music cue and Speech / dialogue, all editable; Regenerate
//   storyboard · Generate video. The take keeps the prompts, what was left to
//   AI and the storyboard; each scene's speech is its on-screen line.
// - render: "Take {n} · Stage {i} of 5 · {label}", the progress, the time
//   left, "Notify me on this browser"; Cancel render · Close. Closing leaves
//   the render running — its toast carries on in the corner.
// - result: the player (never autoplaying) and "Take {n} is now {Product}'s
//   video."; Regenerate · Done (or Continue, back to the gate).
// - failed: the failure copy; Close · Try again.
// Opening on a product that is already rendering goes straight to the render
// view. Owner only: callers mount it where can(viewer, "video.generate").

import * as React from "react";
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowUp01Icon, Clock01Icon, SparklesIcon, VrIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { PromptHelpModal } from "@/components/brief/prompt-help-modal";
import { Banner, Button, Checkbox, ModalFrame, ProgressBar, Spinner, Textarea, Toggle } from "@/components/ideeza";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ManualProject, ProductSource } from "@/lib/manual/projects";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";
import { etaLabel, progressOf } from "@/lib/video/jobs";
import { defaultLines } from "@/lib/video/product-video";
import { useProjectVideos } from "@/lib/video/store";
import {
  SCENE_FIELD_MAX,
  SCENE_SPANS,
  draftStoryboard,
  linesOfStoryboard,
  sanitizeStoryboard,
  type Scene,
  type Storyboard,
  type StoryboardInput,
} from "@/lib/video/storyboard";
import {
  VIDEO_QUALITY,
  qualityOpen,
  type OnScreenLines,
  type ProductVideo,
  type VideoQuality,
  type VideoTake,
} from "@/lib/video/types";
import {
  FAILURE_COPY,
  HIGH_LOCKED_NOTE,
  RENDER_KEEPS_RUNNING,
  storyboardHonesty,
  honestyLine,
  renderTitle,
  stageLine,
} from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PLAN_PRICING_HREF } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { ArRecordPanel } from "./ar-record-panel";
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

/** How the video is made: on the maker's phone in AR, or by AI from prompts. */
export type VideoMethod = "ai" | "ar";

export type VideoFormValue = {
  method: VideoMethod;
  /** What the video should show; ignored while `autoVideo` leaves it to AI. */
  prompt: string;
  autoVideo: boolean;
  /** The sound; ignored while `autoAudio` leaves it to AI. */
  audioPrompt: string;
  autoAudio: boolean;
  quality: VideoQuality;
  /** The product's default on-screen lines: a scene without speech shows its line. */
  lines: OnScreenLines;
};

/** What the form opens on: a take's own inputs (Regenerate, Try again), the saved draft, or a
 *  fresh form — the video prompt empty, the audio left to AI (the Figma's defaults). */
export function formValueOf(target: VideoTarget, video?: ProductVideo, from?: VideoTake | null): VideoFormValue {
  const lines = defaultLines(target.productName, target.description);
  const base = { method: "ai" as const, lines };
  if (from) {
    return {
      ...base,
      prompt: from.prompt,
      autoVideo: from.auto?.video ?? false,
      audioPrompt: from.audioPrompt ?? "",
      autoAudio: from.auto?.audio ?? true,
      quality: from.quality,
    };
  }
  const d = video?.draft;
  if (d) {
    return { ...base, prompt: d.prompt, autoVideo: d.auto?.video ?? false, audioPrompt: d.audioPrompt ?? "", autoAudio: d.auto?.audio ?? true, quality: d.quality };
  }
  return { ...base, prompt: "", autoVideo: false, audioPrompt: "", autoAudio: true, quality: "low" };
}

export const VIDEO_PROMPT_BLOCKER = "Write what the video should show, or turn on Auto generate video.";
export const AUDIO_PROMPT_BLOCKER = "Describe the sound, or turn on Auto generate audio.";

/** Why the storyboard can't be drafted yet; null when it can. */
export function videoFormBlocker(value: VideoFormValue): string | null {
  if (value.method === "ar") return "Record it on your phone, or pick AI.";
  if (!value.autoVideo && !value.prompt.trim()) return VIDEO_PROMPT_BLOCKER;
  if (!value.autoAudio && !value.audioPrompt.trim()) return AUDIO_PROMPT_BLOCKER;
  return null;
}

/** What the storyboard is drafted from. */
export function storyboardInputOf(target: VideoTarget, value: VideoFormValue): StoryboardInput {
  return {
    productName: target.productName,
    description: target.description,
    videoPrompt: value.autoVideo ? "" : value.prompt.trim(),
    audioPrompt: value.autoAudio ? "" : value.audioPrompt.trim(),
  };
}

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const QUALITIES: VideoQuality[] = ["low", "high"];
const LINK =
  "inline-flex min-h-[24px] items-center rounded-md text-sm font-semibold text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

export type VideoFormProps = {
  target: VideoTarget;
  value: VideoFormValue;
  onChange: (next: VideoFormValue) => void;
  promptRef?: React.Ref<HTMLTextAreaElement>;
  /** Links the fields to the blocked button's reason. */
  describedBy?: string;
  /** The prompt help dialog opened or closed (a parent dialog is covered meanwhile). */
  onHelpOpenChange?: (open: boolean) => void;
};

/** Figma "Generate Video": AR or AI; for AI, the video prompt (with prompt help and Auto
 *  generate video), the audio prompt (with Auto generate audio) and the quality. The button
 *  below it — Generate video storyboard — is the dialog's. */
export function VideoForm({ target, value, onChange, promptRef, describedBy, onHelpOpenChange }: VideoFormProps) {
  const id = React.useId();
  const [help, setHelp] = React.useState(false);
  const openHelp = (open: boolean) => {
    setHelp(open);
    onHelpOpenChange?.(open);
  };

  return (
    <div className="flex flex-col gap-8 [container-type:inline-size]">
      <MethodField value={value.method} onChange={(method) => onChange({ ...value, method })} />

      {value.method === "ar" ? (
        <ArRecordPanel projectId={target.projectId} productId={target.productId} onSwitchToAi={() => onChange({ ...value, method: "ai" })} />
      ) : (
        <>
          <PromptBox
            id={`${id}-video`}
            label="Video prompt"
            action={
              <button type="button" onClick={() => openHelp(true)} className={cn(LINK, TAP)}>
                Need prompt help?
              </button>
            }
            value={value.prompt}
            onValue={(prompt) => onChange({ ...value, prompt })}
            placeholder="Describe the video — the product, the setting, how the camera moves"
            auto={value.autoVideo}
            autoLabel="Auto generate video"
            autoPlaceholder={`AI writes the video from ${target.productName}.`}
            onAuto={(autoVideo) => onChange({ ...value, autoVideo })}
            textRef={promptRef}
            describedBy={describedBy}
            invalid={!!describedBy && !value.autoVideo && !value.prompt.trim()}
          />
          <PromptBox
            id={`${id}-audio`}
            label="Audio prompt"
            value={value.audioPrompt}
            onValue={(audioPrompt) => onChange({ ...value, audioPrompt })}
            placeholder="Describe the sound — ambient noise, music mood, speech tone…"
            auto={value.autoAudio}
            autoLabel="Auto generate audio"
            autoPlaceholder="AI picks the ambience, music and speech for each scene."
            onAuto={(autoAudio) => onChange({ ...value, autoAudio })}
            describedBy={describedBy}
            invalid={!!describedBy && !value.autoAudio && !value.audioPrompt.trim()}
          />
          <QualityField value={value.quality} onChange={(quality) => onChange({ ...value, quality })} />
        </>
      )}

      <PromptHelpModal
        open={help}
        productName={target.productName}
        productDescription={target.description}
        onUse={(prompt) => {
          onChange({ ...value, prompt, autoVideo: false });
          openHelp(false);
        }}
        onClose={() => openHelp(false)}
      />
    </div>
  );
}

/** AR or AI: two cards, a radiogroup. AR is the Figma's Recommended way — a real clip of the
 *  real product — and opens the phone hand-off; AI makes it from prompts. */
function MethodField({ value, onChange }: { value: VideoMethod; onChange: (m: VideoMethod) => void }) {
  const labelId = React.useId();
  const refs = React.useRef<Record<VideoMethod, HTMLDivElement | null>>({ ar: null, ai: null });
  const options: { id: VideoMethod; title: string; text: string; icon: Parameters<typeof Icon>[0]["icon"]; badge?: string }[] = [
    { id: "ar", title: "AR", text: "Record a video of the real product with your phone.", icon: VrIcon, badge: "Recommended" },
    { id: "ai", title: "AI", text: "AI makes the video from your prompts.", icon: SparklesIcon },
  ];
  const pick = (m: VideoMethod) => {
    onChange(m);
    refs.current[m]?.focus();
  };
  return (
    <div className="flex flex-col gap-3">
      <p id={labelId} className="text-md font-semibold text-text-primary">
        How should it be made?
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-1 gap-4 [@container(min-width:480px)]:grid-cols-2">
        {options.map((o) => {
          const checked = value === o.id;
          return (
            <div
              key={o.id}
              ref={(el) => {
                refs.current[o.id] = el;
              }}
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(o.id)}
              onKeyDown={(e) => {
                if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
                  e.preventDefault();
                  pick(o.id === "ar" ? "ai" : "ar");
                } else if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onChange(o.id);
                }
              }}
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-xl border border-solid px-6 py-5 outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
                checked ? "border-border-brand bg-bg-brand-subtle" : "border-border hover:bg-bg-subtle",
              )}
            >
              <span className="flex flex-wrap items-center gap-3">
                <RadioMark checked={checked} />
                <span className={cn("text-md font-semibold", checked ? "text-text-brand" : "text-text-primary")}>{o.title}</span>
                <Icon icon={o.icon} size={18} className={checked ? "text-text-brand" : "text-text-secondary"} />
                {o.badge && (
                  <span className="rounded-full bg-bg-success-subtle px-[8px] py-[2px] text-xs font-semibold text-text-success">{o.badge}</span>
                )}
              </span>
              <span className="text-sm leading-relaxed text-text-secondary">{o.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-solid",
        checked ? "border-border-brand" : "border-border-strong",
      )}
    >
      {checked && <span className="size-[9px] rounded-full bg-bg-brand" />}
    </span>
  );
}

/** A prompt in a box with its "Auto generate" switch at the bottom right (the Figma's fields).
 *  While Auto is on the text is AI's to write: the field is read-only and says so. */
function PromptBox({
  id,
  label,
  action,
  value,
  onValue,
  placeholder,
  auto,
  autoLabel,
  autoPlaceholder,
  onAuto,
  textRef,
  describedBy,
  invalid,
}: {
  id: string;
  label: string;
  action?: React.ReactNode;
  value: string;
  onValue: (v: string) => void;
  placeholder: string;
  auto: boolean;
  autoLabel: string;
  autoPlaceholder: string;
  onAuto: (on: boolean) => void;
  textRef?: React.Ref<HTMLTextAreaElement>;
  describedBy?: string;
  invalid: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <label htmlFor={id} className="text-md font-semibold text-text-primary">
          {label}
        </label>
        {action}
      </div>
      <div
        className={cn(
          "flex flex-col rounded-xl border border-solid bg-bg-surface transition-colors duration-fast focus-within:ring-2 focus-within:ring-border-focus motion-reduce:transition-none",
          invalid ? "border-border-error" : "border-border",
        )}
      >
        <textarea
          ref={textRef}
          id={id}
          rows={3}
          value={auto ? "" : value}
          readOnly={auto}
          onChange={(e) => onValue(e.target.value)}
          placeholder={auto ? autoPlaceholder : placeholder}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            "min-h-[88px] w-full resize-none rounded-t-xl bg-transparent px-6 pt-4 text-md leading-relaxed text-text-primary outline-none placeholder:text-text-tertiary",
            auto && "cursor-default",
          )}
        />
        <div className="flex items-center justify-end gap-3 px-4 pb-3 pt-1">
          <Toggle checked={auto} onChange={() => onAuto(!auto)} aria-label={autoLabel} />
          <span aria-hidden className="text-sm font-medium text-text-secondary">
            {autoLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── the storyboard ───────────────────────────

/** Figma "Review your storyboard": the three scenes, each a disclosure — the first open — with
 *  Visual description, Background audio, Music cue and Speech / dialogue, every field editable. */
function StoryboardEditor({
  storyboard,
  onChange,
  headingRef,
}: {
  storyboard: Storyboard;
  onChange: (next: Storyboard) => void;
  headingRef: (el: HTMLElement | null) => void;
}) {
  const id = React.useId();
  const [open, setOpen] = React.useState<boolean[]>([true, false, false]);
  const set = (i: number, key: keyof Scene, text: string) => {
    const scenes = storyboard.scenes.map((s, j) => (j === i ? { ...s, [key]: text.slice(0, SCENE_FIELD_MAX) } : s)) as Storyboard["scenes"];
    onChange({ ...storyboard, scenes });
  };
  return (
    <div className="flex flex-col gap-6 [container-type:inline-size]">
      <div className="flex flex-col gap-1">
        <h3 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-text-primary outline-none">
          Review your storyboard
        </h3>
        <p className="text-sm text-text-secondary">
          {storyboard.by === "ai"
            ? "AI drafted 3 scenes · Edit freely before generating"
            : "Drafted from your product and prompts — the AI didn't answer · Edit freely before generating"}
        </p>
      </div>
      <ul role="list" className="m-0 flex list-none flex-col gap-4 p-0">
        {storyboard.scenes.map((scene, i) => {
          const panelId = `${id}-scene-${i}`;
          const isOpen = open[i];
          return (
            <li key={i} className="overflow-hidden rounded-xl border border-solid border-border">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((o) => o.map((v, j) => (j === i ? !v : v)))}
                className={cn(
                  "flex min-h-[48px] w-full items-center justify-between gap-4 bg-bg-subtle px-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
                  TAP,
                )}
              >
                <span className="text-md font-semibold text-text-primary">
                  {`Scene ${i + 1} • `}
                  <span className="text-text-brand">{SCENE_SPANS[i]}</span>
                </span>
                <Icon icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon} size={18} className="text-text-secondary" />
              </button>
              {isOpen && (
                <div id={panelId} className="flex flex-col gap-5 px-6 pb-6 pt-5">
                  <SceneField id={`${panelId}-visual`} label="Visual description" rows={3} value={scene.visual} onValue={(t) => set(i, "visual", t)} />
                  <div className="grid grid-cols-1 gap-5 [@container(min-width:520px)]:grid-cols-2">
                    <SceneField id={`${panelId}-bg`} label="Background audio" rows={2} value={scene.background} onValue={(t) => set(i, "background", t)} />
                    <SceneField id={`${panelId}-music`} label="Music cue" rows={2} value={scene.music} onValue={(t) => set(i, "music", t)} placeholder="No music in this scene…" />
                  </div>
                  <SceneField
                    id={`${panelId}-speech`}
                    label="Speech / dialogue"
                    rows={1}
                    value={scene.speech}
                    onValue={(t) => set(i, "speech", t)}
                    placeholder="No speech in this scene…"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SceneField({
  id,
  label,
  rows,
  value,
  onValue,
  placeholder,
}: {
  id: string;
  label: string;
  rows: number;
  value: string;
  onValue: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-text-primary">
        {label}
      </label>
      <Textarea id={id} rows={rows} value={value} onValueChange={onValue} placeholder={placeholder} className="resize-y" />
    </div>
  );
}

/** "Video quality": two cards, a radiogroup. High is shown with its Upgrade
 *  tag but locked (§5 Q1): arrow keys skip it, and Enter or a click on it
 *  does nothing — the reason sits under the group. The project video's dialog
 *  shares it with its own length. */
export function QualityField({
  value,
  onChange,
  seconds,
}: {
  value: VideoQuality;
  onChange: (q: VideoQuality) => void;
  /** The clip's length; a product video's 10 s when omitted. */
  seconds?: number;
}) {
  const noteId = React.useId();
  const refs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const { sub } = useCreatePlan();
  const enabled = QUALITIES.filter((q) => qualityOpen(q, sub.tier));
  const move = (dir: 1 | -1) => {
    const at = enabled.indexOf(value);
    const next = enabled[(at + dir + enabled.length) % enabled.length];
    if (next && next !== value) onChange(next);
    refs.current[next ?? value]?.focus();
  };
  return (
    <div className="flex flex-col gap-3">
      <p id={`${noteId}-label`} className="text-md font-semibold text-text-primary">
        Select video quality <span className="font-medium text-text-tertiary">· {seconds ?? VIDEO_QUALITY.low.seconds} seconds</span>
      </p>
      <div role="radiogroup" aria-labelledby={`${noteId}-label`} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUALITIES.map((q) => {
          const tier = VIDEO_QUALITY[q];
          const checked = value === q;
          const locked = !qualityOpen(q, sub.tier);
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
                <span className="flex flex-col gap-1">
                  <span className={cn("text-md font-semibold", checked ? "text-text-brand" : locked ? "text-text-secondary" : "text-text-primary")}>
                    {tier.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
                    <Icon icon={Clock01Icon} size={14} />
                    {seconds ?? tier.seconds} sec
                  </span>
                </span>
              </span>
              <span className="self-start rounded-md bg-bg-brand-subtle px-[8px] py-[2px] text-xs font-semibold text-text-brand">
                {tier.resolution}
              </span>
            </div>
          );
        })}
      </div>
      {!qualityOpen("high", sub.tier) && (
        <p id={noteId} className="text-sm text-text-secondary">
          {HIGH_LOCKED_NOTE}{" "}
          <Link href={PLAN_PRICING_HREF} className="font-semibold text-text-link hover:text-text-link-hover">
            See plans
          </Link>
        </p>
      )}
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

type Mode =
  | { kind: "form"; from: string | null }
  | { kind: "drafting" }
  | { kind: "storyboard"; storyboard: Storyboard }
  | { kind: "take"; id: string };

function GenerateVideoDialogOpen({
  target,
  onClose,
  back,
  fromTakeId,
  fallbackFocus,
}: GenerateVideoDialogProps & { target: VideoTarget }) {
  const { record, hydrated } = useProjectVideos(target.projectId);
  const { jobs, now, startProductVideo, cancelRender, setBrowserNotify, acknowledge } = useVideoJobs();
  const { sub: planSub } = useCreatePlan();
  const planTier = planSub.tier;
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

  const take = mode.kind === "take" ? video?.takes.find((t) => t.id === mode.id) ?? null : null;
  const job = take ? jobs.find((j) => j.id === take.id) : undefined;
  const view: "form" | "drafting" | "storyboard" | "render" | "result" | "failed" =
    mode.kind === "drafting" || mode.kind === "storyboard" ? mode.kind : !take
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
  // Drafting the storyboard: the model, or this browser's draft when it doesn't answer in 50 s.
  const drafting = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => drafting.current?.abort(), []);
  const draftStoryboardNow = async () => {
    if (blocker) {
      setTried(true);
      promptRef.current?.focus();
      return;
    }
    const input = storyboardInputOf(target, value);
    const ctrl = new AbortController();
    drafting.current = ctrl;
    const timer = window.setTimeout(() => ctrl.abort(), 50_000);
    setMode({ kind: "drafting" });
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
      // Cancelled, offline or timed out: a cancel goes back to the form; anything else keeps the draft.
      if (drafting.current !== ctrl) return;
    } finally {
      window.clearTimeout(timer);
    }
    if (drafting.current !== ctrl) return;
    drafting.current = null;
    setMode({ kind: "storyboard", storyboard });
  };
  const cancelDrafting = () => {
    drafting.current?.abort();
    drafting.current = null;
    setMode({ kind: "form", from: null });
  };
  const generate = (storyboard: Storyboard) => {
    const res = startProductVideo({
      projectId: target.projectId,
      projectName: target.projectName,
      productId: target.productId,
      productName: target.productName,
      prompt: value.autoVideo ? "" : value.prompt.trim(),
      lines: linesOfStoryboard(storyboard, value.lines),
      quality: qualityOpen(value.quality, planTier) ? value.quality : "low",
      source: target.source,
      imageUrl: target.imageUrl,
      audioPrompt: value.autoAudio ? "" : value.audioPrompt.trim(),
      auto: { video: value.autoVideo, audio: value.autoAudio },
      storyboard,
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
          {/* AR's clip comes from the phone: nothing to draft here. */}
          {value.method === "ai" && (
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              aria-disabled={blocker ? true : undefined}
              aria-describedby={blocker ? blockId : undefined}
              className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
              onClick={() => void draftStoryboardNow()}
            >
              Generate video storyboard
            </Button>
          )}
        </div>
        {blocker && value.method === "ai" && (
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
  } else if (view === "drafting") {
    body = (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <Spinner size={28} />
        <p ref={setFocus} tabIndex={-1} className="text-md font-semibold text-text-primary outline-none">
          Drafting your storyboard…
        </p>
        <p className="max-w-[44ch] text-sm text-text-secondary">
          AI is writing 3 scenes for {target.productName} from your prompts. This can take up to 40 seconds.
        </p>
      </div>
    );
    footer = (
      <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
        <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={cancelDrafting}>
          Cancel
        </Button>
      </div>
    );
  } else if (view === "storyboard" && mode.kind === "storyboard") {
    const sb = mode.storyboard;
    body = (
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => setMode({ kind: "form", from: null })}
          className={cn(
            "-ml-2 inline-flex min-h-[32px] items-center gap-2 self-start rounded-md px-2 text-md font-semibold text-text-primary outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus",
            TAP,
          )}
        >
          <Icon icon={ArrowLeft01Icon} size={18} />
          Back to Generate video
        </button>
        <StoryboardEditor storyboard={sb} onChange={(next) => setMode({ kind: "storyboard", storyboard: next })} headingRef={setFocus} />
        <p className="text-xs leading-relaxed text-text-tertiary">{storyboardHonesty(target.productName)}</p>
      </div>
    );
    footer = (
      <div className="ml-auto flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={() => void draftStoryboardNow()}>
            Regenerate storyboard
          </Button>
          <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={() => generate(sb)}>
            Generate video
          </Button>
        </div>
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
      title="Generate video"
      description={renderTitle(`For ${target.productName}`, target.projectName)}
      initialFocus={view === "form" ? promptRef : focusRef}
      footer={hydrated ? footer : null}
    >
      {back && (view === "form" || view === "result" || view === "failed" || view === "render") && (
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
